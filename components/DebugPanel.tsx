import React from 'react';
import { useAppState, useAppDispatch } from '../context/AppContext';
import { X, AlertTriangle, Trash2, RefreshCw } from 'lucide-react';
import { Button } from './ui';

const DebugPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const state = useAppState();
    const dispatch = useAppDispatch();

    const handleClearStorage = () => {
        if (window.confirm('Sind Sie sicher, dass Sie den gesamten lokalen Speicher löschen möchten? Die App wird neu geladen.')) {
            localStorage.removeItem('klaro-state');
            window.location.reload();
        }
    };

    const handleResetState = () => {
        if (window.confirm('Sind Sie sicher, dass Sie den Zustand auf die ursprünglichen Beispieldaten zurücksetzen möchten?')) {
            dispatch({ type: 'RESET_STATE' });
        }
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-card/80 backdrop-blur-lg border-t-2 border-destructive shadow-2xl max-h-[50vh] flex flex-col animate-fade-in">
            <div className="flex items-center justify-between p-2 border-b border-border/20 bg-destructive/10">
                <div className="flex items-center gap-2 font-bold text-destructive">
                    <AlertTriangle size={18} />
                    <span>Debug Panel</span>
                </div>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-secondary">
                    <X size={18} />
                </button>
            </div>
            <div className="p-4 overflow-auto flex-grow">
                <div className="flex items-center gap-4 mb-4">
                    <Button onClick={handleClearStorage} variant="destructive" className="flex items-center gap-2">
                        <Trash2 size={16} />
                        Clear Storage & Reload
                    </Button>
                     <Button onClick={handleResetState} variant="secondary" className="flex items-center gap-2">
                        <RefreshCw size={16} />
                        Reset State to Sample
                    </Button>
                </div>
                <h3 className="font-semibold mb-2">Current App State:</h3>
                <pre className="text-xs bg-secondary p-3 rounded-lg overflow-x-auto">
                    {JSON.stringify(state, (key, value) => {
                        if (value instanceof Set) {
                            return Array.from(value);
                        }
                        return value;
                    }, 2)}
                </pre>
            </div>
        </div>
    );
};

export default DebugPanel;
