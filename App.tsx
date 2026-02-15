
import React, { useState, useEffect } from 'react';
import { AppProvider, useAppState } from './context/AppContext';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import RightSidebar from './components/RightSidebar';
import ModalManager from './components/modals/ModalManager';
import BottomNav from './components/BottomNav';
import Onboarding from './components/Onboarding';
import { useAppDispatch } from './context/AppContext';
import DebugPanel from './components/DebugPanel';
import { RefreshCw, CheckCircle2, AlertCircle, WifiOff } from 'lucide-react';

const PWAUpdateToast: React.FC = () => {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const handleUpdate = () => setShow(true);
        window.addEventListener('pwa-update-available', handleUpdate);
        return () => window.removeEventListener('pwa-update-available', handleUpdate);
    }, []);

    if (!show) return null;

    return (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] lg:bottom-8 left-4 right-4 lg:left-auto lg:right-8 lg:w-96 z-[100] animate-slide-up">
            <div className="glass-card bg-primary text-primary-foreground p-5 rounded-3xl flex items-center justify-between shadow-4xl border-none ring-4 ring-primary/20">
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-2 rounded-xl">
                        <RefreshCw size={20} className="animate-spin" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">System-Update</span>
                        <span className="text-xs font-bold">Neue Features bereit!</span>
                    </div>
                </div>
                <button 
                    onClick={() => {
                        if (navigator.vibrate) navigator.vibrate([20, 50, 20]);
                        window.location.reload();
                    }}
                    className="px-5 py-3 bg-white text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/90 active:scale-95 transition-all shadow-xl"
                >
                    Laden
                </button>
            </div>
        </div>
    );
};

const SyncNotificationToast: React.FC = () => {
    const { syncStatus } = useAppState();
    const dispatch = useAppDispatch();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (syncStatus === 'success' || syncStatus === 'error') {
            setVisible(true);
            const timer = setTimeout(() => {
                setVisible(false);
                dispatch({ type: 'SET_SYNC_STATUS', payload: 'idle' });
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [syncStatus, dispatch]);

    if (!visible) return null;

    const isSuccess = syncStatus === 'success';

    return (
        <div className="fixed top-[calc(env(safe-area-inset-top)+6rem)] lg:top-24 right-4 left-4 lg:left-auto lg:w-80 z-[110] animate-slide-up">
            <div className={`glass-card p-4 rounded-2xl flex items-center gap-4 shadow-4xl border-l-4 ${isSuccess ? 'border-emerald-500 bg-emerald-500/10' : 'border-rose-500 bg-rose-500/10'}`}>
                <div className={`p-2 rounded-xl ${isSuccess ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                    {isSuccess ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                </div>
                <div className="flex-grow">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{isSuccess ? 'Synchronisiert' : 'Sync Fehler'}</p>
                    <p className="text-xs font-bold">{isSuccess ? 'Blockchain Ledger aktualisiert.' : 'Fehler bei der Datenübertragung.'}</p>
                </div>
            </div>
        </div>
    );
};

const AppContent: React.FC = () => {
    const { theme, debugMode, onboardingComplete } = useAppState();
    const dispatch = useAppDispatch();
    const isBlockchainTheme = theme === 'blockchain';

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'D') {
                event.preventDefault();
                dispatch({ type: 'TOGGLE_DEBUG_MODE' });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [dispatch]);

    return (
        <div className={`theme-${theme} font-sans min-h-screen bg-gradient-to-br from-background-start to-background-end text-foreground transition-colors duration-500 overflow-x-hidden ${isBlockchainTheme ? 'blockchain-bg' : ''}`}>
            {!onboardingComplete && <Onboarding />}
            
            <Header />
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-32 lg:pb-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <Dashboard />
                        <TransactionList />
                    </div>
                    <div className="hidden lg:block lg:col-span-1">
                        <RightSidebar />
                    </div>
                </div>
            </main>
            
            <BottomNav />
            <ModalManager />
            <SyncNotificationToast />
            <PWAUpdateToast />
            {debugMode && <DebugPanel onClose={() => dispatch({ type: 'TOGGLE_DEBUG_MODE' })} />}
        </div>
    );
};

const App: React.FC = () => {
    return (
        <AppProvider>
            <AppContent />
        </AppProvider>
    );
};

export default App;
