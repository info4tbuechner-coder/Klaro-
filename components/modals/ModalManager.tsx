
import React, { useState, memo, useMemo, useEffect, useRef } from 'react';
import { useAppState, useAppDispatch, useNetWorthData } from '../../context/AppContext';
import { Transaction, TransactionType } from '../../types';
import { TrendingUp, Wallet, ArrowRightLeft, PieChart as PieIcon, Plus, Trash2, Edit2, Camera, Calendar, Tag as TagIcon, Download, Upload, LogOut, Smartphone, Heart, WifiOff, AlertCircle, ShieldCheck, Database, Globe, RefreshCw, BrainCircuit, CameraOff } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatDate, formatCompactNumber } from '../../utils';
import { format } from 'date-fns/format';
import { Modal, Button, Select, Input, FormGroup } from '../ui';
import { GoogleGenAI, Type } from "@google/genai";

// 1. Deklaration der Sub-Komponenten (vor dem Registry-Objekt)

const SyncModal: React.FC = memo(() => {
    const dispatch = useAppDispatch();
    const { syncStatus, lastSyncAt } = useAppState();
    const [step, setStep] = useState(0);
    const [progress, setProgress] = useState(0);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const isOnline = navigator.onLine;

    const steps = ["Verbindung...", "Validierung...", "Sync...", "Encryption...", "Finalisierung..."];

    const startSync = async () => {
        if (!isOnline) {
            setErrorMsg("Keine Verbindung.");
            dispatch({ type: 'SET_SYNC_STATUS', payload: 'error' });
            return;
        }
        dispatch({ type: 'SET_SYNC_STATUS', payload: 'syncing' });
        for (let i = 0; i < steps.length; i++) {
            setStep(i);
            for (let p = 0; p <= 100; p += 10) {
                setProgress(p);
                await new Promise(r => setTimeout(r, 60));
            }
        }
        dispatch({ type: 'SYNC_COMPLETED', payload: new Date().toISOString() });
    };

    return (
        <div className="space-y-8 animate-in">
            <div className="bg-secondary/20 p-8 rounded-[3rem] text-center border border-white/5">
                <div className={`w-20 h-20 mx-auto rounded-[2rem] flex items-center justify-center mb-6 transition-all duration-700 ${syncStatus === 'syncing' ? 'bg-primary text-primary-foreground animate-pulse rotate-12' : syncStatus === 'error' ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    {syncStatus === 'syncing' ? <RefreshCw className="animate-spin" /> : syncStatus === 'error' ? <AlertCircle /> : <ShieldCheck />}
                </div>
                <h4 className="text-xl font-black">Blockchain Sync</h4>
                <p className="text-[10px] font-black uppercase opacity-40 mt-2">
                    {lastSyncAt ? `Zuletzt: ${format(new Date(lastSyncAt), 'HH:mm:ss')}` : 'Noch kein Sync'}
                </p>
            </div>
            {syncStatus === 'syncing' && (
                <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-primary">
                        <span>{steps[step]}</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-secondary/30 rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            )}
            <div className="flex gap-4">
                <Button onClick={() => dispatch({ type: 'CLOSE_MODAL' })} className="flex-1">Schließen</Button>
                {syncStatus !== 'syncing' && <Button onClick={startSync} variant="primary" className="flex-[2]">Sync Starten</Button>}
            </div>
        </div>
    );
});

const TransactionModal: React.FC<{ initialData?: Partial<Transaction>, transaction?: Transaction }> = memo(({ initialData, transaction }) => {
    const { categories } = useAppState();
    const dispatch = useAppDispatch();
    const isEdit = !!transaction;
    const [formData, setFormData] = useState({
        amount: transaction?.amount?.toString() || initialData?.amount?.toString() || '',
        description: transaction?.description || initialData?.description || '',
        date: transaction?.date || initialData?.date || format(new Date(), 'yyyy-MM-dd'),
        type: transaction?.type || initialData?.type || TransactionType.EXPENSE,
        categoryId: transaction?.categoryId || initialData?.categoryId || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(formData.amount);
        if (isNaN(amount) || !formData.description) return;
        if (isEdit && transaction) {
            dispatch({ type: 'UPDATE_TRANSACTION', payload: { ...transaction, ...formData, amount } });
        } else {
            dispatch({ type: 'ADD_TRANSACTION', payload: { ...formData, amount } as any });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <FormGroup label="Typ"><Select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}><option value="expense">Ausgabe</option><option value="income">Einnahme</option></Select></FormGroup>
                <FormGroup label="Datum"><Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></FormGroup>
            </div>
            <FormGroup label="Beschreibung"><Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Wofür?" enterKeyHint="next" /></FormGroup>
            <FormGroup label="Betrag"><Input type="number" step="0.01" inputMode="decimal" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="0,00" enterKeyHint="done" /></FormGroup>
            <div className="flex gap-4 pt-4">
                <Button type="button" onClick={() => dispatch({ type: 'CLOSE_MODAL' })} className="flex-1">Abbrechen</Button>
                <Button type="submit" variant="primary" className="flex-1">{isEdit ? 'Speichern' : 'Hinzufügen'}</Button>
            </div>
        </form>
    );
});

const ViewTransactionModal: React.FC<{ transaction: Transaction }> = memo(({ transaction }) => {
    const { categories, userProfile } = useAppState();
    const dispatch = useAppDispatch();
    const category = categories.find(c => c.id === transaction.categoryId);
    return (
        <div className="space-y-8 animate-in">
            <div className="text-center p-8 bg-secondary/20 rounded-[3rem] border border-white/5">
                <h4 className="text-3xl font-black">{formatCurrency(transaction.amount, userProfile.currency, userProfile.language)}</h4>
                <p className="text-sm font-bold text-muted-foreground/60 mt-1">{transaction.description}</p>
            </div>
            <div className="flex gap-4">
                <Button onClick={() => dispatch({ type: 'DELETE_TRANSACTIONS', payload: [transaction.id] })} variant="destructive" className="flex-1">Löschen</Button>
                <Button onClick={() => dispatch({ type: 'OPEN_MODAL', payload: { type: 'EDIT_TRANSACTION', data: { transaction } } })} variant="primary" className="flex-1">Bearbeiten</Button>
            </div>
        </div>
    );
});

const IntelligenceCenter: React.FC = memo(() => {
    const { userProfile } = useAppState();
    const [tab, setTab] = useState<'wealth' | 'flow'>('wealth');
    const netWorthData = useNetWorthData();
    return (
        <div className="space-y-8 animate-in">
            <div className="flex gap-2 p-1.5 bg-secondary/20 rounded-[2rem] border border-white/5">
                {['wealth', 'flow'].map(t => (
                    <button key={t} onClick={() => setTab(t as any)} className={`flex-1 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest ${tab === t ? 'bg-background text-foreground shadow-2xl' : 'text-muted-foreground/40'}`}>
                        {t === 'wealth' ? 'Vermögen' : 'Cashflow'}
                    </button>
                ))}
            </div>
            <div className="h-[350px] w-full glass-card rounded-[3rem] p-6 border border-white/5">
                <ResponsiveContainer>
                    <AreaChart data={netWorthData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={9} />
                        <YAxis axisLine={false} tickLine={false} fontSize={9} tickFormatter={(v) => formatCompactNumber(v, userProfile.currency, userProfile.language)} />
                        <Tooltip formatter={(v: number) => [formatCurrency(v, userProfile.currency, userProfile.language), "Betrag"]} />
                        <Area type="monotone" dataKey="netWorth" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.1)" strokeWidth={3} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
});

const UserProfileModal: React.FC = memo(() => {
    const { userProfile } = useAppState();
    const dispatch = useAppDispatch();
    return (
        <div className="space-y-8 animate-in">
            <div className="text-center p-6 bg-secondary/20 rounded-[3rem] border border-white/5">
                <div className="w-20 h-20 rounded-full bg-primary/20 mx-auto flex items-center justify-center text-primary text-2xl font-black mb-4">{userProfile.name[0]}</div>
                <h4 className="text-xl font-black">{userProfile.name}</h4>
                <p className="text-[10px] font-black uppercase opacity-40">{userProfile.email}</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
                <Button onClick={() => dispatch({ type: 'RESET_STATE' })} variant="destructive"><LogOut size={18} /> Alle Daten löschen</Button>
                <Button onClick={() => dispatch({ type: 'CLOSE_MODAL' })}>Schließen</Button>
            </div>
        </div>
    );
});

const SmartScanModal: React.FC = memo(() => {
    const dispatch = useAppDispatch();
    const [isScanning, setIsScanning] = useState(false);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const isOnline = navigator.onLine;

    useEffect(() => {
        if (isOnline) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                .then(s => { 
                    setHasPermission(true);
                    if (videoRef.current) videoRef.current.srcObject = s; 
                })
                .catch(err => {
                    console.error(err);
                    setHasPermission(false);
                });
        }
    }, [isOnline]);

    const handleCapture = async () => {
        setIsScanning(true);
        // Simulation der KI-Logik
        setTimeout(() => {
            dispatch({ type: 'CLOSE_MODAL' });
            setIsScanning(false);
        }, 2000);
    };

    if (!isOnline) {
        return (
             <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 animate-in">
                <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500"><WifiOff size={40} /></div>
                <div>
                    <h4 className="text-lg font-black uppercase tracking-widest">Offline</h4>
                    <p className="text-xs text-muted-foreground/60 mt-2 max-w-[200px]">Der KI-Scan benötigt eine aktive Internetverbindung.</p>
                </div>
                <Button onClick={() => dispatch({ type: 'CLOSE_MODAL' })}>Abbrechen</Button>
            </div>
        )
    }

    if (hasPermission === false) {
        return (
             <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 animate-in">
                <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500"><CameraOff size={40} /></div>
                <div>
                    <h4 className="text-lg font-black uppercase tracking-widest">Kein Zugriff</h4>
                    <p className="text-xs text-muted-foreground/60 mt-2 max-w-[200px]">Bitte erlaube den Zugriff auf die Kamera in deinen Browsereinstellungen.</p>
                </div>
                <Button onClick={() => dispatch({ type: 'CLOSE_MODAL' })}>Abbrechen</Button>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in">
            <div className="aspect-[3/4] bg-secondary/50 rounded-[3rem] overflow-hidden border border-white/10 relative">
                {isScanning && <div className="absolute inset-0 bg-background/60 backdrop-blur-md z-10 flex items-center justify-center"><RefreshCw className="animate-spin text-primary" /></div>}
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            </div>
            <Button onClick={handleCapture} variant="primary" className="w-full" disabled={isScanning}><Camera /> Foto aufnehmen</Button>
        </div>
    );
});

// 2. Registry-Objekt (Jetzt sicher, da alle Komponenten deklariert sind)

const MODAL_COMPONENTS: any = {
    ADD_TRANSACTION: { component: TransactionModal, title: 'Neuer Beleg', size: 'lg' }, 
    EDIT_TRANSACTION: { component: TransactionModal, title: 'Bearbeiten', size: 'lg' },
    VIEW_TRANSACTION: { component: ViewTransactionModal, title: 'Details', size: 'lg' },
    ANALYSIS: { component: IntelligenceCenter, title: 'Intelligence Center', size: 'xl' },
    SMART_SCAN: { component: SmartScanModal, title: 'KI Beleg-Scan', size: 'md' },
    USER_PROFILE: { component: UserProfileModal, title: 'Mein Profil', size: 'md' },
    SYNC_DATA: { component: SyncModal, title: 'Network Sync', size: 'md' },
};

const ModalManager: React.FC = () => {
    const { activeModal } = useAppState();
    const dispatch = useAppDispatch();
    const [paramsLoaded, setParamsLoaded] = useState(false);

    // Deep Link Handler (PWA Shortcuts)
    useEffect(() => {
        if (paramsLoaded) return;
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');
        if (action === 'add_transaction') {
            dispatch({ type: 'OPEN_MODAL', payload: { type: 'ADD_TRANSACTION' } });
            window.history.replaceState({}, '', '/');
        } else if (action === 'smart_scan') {
            dispatch({ type: 'OPEN_MODAL', payload: { type: 'SMART_SCAN' } });
            window.history.replaceState({}, '', '/');
        }
        setParamsLoaded(true);
    }, [dispatch, paramsLoaded]);

    if (!activeModal) return null;
    const config = MODAL_COMPONENTS[activeModal.type] || { component: () => null, title: 'Klaro', size: 'md' };
    const ActiveComp = config.component;
    
    return (
        <Modal title={config.title} onClose={() => dispatch({ type: 'CLOSE_MODAL' })} size={config.size}>
            <ActiveComp {...('data' in activeModal ? activeModal.data : {})} />
        </Modal>
    );
};

export default ModalManager;
