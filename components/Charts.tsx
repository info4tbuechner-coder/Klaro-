
import React, { memo, useMemo } from 'react';
import { useAppState, useExpensePieChartData, useCashflowData, useProjectReportData, useAppDispatch, useNetWorthData } from '../context/AppContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Bar, XAxis, YAxis, Tooltip, Legend, BarChart, CartesianGrid, ComposedChart, AreaChart, Area } from 'recharts';
import { formatCurrency, formatCompactNumber } from '../utils';
import { LiabilityType } from '../types';
import { BudgetOverview } from './BudgetOverview';
import { CircularProgress } from './ui'; // We might need to move CircularProgress to ui.tsx or keep it here if not shared
import { Target, Briefcase, TrendingUp, CreditCard, BarChartHorizontal } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface TooltipPayload {
  name: string;
  value: number;
  payload: any;
  fill?: string;
}

const CustomTooltip = ({ active, payload, label, currency, language }: { active?: boolean, payload?: TooltipPayload[], label?: string | number, currency: string, language: string }) => {
    if (active && Array.isArray(payload) && payload.length) {
      return (
        <div className="p-3 glass-card text-sm rounded-lg shadow-lg border border-white/10 bg-background/90 backdrop-blur-md">
           <p className="font-bold mb-1 text-xs uppercase tracking-widest opacity-40">{label}</p>
           {payload.map((pld, index) => (
             <div key={index} className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pld.fill }}></div>
               <p className="font-bold">{`${pld.name}: ${formatCurrency(pld.value, currency, language)}`}</p>
             </div>
           ))}
        </div>
      );
    }
    return null;
};

interface PieTooltipPayload extends TooltipPayload {
    payload: {
      percent: number;
    };
}
  
const PieTooltip = ({ active, payload, currency, language }: { active?: boolean; payload?: PieTooltipPayload[]; currency: string; language: string }) => {
    if (active && Array.isArray(payload) && payload.length) {
        const data = payload[0];
        return (
            <div className="p-3 glass-card text-sm rounded-lg shadow-lg border border-white/10 bg-background/90 backdrop-blur-md">
                <p className="font-bold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.fill }}></div>
                    {`${data.name}: ${formatCurrency(data.value, currency, language)} (${data.payload.percent.toFixed(0)}%)`}
                </p>
            </div>
        );
    }
    return null;
};

export const NetWorthChart = memo(() => {
    const { userProfile } = useAppState();
    const netWorthData = useNetWorthData();

    return (
        <div id="chart-networth-container">
             <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <AreaChart data={netWorthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.05} vertical={false} />
                        <XAxis dataKey="name" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} dy={10} />
                        <YAxis fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(value) => formatCompactNumber(value, userProfile.currency, userProfile.language)} />
                        <Tooltip content={<CustomTooltip currency={userProfile.currency} language={userProfile.language} />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}/>
                        <Area type="monotone" dataKey="netWorth" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorNetWorth)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
});

