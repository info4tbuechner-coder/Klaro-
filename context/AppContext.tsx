
import React, { createContext, useContext, useMemo, useReducer } from 'react';
// FIX: Import AppState from types.ts where it's now defined.
import { Transaction, Category, Goal, Project, RecurringTransaction, Theme, ViewMode, Filters, ModalType, TransactionType, CategoryType, GoalType, Frequency, DateRangePreset, ReportsData, DashboardStats, Liability, LiabilityType, Action, AppState } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';
import { format } from 'date-fns/format';
import { startOfMonth } from 'date-fns/startOfMonth';
import { endOfMonth } from 'date-fns/endOfMonth';
import { startOfYear } from 'date-fns/startOfYear';
import { endOfYear } from 'date-fns/endOfYear';
import { subMonths } from 'date-fns/subMonths';
import { subYears } from 'date-fns/subYears';
import { sub } from 'date-fns/sub';
import { parseISO } from 'date-fns/parseISO';
import { de } from 'date-fns/locale/de';
import { differenceInDays } from 'date-fns/differenceInDays';
import { endOfDay } from 'date-fns/endOfDay';

const AppStateContext = createContext<AppState | undefined>(undefined);
const AppDispatchContext = createContext<React.Dispatch<Action> | undefined>(undefined);

const initialFilters: Filters = {
    dateRange: {
        preset: 'this_month',
        from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    },
    searchTerm: '',
    transactionType: 'all',
    amountRange: {
        min: '',
        max: '',
    },
    tags: [],
    liabilityId: 'all',
    goalId: 'all',
    categoryStatus: 'all',
};

const sampleData = {
    transactions: [
        { id: '1', type: TransactionType.INCOME, amount: 3200, description: 'Gehalt', date: format(new Date(), 'yyyy-MM-dd'), categoryId: 'c1' },
        { id: '2', type: TransactionType.EXPENSE, amount: 850, description: 'Miete', date: format(new Date(), 'yyyy-MM-01'), categoryId: 'c2', tags: ['privat'] },
        { id: '3', type: TransactionType.EXPENSE, amount: 75.50, description: 'Wocheneinkauf', date: format(subMonths(new Date(), 1), 'yyyy-MM-20'), categoryId: 'c3', tags: ['privat'] },
        { id: '4', type: TransactionType.SAVING, amount: 200, description: 'ETF Sparplan', date: format(new Date(), 'yyyy-MM-15'), categoryId: 'c4', goalId: 'g1' },
        { id: '5', type: TransactionType.INCOME, amount: 500, description: 'Freiberufliches Projekt', date: format(new Date(), 'yyyy-MM-10'), categoryId: 'c5', tags: ['business', 'projekt-alpha'] },
        { id: '6', type: TransactionType.EXPENSE, amount: 49.99, description: 'Software-Abo', date: format(new Date(), 'yyyy-MM-05'), categoryId: 'c6', tags: ['business', 'projekt-alpha'] },
        { id: '7', type: TransactionType.EXPENSE, amount: 120.00, description: 'Versicherung', date: format(new Date(), 'yyyy-MM-02'), categoryId: 'c2', tags: ['privat'] },
    ],
    categories: [
        { id: 'c1', name: 'Gehalt', type: CategoryType.INCOME },
        { id: 'c2', name: 'Wohnen', type: CategoryType.EXPENSE, budget: 1000 },
        { id: 'c3', name: 'Lebensmittel', type: CategoryType.EXPENSE, budget: 400 },
        { id: 'c4', name: 'Investments', type: CategoryType.EXPENSE },
        { id: 'c5', name: 'Freiberuflich', type: CategoryType.INCOME },
        { id: 'c6', name: 'Software', type: CategoryType.EXPENSE, budget: 100 },
    ],
    goals: [
        { id: 'g1', name: 'Neues Auto', targetAmount: 20000, currentAmount: 0, type: GoalType.GOAL },
        { id: 'g2', name: 'Urlaub', targetAmount: 1500, currentAmount: 0, type: GoalType.SINKING_FUND },
    ],
    liabilities: [
        { id: 'l1', name: 'Studienkredit', type: LiabilityType.DEBT, initialAmount: 15000, paidAmount: 2500, interestRate: 3.5, creditor: 'KfW Bank', startDate: '2022-10-01' },
        { id: 'l2', name: 'Darlehen an Max', type: LiabilityType.LOAN, initialAmount: 1000, paidAmount: 100, interestRate: 0, debtor: 'Max Mustermann', startDate: '2023-05-15' }
    ],
    projects: [
        { id: 'p1', name: 'Projekt Alpha', tag: 'projekt-alpha' },
    ],
    recurringTransactions: [
        { id: 'r1', description: 'Miete', amount: 850, type: TransactionType.EXPENSE, categoryId: 'c2', frequency: Frequency.MONTHLY, interval: 1, startDate: '2023-01-01', nextDueDate: format(new Date(), 'yyyy-MM-01'), isBill: true },
    ]
};

