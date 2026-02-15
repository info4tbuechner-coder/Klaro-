
import React, { useState, memo, useEffect, useMemo } from 'react';
import { useAppState, useAppDispatch } from '../context/AppContext';
import { Sun, Moon, BarChart2, Settings, Menu, X, Bot, Palette, FileDown, Repeat, Gem, Bug, ChevronDown, Sparkles, Music, TreePine, Zap, Shield, Database, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import type { Theme, ViewMode, ModalType } from '../types';

const THEMES: { name: Theme; icon: React.ReactNode; color: string }[] = [
  { name: 'onyx', icon: <Shield size={20} />, color: 'bg-slate-900' },
  { name: 'grandeur', icon: <Sun size={20} />, color: 'bg-blue-500' },
  { name: 'blockchain', icon: <Gem size={20} />, color: 'bg-emerald-500' },
  { name: 'synthwave', icon: <Music size={20} />, color: 'bg-pink-500' },
  { name: 'neon', icon: <Zap size={20} />, color: 'bg-indigo-500' },
  { name: 'forest', icon: <TreePine size={20} />, color: 'bg-green-600' },
];

const ViewSwitcher = memo(({ viewMode, setViewMode }: { viewMode: ViewMode, setViewMode: (mode: ViewMode) => void }) => (
    <div className="flex items-center p-1.5 rounded-[2rem] bg-secondary/30 border border-border/10 shadow-inner backdrop-blur-2xl">
        {['all', 'private', 'business'].map((mode) => (
            <button key={mode} onClick={() => setViewMode(mode as ViewMode)} 
                className={`px-5 py-2 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${viewMode === mode ? 'bg-background text-foreground shadow-xl scale-[1.05]' : 'text-muted-foreground/40 hover:text-foreground'}`}>
                {mode === 'all' ? 'Alle' : mode === 'private' ? 'P' : 'B'}
                <span className="hidden sm:inline ml-1">{mode === 'all' ? '' : mode === 'private' ? 'rivat' : 'usiness'}</span>
            </button>
        ))}
    </div>
));

const Header: React.FC = () => {
    const { theme, viewMode, userProfile, syncStatus } = useAppState();
    const dispatch = useAppDispatch();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const userInitials = useMemo(() => {
        const name = userProfile?.name || 'User';
        return name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
    }, [userProfile?.name]);

    const isSyncing = syncStatus === 'syncing';

    return (
        <header className={`sticky top-0 z-[60] w-full px-4 sm:px-8 lg:px-12 transition-all duration-500 ${scrolled ? 'pt-2' : 'pt-4'} pt-[calc(env(safe-area-inset-top,0px)+0.5rem)]`}>
            <div className={`glass-card mx-auto container border border-white/5 transition-all duration-500 ${scrolled ? 'rounded-[2rem] py-1 shadow-2xl' : 'rounded-[3rem] py-2 lg:py-3 shadow-2xl'}`}>
                <div className="flex items-center justify-between h-14 sm:h-20 px-4 sm:px-10">
                    <div className="flex items-center gap-3 sm:gap-4 group cursor-pointer" onClick={() => {
                        if (navigator.vibrate) navigator.vibrate(5);
                        window.scrollTo({top: 0, behavior: 'smooth'});
                    }}>
                        <div className="bg-primary text-primary-foreground p-2 sm:p-3 rounded-[1rem] sm:rounded-[1.25rem] shadow-xl transform transition-all duration-700 group-hover:rotate-[360deg]">
                            <Bot size={20} strokeWidth={2.5} className="sm:w-6 sm:h-6" />
                        </div>
                        <div className="hidden sm:block">
                            <span className="text-2xl font-black tracking-tighter">Klaro</span>
                            <div className="flex items-center gap-1.5 text-[7px] font-black uppercase tracking-[0.4em] text-primary/60 mt-0.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                                {isOnline ? 'Intelligence' : 'Offline Mode'}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 lg:gap-10">
                        <ViewSwitcher viewMode={viewMode} setViewMode={(m) => {
                            if (navigator.vibrate) navigator.vibrate(5);
                            dispatch({ type: 'SET_VIEW_MODE', payload: m });
                        }} />
                        
                        <div className="hidden lg:flex items-center gap-2">
                             <button onClick={() => dispatch({ type: 'OPEN_MODAL', payload: { type: 'SYNC_DATA' } })} className={`p-3.5 hover:bg-secondary rounded-2xl text-muted-foreground/40 hover:text-emerald-500 transition-all active:scale-90 relative ${isSyncing ? 'animate-pulse text-emerald-500' : ''}`} title="Blockchain Sync">
                                {isSyncing ? <RefreshCw size={22} className="animate-spin" /> : <Database size={22} />}
                                {syncStatus === 'error' && <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full"></div>}
                             </button>
                             <div className="relative">
                                <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="p-3.5 hover:bg-secondary rounded-2xl text-muted-foreground/40 hover:text-primary transition-all active:scale-90">
                                    <Settings size={22} />
                                </button>
                                {isDropdownOpen && (
                                    <div className="absolute right-0 mt-6 w-72 glass-card rounded-[2.5rem] p-6 shadow-4xl animate-slide-up border border-white/10 z-50 backdrop-blur-3xl" onMouseLeave={() => setIsDropdownOpen(false)}>
                                        <div className="text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground/20 mb-4 px-2">Konfiguration</div>
                                        <div className="space-y-1">
                                            {['Kategorien', 'Sparziele', 'Automatisierung'].map((item, idx) => (
                                                <button key={item} onClick={() => setIsDropdownOpen(false)} className="w-full text-left p-3.5 rounded-xl hover:bg-primary/5 font-bold transition-all text-sm opacity-60 hover:opacity-100">{item}</button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                             </div>
                        </div>

                        <button onClick={() => {
                            if (navigator.vibrate) navigator.vibrate(10);
                            dispatch({ type: 'OPEN_MODAL', payload: { type: 'USER_PROFILE' } });
                        }} 
                            className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary to-blue-600 text-white font-black text-[10px] sm:text-sm shadow-xl shadow-primary/20 active:scale-90 transition-all border border-white/10">
                            {userInitials}
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
