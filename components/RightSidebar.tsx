

import React, { useState, useMemo, useRef, useCallback, useEffect, memo } from 'react';
import { useAppState, useExpensePieChartData, useCashflowData, useProjectReportData, useAppDispatch } from '../context/AppContext';
import { Target, Briefcase, BarChartHorizontal, FileDown, TrendingUp, CreditCard } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Bar, XAxis, YAxis, Tooltip, Legend, BarChart, CartesianGrid, ComposedChart } from 'recharts';
import { formatCurrency } from '../utils';
import { LiabilityType } from '../types';
import { BudgetOverview } from './Dashboard';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560'];

interface TooltipPayload {
  name: string;
  value: number;
  payload: any;
  fill?: string;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean, payload?: TooltipPayload[], label?: string | number }) => {
    if (active && Array.isArray(payload) && payload.length) {
      return (
        <div className="p-3 glass-card text-sm rounded-lg shadow-lg">
           <p className="font-bold mb-1">{label}</p>
           {payload.map((pld, index) => (
             <div key={index} style={{ color: pld.fill }}>
               <p>{`${pld.name}: ${formatCurrency(pld.value)}`}</p>
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
  
const PieTooltip = ({ active, payload }: { active?: boolean; payload?: PieTooltipPayload[] }) => {
    if (active && Array.isArray(payload) && payload.length) {
        const data = payload[0];
        return (
            <div className="p-3 glass-card text-sm rounded-lg shadow-lg">
                <p className="label">{`${data.name} : ${formatCurrency(data.value)} (${data.payload.percent.toFixed(0)}%)`}</p>
            </div>
        );
    }
    return null;
};

const MonthlyReport = memo(() => {
    const expenseDataForPieChart = useExpensePieChartData();
    const totalExpenses = useMemo(() => expenseDataForPieChart.reduce((sum, item) => sum + item.value, 0), [expenseDataForPieChart]);
    const dataWithPercent = useMemo(() => expenseDataForPieChart.map(item => ({...item, percent: totalExpenses > 0 ? (item.value / totalExpenses) * 100 : 0})), [expenseDataForPieChart, totalExpenses]);

    return (
        <div className="space-y-6">
            <div>
                <h4 className="font-semibold mb-2">Ausgaben nach Kategorie</h4>
                {dataWithPercent.length > 0 ? (
                    <div style={{ width: '100%', height: 200 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={dataWithPercent} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" labelLine={false}>
                                    {dataWithPercent.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<PieTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                ) : <p className="text-sm text-muted-foreground">Keine Ausgabendaten für diesen Zeitraum.</p>}
            </div>
             <div>
                <h4 className="font-semibold mb-2">Budgetübersicht</h4>
                <BudgetOverview />
            </div>
        </div>
    )
});

const CashflowAnalysis = memo(() => {
    const cashflowData = useCashflowData();

    if (cashflowData.every(d => d.Einnahmen === 0 && d.Ausgaben === 0)) {
        return <p className="text-sm text-muted-foreground text-center py-8">Nicht genügend Daten für eine Cashflow-Analyse vorhanden.</p>
    }

    return (
        <div>
            <h4 className="font-semibold mb-4">Cashflow der letzten 12 Monate</h4>
             <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                    <ComposedChart data={cashflowData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                        <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `€${Number(value)/1000}k`} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--secondary))' }}/>
                        <Legend wrapperStyle={{fontSize: "12px"}} />
                        <Bar dataKey="Einnahmen" fill="hsl(var(--success))" barSize={20} />
                        <Bar dataKey="Ausgaben" fill="hsl(var(--warning))" barSize={20} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
});

const ProjectTracker = memo(() => {
    const projectReportData = useProjectReportData();

    return (
        <div className="space-y-6">
            {projectReportData.length > 0 ? projectReportData.map(p => (
                <div key={p.name}>
                    <div className="flex justify-between items-baseline mb-2">
                        <h4 className="font-semibold text-sm">{p.name}</h4>
                        <span className={`font-bold text-lg ${p.profit >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(p.profit)}</span>
                    </div>
                     <div style={{ width: '100%', height: 150 }}>
                        <ResponsiveContainer>
                            <BarChart data={p.data} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                                <XAxis type="number" tickFormatter={(value) => formatCurrency(value as number)} fontSize={12} />
                                <YAxis type="category" dataKey="name" width={80} fontSize={12} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--secondary))' }}/>
                                <Bar dataKey="value" barSize={20}>
                                     {p.data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? 'hsl(var(--success))' : 'hsl(var(--warning))'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )) : <p className="text-sm text-muted-foreground">Noch keine Projekte angelegt.</p>}
        </div>
    )
});

const CircularProgress: React.FC<{ percentage: number; size?: number; strokeWidth?: number }> = ({ percentage, size = 60, strokeWidth = 5 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                <circle
                    className="stroke-secondary"
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <circle
                    className="stroke-primary"
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                    style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
                />
            </svg>
             <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-foreground">
                    {`${Math.round(percentage)}%`}
                </span>
            </div>
        </div>
    );
};

const GoalTracker = memo(() => {
    const { goals } = useAppState();
    return (
        <div className="space-y-4">
            {goals.length > 0 ? goals.map(goal => {
                const { name, currentAmount, targetAmount } = goal;
                const percentage = Math.max(0, Math.min((currentAmount / targetAmount) * 100, 100));
                const isGoalReached = currentAmount >= targetAmount;

                return (
                     <div key={goal.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-secondary/30 transition-colors duration-200">
                        <div className="flex-shrink-0">
                            <CircularProgress percentage={percentage} />
                        </div>
                        <div className="flex-grow overflow-hidden">
                            <p className="font-semibold text-sm truncate">{name}</p>
                            {isGoalReached ? (
                                <p className="font-bold text-success text-sm">🎉 Ziel erreicht!</p>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    <span className="font-semibold text-foreground">{formatCurrency(currentAmount)}</span>
                                    {' '} von {formatCurrency(targetAmount)}
                                </p>
                            )}
                        </div>
                    </div>
                );
            }) : <p className="text-sm text-muted-foreground text-center py-8">Noch keine Ziele angelegt.</p>}
        </div>
    );
});

const LiabilityTracker = memo(() => {
    const { liabilities } = useAppState();
    const dispatch = useAppDispatch();
    
    if (liabilities.length === 0) {
        return <p className="text-sm text-muted-foreground text-center py-8">Keine Schulden oder Forderungen angelegt.</p>;
    }
    
    return (
         <div className="space-y-6">
            {liabilities.map(l => {
                 const progress = l.initialAmount > 0 ? (l.paidAmount / l.initialAmount) * 100 : 100;
                 return (
                    <div key={l.id}>
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold text-sm">{l.name}</h4>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${l.type === LiabilityType.DEBT ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>{l.type === LiabilityType.DEBT ? 'Schuld' : 'Forderung'}</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-4">
                            <div className="bg-primary h-4 rounded-full flex items-center justify-end px-2 transition-all duration-500" style={{ width: `${progress}%` }}>
                                {progress > 15 && <span className="text-xs font-bold text-primary-foreground">{Math.floor(progress)}%</span>}
                            </div>
                        </div>
                        <div className="flex justify-between text-xs mt-1 text-muted-foreground">
                            <span>{formatCurrency(l.paidAmount)} / {formatCurrency(l.initialAmount)}</span>
                        </div>
                    </div>
                );
            })}
             {liabilities.some(l => l.type === LiabilityType.DEBT && (l.initialAmount - l.paidAmount > 0)) && (
                 <button onClick={() => dispatch({ type: 'OPEN_MODAL', payload: { type: 'DEBT_PAYDOWN' } })} className="w-full text-center py-2 mt-4 px-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90">
                    Tilgungsplan erstellen
                 </button>
             )}
        </div>
    )
});

const TABS = [
    { name: 'Bericht', icon: BarChartHorizontal, component: MonthlyReport },
    { name: 'Cashflow', icon: TrendingUp, component: CashflowAnalysis },
    { name: 'Projekte', icon: Briefcase, component: ProjectTracker },
    { name: 'Ziele', icon: Target, component: GoalTracker },
    { name: 'Schulden', icon: CreditCard, component: LiabilityTracker },
];

const RightSidebar: React.FC = () => {
    const { viewMode } = useAppState();
    const [activeTab, setActiveTab] = useState('Bericht');
    const exportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (viewMode === 'business' && !['Projekte', 'Cashflow'].includes(activeTab)) {
            setActiveTab('Projekte');
        } else if (viewMode !== 'business' && activeTab === 'Projekte') {
            setActiveTab('Bericht');
        }
    }, [viewMode, activeTab]);

    const ActiveComponent = TABS.find(tab => tab.name === activeTab)?.component || (() => null);
    const isExportable = useMemo(() => ['Bericht', 'Projekte', 'Cashflow'].includes(activeTab), [activeTab]);

    const handleExport = useCallback(() => {
        if (exportRef.current) {
            const svgElement = exportRef.current.querySelector('svg');
            if (svgElement) {
                const svgString = new XMLSerializer().serializeToString(svgElement);
                const blob = new Blob([svgString], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `klaro-chart-${activeTab.toLowerCase()}.svg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }
        }
    }, [activeTab]);
    
    return (
        <aside className="sticky top-24 space-y-6">
            <div className="glass-card rounded-2xl p-4">
                 <div className="flex justify-between items-center mb-4">
                    <div className="p-1 bg-secondary rounded-xl flex items-center flex-wrap">
                        {TABS.map(tab => (
                            <button
                                key={tab.name}
                                onClick={() => setActiveTab(tab.name)}
                                className={`flex-1 whitespace-nowrap py-2 px-3 text-sm font-semibold flex items-center justify-center rounded-lg transition-colors
                                ${activeTab === tab.name
                                    ? 'bg-card shadow-sm text-primary'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <tab.icon className="mr-2 h-5 w-5"/>
                                {tab.name}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={handleExport}
                        disabled={!isExportable}
                        className="p-2 rounded-md text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Diagramm exportieren"
                        title={isExportable ? "Als SVG exportieren" : "Kein exportierbares Diagramm"}
                    >
                        <FileDown className="h-5 w-5" />
                    </button>
                </div>
                <div ref={exportRef} className="p-2">
                    <ActiveComponent />
                </div>
            </div>
        </aside>
    );
};

export default RightSidebar;
