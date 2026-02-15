
import React, { useState, useEffect } from 'react';
import { useAppDispatch } from '../context/AppContext';
import { Home, List, ScanLine, BarChart3, Plus } from 'lucide-react';

const BottomNav: React.FC = () => {
    const dispatch = useAppDispatch();
    const [activeSection, setActiveSection] = useState<'home' | 'journal'>('home');

    useEffect(() => {
        const handleScroll = () => {
            const journalEl = document.getElementById('journal-section');
            if (journalEl) {
                const rect = journalEl.getBoundingClientRect();
                if (rect.top < window.innerHeight / 3) {
                    setActiveSection('journal');
                } else {
                    setActiveSection('home');
                }
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleAction = (type: string) => {
        if (navigator.vibrate) {
            if (type === 'add') navigator.vibrate([15, 30, 15]);
            else navigator.vibrate(10);
        }

        if (type === 'home') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (type === 'journal') {
            const el = document.getElementById('journal-section');
            if (el) {
                const yOffset = -120; 
                const y = el.getBoundingClientRect().top + window.scrollY + yOffset;
                window.scrollTo({ top: y, behavior: 'smooth' });
            }
        } else if (type === 'add') dispatch({ type: 'OPEN_MODAL', payload: { type: 'ADD_TRANSACTION' } });
        else if (type === 'scan') dispatch({ type: 'OPEN_MODAL', payload: { type: 'SMART_SCAN' } });
        else if (type === 'analysis') dispatch({ type: 'OPEN_MODAL', payload: { type: 'ANALYSIS' } });
    };

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[150] px-4 pt-2 pointer-events-none pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
            <div className="max-w-md mx-auto pointer-events-auto">
                <div className="glass-card rounded-[2.5rem] flex items-stretch justify-around p-2 border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] bg-background/80 backdrop-blur-3xl min-h-[72px]">
                    <button 
                        onClick={() => handleAction('home')}
                        className={`flex-1 flex items-center justify-center rounded-2xl transition-all active:bg-secondary/50 ${activeSection === 'home' ? 'text-primary scale-110' : 'text-muted-foreground/30'}`}
                        aria-label="Home"
                    >
                        <Home size={24} />
                    </button>
                    
                    <button 
                        onClick={() => handleAction('journal')}
                        className={`flex-1 flex items-center justify-center rounded-2xl transition-all active:bg-secondary/50 ${activeSection === 'journal' ? 'text-primary scale-110' : 'text-muted-foreground/30'}`}
                        aria-label="Journal"
                    >
                        <List size={24} />
                    </button>

                    <div className="flex-1 flex justify-center items-center">
                        <button 
                            onClick={() => handleAction('add')}
                            className="bg-primary text-primary-foreground h-16 w-16 rounded-[1.75rem] flex items-center justify-center shadow-2xl shadow-primary/40 -mt-12 border-4 border-background active:scale-125 active:rotate-90 transition-all shimmer"
                            aria-label="Add Transaction"
                        >
                            <Plus size={32} strokeWidth={3} />
                        </button>
                    </div>

                    <button 
                        onClick={() => handleAction('scan')}
                        className="flex-1 flex items-center justify-center rounded-2xl text-muted-foreground/30 active:text-primary active:bg-secondary/50 transition-all"
                        aria-label="Scan"
                    >
                        <ScanLine size={24} />
                    </button>

                    <button 
                        onClick={() => handleAction('analysis')}
                        className="flex-1 flex items-center justify-center rounded-2xl text-muted-foreground/30 active:text-primary active:bg-secondary/50 transition-all"
                        aria-label="Analysis"
                    >
                        <BarChart3 size={24} />
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default BottomNav;
