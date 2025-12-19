
import React, { useMemo, useState, useCallback, memo, useEffect } from 'react';
import { useAppState, useAppDispatch, useFilteredTransactions } from '../context/AppContext';
import { Transaction, TransactionType, Category, CategoryType } from '../types';
import { Edit, Trash2, Search, TrendingUp, TrendingDown, PiggyBank, DollarSign, X, Combine, Inbox, Tag, Filter, ArrowRightLeft, Calendar } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils';
import { parseISO } from 'date-fns/parseISO';
import { isToday } from 'date-fns/isToday';
import { isYesterday } from 'date-fns/isYesterday';
import { format as formatFns } from 'date-fns/format';
import { de } from 'date-fns/locale/de';

// Improved Icon Component with Squircle Shape
const TransactionIcon: React.FC<{ type: TransactionType }> = ({ type }) => {
    let icon = <DollarSign className="h-5 w-5" strokeWidth={2.5} />;
    let colorClass = "bg-secondary text-muted-foreground";

    switch (type) {
        case TransactionType.INCOME:
            icon = <TrendingUp className="h-5 w-5" strokeWidth={2.5} />;
            colorClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
            break;
        case TransactionType.EXPENSE:
            icon = <TrendingDown className="h-5 w-5" strokeWidth={2.5} />;
            colorClass = "bg-rose-500/10 text-rose-600 dark:text-rose-400";
            break;
        case TransactionType.SAVING:
            icon = <PiggyBank className="h-5 w-5" strokeWidth={2.5} />;
            colorClass = "bg-blue-500/10 text-blue-600 dark:text-blue-400";
            break;
    }

    return (
        <div className={`w-12 h-12 ${colorClass} rounded-2xl flex items-center justify-center shadow-sm transition-colors duration-300`}>
            {icon}
        </div>
    );
};

