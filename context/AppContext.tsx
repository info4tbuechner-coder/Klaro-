
import React, { createContext, useContext, useMemo, useReducer } from 'react';
import { 
    Transaction, Category, Goal, Project, RecurringTransaction, 
    Theme, ViewMode, Filters, ModalType, TransactionType, 
    CategoryType, GoalType, Frequency, DateRangePreset, 
    DashboardStats, Liability, LiabilityType, Action, AppState 
} from '../types';
import useLocalStorage from '../hooks/useLocalStorage';
import { format } from 'date-fns/format';
import { startOfMonth } from 'date-fns/startOfMonth';
import { endOfMonth } from 'date-fns/endOfMonth';
import { startOfYear } from 'date-fns/startOfYear';
import { endOfYear } from 'date-fns/endOfYear';
import { subMonths } from 'date-fns/subMonths';
import { eachMonthOfInterval } from 'date-fns/eachMonthOfInterval';
import { isSameMonth } from 'date-fns/isSameMonth';
import { parseISO } from 'date-fns/parseISO';
import { de } from 'date-fns/locale/de';

const AppStateContext = createContext<AppState | undefined>(undefined);
const AppDispatchContext = createContext<React.Dispatch<Action> | undefined>(undefined);

const STORAGE_KEY = 'klaro-v5-master';

const getDatesFromPreset = (preset: DateRangePreset): { from: string; to: string } => {
    const now = new Date();
    switch (preset) {
        case 'this_month':
            return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd') };
        case 'last_month':
            const lastMonth = subMonths(now, 1);
            return { from: format(startOfMonth(lastMonth), 'yyyy-MM-dd'), to: format(endOfMonth(lastMonth), 'yyyy-MM-dd') };
        case 'this_year':
            return { from: format(startOfYear(now), 'yyyy-MM-dd'), to: format(endOfYear(now), 'yyyy-MM-dd') };
        case 'all_time':
            return { from: '1900-01-01', to: '2100-12-31' };
        default:
            return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd') };
    }
};

const initialFilters: Filters = {
    dateRange: {
        preset: 'this_month',
        ...getDatesFromPreset('this_month')
    },
    searchTerm: '',
    transactionType: 'all',
    categoryId: 'all',
    amountRange: { min: '', max: '' },
    tags: [],
    liabilityId: 'all',
    goalId: 'all',
    categoryStatus: 'all',
};

const sampleCategories: Category[] = [
    { id: 'c1', name: 'Gehalt', type: CategoryType.INCOME },
    { id: 'c2', name: 'Wohnen', type: CategoryType.EXPENSE, budget: 1200 },
    { id: 'c3', name: 'Lebensmittel', type: CategoryType.EXPENSE, budget: 400 },
    { id: 'c4', name: 'Transport', type: CategoryType.EXPENSE, budget: 150 },
    { id: 'c5', name: 'Versicherung', type: CategoryType.EXPENSE, budget: 100 },
    { id: 'c6', name: 'Freizeit', type: CategoryType.EXPENSE, budget: 200 },
    { id: 'c7', name: 'Shopping', type: CategoryType.EXPENSE, budget: 100 },
    { id: 'c8', name: 'Gesundheit', type: CategoryType.EXPENSE, budget: 50 },
];

const initialState: AppState = {
    userProfile: { name: 'Finanzprofi', email: 'hello@klaro.ai', currency: 'EUR', language: 'de' },
    transactions: [],
    categories: sampleCategories,
    goals: [],
    projects: [],
    recurringTransactions: [],
    liabilities: [],
    theme: 'onyx',
    viewMode: 'all',
    filters: initialFilters,
    isSubscribed: false,
    activeModal: null,
    selectedTransactions: new Set(),
    debugMode: false,
    syncStatus: 'idle',
    lastSyncAt: null,
    onboardingComplete: false,
};

const deepMerge = (target: any, source: any) => {
    const output = { ...target };
    Object.keys(source).forEach(key => {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && !(source[key] instanceof Set)) {
            output[key] = deepMerge(target[key] || {}, source[key]);
        } else if (target[key] === undefined) {
            output[key] = source[key];
        }
    });
    return output;
};

