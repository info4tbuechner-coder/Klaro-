
import React, { useMemo, useState, useCallback, memo, useEffect } from 'react';
import { useAppState, useAppDispatch, useFilteredTransactions } from '../context/AppContext';
import { Transaction, TransactionType, Category, CategoryType } from '../types';
import { Edit, Trash2, Search, TrendingUp, TrendingDown, PiggyBank, DollarSign, X, Combine, Inbox, Tag, Filter, ArrowRightLeft, Calendar, ChevronRight } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils';
import { parseISO } from 'date-fns/parseISO';
import { isToday } from 'date-fns/isToday';
import { isYesterday } from 'date-fns/isYesterday';
import { format as formatFns } from 'date-fns/format';
import { de } from 'date-fns/locale/de';

const TransactionIcon: React.FC<{ type: TransactionType }> = ({ type }) => {
    let icon = <DollarSign className="h-5 w-5" strokeWidth={2.5} />;
    let colorClass = "bg-secondary text-muted-foreground";

    switch (type) {
        case TransactionType.INCOME:
            icon = <TrendingUp className="h-5 w-5" strokeWidth={2.5} />;
            colorClass = "bg-emerald-500/10 text-emerald-500";
            break;
        case TransactionType.EXPENSE:
            icon = <TrendingDown className="h-5 w-5" strokeWidth={2.5} />;
            colorClass = "bg-rose-500/10 text-rose-500";
            break;
        case TransactionType.SAVING:
            icon = <PiggyBank className="h-5 w-5" strokeWidth={2.5} />;
            colorClass = "bg-blue-500/10 text-blue-500";
            break;
    }

    return (
        <div className={`w-12 h-12 ${colorClass} rounded-[1.25rem] flex items-center justify-center shadow-inner border border-white/5 transition-all duration-500`}>
            {icon}
        </div>
    );
};

