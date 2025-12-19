
import React, { useMemo, useState, useCallback, memo, useEffect, useRef } from 'react';
import { useAppState, useAppDispatch, useFilteredTransactions } from '../context/AppContext';
import { Transaction, TransactionType, Category, DateRangePreset, Filters, ModalType, Action } from '../types';
import { Edit, Trash2, Search, Package, Banknote, PiggyBank, DollarSign, X, Combine, SlidersHorizontal, Inbox, FileDown, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils';
import { parseISO } from 'date-fns/parseISO';
import { isToday } from 'date-fns/isToday';
import { isYesterday } from 'date-fns/isYesterday';
import { format as formatFns } from 'date-fns/format';
import { de } from 'date-fns/locale/de';

const TransactionTypeIcon: React.FC<{ type: TransactionType }> = ({ type }) => {
    switch (type) {
        case TransactionType.INCOME: return <Banknote className="h-5 w-5 text-success" />;
        case TransactionType.EXPENSE: return <Package className="h-5 w-5 text-destructive" />;
        case TransactionType.SAVING: return <PiggyBank className="h-5 w-5 text-blue-500" />;
        default: return <DollarSign className="h-5 w-5 text-muted-foreground" />;
    }
};

const FilterBar = memo(({ onExport }: { onExport: () => void }) => {
    const { filters, transactions, goals, liabilities } = useAppState();
    const dispatch = useAppDispatch();
    const updateFilters = (newFilters: Partial<Filters>) => dispatch({ type: 'UPDATE_FILTERS', payload: newFilters });
    
    const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    const tagFilterRef = useRef<HTMLDivElement>(null);

    const allTags = useMemo(() => {
        const tags = new Set<string>();
        transactions.forEach(t => {
            t.tags?.forEach(tag => tags.add(tag));
        });
        return Array.from(tags).sort();
    }, [transactions]);

    const handleTagChange = (tag: string) => {
        const newTags = filters.tags.includes(tag)
            ? filters.tags.filter(t => t !== tag)
            : [...filters.tags, tag];
        updateFilters({ tags: newTags });
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (tagFilterRef.current && !tagFilterRef.current.contains(event.target as Node)) {
                setIsTagDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [tagFilterRef]);


    return (
        <div className="p-4 border-b border-border/10">
            <div className="flex flex-col gap-4">
                 <div className="grid flex-grow grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div className="relative lg:col-span-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Suchen nach Beschreibung, Tags..."
                            value={filters.searchTerm}
                            onChange={(e) => updateFilters({ searchTerm: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-secondary border border-transparent focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                    </div>
                     <select
                        value={filters.transactionType}
                        onChange={(e) => updateFilters({ transactionType: e.target.value as TransactionType | 'all' })}
                        className="w-full px-4 py-2 rounded-lg bg-secondary border border-transparent focus:ring-2 focus:ring-primary focus:border-primary"
                     >
                        <option value="all">Alle Typen</option>
                        <option value={TransactionType.INCOME}>Einnahmen</option>
                        <option value={TransactionType.EXPENSE}>Ausgaben</option>
                        <option value={TransactionType.SAVING}>Sparen</option>
                     </select>
                     <select
                        value={filters.dateRange.preset}
                        onChange={(e) => updateFilters({ dateRange: { ...filters.dateRange, preset: e.target.value as DateRangePreset } })}
                        className="w-full px-4 py-2 rounded-lg bg-secondary border border-transparent focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                        <option value="this_month">Dieser Monat</option>
                        <option value="last_month">Letzter Monat</option>
                        <option value="this_year">Dieses Jahr</option>
                        <option value="all_time">Gesamter Zeitraum</option>
                        <option value="custom">Benutzerdefiniert...</option>
                     </select>
                </div>
                
                {isAdvancedOpen && (
                    <div className="grid flex-grow grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in">
                         <select
                            value={filters.categoryStatus}
                            onChange={(e) => updateFilters({ categoryStatus: e.target.value as any })}
                            className="w-full px-4 py-2 rounded-lg bg-secondary border border-transparent focus:ring-2 focus:ring-primary focus:border-primary"
                        >
                            <option value="all">Alle Kategorien</option>
                            <option value="categorized">Kategorisiert</option>
                            <option value="uncategorized">Unkategorisiert</option>
                        </select>
                        <select
                            value={filters.goalId}
                            onChange={(e) => updateFilters({ goalId: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg bg-secondary border border-transparent focus:ring-2 focus:ring-primary focus:border-primary"
                            disabled={goals.length === 0}
                        >
                            <option value="all">Alle Ziele</option>
                            {goals.map(goal => (
                                <option key={goal.id} value={goal.id}>{goal.name}</option>
                            ))}
                        </select>
                        <select
                            value={filters.liabilityId}
                            onChange={(e) => updateFilters({ liabilityId: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg bg-secondary border border-transparent focus:ring-2 focus:ring-primary focus:border-primary"
                            disabled={liabilities.length === 0}
                        >
                            <option value="all">Alle Schulden/Forderungen</option>
                            {liabilities.map(l => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                        </select>
                         <div className="relative" ref={tagFilterRef}>
                            <button
                                onClick={() => setIsTagDropdownOpen(prev => !prev)}
                                className="w-full px-4 py-2 rounded-lg bg-secondary border border-transparent focus:ring-2 focus:ring-primary focus:border-primary text-left flex justify-between items-center"
                                aria-haspopup="listbox"
                                aria-expanded={isTagDropdownOpen}
                            >
                                <span className="truncate">
                                    {filters.tags.length > 0 ? `${filters.tags.length} Tag(s) ausgewählt` : 'Nach Tags filtern'}
                                </span>
                                <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                            </button>
                            {isTagDropdownOpen && (
                                <div className="absolute z-20 top-full mt-1 w-full bg-card rounded-lg shadow-lg border border-border max-h-60 overflow-y-auto animate-fade-in" role="listbox">
                                    {filters.tags.length > 0 && (
                                        <div className="px-4 py-2 border-b border-border">
                                            <button onClick={() => updateFilters({ tags: [] })} className="text-sm font-medium text-primary hover:underline">
                                                Auswahl aufheben
                                            </button>
                                        </div>
                                    )}
                                    <div className="p-2 flex flex-wrap gap-2">
                                        {allTags.length > 0 ? allTags.map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => handleTagChange(tag)}
                                                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                                                    filters.tags.includes(tag)
                                                        ? 'bg-primary text-primary-foreground font-semibold'
                                                        : 'bg-secondary hover:bg-secondary/80'
                                                }`}
                                                role="option"
                                                aria-selected={filters.tags.includes(tag)}
                                            >
                                                {tag}
                                            </button>
                                        )) : <p className="px-2 py-2 text-sm text-muted-foreground">Keine Tags vorhanden.</p>}
                                    </div>
                                </div>
                            )}
                         </div>
                        <div className="col-span-1 lg:col-span-2 flex items-center gap-2">
                            <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                                <input
                                    type="number"
                                    placeholder="Min Betrag"
                                    value={filters.amountRange.min}
                                    onChange={(e) => updateFilters({ amountRange: { ...filters.amountRange, min: e.target.value === '' ? '' : parseFloat(e.target.value) } })}
                                    className="w-full pl-7 pr-2 py-2 rounded-lg bg-secondary border border-transparent focus:ring-2 focus:ring-primary focus:border-primary"
                                    aria-label="Minimaler Betrag"
                                    step="0.01"
                                />
                            </div>
                            <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                                <input
                                    type="number"
                                    placeholder="Max Betrag"
                                    value={filters.amountRange.max}
                                    onChange={(e) => updateFilters({ amountRange: { ...filters.amountRange, max: e.target.value === '' ? '' : parseFloat(e.target.value) } })}
                                    className="w-full pl-7 pr-2 py-2 rounded-lg bg-secondary border border-transparent focus:ring-2 focus:ring-primary focus:border-primary"
                                    aria-label="Maximaler Betrag"
                                    step="0.01"
                                />
                            </div>
                        </div>
                    </div>
                )}

                 <div className="flex items-center justify-between">
                     <button
                        onClick={() => setIsAdvancedOpen(prev => !prev)}
                        className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-secondary"
                     >
                        <SlidersHorizontal size={16}/>
                        <span>{isAdvancedOpen ? 'Weniger' : 'Mehr'} Filter</span>
                        {isAdvancedOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                     </button>
                    <button
                        onClick={onExport}
                        className="px-4 py-2 rounded-lg bg-secondary border border-transparent hover:bg-border/40 text-sm font-medium flex items-center gap-2"
                        title="Aktuelle Ansicht als CSV exportieren"
                    >
                        <FileDown size={16} />
                        <span>Exportieren</span>
                    </button>
                </div>

                {filters.dateRange.preset === 'custom' && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                        <div>
                            <label htmlFor="date-from" className="block text-xs font-medium text-muted-foreground mb-1">Von</label>
                            <input
                                id="date-from"
                                type="date"
                                value={filters.dateRange.from}
                                onChange={(e) => updateFilters({ dateRange: { ...filters.dateRange, from: e.target.value } })}
                                className="w-full px-4 py-2 rounded-lg bg-secondary border border-transparent focus:ring-2 focus:ring-primary focus:border-primary"
                            />
                        </div>
                        <div>
                            <label htmlFor="date-to" className="block text-xs font-medium text-muted-foreground mb-1">Bis</label>
                            <input
                                id="date-to"
                                type="date"
                                value={filters.dateRange.to}
                                onChange={(e) => updateFilters({ dateRange: { ...filters.dateRange, to: e.target.value } })}
                                className="w-full px-4 py-2 rounded-lg bg-secondary border border-transparent focus:ring-2 focus:ring-primary focus:border-primary"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

const TransactionItem = memo(({ transaction, category, isSelected, onSelect }: { transaction: Transaction; category?: Category; isSelected: boolean; onSelect: (id: string) => void; }) => {
    const dispatch = useAppDispatch();
    const openModal = (modal: ModalType) => dispatch({ type: 'OPEN_MODAL', payload: modal });
    
    const date = parseISO(transaction.date);
    let dateLabel = formatDate(transaction.date);
    if (isToday(date)) dateLabel = 'Heute';
    if (isYesterday(date)) dateLabel = 'Gestern';

    return (
        <tr className={`group border-b border-border/10 transition-colors ${isSelected ? 'bg-secondary' : 'hover:bg-secondary/50'}`}>
            <td className="p-4 w-12 text-center">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onSelect(transaction.id)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    aria-label={`Transaktion ${transaction.description} auswählen`}
                />
            </td>
            <td className="p-4">
                <div className="flex items-center gap-4">
                    <TransactionTypeIcon type={transaction.type} />
                    <div>
                        <p className="font-semibold text-foreground">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">{category?.name || 'Unkategorisiert'}</p>
                    </div>
                </div>
            </td>
            <td className="p-4 text-right">
                <p className={`font-semibold text-lg ${transaction.type === TransactionType.INCOME ? 'text-success' : ''}`}>
                    {formatCurrency(transaction.amount)}
                </p>
            </td>
            <td className="p-4 hidden md:table-cell">
                <div className="flex flex-wrap gap-2">
                    {transaction.tags?.map(tag => (
                        <span key={tag} className="px-2 py-1 text-xs font-medium rounded-full bg-secondary text-secondary-foreground">{tag}</span>
                    ))}
                </div>
            </td>
            <td className="p-4 text-right hidden lg:table-cell">
                <span className="text-sm font-medium text-muted-foreground">{dateLabel}</span>
            </td>
            <td className="p-4 w-28 text-right">
                <div className="flex justify-end items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openModal({ type: 'EDIT_TRANSACTION', data: transaction })} className="p-2 text-muted-foreground hover:text-primary" aria-label="Bearbeiten">
                        <Edit size={16} />
                    </button>
                    <button onClick={() => { if (window.confirm("Sicher, dass Sie diese Transaktion löschen möchten?")) { dispatch({ type: 'DELETE_TRANSACTIONS', payload: [transaction.id] }) } }} className="p-2 text-muted-foreground hover:text-destructive" aria-label="Löschen">
                        <Trash2 size={16} />
                    </button>
                </div>
            </td>
        </tr>
    );
});


const BulkActionBar = memo(({ selectedIds, transactions, categories, dispatch }: { selectedIds: Set<string>; transactions: Transaction[]; categories: Category[]; dispatch: React.Dispatch<Action>; }) => {
    const selectedCount = selectedIds.size;

    const handleCategorize = (categoryId: string) => {
        if (!categoryId) return;
        dispatch({ type: 'CATEGORIZE_TRANSACTIONS', payload: { ids: Array.from(selectedIds), categoryId } });
    };

    const handleDelete = () => {
        if (window.confirm(`Möchten Sie ${selectedCount} Transaktionen wirklich löschen?`)) {
            dispatch({ type: 'DELETE_TRANSACTIONS', payload: Array.from(selectedIds) });
        }
    };

    const handleMerge = () => {
        dispatch({ type: 'OPEN_MODAL', payload: { type: 'MERGE_TRANSACTIONS', data: { transactionIds: Array.from(selectedIds) } } });
    };

    const handleClearSelection = () => {
        dispatch({ type: 'SET_SELECTED_TRANSACTIONS', payload: new Set() });
    };
    
    const canMerge = useMemo(() => {
        if (selectedIds.size < 2) return false;
        const selectedTransactions = transactions.filter(t => selectedIds.has(t.id));
        if (selectedTransactions.length < 2) return false;
        const firstType = selectedTransactions[0].type;
        return selectedTransactions.every(t => t.type === firstType);
    }, [selectedIds, transactions]);

    return (
        <div className="sticky top-16 z-10 p-3 bg-card border-b border-border shadow-md rounded-b-lg flex items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-4">
                <button onClick={handleClearSelection} className="p-2 hover:bg-secondary rounded-full" aria-label="Auswahl aufheben"><X size={18} /></button>
                <span className="text-sm font-semibold">{selectedCount} ausgewählt</span>
            </div>
            <div className="flex items-center gap-2">
                 <select onChange={(e) => handleCategorize(e.target.value)} className="bg-secondary text-sm rounded-lg px-3 py-1.5 focus:ring-primary" defaultValue="">
                    <option value="" disabled>Kategorie zuweisen...</option>
                    <optgroup label="Einnahmen">
                        {categories.filter(c => c.type === 'income').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </optgroup>
                    <optgroup label="Ausgaben">
                        {categories.filter(c => c.type === 'expense').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </optgroup>
                </select>
                <button onClick={handleMerge} disabled={!canMerge} className="p-2 flex items-center gap-1.5 text-sm font-medium hover:bg-secondary rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                    <Combine size={16}/> Zusammenführen
                </button>
                <button onClick={handleDelete} className="p-2 flex items-center gap-1.5 text-sm font-medium hover:bg-destructive/10 text-destructive rounded-lg">
                    <Trash2 size={16}/> Löschen
                </button>
            </div>
        </div>
    );
});


const TransactionList: React.FC = () => {
    const { categories, selectedTransactions } = useAppState();
    const dispatch = useAppDispatch();
    const filteredTransactions = useFilteredTransactions();
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

    const categoriesMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

    const handleSelectTransaction = useCallback((id: string) => {
        dispatch({
            type: 'SET_SELECTED_TRANSACTIONS',
            payload: (prev: Set<string>) => {
                const newSet = new Set(prev);
                if (newSet.has(id)) {
                    newSet.delete(id);
                } else {
                    newSet.add(id);
                }
                return newSet;
            },
        });
    }, [dispatch]);
    
    const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allIds = new Set(filteredTransactions.map(t => t.id));
            dispatch({ type: 'SET_SELECTED_TRANSACTIONS', payload: allIds });
        } else {
            dispatch({ type: 'SET_SELECTED_TRANSACTIONS', payload: new Set() });
        }
    }, [dispatch, filteredTransactions]);

    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            const numSelected = selectedTransactions.size;
            const numTotal = filteredTransactions.length;
            selectAllCheckboxRef.current.checked = numSelected > 0 && numSelected === numTotal;
            selectAllCheckboxRef.current.indeterminate = numSelected > 0 && numSelected < numTotal;
        }
    }, [selectedTransactions, filteredTransactions]);

    const handleExportCSV = useCallback(() => {
        if (filteredTransactions.length === 0) {
            alert("Keine Transaktionen zum Exportieren vorhanden.");
            return;
        }
        
        const header = "Datum;Beschreibung;Betrag;Typ;Kategorie;Tags\n";
        const rows = filteredTransactions.map(t => {
            const categoryName = t.categoryId ? categoriesMap.get(t.categoryId)?.name || '' : '';
            const amount = t.amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const fields = [
                formatDate(t.date),
                `"${t.description.replace(/"/g, '""')}"`,
                `"${amount}"`,
                t.type,
                `"${categoryName.replace(/"/g, '""')}"`,
                `"${(t.tags || []).join(', ')}"`
            ];
            return fields.join(';');
        }).join('\n');

        const csvContent = "\uFEFF" + header + rows;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `klaro-export-${formatFns(new Date(), 'yyyy-MM-dd')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // FIX: Revoke object URL to prevent memory leaks
        URL.revokeObjectURL(url);
    }, [filteredTransactions, categoriesMap]);
    
    const groupedTransactions = useMemo(() => {
        return filteredTransactions.reduce((acc, t) => {
            const date = formatFns(parseISO(t.date), 'yyyy-MM-dd');
            if (!acc[date]) acc[date] = [];
            acc[date].push(t);
            return acc;
        }, {} as Record<string, Transaction[]>);
    }, [filteredTransactions]);

    return (
        <section className="glass-card rounded-2xl overflow-hidden">
            <FilterBar onExport={handleExportCSV}/>
            {selectedTransactions.size > 0 && <BulkActionBar selectedIds={selectedTransactions} transactions={filteredTransactions} categories={categories} dispatch={dispatch} />}

            <div className="overflow-x-auto">
                {filteredTransactions.length > 0 ? (
                    <table className="w-full text-sm">
                        <thead className="border-b border-border/10">
                            <tr>
                                <th className="p-4 w-12 text-center">
                                    <input 
                                        type="checkbox"
                                        ref={selectAllCheckboxRef}
                                        onChange={handleSelectAll}
                                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                        aria-label="Alle Transaktionen auswählen"
                                    />
                                </th>
                                <th className="p-4 text-left font-semibold text-muted-foreground">Beschreibung</th>
                                <th className="p-4 text-right font-semibold text-muted-foreground">Betrag</th>
                                <th className="p-4 text-left font-semibold text-muted-foreground hidden md:table-cell">Tags</th>
                                <th className="p-4 text-right font-semibold text-muted-foreground hidden lg:table-cell">Datum</th>
                                <th className="p-4 w-28"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(groupedTransactions).map(([date, transactions]) => {
                                const d = parseISO(date);
                                let dateLabel = formatFns(d, 'EEEE, dd. MMMM', { locale: de });
                                if (isToday(d)) dateLabel = 'Heute';
                                if (isYesterday(d)) dateLabel = 'Gestern';
                                
                                return (
                                    <React.Fragment key={date}>
                                        <tr className="bg-secondary/30">
                                            <td colSpan={6} className="px-4 py-2 font-semibold text-sm">
                                                {dateLabel}
                                            </td>
                                        </tr>
                                        {transactions.map(t => (
                                            <TransactionItem 
                                                key={t.id} 
                                                transaction={t} 
                                                category={t.categoryId ? categoriesMap.get(t.categoryId) : undefined} 
                                                isSelected={selectedTransactions.has(t.id)}
                                                onSelect={handleSelectTransaction}
                                            />
                                        ))}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div className="text-center py-16 px-6">
                        <Inbox className="mx-auto h-12 w-12 text-muted-foreground/50" />
                        <h3 className="mt-4 text-lg font-semibold">Keine Transaktionen gefunden</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Passen Sie Ihre Filter an oder fügen Sie eine neue Transaktion hinzu.
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
};

export default TransactionList;
