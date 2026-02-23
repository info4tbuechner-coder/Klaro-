
import React, { useMemo, useState, useCallback, memo } from 'react';
import { useAppState, useAppDispatch, useFilteredTransactions } from '../context/AppContext';
import { Transaction, TransactionType, Category, CategoryType, DateRangePreset } from '../types';
import { Edit, Trash2, Search, TrendingDown, PiggyBank, DollarSign, X, Inbox, ChevronRight, SlidersHorizontal, Tag, Euro, Clock, ArrowUpRight, WifiOff } from 'lucide-react';
import { formatCurrency } from '../utils';
import { parseISO } from 'date-fns/parseISO';
import { isToday } from 'date-fns/isToday';
import { isYesterday } from 'date-fns/isYesterday';
import { format as formatFns } from 'date-fns/format';
import { de } from 'date-fns/locale/de';

const TransactionIcon: React.FC<{ type: TransactionType }> = ({ type }) => {
    let icon = <DollarSign size={20} />;
    let color = "text-muted-foreground bg-secondary/50";

    if (type === TransactionType.INCOME) {
        icon = <ArrowUpRight size={20} />;
        color = "text-emerald-500 bg-emerald-500/10";
    } else if (type === TransactionType.EXPENSE) {
        icon = <TrendingDown size={20} />;
        color = "text-rose-500 bg-rose-500/10";
    } else if (type === TransactionType.SAVING) {
        icon = <PiggyBank size={20} />;
        color = "text-blue-500 bg-blue-500/10";
    }

    return (
        <div className={`w-10 h-10 lg:w-16 lg:h-16 ${color} rounded-xl lg:rounded-[1.75rem] flex items-center justify-center border border-white/5 transition-transform duration-500 group-hover:scale-110`}>
            {icon}
        </div>
    );
};

const TransactionItem: React.FC<{ 
    transaction: Transaction; 
    category?: Category; 
    isSelected: boolean; 
    onSelect: (id: string) => void; 
    onEdit: (t: Transaction) => void; 
    onView: (t: Transaction) => void; 
    delay: number;
    currency: string;
    language: string;
}> = memo(({ transaction, category, isSelected, onSelect, onEdit, onView, delay, currency, language }) => {
    const isPositive = transaction.type === TransactionType.INCOME;
    const amountColor = isPositive ? 'text-emerald-500' : transaction.type === TransactionType.SAVING ? 'text-blue-500' : 'text-foreground';
    const sign = isPositive ? '+' : transaction.type === TransactionType.SAVING ? '' : '-';

    return (
        <div 
            onClick={() => {
                if (navigator.vibrate) navigator.vibrate(5);
                onView(transaction);
            }}
            style={{ animationDelay: `${delay}ms` }}
            className={`group flex items-center p-3 lg:p-6 rounded-[1.75rem] lg:rounded-[2.5rem] transition-all duration-300 cursor-pointer border border-transparent hover:bg-white/5 active:bg-white/10 active:scale-[0.98] animate-slide-up ${isSelected ? 'bg-primary/20 border-primary/40' : ''}`}
        >
            <div className="relative mr-3 lg:mr-8 flex items-center justify-center w-12 h-12 lg:w-16 lg:h-16" onClick={(e) => { 
                e.stopPropagation(); 
                if (navigator.vibrate) navigator.vibrate(10);
                onSelect(transaction.id); 
            }}>
                <div className={`absolute left-0 lg:left-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center transition-all duration-500 shadow-2xl z-20 ${isSelected ? 'scale-100 opacity-100 rotate-0' : 'scale-0 opacity-0 rotate-90'}`}>
                    <X size={16} strokeWidth={3} />
                </div>
                <div className={`${isSelected ? 'opacity-20 scale-90' : 'opacity-100'} transition-all duration-500`}>
                    <TransactionIcon type={transaction.type} />
                </div>
            </div>

            <div className="flex-grow min-w-0">
                <div className="flex items-center justify-between mb-0.5 lg:mb-2">
                    <h4 className="font-bold text-sm lg:text-lg truncate tracking-tight">{transaction.description}</h4>
                    <span className={`font-mono font-bold text-sm lg:text-xl ${amountColor} tracking-tighter`}>
                        {sign}{formatCurrency(transaction.amount, currency, language)}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 lg:gap-3 flex-wrap">
                         <span className="px-2 py-0.5 rounded-lg bg-secondary/30 font-black text-[8px] lg:text-[10px] uppercase tracking-widest text-muted-foreground/50 border border-white/5">
                            {category?.name || 'Sonstiges'}
                        </span>
                        {transaction.tags && transaction.tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 rounded-lg bg-primary/10 font-black text-[8px] lg:text-[10px] uppercase tracking-widest text-primary border border-primary/20 flex items-center gap-1">
                                <Tag size={8} /> {tag}
                            </span>
                        ))}
                    </div>
                    <div className="opacity-40 lg:opacity-0 group-hover:opacity-100 transition-all">
                         <ChevronRight size={16} />
                    </div>
                </div>
            </div>
        </div>
    );
});

