
import React, { memo, useState, useEffect, useRef } from 'react';
import { useDashboardStats, useBudgetOverviewData, useAppDispatch } from '../context/AppContext';
import { ArrowUpRight, ArrowDownRight, Minus, AlertCircle, TrendingUp, TrendingDown, Wallet, Landmark, Edit, PieChart, MoreHorizontal } from 'lucide-react';
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
        const duration = 1500; // Slower, more elegant animation

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1);
            
            // Expo ease-out for premium feel
            const easedPercentage = percentage === 1 ? 1 : 1 - Math.pow(2, -10 * percentage);

            const currentValue = startValue + (endValue - startValue) * easedPercentage;
            setDisplayValue(currentValue);

            if (progress < duration) {
                animationFrameId = requestAnimationFrame(animate);
            } else {
                setDisplayValue(endValue); 
                prevValueRef.current = endValue;
            }
        };

        animationFrameId = requestAnimationFrame(animate);
        return () => { if (animationFrameId) cancelAnimationFrame(animationFrameId); prevValueRef.current = value; };
    }, [value]);

    return <span className="font-mono tracking-tight">{formatCurrency(displayValue)}</span>;
};

const StatCard: React.FC<{ title: string; amount: number; trend: number; icon: React.ReactNode; colorClass: string; gradient: string }> = memo(({ title, amount, trend, icon, colorClass, gradient }) => {
    const TrendIcon = trend > 0 ? ArrowUpRight : trend < 0 ? ArrowDownRight : Minus;
    const isPositive = trend > 0;
    const isNegative = trend < 0;
    
    // Determine trend colors dynamically based on context (Income vs Expense logic could be applied here, but keeping it simple for now)
    const trendColorClass = isPositive ? 'text-emerald-500 bg-emerald-500/10' : isNegative ? 'text-rose-500 bg-rose-500/10' : 'text-muted-foreground bg-secondary';

    return (
        <div className="glass-card glass-card-hover rounded-3xl p-6 relative overflow-hidden group h-full flex flex-col justify-between">
            {/* Ambient Background Glow */}
            <div className={`absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br ${gradient} opacity-[0.08] blur-[80px] rounded-full group-hover:opacity-[0.15] transition-opacity duration-700`}></div>
            
            <div className="relative z-10 flex justify-between items-start mb-6">
                <div className={`p-3.5 rounded-2xl ${colorClass} bg-opacity-10 backdrop-blur-md shadow-sm border border-white/10`}>
                    {icon}
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${trendColorClass} transition-colors`}>
                    <TrendIcon size={14} strokeWidth={3} />
                    <span>{Math.abs(trend).toFixed(1)}%</span>
                </div>
            </div>

            <div className="relative z-10">
                <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-1 opacity-80">{title}</h3>
                <div className="text-3xl sm:text-4xl font-bold text-foreground">
                    <AnimatedNumber value={amount} />
                </div>
            </div>
        </div>
    );
});

export const BudgetOverview: React.FC = () => {
    const budgetOverviewData = useBudgetOverviewData();

    if (budgetOverviewData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground opacity-60">
                <PieChart size={48} strokeWidth={1} className="mb-4 opacity-50" />
                <p className="text-sm">Keine Budgets definiert</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {budgetOverviewData.map((item, index) => {
                const isOverBudget = item.percentage > 100;
                const percentageWidth = Math.min(item.percentage, 100);
                const remaining = item.budget - item.spent;
                
                // Color calculation
                let progressColor = "bg-primary";
                if (item.percentage > 100) progressColor = "bg-destructive";
                else if (item.percentage > 85) progressColor = "bg-orange-500"; // Warning zone
                else progressColor = "bg-emerald-500";

                return (
                    <div key={item.id} className="group animate-in-fade" style={{animationDelay: `${index * 50}ms`}}>
                        <div className="flex justify-between items-end mb-2">
                            <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-sm">{item.name}</h4>
                                {isOverBudget && (
                                    <span className="flex items-center text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-md">
                                        <AlertCircle size={10} className="mr-1" /> Überzogen
                                    </span>
                                )}
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-muted-foreground font-medium mb-0.5">
                                    <span className={isOverBudget ? "text-destructive font-bold" : "text-foreground font-bold"}>
                                        {formatCurrency(item.spent)}
                                    </span> 
                                    <span className="mx-1 opacity-50">/</span> 
                                    {formatCurrency(item.budget)}
                                </p>
                            </div>
                        </div>

                        <div className="h-3 w-full bg-secondary/60 rounded-full overflow-hidden p-[2px]">
                            <div
                                className={`h-full rounded-full ${progressColor} transition-all duration-1000 ease-out relative`}
                                style={{ width: `${percentageWidth}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            </div>
                        </div>
                        
                        <div className="flex justify-between mt-1.5 text-[10px] font-medium text-muted-foreground/70">
                            <span>{item.percentage.toFixed(0)}% genutzt</span>
                            <span>{remaining >= 0 ? `${formatCurrency(remaining)} übrig` : `${formatCurrency(Math.abs(remaining))} drüber`}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

const Dashboard: React.FC = () => {
    const dashboardStats = useDashboardStats();
    const budgetOverviewData = useBudgetOverviewData();
    const dispatch = useAppDispatch();

    return (
        <>
            <section className="mb-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                    <StatCard 
                        title="Einnahmen" 
                        amount={dashboardStats.income} 
                        trend={dashboardStats.incomeTrend} 
                        icon={<TrendingUp size={24} />} 
                        colorClass="text-emerald-600 bg-emerald-500"
                        gradient="from-emerald-500 to-teal-500"
                    />
                    <StatCard 
                        title="Ausgaben" 
                        amount={dashboardStats.expense} 
                        trend={dashboardStats.expenseTrend} 
                        icon={<TrendingDown size={24} />} 
                        colorClass="text-rose-600 bg-rose-500"
                        gradient="from-rose-500 to-pink-600"
                    />
                    <StatCard 
                        title="Gespart" 
                        amount={dashboardStats.saving} 
                        trend={dashboardStats.savingTrend} 
                        icon={<Landmark size={24} />} 
                        colorClass="text-blue-600 bg-blue-500"
                        gradient="from-blue-500 to-indigo-500"
                    />
                    <StatCard 
                        title="Saldo" 
                        amount={dashboardStats.balance} 
                        trend={dashboardStats.balanceTrend} 
                        icon={<Wallet size={24} />} 
                        colorClass="text-violet-600 bg-violet-500"
                        gradient="from-violet-500 to-purple-500"
                    />
                </div>
            </section>
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-10">
                <div className="xl:col-span-2 space-y-8">
                    <NewsFeed />
                </div>
                <div className="xl:col-span-1">
                     {budgetOverviewData.length > 0 ? (
                        <section className="glass-card rounded-3xl p-6 h-full flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-xl text-primary">
                                        <PieChart size={20} />
                                    </div>
                                    Budget
                                </h2>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => dispatch({ type: 'OPEN_MODAL', payload: { type: 'BUDGET_DETAILS' } })} 
                                        className="p-2 hover:bg-secondary rounded-full text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        <MoreHorizontal size={20} />
                                    </button>
                                </div>
                            </div>
                            <BudgetOverview />
                            <button 
                                onClick={() => dispatch({ type: 'OPEN_MODAL', payload: { type: 'MANAGE_CATEGORIES' } })} 
                                className="mt-auto w-full py-3 text-sm font-medium text-muted-foreground hover:text-primary transition-colors border-t border-border/50 pt-4"
                            >
                                Budgets verwalten
                            </button>
                        </section>
                    ) : (
                        <section className="glass-card rounded-3xl p-8 h-full flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4 text-muted-foreground">
                                <PieChart size={32} />
                            </div>
                            <h3 className="font-bold text-lg mb-2">Keine Budgets</h3>
                            <p className="text-sm text-muted-foreground mb-6 max-w-[200px]">Erstellen Sie Kategorien mit Budgets, um Ihre Ausgaben zu kontrollieren.</p>
                            <button 
                                onClick={() => dispatch({ type: 'OPEN_MODAL', payload: { type: 'MANAGE_CATEGORIES' } })} 
                                className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-medium shadow-lg hover:shadow-primary/25 transition-all"
                            >
                                Jetzt einrichten
                            </button>
                        </section>
                    )}
                </div>
            </div>
        </>
    );
};

export default Dashboard;