const appReducer = (state: AppState, action: Action): AppState => {
    switch (action.type) {
        case 'SET_THEME': return { ...state, theme: action.payload };
        case 'SET_VIEW_MODE': return { ...state, viewMode: action.payload };
        case 'UPDATE_FILTERS': 
            const newFilters = { ...state.filters, ...action.payload };
            if (action.payload.dateRange?.preset && action.payload.dateRange.preset !== 'custom') {
                const calculated = getDatesFromPreset(action.payload.dateRange.preset);
                newFilters.dateRange = { ...newFilters.dateRange, ...calculated };
            }
            return { ...state, filters: newFilters };
        case 'OPEN_MODAL': return { ...state, activeModal: action.payload };
        case 'CLOSE_MODAL': return { ...state, activeModal: null };
        case 'UPDATE_USER_PROFILE': return { ...state, userProfile: { ...state.userProfile, ...action.payload } };
        case 'ADD_TRANSACTION': return { ...state, transactions: [{ ...action.payload, id: crypto.randomUUID() }, ...state.transactions], activeModal: null };
        case 'UPDATE_TRANSACTION': return { ...state, transactions: state.transactions.map(t => t.id === action.payload.id ? action.payload : t), activeModal: null };
        case 'DELETE_TRANSACTIONS': 
            return { 
                ...state, 
                transactions: state.transactions.filter(t => !action.payload.includes(t.id)), 
                selectedTransactions: new Set(),
                activeModal: null
            };
        case 'CATEGORIZE_TRANSACTIONS':
            return {
                ...state,
                transactions: state.transactions.map(t => 
                    action.payload.ids.includes(t.id) ? { ...t, categoryId: action.payload.categoryId } : t
                ),
                selectedTransactions: new Set()
            };
        case 'ADD_CATEGORY': return { ...state, categories: [...state.categories, { ...action.payload, id: crypto.randomUUID() }] };
        case 'UPDATE_CATEGORY': return { ...state, categories: state.categories.map(c => c.id === action.payload.id ? action.payload : c) };
        case 'DELETE_CATEGORY': return { ...state, categories: state.categories.filter(c => c.id !== action.payload) };
        case 'ADD_GOAL': return { ...state, goals: [...state.goals, { ...action.payload, id: crypto.randomUUID(), currentAmount: 0 }] };
        case 'UPDATE_GOAL': return { ...state, goals: state.goals.map(g => g.id === action.payload.id ? action.payload : g) };
        case 'DELETE_GOAL': return { ...state, goals: state.goals.filter(g => g.id !== action.payload) };
        case 'ADD_PROJECT': return { ...state, projects: [...state.projects, { ...action.payload, id: crypto.randomUUID() }] };
        case 'IMPORT_DATA': 
            return { 
                ...state, 
                ...action.payload,
                selectedTransactions: new Set()
            };
        case 'SET_SELECTED_TRANSACTIONS': 
            const nextSet = typeof action.payload === 'function' ? action.payload(state.selectedTransactions) : action.payload;
            return { ...state, selectedTransactions: nextSet };
        case 'RESET_STATE': return { ...initialState, theme: state.theme };
        case 'TOGGLE_DEBUG_MODE': return { ...state, debugMode: !state.debugMode };
        case 'SET_SYNC_STATUS': return { ...state, syncStatus: action.payload };
        case 'SYNC_COMPLETED': return { ...state, syncStatus: 'success', lastSyncAt: action.payload };
        case 'COMPLETE_ONBOARDING': return { ...state, onboardingComplete: true };
        default: return state;
    }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [storedState, setStoredState] = useLocalStorage<AppState>(STORAGE_KEY, initialState);
    const hydratedState = useMemo(() => deepMerge(storedState || {}, initialState), [storedState]);

    const [state, dispatch] = useReducer((s: AppState, a: Action) => {
        const next = appReducer(s, a);
        setStoredState(next);
        return next;
    }, hydratedState);

    return (
        <AppStateContext.Provider value={state}>
            <AppDispatchContext.Provider value={dispatch}>
                {children}
            </AppDispatchContext.Provider>
        </AppStateContext.Provider>
    );
};