const initialState: AppState = {
    userProfile: {
        name: 'Benutzer',
        email: '',
        currency: 'EUR',
        language: 'de'
    },
    transactions: sampleData.transactions,
    categories: sampleData.categories,
    goals: sampleData.goals,
    projects: sampleData.projects,
    recurringTransactions: sampleData.recurringTransactions,
    liabilities: sampleData.liabilities,
    theme: 'grandeur',
    viewMode: 'all',
    filters: initialFilters,
    isSubscribed: false,
    activeModal: null,
    selectedTransactions: new Set(),
};

const recalculateGoalAmounts = (transactions: Transaction[], goals: Goal[]): Goal[] => {
    const goalAmounts = new Map<string, number>();

    transactions.forEach(t => {
        if (t.type === TransactionType.SAVING && t.goalId) {
            goalAmounts.set(t.goalId, (goalAmounts.get(t.goalId) || 0) + t.amount);
        }
    });

    return goals.map(g => ({
        ...g,
        currentAmount: goalAmounts.get(g.id) || 0,
    }));
};

const recalculateLiabilityAmounts = (transactions: Transaction[], liabilities: Liability[]): Liability[] => {
    const liabilityAmounts = new Map<string, number>();

    transactions.forEach(t => {
        if (t.liabilityId) {
            const liability = liabilities.find(l => l.id === t.liabilityId);
            if (liability) {
                if ((liability.type === LiabilityType.DEBT && t.type === TransactionType.EXPENSE) ||
                    (liability.type === LiabilityType.LOAN && t.type === TransactionType.INCOME)) {
                    liabilityAmounts.set(t.liabilityId, (liabilityAmounts.get(t.liabilityId) || 0) + t.amount);
                }
            }
        }
    });

    return liabilities.map(l => ({
        ...l,
        paidAmount: liabilityAmounts.get(l.id) || 0,
    }));
};

