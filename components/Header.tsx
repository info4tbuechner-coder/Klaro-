import React, { useState, memo } from 'react';
import { useAppState, useAppDispatch } from '../context/AppContext';
import { Sun, Moon, BarChart2, Settings, Menu, X, Bot, Palette, FileDown, UploadCloud, Repeat, Gem } from 'lucide-react';
import type { Theme, ViewMode, ModalType } from '../types';

const THEMES: { name: Theme; icon: React.ReactNode }[] = [
  { name: 'grandeur', icon: <Sun className="h-5 w-5" /> },
  { name: 'synthwave', icon: <Moon className="h-5 w-5" /> },
  { name: 'blockchain', icon: <Gem className="h-5 w-5" /> },
  { name: 'neon', icon: <Bot className="h-5 w-5" /> },
  { name: 'forest', icon: <Palette className="h-5 w-5" /> },
];

const baseButtonClass = "px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200";
const activeButtonClass = "bg-primary text-primary-foreground";
const inactiveButtonClass = "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground";

const ViewSwitcher = memo(({ viewMode, setViewMode, isBlockchainTheme }: { viewMode: ViewMode, setViewMode: (mode: ViewMode) => void, isBlockchainTheme: boolean }) => (
    <div className={`flex items-center space-x-1 p-1 rounded-lg ${isBlockchainTheme ? 'border border-border' : 'bg-muted'}`}>
        <button onClick={() => setViewMode('all')} className={`${baseButtonClass} ${viewMode === 'all' ? activeButtonClass : inactiveButtonClass}`}>Alle</button>
        <button onClick={() => setViewMode('private')} className={`${baseButtonClass} ${viewMode === 'private' ? activeButtonClass : inactiveButtonClass}`}>Privat</button>
        <button onClick={() => setViewMode('business')} className={`${baseButtonClass} ${viewMode === 'business' ? activeButtonClass : inactiveButtonClass}`}>Business</button>
    </div>
));

interface NavItemsProps {
    isMobile?: boolean;
    openModal: (modal: ModalType) => void;
    isDropdownOpen: boolean;
    setIsDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
    theme: Theme;
    setTheme: (theme: Theme) => void;
    isBlockchainTheme: boolean;
}