export const useAppState = () => {
    const context = useContext(AppStateContext);
    if (!context) throw new Error('useAppState missing Provider');
    return context;
};

export const useAppDispatch = () => {
    const context = useContext(AppDispatchContext);
    if (!context) throw new Error('useAppDispatch missing Provider');
    return context;
};

export const useFilteredTransactions = () => {
    const { transactions, filters, viewMode } = useAppState();
    return useMemo(() => {
        const f = filters || initialFilters;
        return (transactions || []).filter(t => {
            if (viewMode === 'private' && t.tags?.includes('business')) return false;
            if (viewMode === 'business' && !t.tags?.includes('business')) return false;
            if (f.transactionType !== 'all' && t.type !== f.transactionType) return false;
            if (t.date < f.dateRange.from || t.date > f.dateRange.to) return false;
            if (f.categoryId !== 'all' && t.categoryId !== f.categoryId) return false;
            if (f.categoryStatus === 'uncategorized' && t.categoryId) return false;
            if (f.categoryStatus === 'categorized' && !t.categoryId) return false;
            if (f.searchTerm) {
                const search = f.searchTerm.toLowerCase();
                if (!t.description.toLowerCase().includes(search)) return false;
            }
            if (f.amountRange.min && t.amount < parseFloat(f.amountRange.min)) return false;
            if (f.amountRange.max && t.amount > parseFloat(f.amountRange.max)) return false;
            return true;
        });
    }, [transactions, filters, viewMode]);
};

export const useDashboardStats = (): DashboardStats => {
    const { transactions } = useAppState();
    const filtered = useFilteredTransactions();
    
    return useMemo(() => {
        const calculateStats = (list: Transaction[]) => list.reduce((acc, t) => {
            if (t.type === TransactionType.INCOME) acc.income += t.amount;
            else if (t.type === TransactionType.EXPENSE) acc.expense += t.amount;
            else if (t.type === TransactionType.SAVING) acc.saving += t.amount;
            return acc;
        }, { income: 0, expense: 0, saving: 0 });

        const currentStats = calculateStats(filtered);
        
        const now = new Date();
        const lastMonthStart = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
        const lastMonthEnd = format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
        const lastMonthTransactions = transactions.filter(t => t.date >= lastMonthStart && t.date <= lastMonthEnd);
        const lastMonthStats = calculateStats(lastMonthTransactions);

        const getTrend = (curr: number, prev: number) => prev === 0 ? 0 : ((curr - prev) / prev) * 100;

        return { 
            ...currentStats, 
            balance: currentStats.income - currentStats.expense, 
            incomeTrend: getTrend(currentStats.income, lastMonthStats.income), 
            expenseTrend: getTrend(currentStats.expense, lastMonthStats.expense), 
            savingTrend: getTrend(currentStats.saving, lastMonthStats.saving), 
            balanceTrend: getTrend(currentStats.income - currentStats.expense, lastMonthStats.income - lastMonthStats.expense) 
        };
    }, [filtered, transactions]);
};

export const useNetWorthData = () => {
    const { transactions, liabilities } = useAppState();
    return useMemo(() => {
        const months = eachMonthOfInterval({ start: subMonths(new Date(), 11), end: new Date() });
        return months.map(month => {
            const dateStr = format(endOfMonth(month), 'yyyy-MM-dd');
            const assets = transactions.filter(t => t.date <= dateStr).reduce((acc, t) => {
                if (t.type === TransactionType.INCOME) return acc + t.amount;
                if (t.type === TransactionType.EXPENSE) return acc - t.amount;
                if (t.type === TransactionType.SAVING) return acc + t.amount;
                return acc;
            }, 0);
            const debts = (liabilities || []).filter(l => l.type === LiabilityType.DEBT).reduce((acc, l) => acc + (l.initialAmount - l.paidAmount), 0);
            return { 
                name: format(month, 'MMM yy', { locale: de }),
                netWorth: assets - debts,
                assets,
                debts
            };
        });
    }, [transactions, liabilities]);
};

