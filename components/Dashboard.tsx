
import React, { memo, useState, useEffect, useRef } from 'react';
import { useDashboardStats, useBudgetOverviewData, useAppDispatch, useAppState } from '../context/AppContext';
import { ArrowUpRight, ArrowDownRight, Minus, TrendingUp, TrendingDown, Wallet, Landmark, PieChart, MoreHorizontal, Activity, Zap, Sparkles, AlertCircle, BarChart3 } from 'lucide-react';
import { formatCurrency } from '../utils';
import NewsFeed from './NewsFeed';
import AIAdvisor from './AIAdvisor';
import { NetWorthChart, CashflowAnalysis } from './Charts';

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
        <div className="glass-card rounded-[3rem] p-8 lg:p-10 relative overflow-hidden group flex flex-col justify-between h-full min-h-[240px] animate-in hover:shadow-2xl transition-all duration-500 border border-white/5 hover:border-white/10">
            <div className={`absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br ${gradient} opacity-[0.03] blur-[120px] group-hover:opacity-[0.15] transition-all duration-1000`}></div>
            
            <div className="relative z-10 flex justify-between items-start">
                <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-[1.75rem] bg-secondary/30 flex items-center justify-center text-foreground/40 border border-white/5 shadow-inner transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 group-hover:text-primary backdrop-blur-md">
                    {icon}
                </div>
                <div className={`flex items-center gap-1.5 px-4 lg:px-5 py-2 lg:py-2.5 rounded-full text-[9px] lg:text-[10px] font-black uppercase tracking-[0.25em] border border-white/5 ${trendColor} backdrop-blur-md transition-all duration-500`}>
                    {isPositive ? <ArrowUpRight size={14} /> : isNegative ? <ArrowDownRight size={14} /> : <Minus size={14} />}
                    <span>{trend === 0 ? 'NEU' : `${Math.abs(trend).toFixed(1)}%`}</span>
                </div>
            </div>

            <div className="relative z-10 mt-8">
                <h3 className="text-muted-foreground text-[9px] lg:text-[10px] font-black uppercase tracking-[0.4em] mb-3 opacity-40">{title}</h3>
                <div className="text-4xl lg:text-5xl font-extrabold text-foreground tracking-tighter leading-none group-hover:translate-x-1 transition-transform duration-500">
                    <AnimatedNumber value={amount} currency={currency} language={language} />
                </div>
            </div>
        </div>
    );
});

import { BudgetOverview } from './BudgetOverview';

const Dashboard: React.FC = () => {
    const stats = useDashboardStats();
    const { userProfile } = useAppState();
    const dispatch = useAppDispatch();

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <StatCard title="Einnahmen" amount={stats.income} trend={stats.incomeTrend} icon={<TrendingUp size={28} />} gradient="from-emerald-400 to-teal-600" currency={userProfile.currency} language={userProfile.language} />
                <StatCard title="Ausgaben" amount={stats.expense} trend={stats.expenseTrend} icon={<TrendingDown size={28} />} gradient="from-rose-400 to-pink-600" currency={userProfile.currency} language={userProfile.language} />
                <StatCard title="Sparen" amount={stats.saving} trend={stats.savingTrend} icon={<Zap size={28} />} gradient="from-blue-400 to-indigo-600" currency={userProfile.currency} language={userProfile.language} />
                <StatCard title="Saldo" amount={stats.balance} trend={stats.balanceTrend} icon={<Wallet size={28} />} gradient="from-violet-400 to-purple-600" currency={userProfile.currency} language={userProfile.language} />
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-8">
                    <section className="glass-card rounded-[3rem] p-8 lg:p-10 border border-white/5 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20">
                                    <BarChart3 size={24} />
                                </div>
                                <h2 className="text-xs font-black uppercase tracking-[0.4em] text-foreground/50">Vermögensentwicklung</h2>
                            </div>
                        </div>
                        <NetWorthChart />
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <AIAdvisor />
                         <NewsFeed />
                    </div>
                </div>

                <div className="xl:col-span-1 space-y-8">
                    <section className="glass-card rounded-[3rem] p-8 lg:p-10 h-full border border-white/5 flex flex-col relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 blur-[80px] rounded-full group-hover:bg-primary/10 transition-all duration-1000"></div>
                        
                        <div className="flex items-center justify-between mb-10 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20 shadow-xl">
                                    <Activity size={24} />
                                </div>
                                <h2 className="text-xs font-black uppercase tracking-[0.4em] text-foreground/50">Budgets</h2>
                            </div>
                            <button onClick={() => dispatch({ type: 'OPEN_MODAL', payload: { type: 'ANALYSIS' } })} className="p-3 hover:bg-secondary rounded-xl text-muted-foreground/20 hover:text-foreground transition-all active:scale-90">
                                <MoreHorizontal size={24} />
                            </button>
                        </div>

                        <div className="flex-grow relative z-10">
                            <BudgetOverview />
                        </div>

                        <button onClick={() => dispatch({ type: 'OPEN_MODAL', payload: { type: 'MANAGE_CATEGORIES' } })} 
                                className="mt-10 w-full py-6 border-t border-border/5 text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground/20 hover:text-primary transition-all relative z-10 hover:tracking-[0.5em]">
                            Kategorien Verwalten
                        </button>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
