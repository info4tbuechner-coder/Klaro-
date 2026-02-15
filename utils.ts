
import { format } from 'date-fns/format';
import { parseISO } from 'date-fns/parseISO';
import { de } from 'date-fns/locale/de';
import { Liability, LiabilityType } from './types';

export const formatCurrency = (value: number, currency: string = 'EUR', language: string = 'de-DE'): string => {
    try {
        const locale = language.includes('-') ? language : (language === 'de' ? 'de-DE' : 'en-US');
        return new Intl.NumberFormat(locale, { 
            style: 'currency', 
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    } catch (error) {
        console.error("Formatting error", error);
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
    }
};

export const formatCompactNumber = (value: number, currency: string = 'EUR', language: string = 'de-DE'): string => {
    try {
        const locale = language.includes('-') ? language : (language === 'de' ? 'de-DE' : 'en-US');
        return new Intl.NumberFormat(locale, {
            notation: 'compact',
            style: 'currency',
            currency: currency,
            compactDisplay: 'short'
        }).format(value);
    } catch (e) {
        return `${Math.round(value / 1000)}k`;
    }
};

export const formatDate = (dateString: string): string => {
    try {
        if (!dateString || typeof dateString !== 'string') return 'Ungültiges Datum';
        return format(parseISO(dateString), 'dd. MMMM yyyy', { locale: de });
    } catch (error) {
        return 'Ungültiges Datum';
    }
};

export interface PaydownPlan {
    month: number;
    payments: any[];
    totalPaidThisMonth: number;
    totalInterestThisMonth: number;
}

export const calculateDebtPaydownPlan = (
    allLiabilities: Liability[],
    strategy: 'avalanche' | 'snowball',
    monthlyExtra: number
): any => {
    // Implementierung der Tilgungslogik...
    return null; 
};
