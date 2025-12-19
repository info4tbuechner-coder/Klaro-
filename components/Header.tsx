
import React, { useState, memo } from 'react';
import { useAppState, useAppDispatch } from '../context/AppContext';
import { Sun, Moon, BarChart2, Settings, Menu, X, Bot, Palette, FileDown, UploadCloud, Repeat, Gem, User, Bug, ChevronDown } from 'lucide-react';
import type { Theme, ViewMode, ModalType } from '../types';

const THEMES: { name: Theme; icon: React.ReactNode; color: string }[] = [
  { name: 'grandeur', icon: <Sun className="h-4 w-4" />, color: 'bg-blue-500' },
  { name: 'synthwave', icon: <Moon className="h-4 w-4" />, color: 'bg-pink-500' },
  { name: 'blockchain', icon: <Gem className="h-4 w-4" />, color: 'bg-emerald-500' },
  { name: 'neon', icon: <Bot className="h-4 w-4" />, color: 'bg-purple-500' },
  { name: 'forest', icon: <Palette className="h-4 w-4" />, color: 'bg-green-700' },
];

const ViewSwitcher = memo(({ viewMode, setViewMode }: { viewMode: ViewMode, setViewMode: (mode: ViewMode) => void }) => (
    <div className="flex items-center p-1 rounded-full bg-secondary/50 border border-border/50">
        <button onClick={() => setViewMode('all')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${viewMode === 'all' ? 'bg-background text-foreground shadow-sm scale-105' : 'text-muted-foreground hover:text-foreground'}`}>Alle</button>
        <button onClick={() => setViewMode('private')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${viewMode === 'private' ? 'bg-background text-foreground shadow-sm scale-105' : 'text-muted-foreground hover:text-foreground'}`}>Privat</button>
        <button onClick={() => setViewMode('business')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${viewMode === 'business' ? 'bg-background text-foreground shadow-sm scale-105' : 'text-muted-foreground hover:text-foreground'}`}>Business</button>
    </div>
));

interface NavItemsProps {
    isMobile?: boolean;
    openModal: (modal: ModalType) => void;
    isDropdownOpen: boolean;
    setIsDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
    theme: Theme;
    setTheme: (theme: Theme) => void;
    userInitials: string;
    toggleDebug: () => void;
    debugMode: boolean;
}

const NavItems = memo(({ isMobile = false, openModal, isDropdownOpen, setIsDropdownOpen, theme, setTheme, userInitials, toggleDebug, debugMode }: NavItemsProps) => (
    <div className={`flex items-center ${isMobile ? 'flex-col space-y-4 w-full' : 'space-x-2'}`}>
        <button 
            onClick={() => openModal({type: 'ANALYSIS'})} 
            className={`px-4 py-2 rounded-full text-sm font-bold flex items-center transition-all duration-200 text-muted-foreground hover:text-primary hover:bg-primary/5 ${isMobile ? 'w-full justify-center' : ''}`}
        >
            <BarChart2 className="mr-2 h-4 w-4" /> Analyse
        </button>
        
        <div className={`relative ${isMobile ? 'w-full' : ''}`}>
            <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`px-4 py-2 rounded-full text-sm font-bold flex items-center transition-all duration-200 text-muted-foreground hover:text-primary hover:bg-primary/5 ${isMobile ? 'w-full justify-center' : ''}`}
            >
                <Settings className="mr-2 h-4 w-4" /> Verwaltung <ChevronDown className={`ml-1 h-3 w-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}/>
            </button>
            {isDropdownOpen && (
                <div className={`absolute ${isMobile ? 'relative w-full mt-2' : 'right-0 mt-3 w-56'} rounded-2xl shadow-xl py-2 glass-card ring-1 ring-black ring-opacity-5 z-20 animate-in-fade`}>
                    <div className="px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">Daten</div>
                    <button onClick={() => { openModal({type: 'MANAGE_CATEGORIES'}); setIsDropdownOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary transition-colors">Kategorien</button>
                    <button onClick={() => { openModal({type: 'MANAGE_GOALS'}); setIsDropdownOpen(false);}} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary transition-colors">Ziele</button>
                    <button onClick={() => { openModal({type: 'MANAGE_PROJECTS'}); setIsDropdownOpen(false);}} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary transition-colors">Projekte</button>
                    <button onClick={() => { openModal({type: 'MANAGE_RECURRING'}); setIsDropdownOpen(false);}} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary transition-colors">Daueraufträge</button>
                    <button onClick={() => { openModal({type: 'MANAGE_LIABILITIES'}); setIsDropdownOpen(false);}} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary transition-colors">Schulden</button>
                    <div className="my-2 border-t border-border/50"></div>
                    <div className="px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">System</div>
                    <button onClick={() => { openModal({type: 'TAX_EXPORT'}); setIsDropdownOpen(false);}} className="w-full text-left flex items-center px-4 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary transition-colors"><FileDown className="mr-2 h-4 w-4" /> Steuer-Export</button>
                     <button onClick={() => { openModal({type: 'SYNC_DATA'}); setIsDropdownOpen(false);}} className="w-full text-left flex items-center px-4 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary transition-colors"><Repeat className="mr-2 h-4 w-4" /> Sync (Pro)</button>
                     <button onClick={() => { toggleDebug(); setIsDropdownOpen(false);}} className="w-full text-left flex items-center px-4 py-2 text-sm text-foreground hover:bg-primary/10 hover:text-primary transition-colors">
                        <Bug className="mr-2 h-4 w-4" /> Debug {debugMode ? 'An' : 'Aus'}
                    </button>
                </div>
            )}
        </div>

        <div className={`flex items-center gap-1 p-1 rounded-full bg-secondary/50 border border-border/50 ${isMobile ? 'justify-center' : ''}`}>
            {THEMES.map(t => (
                <button
                    key={t.name}
                    onClick={() => setTheme(t.name)}
                    className={`p-2 rounded-full transition-all duration-300 relative group ${theme === t.name ? 'bg-background shadow-md scale-110 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    aria-label={`Wechsle zu ${t.name} Theme`}
                >
                    {t.icon}
                    {theme === t.name && <span className={`absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full ${t.color}`}></span>}
                </button>
            ))}
        </div>

        <button
            onClick={() => openModal({ type: 'USER_PROFILE' })}
            className={`flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 text-white font-bold text-sm hover:shadow-lg hover:shadow-primary/20 transition-all transform hover:scale-105 ${isMobile ? 'mt-4' : 'ml-2'}`}
            aria-label="Benutzerprofil"
        >
            {userInitials}
        </button>
    </div>
));


const Header: React.FC = () => {
    const { theme, viewMode, userProfile, debugMode } = useAppState();
    const dispatch = useAppDispatch();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const setTheme = (newTheme: Theme) => dispatch({ type: 'SET_THEME', payload: newTheme });
    const setViewMode = (newMode: ViewMode) => dispatch({ type: 'SET_VIEW_MODE', payload: newMode });
    const openModal = (modal: ModalType) => dispatch({ type: 'OPEN_MODAL', payload: modal });
    const toggleDebug = () => dispatch({ type: 'TOGGLE_DEBUG_MODE' });

    const userInitials = userProfile?.name 
        ? userProfile.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() 
        : 'U';

    const navItemsProps = { openModal, isDropdownOpen, setIsDropdownOpen, theme, setTheme, userInitials, toggleDebug, debugMode };

    return (
        <header className="sticky top-4 z-40 w-full px-4 sm:px-6 lg:px-8 mb-4">
            <div className="glass-card rounded-2xl mx-auto container">
                <div className="flex items-center justify-between h-16 px-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
                            <Bot size={20} />
                        </div>
                        <span className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Klaro</span>
                    </div>
                    
                    <div className="hidden md:flex items-center space-x-6">
                        <ViewSwitcher viewMode={viewMode} setViewMode={setViewMode} />
                        <div className="h-6 w-px bg-border"></div>
                        <NavItems {...navItemsProps} />
                    </div>

                    <div className="md:hidden flex items-center">
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-xl text-foreground hover:bg-secondary transition-colors">
                            {isMenuOpen ? <X /> : <Menu />}
                        </button>
                    </div>
                </div>
            </div>
            
            {isMenuOpen && (
                <div className="md:hidden glass-card mt-2 p-6 rounded-3xl space-y-6 animate-slide-down mx-auto container">
                    <div className="flex justify-center">
                        <ViewSwitcher viewMode={viewMode} setViewMode={setViewMode} />
                    </div>
                    <NavItems isMobile={true} {...navItemsProps} />
                </div>
            )}
        </header>
    );
};

export default Header;
