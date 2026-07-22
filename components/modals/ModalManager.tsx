
import React, { useState, memo, useEffect, useRef } from 'react';
import { useAppState, useAppDispatch, useNetWorthData } from '../../context/AppContext';
import { Transaction, TransactionType } from '../../types';
import { RefreshCw, AlertCircle, ShieldCheck, Camera, CameraOff, LogOut, WifiOff, Download, Calendar, FileText, FileSpreadsheet } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatCompactNumber } from '../../utils';
import { format } from 'date-fns/format';
import { parseISO } from 'date-fns/parseISO';
import { isSameMonth } from 'date-fns/isSameMonth';
import { subMonths } from 'date-fns/subMonths';
import { de } from 'date-fns/locale/de';
import { Modal, Button, Select, Input, FormGroup } from '../ui';

// 1. Deklaration der Sub-Komponenten (vor dem Registry-Objekt)

const SyncModal: React.FC = memo(() => {
    const dispatch = useAppDispatch();
    const { syncStatus, lastSyncAt } = useAppState();
    const [step, setStep] = useState(0);
    const [progress, setProgress] = useState(0);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const isOnline = navigator.onLine;

    const steps = ["Verbindung...", "Validierung...", "Sync...", "Encryption...", "Finalisierung..."];

    const startSync = async () => {
        if (!isOnline) {
            setErrorMsg("Keine Verbindung.");
            dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
            return;
        }
        setErrorMsg(null);
        dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });
        for (let i = 0; i < steps.length; i++) {
            setStep(i);
            for (let p = 0; p <= 100; p += 10) {
                setProgress(p);
                await new Promise(r => setTimeout(r, 60));
            }
        }
        dispatch({ type: 'SYNC_COMPLETED', payload: new Date().toISOString() });
    };

    return (
        <div className="space-y-8 animate-in">
            <div className="bg-secondary/20 p-8 rounded-[3rem] text-center border border-white/5">
                <div className={`w-20 h-20 mx-auto rounded-[2rem] flex items-center justify-center mb-6 transition-all duration-700 ${syncStatus === 'syncing' ? 'bg-primary text-primary-foreground animate-pulse rotate-12' : syncStatus === 'error' ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {syncStatus === 'syncing' ? <RefreshCw className="animate-spin" /> : syncStatus === 'error' ? <AlertCircle /> : <ShieldCheck />}
                </div>
                <h4 className="text-xl font-black">Blockchain Sync</h4>
                <p className="text-[10px] font-black uppercase opacity-40 mt-2">
                    {lastSyncAt ? `Zuletzt: ${format(new Date(lastSyncAt), 'HH:mm:ss')}` : 'Noch kein Sync'}
                </p>
                {errorMsg && <p className="text-rose-500 text-xs mt-2 font-bold">{errorMsg}</p>}
            </div>
            {syncStatus === 'syncing' && (
                <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-primary">
                        <span>{steps[step]}</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-secondary/30 rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            )}
            <div className="flex gap-4">
                <Button onClick={() => dispatch({ type: 'CLOSE_MODAL' })} className="flex-1">Schließen</Button>
                {syncStatus !== 'syncing' && <Button onClick={startSync} variant="primary" className="flex-[2]">Sync Starten</Button>}
            </div>
        </div>
    );
});

const TransactionModal: React.FC<{ initialData?: Partial<Transaction>, transaction?: Transaction }> = memo(({ initialData, transaction }) => {
    const { categories, liabilities, goals } = useAppState();
    const dispatch = useAppDispatch();
    const isEdit = !!transaction;
    const [formData, setFormData] = useState({
        amount: transaction?.amount?.toString() || initialData?.amount?.toString() || '',
        description: transaction?.description || initialData?.description || '',
        date: transaction?.date || initialData?.date || format(new Date(), 'yyyy-MM-dd'),
        type: transaction?.type || initialData?.type || TransactionType.EXPENSE,
        categoryId: transaction?.categoryId || initialData?.categoryId || '',
        tags: transaction?.tags?.join(', ') || initialData?.tags?.join(', ') || '',
        liabilityId: transaction?.liabilityId || initialData?.liabilityId || '',
        goalId: transaction?.goalId || initialData?.goalId || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(formData.amount);
        if (isNaN(amount) || !formData.description) return;
        
        const tags = formData.tags.split(',').map(t => t.trim()).filter(t => t);
        const payload = {
            ...formData,
            amount,
            tags,
            liabilityId: formData.liabilityId || undefined,
            goalId: formData.goalId || undefined,
            categoryId: formData.categoryId || undefined
        };

        if (isEdit && transaction) {
            dispatch({ type: 'UPDATE_TRANSACTION', payload: { ...transaction, ...payload } });
        } else {
            dispatch({ type: 'ADD_TRANSACTION', payload: payload as any });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <FormGroup label="Typ"><Select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}><option value="expense">Ausgabe</option><option value="income">Einnahme</option><option value="saving">Sparen</option></Select></FormGroup>
                <FormGroup label="Datum"><Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></FormGroup>
            </div>
            <FormGroup label="Beschreibung"><Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Wofür?" enterKeyHint="next" /></FormGroup>
            <FormGroup label="Betrag"><Input type="number" step="0.01" inputMode="decimal" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="0,00" enterKeyHint="next" /></FormGroup>
            
            <FormGroup label="Kategorie">
                <Select value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})}>
                    <option value="">Keine Kategorie</option>
                    {categories.filter(c => c.type === (formData.type === 'income' ? 'income' : 'expense')).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </Select>
            </FormGroup>

            {formData.type === 'expense' && liabilities.length > 0 && (
                <FormGroup label="Verbindlichkeit (Optional)">
                    <Select value={formData.liabilityId} onChange={e => setFormData({...formData, liabilityId: e.target.value})}>
                        <option value="">Keine Auswahl</option>
                        {liabilities.map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                    </Select>
                </FormGroup>
            )}

            {formData.type === 'saving' && goals.length > 0 && (
                <FormGroup label="Sparziel (Optional)">
                    <Select value={formData.goalId} onChange={e => setFormData({...formData, goalId: e.target.value})}>
                        <option value="">Keine Auswahl</option>
                        {goals.map(g => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                    </Select>
                </FormGroup>
            )}

            <FormGroup label="Tags (Komma getrennt)"><Input value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} placeholder="z.B. Urlaub, Arbeit" enterKeyHint="done" /></FormGroup>

            <div className="flex gap-4 pt-4">
                <Button type="button" onClick={() => dispatch({ type: 'CLOSE_MODAL' })} className="flex-1">Abbrechen</Button>
                <Button type="submit" variant="primary" className="flex-1">{isEdit ? 'Speichern' : 'Hinzufügen'}</Button>
            </div>
        </form>
    );
});

const ViewTransactionModal: React.FC<{ transaction: Transaction }> = memo(({ transaction }) => {
    const { categories, userProfile } = useAppState();
    const dispatch = useAppDispatch();
    const category = categories.find(c => c.id === transaction.categoryId);
    return (
        <div className="space-y-8 animate-in">
            <div className="text-center p-8 bg-secondary/20 rounded-[3rem] border border-white/5">
                <h4 className="text-3xl font-black">{formatCurrency(transaction.amount, userProfile.currency, userProfile.language)}</h4>
                <p className="text-sm font-bold text-muted-foreground/60 mt-1">{transaction.description}</p>
                {category && <p className="text-[10px] uppercase tracking-widest font-black text-primary mt-4 py-1 px-3 bg-primary/10 rounded-full inline-block">{category.name}</p>}
            </div>
            <div className="flex gap-4">
                <Button onClick={() => dispatch({ type: 'DELETE_TRANSACTIONS', payload: [transaction.id] })} variant="destructive" className="flex-1">Löschen</Button>
                <Button onClick={() => dispatch({ type: 'OPEN_MODAL', payload: { type: 'EDIT_TRANSACTION', data: { transaction } } })} variant="primary" className="flex-1">Bearbeiten</Button>
            </div>
        </div>
    );
});

const IntelligenceCenter: React.FC = memo(() => {
    const { userProfile } = useAppState();
    const [tab, setTab] = useState<'wealth' | 'flow'>('wealth');
    const netWorthData = useNetWorthData();
    return (
        <div className="space-y-8 animate-in">
            <div className="flex gap-2 p-1.5 bg-secondary/20 rounded-[2rem] border border-white/5">
                {['wealth', 'flow'].map(t => (
                    <button key={t} onClick={() => setTab(t as any)} className={`flex-1 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest ${tab === t ? 'bg-background text-foreground shadow-2xl' : 'text-muted-foreground/40'}`}>
                        {t === 'wealth' ? 'Vermögen' : 'Cashflow'}
                    </button>
                ))}
            </div>
            <div className="h-[350px] w-full glass-card rounded-[3rem] p-6 border border-white/5">
                <ResponsiveContainer>
                    <AreaChart data={netWorthData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={9} />
                        <YAxis axisLine={false} tickLine={false} fontSize={9} tickFormatter={(v) => formatCompactNumber(v, userProfile.currency, userProfile.language)} />
                        <Tooltip formatter={(v: number) => [formatCurrency(v, userProfile.currency, userProfile.language), "Betrag"]} />
                        <Area type="monotone" dataKey="netWorth" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.1)" strokeWidth={3} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
});

const UserProfileModal: React.FC = memo(() => {
    const { userProfile } = useAppState();
    const dispatch = useAppDispatch();
    return (
        <div className="space-y-8 animate-in">
            <div className="text-center p-6 bg-secondary/20 rounded-[3rem] border border-white/5">
                <div className="w-20 h-20 rounded-full bg-primary/20 mx-auto flex items-center justify-center text-primary text-2xl font-black mb-4">{userProfile.name[0]}</div>
                <h4 className="text-xl font-black">{userProfile.name}</h4>
                <p className="text-[10px] font-black uppercase opacity-40">{userProfile.email}</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
                <Button onClick={() => dispatch({ type: 'RESET_STATE' })} variant="destructive"><LogOut size={18} /> Alle Daten löschen</Button>
                <Button onClick={() => dispatch({ type: 'CLOSE_MODAL' })}>Schließen</Button>
            </div>
        </div>
    );
});

const SmartScanModal: React.FC = memo(() => {
    const dispatch = useAppDispatch();
    const [isScanning, setIsScanning] = useState(false);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const isOnline = navigator.onLine;

    useEffect(() => {
        if (isOnline) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                .then(s => { 
                    setHasPermission(true);
                    if (videoRef.current) videoRef.current.srcObject = s; 
                })
                .catch(err => {
                    console.error(err);
                    setHasPermission(false);
                });
        }
    }, [isOnline]);

    const handleCapture = async () => {
        setIsScanning(true);
        // Simulation der KI-Logik
        setTimeout(() => {
            dispatch({ type: 'CLOSE_MODAL' });
            setIsScanning(false);
        }, 2000);
    };

    if (!isOnline) {
        return (
             <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 animate-in">
                <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500"><WifiOff size={40} /></div>
                <div>
                    <h4 className="text-lg font-black uppercase tracking-widest">Offline</h4>
                    <p className="text-xs text-muted-foreground/60 mt-2 max-w-[200px]">Der KI-Scan benötigt eine aktive Internetverbindung.</p>
                </div>
                <Button onClick={() => dispatch({ type: 'CLOSE_MODAL' })}>Abbrechen</Button>
            </div>
        )
    }

    if (hasPermission === false) {
        return (
             <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 animate-in">
                <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500"><CameraOff size={40} /></div>
                <div>
                    <h4 className="text-lg font-black uppercase tracking-widest">Kein Zugriff</h4>
                    <p className="text-xs text-muted-foreground/60 mt-2 max-w-[200px]">Bitte erlaube den Zugriff auf die Kamera in deinen Browsereinstellungen.</p>
                </div>
                <Button onClick={() => dispatch({ type: 'CLOSE_MODAL' })}>Abbrechen</Button>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in">
            <div className="aspect-[3/4] bg-secondary/50 rounded-[3rem] overflow-hidden border border-white/10 relative">
                {isScanning && <div className="absolute inset-0 bg-background/60 backdrop-blur-md z-10 flex items-center justify-center"><RefreshCw className="animate-spin text-primary" /></div>}
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            </div>
            <Button onClick={handleCapture} variant="primary" className="w-full" disabled={isScanning}><Camera /> Foto aufnehmen</Button>
        </div>
    );
});

const ExportDataModal: React.FC = memo(() => {
    const { transactions, categories, userProfile } = useAppState();
    const dispatch = useAppDispatch();
    const [isExporting, setIsExporting] = useState(false);
    const [period, setPeriod] = useState<'this_month' | 'last_month' | 'custom_month' | 'all'>('this_month');
    const [selectedMonthStr, setSelectedMonthStr] = useState<string>(() => format(new Date(), 'yyyy-MM'));

    const filteredTransactions = React.useMemo(() => {
        const now = new Date();
        if (period === 'this_month') {
            return transactions.filter(t => isSameMonth(parseISO(t.date), now));
        } else if (period === 'last_month') {
            return transactions.filter(t => isSameMonth(parseISO(t.date), subMonths(now, 1)));
        } else if (period === 'custom_month') {
            if (!selectedMonthStr) return transactions;
            const targetDate = parseISO(`${selectedMonthStr}-01`);
            return transactions.filter(t => isSameMonth(parseISO(t.date), targetDate));
        }
        return transactions;
    }, [transactions, period, selectedMonthStr]);

    const periodLabel = React.useMemo(() => {
        const now = new Date();
        if (period === 'this_month') return format(now, 'MMMM yyyy', { locale: de });
        if (period === 'last_month') return format(subMonths(now, 1), 'MMMM yyyy', { locale: de });
        if (period === 'custom_month' && selectedMonthStr) return format(parseISO(`${selectedMonthStr}-01`), 'MMMM yyyy', { locale: de });
        return 'Alle Transaktionen';
    }, [period, selectedMonthStr]);

    const stats = React.useMemo(() => {
        let income = 0;
        let expense = 0;
        let saving = 0;
        filteredTransactions.forEach(t => {
            if (t.type === TransactionType.INCOME) income += t.amount;
            else if (t.type === TransactionType.EXPENSE) expense += t.amount;
            else if (t.type === TransactionType.SAVING) saving += t.amount;
        });
        return {
            count: filteredTransactions.length,
            income,
            expense,
            saving,
            net: income - expense
        };
    }, [filteredTransactions]);

    const exportCSV = () => {
        setIsExporting(true);
        setTimeout(() => {
            const headers = ['Datum', 'Beschreibung', 'Betrag (€)', 'Typ', 'Kategorie', 'Tags'];
            const rows = filteredTransactions.map(t => {
                const category = categories.find(c => c.id === t.categoryId);
                const typeText = t.type === TransactionType.INCOME ? 'Einnahme' : t.type === TransactionType.EXPENSE ? 'Ausgabe' : 'Sparen';
                return [
                    t.date,
                    `"${t.description.replace(/"/g, '""')}"`,
                    t.amount.toString(),
                    typeText,
                    category ? `"${category.name.replace(/"/g, '""')}"` : 'Sonstiges',
                    t.tags ? `"${t.tags.join(', ').replace(/"/g, '""')}"` : ''
                ].join(';');
            });
            
            const summaryRow = `\n\nZusammenfassung: ${periodLabel};Einnahmen: ${stats.income.toFixed(2)};Ausgaben: ${stats.expense.toFixed(2)};Saldo: ${stats.net.toFixed(2)}`;
            const csvContent = "\uFEFF" + [headers.join(';'), ...rows].join('\n') + summaryRow;
            
            try {
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", `klaro_monatsübersicht_${periodLabel.toLowerCase().replace(/\s+/g, '_')}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } catch (e) {
                console.error("CSV export error", e);
                alert("Download blockiert. Bitte öffne die App in einem neuen Fenster, um Dateien herunterzuladen.");
            }
            
            setIsExporting(false);
            dispatch({ type: 'CLOSE_MODAL' });
        }, 300);
    };

    const exportPDF = async () => {
        setIsExporting(true);
        try {
            const jsPDF = (await import('jspdf')).default;
            const autoTable = (await import('jspdf-autotable')).default;

            const doc = new jsPDF();
            
            // Branding Header
            doc.setFontSize(20);
            doc.setTextColor(33, 37, 41);
            doc.text("KLARO | Financial Intelligence", 14, 18);

            doc.setFontSize(12);
            doc.setTextColor(100, 116, 139);
            doc.text(`Monatliche Transaktionsübersicht – ${periodLabel}`, 14, 26);

            doc.setFontSize(9);
            doc.text(`Erstellt am: ${format(new Date(), 'dd.MM.yyyy HH:mm')} Uhr`, 14, 32);

            // KPI Summary Box
            doc.setDrawColor(226, 232, 240);
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(14, 38, 182, 22, 3, 3, 'FD');

            doc.setFontSize(9);
            doc.setTextColor(71, 85, 105);
            doc.text("Gesamteinnahmen:", 20, 47);
            doc.setTextColor(16, 185, 129);
            doc.setFont('helvetica', 'bold');
            doc.text(formatCurrency(stats.income, userProfile.currency, userProfile.language), 20, 54);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text("Gesamtausgaben:", 80, 47);
            doc.setTextColor(239, 68, 68);
            doc.setFont('helvetica', 'bold');
            doc.text(formatCurrency(stats.expense, userProfile.currency, userProfile.language), 80, 54);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text("Monatssaldo:", 140, 47);
            doc.setTextColor(stats.net >= 0 ? 16 : 239, stats.net >= 0 ? 185 : 68, stats.net >= 0 ? 129 : 68);
            doc.setFont('helvetica', 'bold');
            doc.text(formatCurrency(stats.net, userProfile.currency, userProfile.language), 140, 54);

            doc.setFont('helvetica', 'normal');

            // Table Data
            const tableData = filteredTransactions.map(t => {
                const category = categories.find(c => c.id === t.categoryId);
                const isInc = t.type === TransactionType.INCOME;
                const isSav = t.type === TransactionType.SAVING;
                return [
                    format(new Date(t.date), 'dd.MM.yyyy'),
                    t.description,
                    `${isInc ? '+' : isSav ? '' : '-'}${formatCurrency(t.amount, userProfile.currency, userProfile.language)}`,
                    isInc ? 'Einnahme' : isSav ? 'Sparen' : 'Ausgabe',
                    category ? category.name : 'Sonstiges'
                ];
            });

            autoTable(doc, {
                head: [['Datum', 'Beschreibung', 'Betrag', 'Typ', 'Kategorie']],
                body: tableData,
                startY: 68,
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                margin: { left: 14, right: 14 }
            });

            doc.save(`klaro_monatsuebersicht_${periodLabel.toLowerCase().replace(/\s+/g, '_')}.pdf`);
        } catch (e: any) {
            console.error("PDF export error", e);
            alert("Download blockiert. Bitte öffne die App in einem neuen Fenster, um Dateien herunterzuladen.");
        } finally {
            setIsExporting(false);
            dispatch({ type: 'CLOSE_MODAL' });
        }
    };

    return (
        <div className="space-y-6 animate-in">
            <div className="text-center p-6 bg-secondary/20 rounded-[2.5rem] border border-white/5">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                    <Download size={28} />
                </div>
                <h4 className="text-xl font-black tracking-tight">Monatsexport</h4>
                <p className="text-xs text-muted-foreground/60 mt-1">Lade deine Transaktionsübersicht als PDF oder CSV herunter.</p>
            </div>

            {/* Zeitraum Auswahl */}
            <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 flex items-center gap-1.5 px-1">
                    <Calendar size={12} /> Zeitraum wählen
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-secondary/20 rounded-2xl border border-white/5">
                    {[
                        { id: 'this_month', label: 'Diesen Monat' },
                        { id: 'last_month', label: 'Letzten Monat' },
                        { id: 'custom_month', label: 'Wählen' },
                        { id: 'all', label: 'Alle' },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setPeriod(item.id as any)}
                            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${period === item.id ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground/60 hover:text-foreground'}`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                {period === 'custom_month' && (
                    <div className="pt-2 animate-in">
                        <input
                            type="month"
                            value={selectedMonthStr}
                            onChange={(e) => setSelectedMonthStr(e.target.value)}
                            className="w-full p-3 bg-secondary/30 border border-white/10 rounded-xl text-sm font-medium outline-none focus:border-primary"
                        />
                    </div>
                )}
            </div>

            {/* Period Statistics Summary */}
            <div className="p-4 bg-secondary/10 rounded-2xl border border-white/5 space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                    <span>{periodLabel}</span>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black">{stats.count} Belege</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/10">
                        <div className="text-[9px] font-black uppercase tracking-wider text-emerald-500/80">Einnahmen</div>
                        <div className="text-xs font-mono font-bold text-emerald-500 mt-0.5">{formatCurrency(stats.income, userProfile.currency, userProfile.language)}</div>
                    </div>
                    <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/10">
                        <div className="text-[9px] font-black uppercase tracking-wider text-rose-500/80">Ausgaben</div>
                        <div className="text-xs font-mono font-bold text-rose-500 mt-0.5">{formatCurrency(stats.expense, userProfile.currency, userProfile.language)}</div>
                    </div>
                    <div className="p-2 bg-primary/10 rounded-xl border border-primary/10">
                        <div className="text-[9px] font-black uppercase tracking-wider text-primary">Saldo</div>
                        <div className={`text-xs font-mono font-bold mt-0.5 ${stats.net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{formatCurrency(stats.net, userProfile.currency, userProfile.language)}</div>
                    </div>
                </div>
            </div>

            {/* Export Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
                <Button onClick={exportCSV} disabled={isExporting || stats.count === 0} className="w-full py-4 flex items-center justify-center gap-2">
                    <FileSpreadsheet size={18} /> CSV Export
                </Button>
                <Button onClick={exportPDF} disabled={isExporting || stats.count === 0} variant="primary" className="w-full py-4 flex items-center justify-center gap-2">
                    <FileText size={18} /> PDF Export
                </Button>
            </div>
        </div>
    );
});

// 2. Registry-Objekt (Jetzt sicher, da alle Komponenten deklariert sind)

const MODAL_COMPONENTS: any = {
    ADD_TRANSACTION: { component: TransactionModal, title: 'Neuer Beleg', size: 'lg' }, 
    EDIT_TRANSACTION: { component: TransactionModal, title: 'Bearbeiten', size: 'lg' },
    VIEW_TRANSACTION: { component: ViewTransactionModal, title: 'Details', size: 'lg' },
    ANALYSIS: { component: IntelligenceCenter, title: 'Intelligence Center', size: 'xl' },
    SMART_SCAN: { component: SmartScanModal, title: 'KI Beleg-Scan', size: 'md' },
    USER_PROFILE: { component: UserProfileModal, title: 'Mein Profil', size: 'md' },
    SYNC_DATA: { component: SyncModal, title: 'Network Sync', size: 'md' },
    EXPORT_IMPORT_DATA: { component: ExportDataModal, title: 'Export', size: 'md' },
};

const ModalManager: React.FC = () => {
    const { activeModal } = useAppState();
    const dispatch = useAppDispatch();
    const [paramsLoaded, setParamsLoaded] = useState(false);

    // Deep Link Handler (PWA Shortcuts)
    useEffect(() => {
        if (paramsLoaded) return;
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');
        if (action === 'add_transaction') {
            dispatch({ type: 'OPEN_MODAL', payload: { type: 'ADD_TRANSACTION' } });
            window.history.replaceState({}, '', '/');
        } else if (action === 'smart_scan') {
            dispatch({ type: 'OPEN_MODAL', payload: { type: 'SMART_SCAN' } });
            window.history.replaceState({}, '', '/');
        }
        setParamsLoaded(true);
    }, [dispatch, paramsLoaded]);

    if (!activeModal) return null;
    const config = MODAL_COMPONENTS[activeModal.type] || { component: () => null, title: 'Klaro', size: 'md' };
    const ActiveComp = config.component;
    
    return (
        <Modal title={config.title} onClose={() => dispatch({ type: 'CLOSE_MODAL' })} size={config.size}>
            <ActiveComp {...('data' in activeModal ? activeModal.data : {})} />
        </Modal>
    );
};

export default ModalManager;