const TransactionList: React.FC = () => {
    const { categories, selectedTransactions, filters, userProfile } = useAppState();
    const filteredTransactions = useFilteredTransactions();
    const dispatch = useAppDispatch();
    const [page, setPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const ITEMS_PER_PAGE = 30;

    React.useEffect(() => {
        const handleStatus = () => setIsOnline(navigator.onLine);
        window.addEventListener('online', handleStatus);
        window.addEventListener('offline', handleStatus);
        return () => {
            window.removeEventListener('online', handleStatus);
            window.removeEventListener('offline', handleStatus);
        };
    }, []);

    const paginated = useMemo(() => filteredTransactions.slice(0, page * ITEMS_PER_PAGE), [filteredTransactions, page]);

    const grouped = useMemo(() => {
        const groups: Record<string, Transaction[]> = {};
        paginated.forEach(t => {
            if (!groups[t.date]) groups[t.date] = [];
            groups[t.date].push(t);
        });
        return groups;
    }, [paginated]);

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.transactionType !== 'all') count++;
        if (filters.categoryId !== 'all') count++;
        if (filters.amountRange.min !== '' || filters.amountRange.max !== '') count++;
        if (filters.dateRange.preset !== 'this_month') count++;
        if (filters.categoryStatus !== 'all') count++;
        return count;
    }, [filters]);

    const resetFilters = useCallback(() => {
        dispatch({ 
            type: 'UPDATE_FILTERS', 
            payload: { 
                transactionType: 'all', 
                categoryId: 'all', 
                searchTerm: '',
                amountRange: { min: '', max: '' },
                dateRange: { preset: 'this_month', from: '', to: '' },
                categoryStatus: 'all'
            } 
        });
    }, [dispatch]);

    return (
        <section id="journal-section" className="glass-card rounded-[2.5rem] lg:rounded-[4rem] p-4 lg:p-12 min-h-[500px] flex flex-col relative shadow-3xl border border-white/5 mt-4 lg:mt-12 transition-all duration-500">
            {!isOnline && (
                <div className="mb-6 p-4 bg-rose-500/10 rounded-3xl border border-rose-500/20 flex items-center gap-3 animate-in slide-in-from-top-4">
                    <WifiOff size={18} className="text-rose-500" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">Eingeschränkter Modus (Offline)</p>
                </div>
            )}

            {selectedTransactions.size > 0 && (
                <div className="fixed top-[calc(env(safe-area-inset-top)+1rem)] lg:top-12 left-4 right-4 lg:left-1/2 lg:-translate-x-1/2 z-[220] bg-foreground text-background px-6 lg:px-10 py-4 lg:py-6 rounded-3xl lg:rounded-full shadow-4xl flex items-center justify-between lg:justify-start gap-6 lg:gap-10 animate-slide-up ring-1 ring-white/10 backdrop-blur-3xl">
                    <div className="flex items-center gap-3 lg:gap-5 pr-6 lg:pr-10 border-r border-white/5">
                        <span className="bg-primary text-primary-foreground h-9 w-9 lg:h-11 lg:w-11 rounded-xl lg:rounded-2xl flex items-center justify-center font-black text-sm lg:text-lg shadow-xl">{selectedTransactions.size}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Ausgewählt</span>
                    </div>
                    <div className="flex gap-4 lg:gap-6">
                        <button onClick={() => {
                            if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
                            dispatch({ type: 'OPEN_MODAL', payload: { type: 'CONFIRM_BULK_DELETE', data: { ids: Array.from(selectedTransactions) } } });
                        }} className="p-3 text-rose-500 lg:text-background lg:hover:text-rose-400 transition-all active:scale-125" aria-label="Löschen"><Trash2 size={24}/></button>
                        <button onClick={() => {
                            if (navigator.vibrate) navigator.vibrate(10);
                            dispatch({ type: 'SET_SELECTED_TRANSACTIONS', payload: new Set() });
                        }} className="p-3 lg:text-background lg:hover:text-primary transition-all active:scale-125" aria-label="Schließen"><X size={24}/></button>
                    </div>
                </div>
            )}

            <div className="flex flex-col mb-4 lg:mb-20 gap-4 lg:gap-10">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 lg:gap-10 px-2">
                    <div>
                        <h2 className="text-xl lg:text-3xl font-black uppercase tracking-tighter flex items-center gap-3 lg:gap-6">
                            <div className="p-3 lg:p-5 bg-primary/10 rounded-[1.25rem] lg:rounded-[2rem] text-primary shadow-inner border border-primary/20"><Inbox size={22} className="lg:w-8 lg:h-8" /></div>
                            Journal
                        </h2>
                    </div>
                    
                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="relative flex-grow md:w-80">
                             <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/30" />
                             <input 
                                type="text" 
                                placeholder="Suchen..." 
                                inputMode="search"
                                autoCorrect="off"
                                autoCapitalize="none"
                                value={filters.searchTerm}
                                onChange={(e) => dispatch({ type: 'UPDATE_FILTERS', payload: { searchTerm: e.target.value } })}
                                className="w-full pl-12 pr-4 py-4 lg:py-5 bg-secondary/20 border border-transparent rounded-2xl lg:rounded-[2rem] text-sm lg:text-base font-medium focus:bg-background focus:border-primary/20 transition-all outline-none"
                             />
                        </div>
                        <button 
                            onClick={() => {
                                if (navigator.vibrate) navigator.vibrate(10);
                                setShowFilters(!showFilters);
                            }} 
                            className={`p-4 lg:p-5 rounded-2xl lg:rounded-[2rem] transition-all duration-500 relative flex items-center justify-center ${showFilters || activeFiltersCount > 0 ? 'bg-primary text-primary-foreground shadow-xl' : 'bg-secondary/20 text-muted-foreground/30 hover:text-primary'}`}
                        >
                            <SlidersHorizontal size={22} />
                            {activeFiltersCount > 0 && !showFilters && (
                                <span className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-lg border-2 border-background">
                                    {activeFiltersCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {showFilters && (
                    <div className="px-5 lg:px-10 py-6 lg:py-10 bg-secondary/10 rounded-[2rem] lg:rounded-[4rem] border border-white/5 animate-in slide-in-from-top-4 space-y-6 lg:space-y-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-10">
                            <div className="space-y-3 lg:col-span-2">
                                <label className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.4em] text-muted-foreground/40 ml-2">
                                    <Clock size={10} /> Zeitraum
                                </label>
                                <div className="flex flex-wrap gap-1.5 p-1.5 bg-background/50 rounded-2xl lg:rounded-[2rem] border border-white/5">
                                    {(['this_month', 'last_month', 'this_year', 'all_time'] as DateRangePreset[]).map((p) => (
                                        <button 
                                            key={p}
                                            onClick={() => {
                                                if (navigator.vibrate) navigator.vibrate(10);
                                                dispatch({ type: 'UPDATE_FILTERS', payload: { dateRange: { ...filters.dateRange, preset: p } } });
                                            }}
                                            className={`flex-1 min-w-[70px] py-2.5 px-3 rounded-xl lg:rounded-[1.25rem] text-[8px] font-black uppercase tracking-widest transition-all active:scale-95 ${filters.dateRange.preset === p ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground/40 hover:text-foreground'}`}
                                        >
                                            {p === 'this_month' ? 'Monat' : p === 'last_month' ? 'Letzter' : p === 'this_year' ? 'Jahr' : 'Alle'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-white/5 gap-4 lg:gap-6">
                            <button 
                                onClick={resetFilters}
                                className="w-full sm:w-auto px-8 py-4 bg-rose-500/10 text-rose-500 rounded-2xl lg:rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                            >
                                Zurücksetzen
                            </button>
                            <button 
                                onClick={() => {
                                    if (navigator.vibrate) navigator.vibrate(10);
                                    setShowFilters(false);
                                }}
                                className="w-full sm:w-auto px-10 py-4 bg-primary text-primary-foreground rounded-2xl lg:rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95"
                            >
                                Anwenden
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-4 lg:space-y-8">
                {Object.keys(grouped).length > 0 ? Object.keys(grouped).sort((a,b) => b.localeCompare(a)).map((date, gIdx) => (
                    <div key={date} className="space-y-2">
                        <div className="flex items-center gap-4 lg:gap-8 py-4 lg:py-10 sticky top-[64px] lg:top-0 z-10">
                            <div className="h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent flex-grow"></div>
                            <div className="px-4 lg:px-8 py-1.5 rounded-full bg-background/80 backdrop-blur-xl border border-white/5 text-[8px] lg:text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40 shadow-sm">
                                {isToday(parseISO(date)) ? 'Heute' : isYesterday(parseISO(date)) ? 'Gestern' : formatFns(parseISO(date), 'EEEE, dd. MMMM', { locale: de })}
                            </div>
                            <div className="h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent flex-grow"></div>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {grouped[date].map((t, tIdx) => (
                                <TransactionItem 
                                    key={t.id} 
                                    transaction={t} 
                                    category={categories.find(c => c.id === t.categoryId)}
                                    isSelected={selectedTransactions.has(t.id)}
                                    onSelect={(id) => dispatch({ type: 'SET_SELECTED_TRANSACTIONS', payload: s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }})}
                                    onEdit={(transaction) => dispatch({ type: 'OPEN_MODAL', payload: { type: 'EDIT_TRANSACTION', data: { transaction } } })}
                                    onView={(transaction) => dispatch({ type: 'OPEN_MODAL', payload: { type: 'VIEW_TRANSACTION', data: { transaction } } })}
                                    delay={(gIdx * 100) + (tIdx * 30)}
                                    currency={userProfile.currency}
                                    language={userProfile.language}
                                />
                            ))}
                        </div>
                    </div>
                )) : (
                    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/20">
                        <Inbox size={64} strokeWidth={1} />
                        <p className="text-sm font-black uppercase tracking-[0.3em] mt-6">Keine Einträge gefunden</p>
                    </div>
                )}
            </div>
        </section>
    );
};

export default TransactionList;