const TransactionItem: React.FC<{ transaction: Transaction; category?: Category; isSelected: boolean; onSelect: (id: string) => void; onEdit: (t: Transaction) => void; onView: (t: Transaction) => void; style?: React.CSSProperties }> = memo(({ transaction, category, isSelected, onSelect, onEdit, onView, style }) => {
    const isPositive = transaction.type === TransactionType.INCOME;
    const amountClass = isPositive ? 'text-emerald-500' : transaction.type === TransactionType.SAVING ? 'text-blue-500' : 'text-foreground';
    const sign = isPositive ? '+' : transaction.type === TransactionType.SAVING ? '' : '-';

    return (
        <div 
            onClick={() => onView(transaction)}
            style={style}
            className={`group relative flex items-center p-4 pr-6 rounded-[1.75rem] transition-all duration-300 cursor-pointer border border-transparent hover:border-border/60 hover:bg-card/50 hover:shadow-xl ${isSelected ? 'bg-primary/5 border-primary/20 scale-[0.99]' : 'bg-transparent'} animate-in-fade`}
        >
             <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center z-10" onClick={(e) => e.stopPropagation()}>
                 <input
                     type="checkbox"
                     checked={isSelected}
                     onChange={() => onSelect(transaction.id)}
                     className={`w-5 h-5 rounded-lg border-2 border-muted-foreground/30 text-primary focus:ring-0 focus:ring-offset-0 transition-all duration-300 cursor-pointer ${isSelected ? 'opacity-100 scale-110' : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'}`}
                 />
            </div>
            
            <div className={`ml-0 group-hover:ml-10 transition-all duration-500 mr-5 ${isSelected ? 'ml-10' : ''}`}>
                <TransactionIcon type={transaction.type} />
            </div>

            <div className="flex-grow min-w-0 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-4">
                    <span className="font-extrabold text-[15px] sm:text-base text-foreground/90 truncate pr-2 tracking-tight group-hover:text-primary transition-colors">{transaction.description}</span>
                    <span className={`font-mono font-bold text-base sm:text-lg ${amountClass} whitespace-nowrap`}>
                        {sign}{formatCurrency(transaction.amount)}
                    </span>
                </div>
                
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-lg bg-secondary/60 font-black text-[10px] uppercase tracking-widest text-muted-foreground/80`}>
                                {category?.name || 'Unkategorisiert'}
                        </span>
                        {transaction.tags && transaction.tags.length > 0 && (
                            <div className="flex items-center gap-1.5">
                                {transaction.tags.slice(0, 1).map(tag => (
                                    <span key={tag} className="text-[10px] font-bold text-muted-foreground/40 italic">
                                        #{tag}
                                    </span>
                                ))}
                                {transaction.tags.length > 1 && <span className="text-[9px] font-bold text-muted-foreground/30">+{transaction.tags.length - 1}</span>}
                            </div>
                        )}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                         <ChevronRight size={14} className="text-muted-foreground/30" />
                    </div>
                </div>
            </div>

            <button
                onClick={(e) => { e.stopPropagation(); onEdit(transaction); }}
                className="ml-4 p-2.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 transform hover:scale-110 active:scale-95"
                aria-label="Bearbeiten"
            >
                <Edit size={18} />
            </button>
        </div>
    );
});

const TransactionList: React.FC = () => {
    const { categories, selectedTransactions, filters, viewMode } = useAppState();
    const filteredTransactions = useFilteredTransactions();
    const dispatch = useAppDispatch();
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 25;

    useEffect(() => { setPage(1); }, [filters, viewMode]);

    const paginatedTransactions = useMemo(() => filteredTransactions.slice(0, page * ITEMS_PER_PAGE), [filteredTransactions, page]);
    const hasMore = paginatedTransactions.length < filteredTransactions.length;

    const toggleSelection = useCallback((id: string) => {
        dispatch({ type: 'SET_SELECTED_TRANSACTIONS', payload: (prev) => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        }});
    }, [dispatch]);

    const renderDateHeader = (dateStr: string) => {
        const date = parseISO(dateStr);
        let label = formatFns(date, 'EEEE, dd. MMMM', { locale: de });
        if (isToday(date)) label = 'Heute';
        else if (isYesterday(date)) label = 'Gestern';
        
        return (
            <div className="flex items-center gap-4 py-6 mt-4">
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent flex-grow"></div>
                <div className="flex items-center gap-2.5 text-[11px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] px-4">
                    <Calendar size={13} className="opacity-40" />
                    {label}
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent flex-grow"></div>
            </div>
        );
    };

    const groupedTransactions = useMemo(() => {
        const groups: { [key: string]: Transaction[] } = {};
        paginatedTransactions.forEach(t => {
            if (!groups[t.date]) groups[t.date] = [];
            groups[t.date].push(t);
        });
        return groups;
    }, [paginatedTransactions]);

    return (
        <section className="glass-card rounded-[2.5rem] p-8 min-h-[700px] flex flex-col relative overflow-visible">
             <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-6">
                 <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20 shadow-lg">
                            <Inbox size={22} />
                        </div>
                        Journal
                    </h2>
                     <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-widest mt-2 ml-14">
                        {filteredTransactions.length} Transaktionen erfasst
                    </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                    <div className="bg-secondary/40 p-1.5 rounded-[1.5rem] flex flex-col sm:flex-row gap-2 w-full sm:w-auto border border-white/5">
                        <div className="relative">
                            <ArrowRightLeft className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 pointer-events-none" />
                            <select
                                value={filters.transactionType}
                                onChange={(e) => dispatch({ type: 'UPDATE_FILTERS', payload: { transactionType: e.target.value as any, categoryId: 'all' } })}
                                className="w-full sm:w-44 pl-10 pr-8 py-2.5 bg-background/50 border-transparent rounded-2xl text-[13px] font-bold focus:ring-0 appearance-none cursor-pointer hover:bg-background transition-colors shadow-sm"
                            >
                                <option value="all">Alle Belege</option>
                                <option value={TransactionType.INCOME}>Einnahmen</option>
                                <option value={TransactionType.EXPENSE}>Ausgaben</option>
                                <option value={TransactionType.SAVING}>Sparrate</option>
                            </select>
                        </div>
                    </div>

                    <div className="relative w-full sm:w-auto">
                         <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30" />
                         <input 
                            type="text" 
                            placeholder="Journal durchsuchen..." 
                            value={filters.searchTerm}
                            onChange={(e) => dispatch({ type: 'UPDATE_FILTERS', payload: { searchTerm: e.target.value } })}
                            className="w-full sm:w-72 pl-11 pr-10 py-3 bg-secondary/30 border-transparent rounded-[1.5rem] text-[13px] font-medium focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30"
                         />
                    </div>
                </div>
            </div>

            {selectedTransactions.size > 0 && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] bg-foreground text-background px-6 py-4 rounded-[2rem] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] flex items-center gap-6 animate-in-fade border border-white/10">
                    <div className="flex items-center gap-3 border-r border-white/10 pr-6">
                         <div className="bg-primary text-primary-foreground h-9 w-9 rounded-full flex items-center justify-center font-black text-sm">
                            {selectedTransactions.size}
                         </div>
                         <span className="text-sm font-black uppercase tracking-wider">Aktionen</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {selectedTransactions.size >= 2 && (
                            <button onClick={() => dispatch({ type: 'OPEN_MODAL', payload: { type: 'MERGE_TRANSACTIONS', data: { transactionIds: Array.from(selectedTransactions) } } })} className="p-3 hover:bg-white/10 rounded-2xl transition-all hover:scale-110 active:scale-95" title="Zusammenführen">
                                <Combine size={20} />
                            </button>
                        )}
                        <button onClick={() => dispatch({ type: 'OPEN_MODAL', payload: { type: 'CONFIRM_BULK_DELETE', data: { ids: Array.from(selectedTransactions) } } })} className="p-3 hover:bg-rose-500 rounded-2xl transition-all text-rose-300 hover:text-white hover:scale-110 active:scale-95" title="Löschen">
                            <Trash2 size={20} />
                        </button>
                        <button onClick={() => dispatch({ type: 'SET_SELECTED_TRANSACTIONS', payload: new Set() })} className="p-3 hover:bg-white/10 rounded-full transition-colors ml-2">
                            <X size={20} />
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-grow">
                {paginatedTransactions.length > 0 ? (
                    Object.keys(groupedTransactions).sort((a,b) => b.localeCompare(a)).map((date, dIdx) => (
                        <div key={date}>
                            {renderDateHeader(date)}
                            <div className="grid grid-cols-1 gap-1">
                                {groupedTransactions[date].map((t, index) => (
                                    <TransactionItem 
                                        key={t.id} 
                                        transaction={t} 
                                        category={categories.find(c => c.id === t.categoryId)}
                                        isSelected={selectedTransactions.has(t.id)}
                                        onSelect={toggleSelection}
                                        onEdit={(transaction) => dispatch({ type: 'OPEN_MODAL', payload: { type: 'EDIT_TRANSACTION', data: { transaction } } })}
                                        onView={(transaction) => dispatch({ type: 'OPEN_MODAL', payload: { type: 'VIEW_TRANSACTION', data: { transaction } } })}
                                        style={{ animationDelay: `${(dIdx * 40) + (index * 25)}ms` }}
                                    />
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-96 text-center opacity-40">
                        <Search size={64} strokeWidth={1} className="mb-6" />
                        <h3 className="text-xl font-black uppercase tracking-widest mb-2">Kein Treffer</h3>
                        <p className="text-sm font-medium">Versuchen Sie andere Filter oder Stichworte.</p>
                    </div>
                )}
            </div>

            {hasMore && (
                <div className="mt-12 flex justify-center pb-6">
                    <button 
                        onClick={() => setPage(p => p + 1)}
                        className="px-10 py-4 bg-secondary/50 hover:bg-secondary text-foreground rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] transition-all border border-white/5 shadow-lg active:scale-95"
                    >
                        Journal erweitern
                    </button>
                </div>
            )}
        </section>
    );
};

export default TransactionList;