const appReducer = (state: AppState, action: Action): AppState => {
    switch (action.type) {
        case 'SET_THEME':
            return { ...state, theme: action.payload };
        case 'SET_VIEW_MODE':
            return { ...state, viewMode: action.payload };
        case 'UPDATE_FILTERS':
            return { ...state, filters: { ...state.filters, ...action.payload } };
        case 'SET_IS_SUBSCRIBED':
            return { ...state, isSubscribed: action.payload };
        case 'UPDATE_USER_PROFILE':
            return { ...state, userProfile: { ...state.userProfile, ...action.payload } };
        case 'OPEN_MODAL':
            return { ...state, activeModal: action.payload };
        case 'CLOSE_MODAL':
            return { ...state, activeModal: null };
        case 'SET_SELECTED_TRANSACTIONS': {
            const newSelected = typeof action.payload === 'function'
                ? action.payload(state.selectedTransactions)
                : action.payload;
            return { ...state, selectedTransactions: newSelected };
        }
        case 'ADD_TRANSACTION': {
            const newTransaction = { ...action.payload, id: new Date().toISOString() + Math.random() };
            const newTransactions = [...state.transactions, newTransaction];
            const newGoals = recalculateGoalAmounts(newTransactions, state.goals);
            const newLiabilities = recalculateLiabilityAmounts(newTransactions, state.liabilities);
            return { ...state, transactions: newTransactions, goals: newGoals, liabilities: newLiabilities, activeModal: null };
        }
        case 'UPDATE_TRANSACTION': {
            const newTransactions = state.transactions.map(t => t.id === action.payload.id ? action.payload : t);
            const newGoals = recalculateGoalAmounts(newTransactions, state.goals);
            const newLiabilities = recalculateLiabilityAmounts(newTransactions, state.liabilities);
            return { ...state, transactions: newTransactions, goals: newGoals, liabilities: newLiabilities, activeModal: null };
        }
        case 'DELETE_TRANSACTIONS': {
            const newTransactions = state.transactions.filter(t => !action.payload.includes(t.id));
            const newGoals = recalculateGoalAmounts(newTransactions, state.goals);
            const newLiabilities = recalculateLiabilityAmounts(newTransactions, state.liabilities);
            return { ...state, transactions: newTransactions, goals: newGoals, liabilities: newLiabilities, selectedTransactions: new Set() };
        }
        case 'MERGE_TRANSACTIONS': {
            const { transactionIds, newDescription } = action.payload;
            const toMerge = state.transactions.filter(t => transactionIds.includes(t.id));
            if (toMerge.length < 2) return state;

            const mergedTransaction: Transaction = {
                id: new Date().toISOString() + Math.random(),
                description: newDescription,
                amount: toMerge.reduce((sum, t) => sum + t.amount, 0),
                date: toMerge.reduce((latest, t) => (t.date > latest ? t.date : latest), toMerge[0].date),
                type: toMerge[0].type,
                categoryId: toMerge[0].categoryId,
                goalId: toMerge[0].goalId,
                liabilityId: toMerge[0].liabilityId,
                tags: Array.from(new Set(toMerge.flatMap(t => t.tags || []))),
            };

            const remainingTransactions = state.transactions.filter(t => !transactionIds.includes(t.id));
            const newTransactions = [...remainingTransactions, mergedTransaction];
            const newGoals = recalculateGoalAmounts(newTransactions, state.goals);
            const newLiabilities = recalculateLiabilityAmounts(newTransactions, state.liabilities);
            return { ...state, transactions: newTransactions, goals: newGoals, liabilities: newLiabilities, activeModal: null, selectedTransactions: new Set() };
        }
        case 'CATEGORIZE_TRANSACTIONS': {
            const newTransactions = state.transactions.map(t => action.payload.ids.includes(t.id) ? { ...t, categoryId: action.payload.categoryId } : t);
            return { ...state, transactions: newTransactions, selectedTransactions: new Set() };
        }
        case 'ADD_CATEGORY': {
            const newCategory = { ...action.payload, id: new Date().toISOString() };
            return { ...state, categories: [...state.categories, newCategory] };
        }
        case 'UPDATE_CATEGORY': {
            return { ...state, categories: state.categories.map(c => c.id === action.payload.id ? action.payload : c) };
        }
        case 'DELETE_CATEGORY': {
            return {
                ...state,
                categories: state.categories.filter(c => c.id !== action.payload),
                transactions: state.transactions.map(t => t.categoryId === action.payload ? { ...t, categoryId: undefined } : t),
                recurringTransactions: state.recurringTransactions.map(rt => rt.categoryId === action.payload ? { ...rt, categoryId: undefined } : rt)
            };
        }
         case 'DELETE_UNUSED_CATEGORIES': {
            const usedCategoryIds = new Set(state.transactions.map(t => t.categoryId));
            return { ...state, categories: state.categories.filter(c => usedCategoryIds.has(c.id)) };
        }
        case 'REORDER_CATEGORIES':
             return { ...state, categories: action.payload };
        case 'ADD_GOAL': {
            const newGoal: Goal = { ...action.payload, id: new Date().toISOString(), currentAmount: 0 };
            return { ...state, goals: [...state.goals, newGoal] };
        }
        case 'UPDATE_GOAL': {
            const { currentAmount, ...goalData } = action.payload;
            const newGoals = state.goals.map(g => g.id === action.payload.id ? { ...g, ...goalData } : g);
            return { ...state, goals: newGoals };
        }
        case 'DELETE_GOAL': {
            return {
                ...state,
                goals: state.goals.filter(g => g.id !== action.payload),
                transactions: state.transactions.map(t => t.goalId === action.payload ? { ...t, goalId: undefined } : t),
                recurringTransactions: state.recurringTransactions.map(rt => rt.goalId === action.payload ? { ...rt, goalId: undefined } : rt)
            };
        }
        case 'ADD_PROJECT': {
            const newProject: Project = { ...action.payload, id: new Date().toISOString() };
            return { ...state, projects: [...state.projects, newProject] };
        }
        case 'UPDATE_PROJECT': {
            return { ...state, projects: state.projects.map(p => p.id === action.payload.id ? action.payload : p) };
        }
        case 'DELETE_PROJECT': {
            const projectToDelete = state.projects.find(p => p.id === action.payload);
            if (!projectToDelete) return state;
            // Optional: remove tag from transactions. For now, we leave them as generic tags.
            return { ...state, projects: state.projects.filter(p => p.id !== action.payload) };
        }
        case 'ADD_RECURRING': {
            const { startDate } = action.payload;
            const newRecurring: RecurringTransaction = { ...action.payload, id: new Date().toISOString(), nextDueDate: startDate };
            return { ...state, recurringTransactions: [...state.recurringTransactions, newRecurring] };
        }
        case 'UPDATE_RECURRING': {
            const originalTx = state.recurringTransactions.find(rt => rt.id === action.payload.id);
            const nextDueDate = originalTx ? originalTx.nextDueDate : action.payload.startDate;
            return { ...state, recurringTransactions: state.recurringTransactions.map(rt => rt.id === action.payload.id ? {...action.payload, nextDueDate } : rt) };
        }
        case 'DELETE_RECURRING': {
            return { ...state, recurringTransactions: state.recurringTransactions.filter(rt => rt.id !== action.payload) };
        }
        case 'ADD_LIABILITY': {
            const newLiability: Liability = { ...action.payload, id: new Date().toISOString(), paidAmount: 0 };
            return { ...state, liabilities: [...state.liabilities, newLiability] };
        }
        case 'UPDATE_LIABILITY': {
            // Protect the calculated `paidAmount` from being accidentally overwritten by form data.
            // This pattern ensures data integrity and improves overall app stability.
            const { paidAmount, ...liabilityData } = action.payload;
            const newLiabilities = state.liabilities.map(l =>
                l.id === action.payload.id ? { ...l, ...liabilityData } : l
            );
            return { ...state, liabilities: newLiabilities };
        }
        case 'DELETE_LIABILITY': {
             return {
                ...state,
                liabilities: state.liabilities.filter(l => l.id !== action.payload),
                transactions: state.transactions.map(t => t.liabilityId === action.payload ? { ...t, liabilityId: undefined } : t)
            };
        }
        case 'IMPORT_DATA': {
            const importedState = action.payload;
            const transactions = importedState.transactions || state.transactions;
            // Recalculate derived state after import
            const goals = recalculateGoalAmounts(transactions, importedState.goals || state.goals);
            const liabilities = recalculateLiabilityAmounts(transactions, importedState.liabilities || state.liabilities);

            return { 
                ...state, 
                ...importedState,
                // Ensure userProfile exists if importing old data
                userProfile: importedState.userProfile || state.userProfile,
                goals,
                liabilities,
                activeModal: null
            };
        }
        case 'RESET_STATE': {
            // Reset to initial sample data but preserve the user's theme choice.
            return {
                ...initialState,
                theme: state.theme,
            };
        }
        default:
            return state;
    }
};