// FIX: Destructured isBlockchainTheme from props
const NavItems = memo(({ isMobile = false, openModal, isDropdownOpen, setIsDropdownOpen, theme, setTheme, isBlockchainTheme }: NavItemsProps) => (
    <div className={`flex items-center ${isMobile ? 'flex-col space-y-4' : 'space-x-4'}`}>
        <button onClick={() => openModal({type: 'ANALYSIS'})} className={`${baseButtonClass} ${inactiveButtonClass} flex items-center`}>
            <BarChart2 className="mr-2 h-4 w-4" /> Analyse
        </button>
        <div className="relative">
            <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`${baseButtonClass} ${inactiveButtonClass} flex items-center`}
            >
                <Settings className="mr-2 h-4 w-4" /> Verwaltung
            </button>
            {isDropdownOpen && (
                <div className={`absolute ${isMobile ? 'static' : 'right-0 mt-2'} w-48 rounded-md shadow-lg py-1 glass-card ring-1 ring-black ring-opacity-5 z-20 animate-fade-in`}>
                    <a href="#" onClick={(e) => { e.preventDefault(); openModal({type: 'MANAGE_CATEGORIES'}); setIsDropdownOpen(false); }} className="block px-4 py-2 text-sm text-foreground hover:bg-secondary">Kategorien</a>
                    <a href="#" onClick={(e) => { e.preventDefault(); openModal({type: 'MANAGE_GOALS'}); setIsDropdownOpen(false);}} className="block px-4 py-2 text-sm text-foreground hover:bg-secondary">Ziele</a>
                    <a href="#" onClick={(e) => { e.preventDefault(); openModal({type: 'MANAGE_PROJECTS'}); setIsDropdownOpen(false);}} className="block px-4 py-2 text-sm text-foreground hover:bg-secondary">Projekte</a>
                    <a href="#" onClick={(e) => { e.preventDefault(); openModal({type: 'MANAGE_RECURRING'}); setIsDropdownOpen(false);}} className="block px-4 py-2 text-sm text-foreground hover:bg-secondary">Daueraufträge</a>
                    <a href="#" onClick={(e) => { e.preventDefault(); openModal({type: 'MANAGE_LIABILITIES'}); setIsDropdownOpen(false);}} className="block px-4 py-2 text-sm text-foreground hover:bg-secondary">Schulden</a>
                    <div className="border-t border-border my-1"></div>
                    <a href="#" onClick={(e) => { e.preventDefault(); openModal({type: 'EXPORT_IMPORT_DATA'}); setIsDropdownOpen(false);}} className="flex items-center px-4 py-2 text-sm text-foreground hover:bg-secondary"><UploadCloud className="mr-2 h-4 w-4" /> Export / Import</a>
                    <a href="#" onClick={(e) => { e.preventDefault(); openModal({type: 'TAX_EXPORT'}); setIsDropdownOpen(false);}} className="flex items-center px-4 py-2 text-sm text-foreground hover:bg-secondary"><FileDown className="mr-2 h-4 w-4" /> Steuer-Export</a>
                    <div className="border-t border-border my-1"></div>
                     <a href="#" onClick={(e) => { e.preventDefault(); openModal({type: 'SYNC_DATA'}); setIsDropdownOpen(false);}} className="flex items-center px-4 py-2 text-sm text-foreground hover:bg-secondary"><Repeat className="mr-2 h-4 w-4" /> Sync (Pro)</a>
                </div>
            )}
        </div>
        <div className={`flex items-center p-1 rounded-full ${isBlockchainTheme ? 'border border-border' : 'bg-muted'}`}>
            {THEMES.map(t => (
                <button
                    key={t.name}
                    onClick={() => setTheme(t.name)}
                    className={`p-2 rounded-full transition-colors ${theme === t.name ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    aria-label={`Wechsle zu ${t.name} Theme`}
                >
                    {t.icon}
                </button>
            ))}
        </div>
    </div>
));


const Header: React.FC = () => {
    const { theme, viewMode } = useAppState();
    const dispatch = useAppDispatch();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const isBlockchainTheme = theme === 'blockchain';

    const setTheme = (newTheme: Theme) => dispatch({ type: 'SET_THEME', payload: newTheme });
    const setViewMode = (newMode: ViewMode) => dispatch({ type: 'SET_VIEW_MODE', payload: newMode });
    const openModal = (modal: ModalType) => dispatch({ type: 'OPEN_MODAL', payload: modal });

    const navItemsProps = { openModal, isDropdownOpen, setIsDropdownOpen, theme, setTheme, isBlockchainTheme };

    return (
        <header className="sticky top-0 z-40 w-full glass-card">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <span className={`text-2xl font-bold ${theme === 'synthwave' || theme === 'blockchain' ? 'text-primary' : ''}`}>Klaro</span>
                    </div>
                    <div className="hidden md:flex items-center space-x-4">
                        <ViewSwitcher viewMode={viewMode} setViewMode={setViewMode} isBlockchainTheme={isBlockchainTheme} />
                        <NavItems {...navItemsProps} />
                    </div>
                    <div className="md:hidden flex items-center">
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="inline-flex items-center justify-center p-2 rounded-md text-foreground hover:bg-secondary focus:outline-none">
                            {isMenuOpen ? <X /> : <Menu />}
                        </button>
                    </div>
                </div>
            </div>
            {isMenuOpen && (
                <div className="md:hidden glass-card p-4 space-y-4 animate-slide-down">
                    <ViewSwitcher viewMode={viewMode} setViewMode={setViewMode} isBlockchainTheme={isBlockchainTheme} />
                    <NavItems isMobile={true} {...navItemsProps} />
                </div>
            )}
        </header>
    );
};

export default Header;