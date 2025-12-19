import { format } from 'date-fns/format';
import { parseISO } from 'date-fns/parseISO';
import { de } from 'date-fns/locale/de';
import { Liability, LiabilityType } from './types';

export const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

export const formatDate = (dateString: string): string => {
    try {
        // Stellt sicher, dass ein gültiger String übergeben wird, bevor versucht wird, ihn zu parsen.
        if (!dateString || typeof dateString !== 'string') {
            throw new Error('Invalid date string provided');
        }
        return format(parseISO(dateString), 'dd. MMMM yyyy', { locale: de });
    } catch (error) {
        console.warn(`Ungültiger Datumsstring für formatDate: ${dateString}`, error);
        return 'Ungültiges Datum';
    }
};

interface MonthlyPayment {
    liabilityId: string;
    name: string;
    payment: number;
    interestPaid: number;
    principalPaid: number;
    remainingBalance: number;
}

export interface PaydownPlan {
    month: number;
    payments: MonthlyPayment[];
    totalPaidThisMonth: number;
    totalInterestThisMonth: number;
}

// Interne Schnittstelle für mehr Typsicherheit und Klarheit innerhalb der Berechnungsfunktion.
interface DebtForPlan extends Liability {
    balance: number;
}

/**
 * Berechnet einen detaillierten Tilgungsplan für Schulden basierend auf einer gewählten Strategie.
 * @param allLiabilities - Ein Array aller Verbindlichkeiten des Benutzers.
 * @param strategy - Die zu verwendende Tilgungsstrategie ('avalanche' oder 'snowball').
 * @param monthlyExtra - Der zusätzliche monatliche Betrag, der für die Tilgung zur Verfügung steht.
 * @returns Ein Objekt, das den monatlichen Plan und eine Zusammenfassung enthält, oder null, wenn keine Schulden vorhanden sind.
 */
export const calculateDebtPaydownPlan = (
    allLiabilities: Liability[],
    strategy: 'avalanche' | 'snowball',
    monthlyExtra: number
): { plan: PaydownPlan[], summary: { totalMonths: number, totalInterest: number, totalPrincipal: number } } | null => {
    // 1. Filtern und Vorbereiten der Schulden
    // Es werden nur Schulden (keine Forderungen) berücksichtigt, die noch nicht vollständig abbezahlt sind.
    // Eine tiefe Kopie wird erstellt, um den ursprünglichen State nicht zu verändern.
    let debts: DebtForPlan[] = JSON.parse(JSON.stringify(
        allLiabilities.filter(l => l.type === LiabilityType.DEBT && l.paidAmount < l.initialAmount)
    ));
    
    if (debts.length === 0) return null;

    // Berechne den aktuellen Restbetrag für jede Schuld und füge ihn dem Objekt hinzu.
    debts.forEach(d => d.balance = d.initialAmount - d.paidAmount);

    // 2. Schulden nach der gewählten Strategie sortieren
    if (strategy === 'snowball') {
        // Schneeball: Kleinste Restschuld zuerst, um schnelle Erfolgserlebnisse zu erzielen.
        debts.sort((a, b) => a.balance - b.balance);
    } else { // avalanche
        // Lawine: Höchster Zinssatz zuerst, um langfristig Zinskosten zu minimieren.
        debts.sort((a, b) => b.interestRate - a.interestRate);
    }

    const plan: PaydownPlan[] = [];
    let month = 0;
    let totalInterest = 0;
    const totalPrincipal = debts.reduce((sum, d) => sum + d.balance, 0);

    // 3. Monatliche Tilgung simulieren, bis alle Schulden abbezahlt sind
    while (debts.some(d => d.balance > 0)) {
        month++;
        let extraPaymentPool = monthlyExtra;
        const monthlyPayments: MonthlyPayment[] = [];
        let totalPaidThisMonth = 0;
        let totalInterestThisMonth = 0;
        
        const debtInterestThisMonth: { [key: string]: number } = {};

        // Schritt A: Zinsen für den aktuellen Monat berechnen und auf den Restbetrag aufschlagen.
        for (const debt of debts) {
            if (debt.balance > 0) {
                const interest = (debt.balance * (debt.interestRate / 100)) / 12;
                debt.balance += interest;
                totalInterest += interest;
                totalInterestThisMonth += interest;
                debtInterestThisMonth[debt.id] = interest;
            }
        }
        
        // Schritt B: Die zusätzliche Zahlung auf die Schulden in der priorisierten Reihenfolge anwenden.
        for (const debt of debts) {
            if (extraPaymentPool > 0 && debt.balance > 0) {
                const payment = Math.min(debt.balance, extraPaymentPool);
                const interestPaid = Math.min(payment, debtInterestThisMonth[debt.id] || 0);
                const principalPaid = payment - interestPaid;
                
                debt.balance -= payment;
                extraPaymentPool -= payment;
                totalPaidThisMonth += payment;
                
                monthlyPayments.push({
                    liabilityId: debt.id,
                    name: debt.name,
                    payment,
                    interestPaid,
                    principalPaid,
                    remainingBalance: debt.balance,
                });
                delete debtInterestThisMonth[debt.id];
            }
        }
        
        // Erfasse Schulden, die in diesem Monat nur Zinsen angesammelt, aber keine Zahlung erhalten haben.
        for (const debt of debts) {
             if (debt.balance > 0 && debtInterestThisMonth[debt.id] !== undefined) {
                 monthlyPayments.push({
                    liabilityId: debt.id,
                    name: debt.name,
                    payment: 0,
                    interestPaid: debtInterestThisMonth[debt.id],
                    principalPaid: 0,
                    remainingBalance: debt.balance,
                 });
             }
        }

        plan.push({
            month,
            payments: monthlyPayments,
            totalPaidThisMonth,
            totalInterestThisMonth
        });
        
        // Entferne vollständig getilgte Schulden für die nächste Iteration.
        debts = debts.filter(d => d.balance > 0);
        
        // Bei der Schneeball-Strategie ist keine Neusortierung nötig, da die Reihenfolge
        // der niedrigsten Beträge durch die Tilgung erhalten bleibt.

        if (month > 1200) break; // Sicherheitsstopp nach 100 Jahren, um Endlosschleifen zu vermeiden.
    }
    
    // 4. Endergebnis zurückgeben
    return {
        plan,
        summary: {
            totalMonths: month,
            totalInterest,
            totalPrincipal
        }
    };
};