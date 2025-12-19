

import React, { memo, useState, useEffect, useRef } from 'react';
import { useDashboardStats, useBudgetOverviewData } from '../context/AppContext';
import { ArrowUpRight, ArrowDownRight, Minus, AlertCircle, TrendingUp, TrendingDown, Wallet, Landmark } from 'lucide-react';
import { formatCurrency } from '../utils';
import NewsFeed from './NewsFeed';

const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
    const [displayValue, setDisplayValue] = useState(0);
    const prevValueRef = useRef(0);

    useEffect(() => {
        const startValue = prevValueRef.current;
        const endValue = value;
        let startTime: number;
        let animationFrameId: number;
        const duration = 800; // ms for animation

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1);
            
            // Ease-out cubic function
            const easedPercentage = 1 - Math.pow(1 - percentage, 3);

            const currentValue = startValue + (endValue - startValue) * easedPercentage;
            setDisplayValue(currentValue);

            if (progress < duration) {
                animationFrameId = requestAnimationFrame(animate);
            } else {
                setDisplayValue(endValue); // Ensure it ends on the exact value
                prevValueRef.current = endValue;
            }
        };

        animationFrameId = requestAnimationFrame(animate);
        
        return () => { 
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            prevValueRef.current = value; 
        };
    }, [value]);

    return <span>{formatCurrency(displayValue)}</span>;
};

const StatCard: React.FC<{ title: string; amount: number; trend: number; icon: React.ReactNode }> = memo(({ title, amount, trend, icon }) => {
    const TrendIcon = trend > 0 ? ArrowUpRight : trend < 0 ? ArrowDownRight : Minus;
    const trendColor = trend > 0 ? 'text-success' : trend < 0 ? 'text-destructive' : 'text-muted-foreground';

    return (
        <div className="glass-card stat-card-bg stat-card-glow p-5 rounded-2xl flex items-start justify-between group transition-all duration-300">
            <div>
                <h3 className="text-muted-foreground text-base font-medium">{title}</h3>
                <p className="text-3xl font-bold text-foreground mt-2">
                    <AnimatedNumber value={amount} />
                </p>
                 <div className={`mt-2 flex items-center text-sm font-semibold ${trendColor}`}>
                    <TrendIcon className="h-4 w-4 mr-1" />
                    <span>{Math.abs(trend).toFixed(1)}% vs. Vorperiode</span>
                </div>
            </div>
             <div className="bg-primary/10 text-primary p-3 rounded-lg transition-transform duration-300 group-hover:scale-110">
                {icon}
            </div>
        </div>
    );
});

export const BudgetOverview: React.FC = () => {
    const budgetOverviewData = useBudgetOverviewData();

    if (budgetOverviewData.length === 0) {
        return <p className="text-sm text-center py-4 text-muted-foreground">Keine Budgets für diesen Zeitraum festgelegt.</p>;
    }

    return (
        <div className="space-y-6">
            {budgetOverviewData.map(item => {
                const isOverBudget = item.percentage > 100;
                const progressBarColor = isOverBudget ? 'bg-destructive' : 'bg-success';
                const percentageWidth = Math.min(item.percentage, 100);
                const remaining = item.budget - item.spent;

                const tooltipContent = (
                    <>
                        <div className="font-bold mb-1.5">{item.name}</div>
                        <div className="grid grid-cols-[auto,1fr] gap-x-3 text-xs">
                            <span className="text-muted-foreground">Budget:</span>
                            <span className="text-right font-mono font-semibold">{formatCurrency(item.budget)}</span>
                            <span className="text-muted-foreground">Ausgegeben:</span>
                            <span className="text-right font-mono font-semibold">{formatCurrency(item.spent)}</span>
                        </div>
                        <hr className="border-border/20 my-1.5" />
                        <div className={`grid grid-cols-[auto,1fr] gap-x-3 text-xs font-bold ${isOverBudget ? 'text-destructive' : 'text-success'}`}>
                            {isOverBudget ? (
                                <>
                                    <span>Überschritten:</span>
                                    <span className="text-right font-mono">{formatCurrency(Math.abs(remaining))}</span>
                                </>
                            ) : (
                                <>
                                    <span>Verbleibend:</span>
                                    <span className="text-right font-mono">{formatCurrency(remaining)}</span>
                                </>
                            )}
                        </div>
                    </>
                );

                return (
                    <div key={item.id} className="relative group animate-fade-in">
                        <div
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-52 p-3
                                       bg-popover text-popover-foreground rounded-lg shadow-xl 
                                       opacity-0 group-hover:opacity-100 transition-opacity duration-300 
                                       pointer-events-none z-10"
                        >
                            {tooltipContent}
                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0
                                        border-x-8 border-x-transparent
                                        border-t-8 border-t-[hsl(var(--popover))]"></div>
                        </div>

                        <div className="flex justify-between items-center mb-1">
                            <h4 className="font-medium text-sm truncate pr-2">{item.name}</h4>
                            <div className={`flex items-center text-sm font-semibold ${isOverBudget ? 'text-destructive' : 'text-muted-foreground'}`}>
                                {isOverBudget && <AlertCircle className="mr-1 h-4 w-4 animate-pulse-destructive" />}
                                <span>{item.percentage.toFixed(0)}%</span>
                            </div>
                        </div>

                        <div className="w-full bg-secondary rounded-full h-2.5">
                            <div
                                className={`${progressBarColor} h-2.5 rounded-full transition-all duration-500`}
                                style={{ width: `${percentageWidth}%` }}
                            ></div>
                        </div>
                        
                        <div className="flex justify-between text-xs mt-1 text-muted-foreground">
                            <span className="font-medium">{formatCurrency(item.spent)}</span>
                            <span>von {formatCurrency(item.budget)}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const Dashboard: React.FC = () => {
    const dashboardStats = useDashboardStats();
    const budgetOverviewData = useBudgetOverviewData();

    return (
        <>
            <section>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                    <StatCard title="Einnahmen" amount={dashboardStats.income} trend={dashboardStats.incomeTrend} icon={<TrendingUp size={24}/>} />
                    <StatCard title="Ausgaben" amount={dashboardStats.expense} trend={dashboardStats.expenseTrend} icon={<TrendingDown size={24}/>} />
                    <StatCard title="Gespart" amount={dashboardStats.saving} trend={dashboardStats.savingTrend} icon={<Landmark size={24}/>} />
                    <StatCard title="Saldo" amount={dashboardStats.balance} trend={dashboardStats.balanceTrend} icon={<Wallet size={24}/>} />
                </div>
            </section>
            
            <NewsFeed />
            
            {budgetOverviewData.length > 0 && (
                <section className="glass-card rounded-2xl p-6">
                    <h2 className="text-xl font-bold mb-4">Budgetübersicht</h2>
                    <BudgetOverview />
                </section>
            )}
        </>
    );
};

export default Dashboard;