export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [storedState, setStoredState] = useLocalStorage<AppState>('klaro-state', initialState);

    // Recalculate derived state on initial load to ensure consistency
    const initialStateWithRecalculations = useMemo(() => {
        const goals = recalculateGoalAmounts(storedState.transactions, storedState.goals);
        const liabilities = recalculateLiabilityAmounts(storedState.transactions, storedState.liabilities);
        // Fallback for userProfile if loading from older local storage
        const userProfile = storedState.userProfile || initialState.userProfile;
        
        return { ...storedState, goals, liabilities, userProfile };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps


    const reducerWithSideEffects = (state: AppState, action: Action) => {
        const newState = appReducer(state, action);
        // Do not persist state for actions that don't change core data
        // to avoid unnecessary writes to localStorage.
        const nonPersistentActions = new Set(['SET_SELECTED_TRANSACTIONS', 'OPEN_MODAL', 'CLOSE_MODAL', 'UPDATE_FILTERS']);
        if (!nonPersistentActions.has(action.type)) {
            const stateToStore = {
                ...newState,
                activeModal: null,
                selectedTransactions: new Set<string>(),
            };
            setStoredState(stateToStore);
        }
        return newState;
    };
    
    const [state, dispatch] = useReducer(reducerWithSideEffects, initialStateWithRecalculations);
    
    return (
        <AppStateContext.Provider value={state}>
            <AppDispatchContext.Provider value={dispatch}>
                {children}
            </AppDispatchContext.Provider>
        </AppStateContext.Provider>
    );
};

export const useAppState = (): AppState => {
    const context = useContext(AppStateContext);
    if (context === undefined) {
        throw new Error('useAppState must be used within a AppProvider');
    }
    return context;
};

export const useAppDispatch = (): React.Dispatch<Action> => {
    const context = useContext(AppDispatchContext);
    if (context === undefined) {
        throw new Error('useAppDispatch must be used within a AppProvider');
    }
    return context;
};

export const useFilteredTransactions = (): Transaction[] => {
    const { transactions, filters, viewMode } = useAppState();

    const getDateRange = (preset: DateRangePreset) => {
        const now = new Date();
        switch (preset) {
            case 'this_month':
                return { from: startOfMonth(now), to: endOfMonth(now) };
            case 'last_month':
                const lastMonth = subMonths(now, 1);
                return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
            case 'this_year':
                return { from: startOfYear(now), to: endOfYear(now) };
            default:
                return { from: new Date('1970-01-01'), to: new Date('2999-12-31')};
        }
    };

    return useMemo(() => {
        let fromDate: Date, toDate: Date;
        if (filters.dateRange.preset === 'custom') {
            fromDate = parseISO(filters.dateRange.from);
            toDate = endOfDay(parseISO(filters.dateRange.to));
        } else {
            const range = getDateRange(filters.dateRange.preset);
            fromDate = range.from;
            toDate = range.to;
        }
        
        const fromTimestamp = fromDate.getTime();
        const toTimestamp = toDate.getTime();
        const searchTerm = filters.searchTerm.toLowerCase();
        
        return transactions.filter(t => {
            const transactionDate = parseISO(t.date).getTime();
            if(transactionDate < fromTimestamp || transactionDate > toTimestamp) return false;

            if (filters.transactionType !== 'all' && t.type !== filters.transactionType) return false;

            const { min, max } = filters.amountRange;
            if (min !== '' && t.amount < min) return false;
            if (max !== '' && t.amount > max) return false;

            if (searchTerm && !t.description.toLowerCase().includes(searchTerm) && !t.tags?.some(tag => tag.toLowerCase().includes(searchTerm))) return false;

            if (filters.tags.length > 0 && !filters.tags.every(tag => t.tags?.includes(tag))) return false;
            
            if (viewMode !== 'all') {
                if(viewMode === 'private' && t.tags?.includes('business')) return false;
                if(viewMode === 'business' && !t.tags?.includes('business')) return false;
            }

            if(filters.categoryStatus !== 'all') {
                if(filters.categoryStatus === 'categorized' && !t.categoryId) return false;
                if(filters.categoryStatus === 'uncategorized' && t.categoryId) return false;
            }

            if(filters.goalId !== 'all' && t.goalId !== filters.goalId) return false;

            if(filters.liabilityId !== 'all' && t.liabilityId !== filters.liabilityId) return false;

            return true;
        // Optimization: Use string comparison for ISO dates (YYYY-MM-DD) instead of parsing to Date objects.
        // This is significantly faster for large datasets.
        }).sort((a, b) => b.date.localeCompare(a.date));
    }, [transactions, filters, viewMode]);
};

export const useDashboardStats = (): DashboardStats => {
    const filteredTransactions = useFilteredTransactions();
    const { transactions, filters } = useAppState();

    return useMemo(() => {
        const { preset, from, to } = filters.dateRange;
        let currentPeriodStart: Date, currentPeriodEnd: Date;
        let previousPeriodStart: Date, previousPeriodEnd: Date;

        const now = new Date();

        // Determine current period
        switch (preset) {
            case 'this_month':
                currentPeriodStart = startOfMonth(now);
                currentPeriodEnd = endOfMonth(now);
                previousPeriodStart = startOfMonth(subMonths(now, 1));
                previousPeriodEnd = endOfMonth(subMonths(now, 1));
                break;
            case 'last_month':
                const lastMonth = subMonths(now, 1);
                currentPeriodStart = startOfMonth(lastMonth);
                currentPeriodEnd = endOfMonth(lastMonth);
                previousPeriodStart = startOfMonth(subMonths(now, 2));
                previousPeriodEnd = endOfMonth(subMonths(now, 2));
                break;
            case 'this_year':
                currentPeriodStart = startOfYear(now);
                currentPeriodEnd = endOfYear(now);
                previousPeriodStart = startOfYear(subYears(now, 1));
                previousPeriodEnd = endOfYear(subYears(now, 1));
                break;
            case 'all_time':
                 // No trend for all_time
                currentPeriodStart = new Date(0);
                currentPeriodEnd = new Date();
                previousPeriodStart = new Date(0);
                previousPeriodEnd = new Date(0);
                break;
            case 'custom':
            default:
                currentPeriodStart = parseISO(from);
                currentPeriodEnd = parseISO(to);
                const duration = differenceInDays(currentPeriodEnd, currentPeriodStart);
                previousPeriodEnd = sub(currentPeriodStart, { days: 1 });
                previousPeriodStart = sub(previousPeriodEnd, { days: duration });
                break;
        }

        const currentPeriodStats = { income: 0, expense: 0, saving: 0 };
        const previousPeriodStats = { income: 0, expense: 0, saving: 0 };

        // Current period stats are already calculated by useFilteredTransactions
        filteredTransactions.forEach(t => {
            if (t.type === TransactionType.INCOME) currentPeriodStats.income += t.amount;
            else if (t.type === TransactionType.EXPENSE) currentPeriodStats.expense += t.amount;
            else if (t.type === TransactionType.SAVING) currentPeriodStats.saving += t.amount;
        });

        // Calculate previous period stats by filtering all transactions
        if (preset !== 'all_time') {
            transactions.forEach(t => {
                const tDate = parseISO(t.date);
                if (tDate >= previousPeriodStart && tDate <= previousPeriodEnd) {
                    if (t.type === TransactionType.INCOME) previousPeriodStats.income += t.amount;
                    else if (t.type === TransactionType.EXPENSE) previousPeriodStats.expense += t.amount;
                    else if (t.type === TransactionType.SAVING) previousPeriodStats.saving += t.amount;
                }
            });
        }
        
        const calcTrend = (current: number, previous: number) => {
            if (preset === 'all_time') return 0;
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / Math.abs(previous)) * 100;
        };

        const currentBalance = currentPeriodStats.income - currentPeriodStats.expense;
        const previousBalance = previousPeriodStats.income - previousPeriodStats.expense;

        return {
            income: currentPeriodStats.income,
            expense: currentPeriodStats.expense,
            saving: currentPeriodStats.saving,
            balance: currentBalance,
            incomeTrend: calcTrend(currentPeriodStats.income, previousPeriodStats.income),
            expenseTrend: calcTrend(currentPeriodStats.expense, previousPeriodStats.expense),
            savingTrend: calcTrend(currentPeriodStats.saving, previousPeriodStats.saving),
            balanceTrend: calcTrend(currentBalance, previousBalance),
        }
    }, [filteredTransactions, transactions, filters.dateRange]);
};

