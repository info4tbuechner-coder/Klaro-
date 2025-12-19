
import React, { useState, useEffect } from 'react';
import { AppProvider, useAppState } from './context/AppContext';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import RightSidebar from './components/RightSidebar';
import ModalManager from './components/modals/ModalManager';
import { Plus, ScanLine } from 'lucide-react';
import { useAppDispatch } from './context/AppContext';
import DebugPanel from './components/DebugPanel';
import { ModalType } from './types';

const FloatingActionButtons: React.FC = () => {
    const dispatch = useAppDispatch();
    const openModal = (modal: ModalType) => dispatch({ type: 'OPEN_MODAL', payload: modal });
    
    return (
        <div className="fixed bottom-8 right-8 flex flex-col items-center gap-4 z-30">
            <button
                onClick={() => openModal({ type: 'SMART_SCAN' })}
                className="bg-secondary text-secondary-foreground h-14 w-14 rounded-full shadow-lg flex items-center justify-center hover:bg-card focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-all transform hover:scale-110"
                aria-label="Beleg scannen"
                title="Beleg scannen (Smart Scan)"
            >
                <ScanLine size={28} />
            </button>
            <button
                onClick={() => openModal({ type: 'ADD_TRANSACTION' })}
                className="bg-primary text-primary-foreground h-16 w-16 rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-transform transform hover:scale-110"
                aria-label="Neue Transaktion hinzufügen"
                title="Neue Transaktion manuell hinzufügen"
            >
                <Plus size={32} />
            </button>
        </div>
    );
};

const AppContent: React.FC = () => {
    const { theme } = useAppState();
    const isBlockchainTheme = theme === 'blockchain';
    const [isDebugPanelVisible, setIsDebugPanelVisible] = useState(false);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'D') {
                event.preventDefault();
                setIsDebugPanelVisible(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    return (
        <div className={`theme-${theme} font-sans min-h-screen bg-gradient-to-br from-background-start to-background-end text-foreground transition-colors duration-500 ${isBlockchainTheme ? 'blockchain-bg' : ''}`}>
            <Header />
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <FloatingActionButtons />
            <ModalManager />
            {isDebugPanelVisible && <DebugPanel onClose={() => setIsDebugPanelVisible(false)} />}
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