export const useComparativeExpenseData = () => {
    const { transactions, categories } = useAppState();
    return useMemo(() => {
        const now = new Date();
        const prev = subMonths(now, 1);
        const currentMonthData = transactions.filter(t => isSameMonth(parseISO(t.date), now) && t.type === TransactionType.EXPENSE);
        const prevMonthData = transactions.filter(t => isSameMonth(parseISO(t.date), prev) && t.type === TransactionType.EXPENSE);

        return (categories || []).filter(c => c.type === CategoryType.EXPENSE).map(cat => {
            const current = currentMonthData.filter(t => t.categoryId === cat.id).reduce((sum, t) => sum + t.amount, 0);
            const previous = prevMonthData.filter(t => t.categoryId === cat.id).reduce((sum, t) => sum + t.amount, 0);
            return {
                name: cat.name,
                current,
                previous,
                diff: previous > 0 ? ((current - previous) / previous) * 100 : 0
            };
        }).filter(item => item.current > 0 || item.previous > 0);
    }, [transactions, categories]);
};

export const useExpensePieChartData = () => {
    const filtered = useFilteredTransactions();
    const { categories } = useAppState();
    return useMemo(() => {
        const map = filtered.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => {
            const cat = (categories || []).find(c => c.id === t.categoryId)?.name || 'Sonstiges';
            acc.set(cat, (acc.get(cat) || 0) + t.amount);
            return acc;
        }, new Map<string, number>());
        return Array.from(map).map(([name, value]) => ({ name, value }));
    }, [filtered, categories]);
};

export const useCashflowData = () => {
    const { transactions } = useAppState();
    return useMemo(() => {
        const months = eachMonthOfInterval({ start: subMonths(new Date(), 5), end: new Date() });
        return months.map(m => {
            const label = format(m, 'MMM', { locale: de });
            const monthStr = format(m, 'yyyy-MM');
            const income = transactions.filter(t => t.date.startsWith(monthStr) && t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
            const expense = transactions.filter(t => t.date.startsWith(monthStr) && t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
            return { name: label, Einnahmen: income, Ausgaben: expense };
        });
    }, [transactions]);
};

export const useBudgetOverviewData = () => {
    const { categories, transactions } = useAppState();
    const now = format(new Date(), 'yyyy-MM');
    return useMemo(() => {
        return (categories || []).filter(c => c.type === CategoryType.EXPENSE && c.budget).map(c => {
            const spent = transactions.filter(t => t.categoryId === c.id && t.date.startsWith(now)).reduce((sum, t) => sum + t.amount, 0);
            return { id: c.id, name: c.name, spent, budget: c.budget!, percentage: (spent / c.budget!) * 100 };
        });
    }, [categories, transactions, now]);
};

export const useSankeyData = () => {
    const { categories, transactions } = useAppState();
    return useMemo(() => {
        const nodes = [{ name: 'Einnahmen' }, { name: 'Ausgaben' }];
        const links: any[] = [];
        const income = transactions.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
        const expenses = transactions.filter(t => t.type === TransactionType.EXPENSE);
        
        if (income > 0) {
            nodes.push({ name: 'Budget' });
            links.push({ source: 0, target: 2, value: income });
            const catMap = new Map<string, number>();
            expenses.forEach(t => {
                const cat = (categories || []).find(c => c.id === t.categoryId)?.name || 'Sonstiges';
                catMap.set(cat, (catMap.get(cat) || 0) + t.amount);
            });
            catMap.forEach((val, name) => {
                nodes.push({ name });
                links.push({ source: 2, target: nodes.length - 1, value: val });
            });
        }
        return { nodes, links };
    }, [categories, transactions]);
};

export const useProjectReportData = () => [];
