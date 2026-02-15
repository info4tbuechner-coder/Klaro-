
import React, { memo, useState, useEffect, useRef } from 'react';
import { useDashboardStats, useBudgetOverviewData, useAppDispatch, useAppState } from '../context/AppContext';
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp, TrendingDown, Wallet, Landmark, PieChart, MoreHorizontal, Activity, Zap, Sparkles, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../utils';
import NewsFeed from './NewsFeed';

const AnimatedNumber: React.FC<{ value: number; currency: string; language: string }> = ({ value, currency, language }) => {
    const [displayValue, setDisplayValue] = useState(0);
    const prevValueRef = useRef(0);

    useEffect(() => {
        const startValue = prevValueRef.current;
        const endValue = value;
        let startTime: number;
        let animationFrameId: number;
        const duration = 1600;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1);
            const easedPercentage = 1 - Math.pow(1 - percentage, 5);

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

    return <span className="font-mono tracking-tighter">{formatCurrency(displayValue, currency, language)}</span>;
};

const StatCard: React.FC<{ title: string; amount: number; trend: number; icon: React.ReactNode; gradient: string; currency: string; language: string }> = memo(({ title, amount, trend, icon, gradient, currency, language }) => {
    const isPositive = trend > 0;
    const isNegative = trend < 0;
    const trendColor = isPositive ? 'text-emerald-500 bg-emerald-500/10' : isNegative ? 'text-rose-500 bg-rose-500/10' : 'text-muted-foreground/40 bg-secondary/50';

    return (
        <div className="glass-card rounded-[3rem] p-10 relative overflow-hidden group flex flex-col justify-between h-full min-h-[260px] animate-in">
            <div className={`absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br ${gradient} opacity-[0.03] blur-[120px] group-hover:opacity-[0.2] transition-all duration-1000`}></div>
            
            <div className="relative z-10 flex justify-between items-start">
                <div className="w-16 h-16 rounded-[1.75rem] bg-secondary/30 flex items-center justify-center text-foreground/40 border border-white/5 shadow-inner transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 group-hover:text-primary">
                    {icon}
                </div>
                <div className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.25em] border border-white/5 ${trendColor} backdrop-blur-md transition-all duration-500`}>
                    {isPositive ? <ArrowUpRight size={14} /> : isNegative ? <ArrowDownRight size={14} /> : <Minus size={14} />}
                    <span>{trend === 0 ? 'NEU' : `${Math.abs(trend).toFixed(1)}%`}</span>
                </div>
            </div>

            <div className="relative z-10">
                <h3 className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.5em] mb-4 opacity-30">{title}</h3>
                <div className="text-5xl font-extrabold text-foreground tracking-tighter leading-none group-hover:translate-x-1 transition-transform duration-500">
                    <AnimatedNumber value={amount} currency={currency} language={language} />
                </div>
            </div>
        </div>
    );
});

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
        <div className="space-y-10 max-h-[450px] overflow-y-auto pr-4 no-scrollbar scroll-smooth">
            {budgetOverviewData.map((item, index) => {
                const percentage = Math.min(item.percentage, 100);
                const isCritical = item.percentage > 85;
                const isOver = item.percentage > 100;

                return (
                    <div key={item.id} className="animate-in group relative" style={{animationDelay: `${index * 150}ms`}}>
                        <div className="flex justify-between items-end mb-4">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-3">
                                    <h4 className="font-bold text-lg text-foreground/80 tracking-tight group-hover:text-primary transition-colors">{item.name}</h4>
                                    {isOver && (
                                        <div className="animate-pulse bg-rose-500/20 text-rose-500 p-1 rounded-full">
                                            <AlertCircle size={14} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 mt-1.5">
                                    <p className={`text-[9px] font-black uppercase tracking-[0.3em] ${isOver ? 'text-rose-500' : isCritical ? 'text-orange-400' : 'text-muted-foreground/30'}`}>
                                        {isOver ? 'Budget überschritten' : isCritical ? 'Limit fast erreicht' : 'In Ordnung'}
                                    </p>
                                    <div className="h-1 w-1 rounded-full bg-muted-foreground/20"></div>
                                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/20">
                                        Limit: {formatCurrency(item.budget, userProfile.currency, userProfile.language)}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <span className={`text-xl font-mono font-bold tracking-tighter ${isOver ? 'text-rose-500' : 'text-foreground/90'}`}>
                                    {formatCurrency(item.spent, userProfile.currency, userProfile.language)}
                                </span>
                                <span className="text-[10px] font-black text-muted-foreground/20 uppercase tracking-widest mt-1">
                                    {Math.round(item.percentage)}% genutzt
                                </span>
                            </div>
                        </div>

                        <div className="h-5 w-full bg-secondary/20 rounded-full p-1 border border-white/5 relative shadow-inner overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ease-out relative shadow-[0_0_15px_-5px_currentColor] ${isOver ? 'bg-rose-500' : isCritical ? 'bg-orange-400' : 'bg-primary'}`}
                                style={{ width: `${percentage}%` }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                                {percentage > 5 && (
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full mr-1 shadow-[0_0_10px_white]"></div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const Dashboard: React.FC = () => {
    const stats = useDashboardStats();
    const { userProfile } = useAppState();
    const dispatch = useAppDispatch();

    return (
        <div className="bento-grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Einnahmen" amount={stats.income} trend={stats.incomeTrend} icon={<TrendingUp size={32} />} gradient="from-emerald-400 to-teal-600" currency={userProfile.currency} language={userProfile.language} />
            <StatCard title="Ausgaben" amount={stats.expense} trend={stats.expenseTrend} icon={<TrendingDown size={32} />} gradient="from-rose-400 to-pink-600" currency={userProfile.currency} language={userProfile.language} />
            <StatCard title="Sparen" amount={stats.saving} trend={stats.savingTrend} icon={<Zap size={32} />} gradient="from-blue-400 to-indigo-600" currency={userProfile.currency} language={userProfile.language} />
            <StatCard title="Saldo" amount={stats.balance} trend={stats.balanceTrend} icon={<Wallet size={32} />} gradient="from-violet-400 to-purple-600" currency={userProfile.currency} language={userProfile.language} />
            
            <div className="md:col-span-2 xl:col-span-3">
                <NewsFeed />
            </div>

            <div className="md:col-span-2 xl:col-span-1">
                <section className="glass-card rounded-[4rem] p-12 h-full border border-white/5 flex flex-col relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 blur-[80px] rounded-full group-hover:bg-primary/15 transition-all duration-1000"></div>
                    
                    <div className="flex items-center justify-between mb-12 relative z-10">
                        <div className="flex items-center gap-5">
                            <div className="p-4 bg-primary/10 rounded-[1.5rem] text-primary border border-primary/20 shadow-2xl">
                                <Activity size={26} />
                            </div>
                            <h2 className="text-xs font-black uppercase tracking-[0.5em] text-foreground/30">Budget Intelligenz</h2>
                        </div>
                        <button onClick={() => dispatch({ type: 'OPEN_MODAL', payload: { type: 'ANALYSIS' } })} className="p-4 hover:bg-secondary rounded-2xl text-muted-foreground/20 hover:text-foreground transition-all active:scale-90">
                            <MoreHorizontal size={28} />
                        </button>
                    </div>

                    <div className="flex-grow relative z-10">
                        <BudgetOverview />
                    </div>

                    <button onClick={() => dispatch({ type: 'OPEN_MODAL', payload: { type: 'MANAGE_CATEGORIES' } })} 
                            className="mt-12 w-full py-8 border-t border-border/5 text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground/20 hover:text-primary transition-all relative z-10 hover:tracking-[0.6em]">
                        Alle Kategorien Verwalten
                    </button>
                </section>
            </div>
        </div>
    );
};

export default Dashboard;