export const useBudgetOverviewData = (): ReportsData['budgetOverviewData'] => {
    const filteredTransactions = useFilteredTransactions();
    const { categories } = useAppState();
    return useMemo(() => {
        return categories
            .filter(c => c.type === CategoryType.EXPENSE && c.budget && c.budget > 0)
            .map(c => {
                const spent = filteredTransactions
                    .filter(t => t.categoryId === c.id && t.type === TransactionType.EXPENSE)
                    .reduce((sum, t) => sum + t.amount, 0);
                return { id: c.id, name: c.name, spent, budget: c.budget!, percentage: (spent / c.budget!) * 100 };
            });
    }, [filteredTransactions, categories]);
};

export const useExpensePieChartData = (): ReportsData['expenseDataForPieChart'] => {
    const filteredTransactions = useFilteredTransactions();
    const { categories } = useAppState();
    return useMemo(() => {
        const categoriesMap = new Map(categories.map(c => [c.id, c]));
        return Array.from(
            filteredTransactions
                .filter(t => t.type === TransactionType.EXPENSE && t.categoryId)
                .reduce((acc, t) => {
                    const categoryName = categoriesMap.get(t.categoryId!)?.name || "Unkategorisiert";
                    acc.set(categoryName, (acc.get(categoryName) || 0) + t.amount);
                    return acc;
                }, new Map<string, number>())
        ).map(([name, value]) => ({ name, value }));
    }, [filteredTransactions, categories]);
};

