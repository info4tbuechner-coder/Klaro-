
import type { SetStateAction } from 'react';

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  SAVING = 'saving',
}

export enum CategoryType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export enum GoalType {
  GOAL = 'goal',
  SINKING_FUND = 'sinking_fund',
}

export enum Frequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum LiabilityType {
  DEBT = 'debt', // Schulden, die ich habe
  LOAN = 'loan', // Forderung, die ich an andere habe
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD
  categoryId?: string;
  goalId?: string;
  tags?: string[];
  liabilityId?: string;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  budget?: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  type: GoalType;
}

export interface Liability {
  id: string;
  name: string;
  type: LiabilityType;
  initialAmount: number;
  paidAmount: number;
  interestRate: number; // Annual interest rate in percent, e.g., 5 for 5%
  creditor?: string; // For DEBT
  debtor?: string;   // For LOAN
  startDate: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
}

export interface RecurringTransaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId?: string;
  goalId?: string;
  frequency: Frequency;
  interval: number;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  nextDueDate: string; // YYYY-MM-DD
  isBill?: boolean;
}

export interface Project {
  id: string;
  name: string;
  incomeBudget?: number;
  expenseBudget?: number;
  tag: string;
}

export interface UserProfile {
    name: string;
    email: string;
    currency: string;
    language: string;
}

export interface DashboardStats {
    income: number;
    expense: number;
    saving: number;
    balance: number;
    incomeTrend: number;
    expenseTrend: number;
    savingTrend: number;
    balanceTrend: number;
}

export type Theme = 'grandeur' | 'synthwave' | 'blockchain' | 'neon' | 'forest';

export type ViewMode = 'all' | 'private' | 'business';

export type DateRangePreset = 'this_month' | 'last_month' | 'this_year' | 'all_time' | 'custom';

export interface Filters {
    dateRange: {
        preset: DateRangePreset;
        from: string;
        to: string;
    };
    searchTerm: string;
    transactionType: TransactionType | 'all';
    amountRange: {
        min: number | '';
        max: number | '';
    };
    tags: string[];
    liabilityId: string | 'all';
    goalId: string | 'all';
    categoryStatus: 'all' | 'categorized' | 'uncategorized';
}

export interface ReportsData {
    budgetOverviewData: {
        id: string;
        name: string;
        spent: number;
        budget: number;
        percentage: number;
    }[];
    expenseDataForPieChart: { name: string, value: number }[];
    projectReportData: {
        name: string;
        tag: string;
        profit: number;
        data: {
            name: 'Einnahmen' | 'Ausgaben';
            value: number;
        }[];
    }[];
    cashflowData: {
        month: string;
        Einnahmen: number;
        Ausgaben: number;
    }[];
    sankeyData: {
        nodes: { name: string }[];
        links: { source: number; target: number; value: number }[];
    };
}


export type ModalType =
  | { type: 'ADD_TRANSACTION' }
  | { type: 'EDIT_TRANSACTION'; data: Transaction }
  | { type: 'SMART_SCAN' }
  | { type: 'MONTHLY_CHECK' }
  | { type: 'MANAGE_CATEGORIES' }
  | { type: 'MANAGE_GOALS' }
  | { type: 'MANAGE_PROJECTS' }
  | { type: 'MANAGE_RECURRING' }
  | { type: 'MANAGE_LIABILITIES' }
  | { type: 'DEBT_PAYDOWN' }
  | { type: 'EXPORT_IMPORT_DATA' }
  | { type: 'TAX_EXPORT' }
  | { type: 'SUBSCRIPTION' }
  | { type: 'SYNC_DATA' }
  | { type: 'MERGE_TRANSACTIONS'; data: { transactionIds: string[] } }
  | { type: 'USER_PROFILE' }
  | { type: 'ANALYSIS' };

// FIX: Define AppState interface here so it can be used in the Action type.
export interface AppState {
    userProfile: UserProfile;
    transactions: Transaction[];
    categories: Category[];
    goals: Goal[];
    projects: Project[];
    recurringTransactions: RecurringTransaction[];
    liabilities: Liability[];
    theme: Theme;
    viewMode: ViewMode;
    filters: Filters;
    isSubscribed: boolean;
    activeModal: ModalType | null;
    selectedTransactions: Set<string>;
}

export type Action =
    | { type: 'SET_THEME'; payload: Theme }
    | { type: 'SET_VIEW_MODE'; payload: ViewMode }
    | { type: 'UPDATE_FILTERS'; payload: Partial<Filters> }
    | { type: 'SET_IS_SUBSCRIBED'; payload: boolean }
    | { type: 'UPDATE_USER_PROFILE'; payload: Partial<UserProfile> }
    | { type: 'ADD_TRANSACTION'; payload: Omit<Transaction, 'id'> }
    | { type: 'UPDATE_TRANSACTION'; payload: Transaction }
    | { type: 'DELETE_TRANSACTIONS'; payload: string[] }
    | { type: 'CATEGORIZE_TRANSACTIONS'; payload: { ids: string[]; categoryId: string } }
    | { type: 'MERGE_TRANSACTIONS'; payload: { transactionIds: string[]; newDescription: string } }
    | { type: 'ADD_CATEGORY'; payload: Omit<Category, 'id'> }
    | { type: 'UPDATE_CATEGORY'; payload: Category }
    | { type: 'DELETE_CATEGORY'; payload: string }
    | { type: 'DELETE_UNUSED_CATEGORIES' }
    | { type: 'REORDER_CATEGORIES'; payload: Category[] }
    | { type: 'ADD_GOAL'; payload: Omit<Goal, 'id' | 'currentAmount'> }
    | { type: 'UPDATE_GOAL'; payload: Goal }
    | { type: 'DELETE_GOAL'; payload: string }
    | { type: 'ADD_PROJECT'; payload: Omit<Project, 'id'> }
    | { type: 'UPDATE_PROJECT'; payload: Project }
    | { type: 'DELETE_PROJECT'; payload: string }
    | { type: 'ADD_RECURRING'; payload: Omit<RecurringTransaction, 'id' | 'nextDueDate'> }
    | { type: 'UPDATE_RECURRING'; payload: RecurringTransaction }
    | { type: 'DELETE_RECURRING'; payload: string }
    | { type: 'ADD_LIABILITY'; payload: Omit<Liability, 'id' | 'paidAmount'> }
    | { type: 'UPDATE_LIABILITY'; payload: Liability }
    | { type: 'DELETE_LIABILITY'; payload: string }
    | { type: 'IMPORT_DATA'; payload: Partial<AppState> }
    | { type: 'OPEN_MODAL'; payload: ModalType }
    | { type: 'CLOSE_MODAL' }
    // FIX: Changed React.SetStateAction to SetStateAction to align with the new import.
    | { type: 'SET_SELECTED_TRANSACTIONS'; payload: SetStateAction<Set<string>> }
    | { type: 'RESET_STATE' };
