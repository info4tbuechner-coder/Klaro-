
import React from 'react';
import { useBudgetOverviewData, useAppState } from '../context/AppContext';
import { Activity, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../utils';

export const BudgetOverview: React.FC = () => {
    const budgetOverviewData = useBudgetOverviewData();
    const { userProfile } = useAppState();

    if (budgetOverviewData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-28 text-muted-foreground/10">
                <Activity size={72} strokeWidth={1} className="mb-6 opacity-30 animate-pulse" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Keine Budgets aktiv</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-h-[450px] overflow-y-auto pr-4 no-scrollbar scroll-smooth">
            {budgetOverviewData.map((item, index) => {
                const percentage = Math.min(item.percentage, 100);
                const isCritical = item.percentage > 85;
                const isOver = item.percentage > 100;

                return (
                    <div key={item.id} className="animate-in group relative" style={{animationDelay: `${index * 100}ms`}}>
                        <div className="flex justify-between items-end mb-3">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-3">
                                    <h4 className="font-bold text-base text-foreground/80 tracking-tight group-hover:text-primary transition-colors">{item.name}</h4>
                                    {isOver && (
                                        <div className="animate-pulse bg-rose-500/20 text-rose-500 p-1 rounded-full">
                                            <AlertCircle size={12} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className={`text-[8px] font-black uppercase tracking-[0.2em] ${isOver ? 'text-rose-500' : isCritical ? 'text-orange-400' : 'text-muted-foreground/30'}`}>
                                        {isOver ? 'Überschritten' : isCritical ? 'Kritisch' : 'OK'}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <span className={`text-lg font-mono font-bold tracking-tighter ${isOver ? 'text-rose-500' : 'text-foreground/90'}`}>
                                    {formatCurrency(item.spent, userProfile.currency, userProfile.language)}
                                </span>
                                <span className="text-[9px] font-black text-muted-foreground/20 uppercase tracking-widest">
                                    von {formatCurrency(item.budget, userProfile.currency, userProfile.language)}
                                </span>
                            </div>
                        </div>

                        <div className="h-4 w-full bg-secondary/30 rounded-full p-0.5 border border-white/5 relative shadow-inner overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ease-out relative shadow-[0_0_15px_-5px_currentColor] ${isOver ? 'bg-rose-500' : isCritical ? 'bg-orange-400' : 'bg-primary'}`}
                                style={{ width: `${percentage}%` }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