export const useProjectReportData = (): ReportsData['projectReportData'] => {
    const filteredTransactions = useFilteredTransactions();
    const { projects } = useAppState();
    return useMemo(() => {
        return projects.map(p => {
            const projectTransactions = filteredTransactions.filter(t => t.tags?.includes(p.tag));
            const income = projectTransactions.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
            const expense = projectTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
            return {
                name: p.name,
                tag: p.tag,
                profit: income - expense,
                data: [{ name: 'Einnahmen' as const, value: income }, { name: 'Ausgaben' as const, value: expense }]
            };
        });
    }, [filteredTransactions, projects]);
};

export const useCashflowData = (): ReportsData['cashflowData'] => {
    const { transactions } = useAppState();
    return useMemo(() => {
        const cashflowData: { month: string, Einnahmen: number, Ausgaben: number }[] = [];
        const monthMap = new Map<string, { Einnahmen: number, Ausgaben: number }>();
        const last12Months = Array.from({ length: 12 }).map((_, i) => subMonths(new Date(), i));
        
        last12Months.forEach(date => {
            const monthKey = format(date, 'MMM yy', { locale: de });
            monthMap.set(monthKey, { Einnahmen: 0, Ausgaben: 0 });
        });

        transactions.forEach(t => {
            if (parseISO(t.date) > subMonths(new Date(), 12)) {
                const monthKey = format(parseISO(t.date), 'MMM yy', { locale: de });
                if (monthMap.has(monthKey)) {
                    const current = monthMap.get(monthKey)!;
                    if (t.type === TransactionType.INCOME) current.Einnahmen += t.amount;
                    if (t.type === TransactionType.EXPENSE) current.Ausgaben += t.amount;
                }
            }
        });
        
        monthMap.forEach((value, key) => cashflowData.push({ month: key, ...value }));
        cashflowData.reverse();
        return cashflowData;
    }, [transactions]);
};