const TransactionItem: React.FC<{ transaction: Transaction; category?: Category; isSelected: boolean; onSelect: (id: string) => void; onEdit: (t: Transaction) => void; onView: (t: Transaction) => void; style?: React.CSSProperties }> = memo(({ transaction, category, isSelected, onSelect, onEdit, onView, style }) => {
    const isPositive = transaction.type === TransactionType.INCOME;
    const amountClass = isPositive ? 'text-emerald-600 dark:text-emerald-400' : transaction.type === TransactionType.SAVING ? 'text-blue-600 dark:text-blue-400' : 'text-foreground';
    const sign = isPositive ? '+' : transaction.type === TransactionType.SAVING ? '' : '-';

    return (
        <div 
            onClick={() => onView(transaction)}
            style={style}
            className={`group relative flex items-center p-4 rounded-3xl transition-all duration-300 cursor-pointer border border-transparent hover:border-border/60 hover:bg-card hover:shadow-lg hover:shadow-primary/5 ${isSelected ? 'bg-primary/5 border-primary/20' : 'bg-transparent'} animate-in-fade`}
        >
             <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center" onClick={(e) => e.stopPropagation()}>
                 <input
                     type="checkbox"
                     checked={isSelected}
                     onChange={() => onSelect(transaction.id)}
                     className={`w-5 h-5 rounded-md border-2 border-muted-foreground/30 text-primary focus:ring-primary focus:ring-offset-0 transition-all duration-200 cursor-pointer ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                 />
            </div>
            
            <div className={`ml-0 group-hover:ml-8 transition-all duration-300 mr-4 ${isSelected ? 'ml-8' : ''}`}>
                <TransactionIcon type={transaction.type} />
            </div>

            <div className="flex-grow min-w-0 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-foreground truncate pr-2">{transaction.description}</span>
                    <span className={`font-bold font-mono text-base ${amountClass} whitespace-nowrap`}>
                        {sign}{formatCurrency(transaction.amount)}
                    </span>
                </div>
                
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className={`px-2 py-0.5 rounded-md bg-secondary/80 font-medium text-[11px] uppercase tracking-wide`}>
                                {category?.name || 'Unkategorisiert'}
                        </span>
                        {transaction.tags && transaction.tags.length > 0 && (
                            <div className="flex items-center gap-1">
                                {transaction.tags.slice(0, 2).map(tag => (
                                    <span key={tag} className="flex items-center text-[10px] text-muted-foreground/80">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    {/* Hide date on very small screens if needed, but flex justify-between handles it well */}
                </div>
            </div>

            <button
                onClick={(e) => { e.stopPropagation(); onEdit(transaction); }}
                className="ml-4 p-2 text-muted-foreground hover:text-primary hover:bg-secondary rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 focus:opacity-100 focus:outline-none transform hover:scale-110"
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
    const ITEMS_PER_PAGE = 20;

    useEffect(() => {
        setPage(1);
    }, [filters, viewMode]);

    const paginatedTransactions = useMemo(() => {
        return filteredTransactions.slice(0, page * ITEMS_PER_PAGE);
    }, [filteredTransactions, page]);

    const hasMore = paginatedTransactions.length < filteredTransactions.length;

    const handleEdit = useCallback((transaction: Transaction) => {
        dispatch({ type: 'OPEN_MODAL', payload: { type: 'EDIT_TRANSACTION', data: { transaction } } });
    }, [dispatch]);

    const handleView = useCallback((transaction: Transaction) => {
        dispatch({ type: 'OPEN_MODAL', payload: { type: 'VIEW_TRANSACTION', data: { transaction } } });
    }, [dispatch]);

    const toggleSelection = useCallback((id: string) => {
        dispatch({ type: 'SET_SELECTED_TRANSACTIONS', payload: (prev) => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        }});
    }, [dispatch]);

    const handleBulkDelete = useCallback(() => {
        if (selectedTransactions.size === 0) return;
        dispatch({ 
            type: 'OPEN_MODAL', 
            payload: { 
                type: 'CONFIRM_BULK_DELETE', 
                data: { ids: Array.from(selectedTransactions) } 
            } 
        });
    }, [dispatch, selectedTransactions]);

    const handleBulkCategorize = useCallback((categoryId: string) => {
        dispatch({ type: 'CATEGORIZE_TRANSACTIONS', payload: { ids: Array.from(selectedTransactions), categoryId } });
    }, [dispatch, selectedTransactions]);

     const handleMerge = useCallback(() => {
        if (selectedTransactions.size < 2) return;
        dispatch({ type: 'OPEN_MODAL', payload: { type: 'MERGE_TRANSACTIONS', data: { transactionIds: Array.from(selectedTransactions) } } });
    }, [dispatch, selectedTransactions]);

    const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        const type = e.target.value;
        dispatch({ 
            type: 'UPDATE_FILTERS', 
            payload: { 
                transactionType: type as any,
                categoryId: 'all' 
            } 
        });
    }, [dispatch]);


    const groupedTransactions = useMemo(() => {
        const groups: { [key: string]: Transaction[] } = {};
        paginatedTransactions.forEach(t => {
            const date = t.date;
            if (!groups[date]) groups[date] = [];
            groups[date].push(t);
        });
        return groups;
    }, [paginatedTransactions]);

    const sortedDates = Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a));

    const incomeCategories = useMemo(() => categories.filter(c => c.type === CategoryType.INCOME), [categories]);
    const expenseCategories = useMemo(() => categories.filter(c => c.type === CategoryType.EXPENSE), [categories]);

    const showIncomeCategories = filters.transactionType === 'all' || filters.transactionType === TransactionType.INCOME;
    const showExpenseCategories = filters.transactionType === 'all' || filters.transactionType === TransactionType.EXPENSE || filters.transactionType === TransactionType.SAVING;

    const renderDateHeader = (dateStr: string) => {
        const date = parseISO(dateStr);
        let label = formatFns(date, 'EEEE, dd. MMMM', { locale: de });
        if (isToday(date)) label = 'Heute';
        else if (isYesterday(date)) label = 'Gestern';
        
        return (
            <div className="flex items-center gap-3 py-4 mt-2">
                <div className="h-px bg-border flex-grow"></div>
                <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest px-2">
                    <Calendar size={12} />
                    {label} <span className="font-normal opacity-50 ml-1">({formatFns(date, 'yyyy')})</span>
                </div>
                <div className="h-px bg-border flex-grow"></div>
            </div>
        );
    };

    return (
        <section className="glass-card rounded-3xl p-6 min-h-[600px] flex flex-col relative overflow-hidden">
             <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-6">
                 <div>
                    <h2 className="text-xl font-bold flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl text-primary">
                            <Inbox size={22} />
                        </div>
                        Transaktionen
                    </h2>
                     <p className="text-sm text-muted-foreground mt-1 ml-11">
                        {filteredTransactions.length} Einträge
                    </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    {/* Filters container */}
                    <div className="bg-secondary/50 p-1.5 rounded-2xl flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <div className="relative">
                            <ArrowRightLeft className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <select
                                value={filters.transactionType}
                                onChange={handleTypeChange}
                                className="w-full sm:w-40 pl-9 pr-8 py-2 bg-background border-transparent rounded-xl text-sm font-medium focus:border-primary focus:ring-primary appearance-none cursor-pointer hover:bg-background/80 transition-colors shadow-sm"
                            >
                                <option value="all">Alle Typen</option>
                                <option value={TransactionType.INCOME}>Einnahmen</option>
                                <option value={TransactionType.EXPENSE}>Ausgaben</option>
                                <option value={TransactionType.SAVING}>Sparen</option>
                            </select>
                        </div>

                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <select
                                value={filters.categoryId}
                                onChange={(e) => dispatch({ type: 'UPDATE_FILTERS', payload: { categoryId: e.target.value } })}
                                className="w-full sm:w-48 pl-9 pr-8 py-2 bg-background border-transparent rounded-xl text-sm font-medium focus:border-primary focus:ring-primary appearance-none cursor-pointer hover:bg-background/80 transition-colors shadow-sm"
                            >
                                <option value="all">Alle Kategorien</option>
                                {showIncomeCategories && (
                                    <optgroup label="Einnahmen">
                                        {incomeCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </optgroup>
                                )}
                                {showExpenseCategories && (
                                    <optgroup label="Ausgaben">
                                        {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </optgroup>
                                )}
                            </select>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative w-full sm:w-auto">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                         <input 
                            type="text" 
                            placeholder="Suchen..." 
                            value={filters.searchTerm}
                            onChange={(e) => dispatch({ type: 'UPDATE_FILTERS', payload: { searchTerm: e.target.value } })}
                            className="w-full sm:w-64 pl-9 pr-8 py-2.5 bg-secondary/50 border-transparent rounded-xl text-sm font-medium focus:bg-background focus:border-primary focus:ring-primary transition-all"
                         />
                         {filters.searchTerm && (
                             <button 
                                onClick={() => dispatch({ type: 'UPDATE_FILTERS', payload: { searchTerm: '' } })}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary"
                             >
                                 <X size={14} />
                             </button>
                         )}
                    </div>
                </div>
            </div>

            {selectedTransactions.size > 0 && (
                <div className="absolute top-6 left-6 right-6 z-20 bg-foreground text-background p-3 rounded-2xl shadow-xl flex items-center justify-between animate-slide-down transform border border-white/10">
                    <div className="flex items-center gap-3 px-2">
                         <div className="bg-background text-foreground h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm">
                            {selectedTransactions.size}
                         </div>
                         <span className="text-sm font-bold">ausgewählt</span>
                    </div>
                    <div className="flex items-center gap-1">
                        {selectedTransactions.size >= 2 && (
                            <button onClick={handleMerge} className="p-2 hover:bg-white/20 rounded-xl transition-colors" title="Zusammenführen">
                                <Combine size={20} />
                            </button>
                        )}
                        <div className="relative group">
                            <button className="p-2 hover:bg-white/20 rounded-xl transition-colors" title="Kategorie ändern">
                                <Tag size={20} />
                            </button>
                             <div className="absolute right-0 top-full mt-2 w-48 bg-popover text-popover-foreground rounded-xl shadow-xl border border-border hidden group-hover:block max-h-60 overflow-y-auto z-50">
                                {categories.map(c => (
                                    <button 
                                        key={c.id} 
                                        onClick={() => handleBulkCategorize(c.id)}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-secondary truncate"
                                    >
                                        {c.name}
                                    </button>
                                ))}
                             </div>
                        </div>
                        <button onClick={handleBulkDelete} className="p-2 hover:bg-rose-500 rounded-xl transition-colors text-rose-300 hover:text-white" title="Löschen">
                            <Trash2 size={20} />
                        </button>
                        <div className="w-px h-6 bg-white/20 mx-2"></div>
                        <button onClick={() => dispatch({ type: 'SET_SELECTED_TRANSACTIONS', payload: new Set() })} className="p-2 hover:bg-white/20 rounded-full">
                            <X size={20} />
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-grow space-y-2">
                {paginatedTransactions.length > 0 ? (
                    sortedDates.map((date, dateIndex) => (
                        <div key={date}>
                            {renderDateHeader(date)}
                            <div className="space-y-1">
                                {groupedTransactions[date].map((t, index) => (
                                    <TransactionItem 
                                        key={t.id} 
                                        transaction={t} 
                                        category={categories.find(c => c.id === t.categoryId)}
                                        isSelected={selectedTransactions.has(t.id)}
                                        onSelect={toggleSelection}
                                        onEdit={handleEdit}
                                        onView={handleView}
                                        style={{ animationDelay: `${(dateIndex * 50) + (index * 30)}ms` }}
                                    />
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-80 text-center opacity-60">
                        <div className="p-6 bg-secondary rounded-full mb-6">
                            <Search size={40} className="text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">Keine Transaktionen</h3>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
                            Wir haben keine Einträge für die gewählten Filter gefunden.
                        </p>
                        <button 
                            onClick={() => dispatch({ type: 'OPEN_MODAL', payload: { type: 'ADD_TRANSACTION' } })}
                            className="text-primary font-bold text-sm hover:underline"
                        >
                            Neue Transaktion erstellen
                        </button>
                    </div>
                )}
            </div>

            {hasMore && (
                <div className="mt-8 flex justify-center pb-4">
                    <button 
                        onClick={() => setPage(p => p + 1)}
                        className="px-8 py-3 bg-secondary hover:bg-secondary/80 text-foreground rounded-full text-sm font-bold transition-all shadow-sm hover:shadow-md"
                    >
                        Mehr laden
                    </button>
                </div>
            )}
        </section>
    );
};

export default TransactionList;