export const MonthlyReport = memo(() => {
    const { userProfile } = useAppState();
    const expenseDataForPieChart = useExpensePieChartData();
    const totalExpenses = useMemo(() => expenseDataForPieChart.reduce((sum, item) => sum + item.value, 0), [expenseDataForPieChart]);
    const dataWithPercent = useMemo(() => expenseDataForPieChart.map(item => ({...item, percent: totalExpenses > 0 ? (item.value / totalExpenses) * 100 : 0})), [expenseDataForPieChart, totalExpenses]);

    return (
        <div className="space-y-6">
            <div id="chart-pie-container">
                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/30 mb-6">Ausgaben Mix</h4>
                {dataWithPercent.length > 0 ? (
                    <div style={{ width: '100%', height: 200 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie 
                                    data={dataWithPercent} 
                                    dataKey="value" 
                                    nameKey="name" 
                                    cx="50%" 
                                    cy="50%" 
                                    innerRadius={50}
                                    outerRadius={80} 
                                    stroke="none"
                                    paddingAngle={5}
                                >
                                    {dataWithPercent.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<PieTooltip currency={userProfile.currency} language={userProfile.language} />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                ) : <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/20 text-center py-10">Keine Daten vorhanden</p>}
            </div>
             <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/30 mb-6">Budget Status</h4>
                <BudgetOverview />
            </div>
        </div>
    )
});

export const CashflowAnalysis = memo(() => {
    const { userProfile } = useAppState();
    const cashflowData = useCashflowData();

    if (cashflowData.every(d => d.Einnahmen === 0 && d.Ausgaben === 0)) {
        return <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/20 text-center py-20">Analysedaten werden gesammelt...</p>
    }

    return (
        <div id="chart-cashflow-container">
            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/30 mb-8">Geldfluss Historie</h4>
             <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                    <ComposedChart data={cashflowData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.05} vertical={false} />
                        <XAxis dataKey="name" fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} dy={10} />
                        <YAxis fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(value) => formatCompactNumber(value, userProfile.currency, userProfile.language)} />
                        <Tooltip content={<CustomTooltip currency={userProfile.currency} language={userProfile.language} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }}/>
                        <Legend wrapperStyle={{fontSize: "9px", fontWeight: "bold", paddingTop: "20px"}} iconType="circle" />
                        <Bar dataKey="Einnahmen" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
                        <Bar dataKey="Ausgaben" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={12} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
});

export const ProjectTracker = memo(() => {
    const { userProfile } = useAppState();
    const projectReportData = useProjectReportData();

    return (
        <div className="space-y-6" id="chart-project-container">
            {projectReportData.length > 0 ? projectReportData.map(p => (
                <div key={p.name}>
                    <div className="flex justify-between items-baseline mb-2">
                        <h4 className="font-semibold text-sm">{p.name}</h4>
                        <span className={`font-bold text-lg ${p.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{formatCurrency(p.profit, userProfile.currency, userProfile.language)}</span>
                    </div>
                     <div style={{ width: '100%', height: 150 }}>
                        <ResponsiveContainer>
                            <BarChart data={p.data} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.05} />
                                <XAxis type="number" tickFormatter={(value) => formatCompactNumber(value as number, userProfile.currency, userProfile.language)} fontSize={10} />
                                <YAxis type="category" dataKey="name" width={80} fontSize={10} />
                                <Tooltip content={<CustomTooltip currency={userProfile.currency} language={userProfile.language} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }}/>
                                <Bar dataKey="value" barSize={16}>
                                     {p.data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#f59e0b'} radius={[0, 4, 4, 0]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )) : <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/20 text-center py-20">Keine Business-Projekte</p>}
        </div>
    )
});

export const GoalTracker = memo(() => {
    const { goals, userProfile } = useAppState();
    return (
        <div className="space-y-4">
            {goals.length > 0 ? goals.map(goal => {
                const { name, currentAmount, targetAmount } = goal;
                const percentage = Math.max(0, Math.min((currentAmount / targetAmount) * 100, 100));
                const isGoalReached = currentAmount >= targetAmount;

                return (
                     <div key={goal.id} className="flex items-center gap-6 p-6 rounded-[2rem] bg-secondary/10 border border-white/5 hover:bg-secondary/20 transition-all duration-500 group">
                        <div className="flex-shrink-0">
                            <CircularProgress percentage={percentage} />
                        </div>
                        <div className="flex-grow overflow-hidden">
                            <p className="font-bold text-sm tracking-tight group-hover:text-primary transition-colors">{name}</p>
                            {isGoalReached ? (
                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">Abgeschlossen</p>
                            ) : (
                                <p className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-widest mt-1">
                                    {formatCurrency(currentAmount, userProfile.currency, userProfile.language)} / {formatCurrency(targetAmount, userProfile.currency, userProfile.language)}
                                </p>
                            )}
                        </div>
                    </div>
                );
            }) : <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/20 text-center py-20">Keine Sparziele</p>}
        </div>
    );
});

export const LiabilityTracker = memo(() => {
    const { liabilities, userProfile } = useAppState();
    const dispatch = useAppDispatch();
    
    if (liabilities.length === 0) {
        return <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/20 text-center py-20">Schuldenfrei</p>;
    }
    
    return (
         <div className="space-y-6">
            {liabilities.map(l => {
                 const progress = l.initialAmount > 0 ? (l.paidAmount / l.initialAmount) * 100 : 100;
                 return (
                    <div key={l.id} className="p-6 rounded-[2rem] bg-secondary/10 border border-white/5">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-sm">{l.name}</h4>
                            <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${l.type === LiabilityType.DEBT ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>{l.type === LiabilityType.DEBT ? 'Schuld' : 'Forderung'}</span>
                        </div>
                        <div className="w-full bg-background/50 rounded-full h-2 overflow-hidden border border-white/5">
                            <div className="bg-primary h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(var(--primary),0.3)]" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mt-3 text-muted-foreground/30">
                            <span>{formatCurrency(l.paidAmount, userProfile.currency, userProfile.language)} getilgt</span>
                            <span>{Math.floor(progress)}%</span>
                        </div>
                    </div>
                );
            })}
             {liabilities.some(l => l.type === LiabilityType.DEBT && (l.initialAmount - l.paidAmount > 0)) && (
                 <button onClick={() => dispatch({ type: 'OPEN_MODAL', payload: { type: 'DEBT_PAYDOWN' } })} className="w-full text-center py-6 mt-4 px-4 bg-primary text-primary-foreground rounded-[2rem] font-black uppercase text-[10px] tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20">
                    Tilgungsplan erstellen
                 </button>
             )}
        </div>
    )
});