export const useSankeyData = (): ReportsData['sankeyData'] => {
    const filteredTransactions = useFilteredTransactions();
    const { categories } = useAppState();
    return useMemo(() => {
        const categoriesMap = new Map(categories.map(c => [c.id, c]));
        const sankeyNodes: { name: string }[] = [];
        const sankeyLinks: { source: number; target: number; value: number }[] = [];
        const nodeMap = new Map<string, number>();

        const addNode = (name: string) => {
            if (!nodeMap.has(name)) {
                nodeMap.set(name, sankeyNodes.length);
                sankeyNodes.push({ name });
            }
            return nodeMap.get(name)!;
        };

        const totalIncome = filteredTransactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
        const incomeNode = addNode("Einkommen");

        filteredTransactions.filter(t => t.type === TransactionType.EXPENSE && t.categoryId).forEach(t => {
            const categoryName = categoriesMap.get(t.categoryId!)?.name || "Sonstiges";
            const targetNode = addNode(categoryName);
            const link = sankeyLinks.find(l => l.source === incomeNode && l.target === targetNode);
            if (link) {
                link.value += t.amount;
            } else {
                sankeyLinks.push({ source: incomeNode, target: targetNode, value: t.amount });
            }
        });
        
        const totalExpense = sankeyLinks.reduce((sum, l) => sum + l.value, 0);
        const saving = totalIncome - totalExpense;
        if(saving > 0) {
            const savingNode = addNode("Ersparnis");
            sankeyLinks.push({ source: incomeNode, target: savingNode, value: saving });
        }
        return { nodes: sankeyNodes, links: sankeyLinks };
    }, [filteredTransactions, categories]);
};
