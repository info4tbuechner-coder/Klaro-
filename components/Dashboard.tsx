
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
        const duration = 1200;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1);
            
            // Expo ease-out
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
    
    const trendColorClass = isPositive ? 'text-emerald-500 bg-emerald-500/10' : isNegative ? 'text-rose-500 bg-rose-500/10' : 'text-muted-foreground bg-secondary';

    return (
        <div className="glass-card rounded-[2rem] p-7 relative overflow-hidden group transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl">
            {/* Ambient Ambient Glow */}
            <div className={`absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br ${gradient} opacity-[0.05] blur-[100px] rounded-full group-hover:opacity-[0.12] transition-opacity duration-700`}></div>
            
            <div className="relative z-10 flex justify-between items-start mb-8">
                <div className={`p-4 rounded-2xl ${colorClass} bg-opacity-10 backdrop-blur-xl shadow-lg border border-white/10 group-hover:scale-110 transition-transform duration-500`}>
                    {icon}
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${trendColorClass} border border-white/5`}>
                    <TrendIcon size={12} strokeWidth={3} />
                    <span>{Math.abs(trend).toFixed(1)}%</span>
                </div>
            </div>

            <div className="relative z-10">
                <h3 className="text-muted-foreground text-xs font-bold uppercase tracking-[0.15em] mb-2 opacity-60">{title}</h3>
                <div className="text-3xl sm:text-4xl font-extrabold text-foreground">
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
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground opacity-40">
                <PieChart size={48} strokeWidth={1} className="mb-4" />
                <p className="text-sm font-medium">Keine Budgets festgelegt</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {budgetOverviewData.map((item, index) => {
                const isOverBudget = item.percentage > 100;
                const percentageWidth = Math.min(item.percentage, 100);
                const remaining = item.budget - item.spent;
                
                let progressColor = "bg-primary";
                if (item.percentage > 100) progressColor = "bg-destructive";
                else if (item.percentage > 85) progressColor = "bg-orange-500";
                else progressColor = "bg-emerald-500";

                return (
                    <div key={item.id} className="group animate-in-fade" style={{animationDelay: `${index * 60}ms`}}>
                        <div className="flex justify-between items-end mb-2.5">
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm text-foreground/90">{item.name}</h4>
                                {isOverBudget && (
                                    <span className="flex items-center text-[10px] font-black uppercase text-destructive bg-destructive/10 px-2 py-0.5 rounded-md border border-destructive/20">
                                        Limit erreicht
                                    </span>
                                )}
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-mono font-bold">
                                    <span className={isOverBudget ? "text-destructive" : "text-foreground"}>
                                        {formatCurrency(item.spent)}
                                    </span> 
                                    <span className="mx-1 opacity-20">/</span> 
                                    <span className="text-muted-foreground/60">{formatCurrency(item.budget)}</span>
                                </p>
                            </div>
                        </div>

                        <div className="h-2.5 w-full bg-secondary/40 rounded-full overflow-hidden p-[1px] border border-white/5">
                            <div
                                className={`h-full rounded-full ${progressColor} transition-all duration-1000 ease-out relative`}
                                style={{ width: `${percentageWidth}%` }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
                                {item.percentage > 90 && <div className="absolute inset-0 animate-pulse bg-white/20"></div>}
                            </div>
                        </div>
                        
                        <div className="flex justify-between mt-2 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-tighter">
                            <span>{item.percentage.toFixed(0)}% Ausgeschöpft</span>
                            <span className={remaining < 0 ? 'text-destructive' : ''}>
                                {remaining >= 0 ? `${formatCurrency(remaining)} frei` : `${formatCurrency(Math.abs(remaining))} über Limit`}
                            </span>
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
        <div className="space-y-10">
            <section>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                    <StatCard 
                        title="Einnahmen" 
                        amount={dashboardStats.income} 
                        trend={dashboardStats.incomeTrend} 
                        icon={<TrendingUp size={24} strokeWidth={2.5} />} 
                        colorClass="text-emerald-600 bg-emerald-500"
                        gradient="from-emerald-500 to-teal-500"
                    />
                    <StatCard 
                        title="Ausgaben" 
                        amount={dashboardStats.expense} 
                        trend={dashboardStats.expenseTrend} 
                        icon={<TrendingDown size={24} strokeWidth={2.5} />} 
                        colorClass="text-rose-600 bg-rose-500"
                        gradient="from-rose-500 to-pink-600"
                    />
                    <StatCard 
                        title="Gespart" 
                        amount={dashboardStats.saving} 
                        trend={dashboardStats.savingTrend} 
                        icon={<Landmark size={24} strokeWidth={2.5} />} 
                        colorClass="text-blue-600 bg-blue-500"
                        gradient="from-blue-500 to-indigo-500"
                    />
                    <StatCard 
                        title="Saldo" 
                        amount={dashboardStats.balance} 
                        trend={dashboardStats.balanceTrend} 
                        icon={<Wallet size={24} strokeWidth={2.5} />} 
                        colorClass="text-violet-600 bg-violet-500"
                        gradient="from-violet-500 to-purple-500"
                    />
                </div>
            </section>
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2">
                    <NewsFeed />
                </div>
                <div className="xl:col-span-1">
                     {budgetOverviewData.length > 0 ? (
                        <section className="glass-card rounded-[2.5rem] p-8 h-full flex flex-col border border-white/5 shadow-2xl">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-3">
                                    <div className="p-2.5 bg-primary/10 rounded-2xl text-primary border border-primary/20">
                                        <PieChart size={20} />
                                    </div>
                                    Budget
                                </h2>
                                <button 
                                    onClick={() => dispatch({ type: 'OPEN_MODAL', payload: { type: 'BUDGET_DETAILS' } })} 
                                    className="p-2.5 hover:bg-secondary rounded-full text-muted-foreground hover:text-primary transition-all duration-300 transform hover:rotate-90"
                                >
                                    <MoreHorizontal size={22} />
                                </button>
                            </div>
                            <BudgetOverview />
                            <button 
                                onClick={() => dispatch({ type: 'OPEN_MODAL', payload: { type: 'MANAGE_CATEGORIES' } })} 
                                className="mt-auto w-full py-4 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-all border-t border-border/40 pt-6"
                            >
                                Budgets anpassen
                            </button>
                        </section>
                    ) : (
                        <section className="glass-card rounded-[2.5rem] p-10 h-full flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-secondary/50 rounded-3xl flex items-center justify-center mb-6 text-muted-foreground/30 shadow-inner">
                                <PieChart size={40} />
                            </div>
                            <h3 className="font-extrabold text-xl mb-3">Keine Budgets</h3>
                            <p className="text-sm text-muted-foreground mb-8 max-w-[220px] leading-relaxed">Setzen Sie sich Limits pro Kategorie, um Ihre Finanzen im Griff zu behalten.</p>
                            <button 
                                onClick={() => dispatch({ type: 'OPEN_MODAL', payload: { type: 'MANAGE_CATEGORIES' } })} 
                                className="bg-primary text-primary-foreground px-8 py-3 rounded-2xl font-bold shadow-xl shadow-primary/30 hover:shadow-primary/50 transition-all transform hover:scale-105 active:scale-95"
                            >
                                Jetzt einrichten
                            </button>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
