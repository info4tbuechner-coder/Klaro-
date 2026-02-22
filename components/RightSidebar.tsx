
import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useAppState } from '../context/AppContext';
import { Target, Briefcase, BarChartHorizontal, FileDown, TrendingUp, CreditCard } from 'lucide-react';
import { MonthlyReport, CashflowAnalysis, ProjectTracker, GoalTracker, LiabilityTracker } from './Charts';

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
    const containerRef = useRef<HTMLDivElement>(null);

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
        if (containerRef.current) {
            const containerId = 
                activeTab === 'Bericht' ? '#chart-pie-container' :
                activeTab === 'Cashflow' ? '#chart-cashflow-container' :
                activeTab === 'Projekte' ? '#chart-project-container' : null;

            const targetContainer = containerId ? containerRef.current.querySelector(containerId) : containerRef.current;
            const svgElement = targetContainer?.querySelector('.recharts-surface');

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
            } else {
                alert("Kein Diagramm zum Exportieren gefunden.");
            }
        }
    }, [activeTab]);
    
    return (
        <aside className="sticky top-32 space-y-6">
            <div className="glass-card rounded-[3.5rem] p-8 border border-white/5">
                 <div className="flex justify-between items-center mb-10">
                    <div className="p-1.5 bg-secondary/30 rounded-[2rem] flex items-center flex-wrap gap-1">
                        {TABS.map(tab => (
                            <button
                                key={tab.name}
                                onClick={() => {
                                    if (navigator.vibrate) navigator.vibrate(5);
                                    setActiveTab(tab.name);
                                }}
                                className={`flex-1 whitespace-nowrap py-3 px-4 text-[9px] font-black uppercase tracking-widest flex items-center justify-center rounded-[1.25rem] transition-all
                                ${activeTab === tab.name
                                    ? 'bg-background shadow-xl text-primary scale-[1.05]'
                                    : 'text-muted-foreground/30 hover:text-foreground'
                                }`}
                                title={tab.name}
                            >
                                <tab.icon size={16}/>
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={handleExport}
                        disabled={!isExportable}
                        className="p-4 rounded-2xl bg-secondary/20 text-muted-foreground/20 hover:text-primary disabled:opacity-5 disabled:cursor-not-allowed transition-all"
                        aria-label="Export"
                    >
                        <FileDown size={20} />
                    </button>
                </div>
                <div ref={containerRef} className="animate-in">
                    <ActiveComponent />
                </div>
            </div>
        </aside>
    );
};

export default RightSidebar;
