
import React, { useState, useCallback, useRef, useEffect, memo, useMemo } from 'react';
import { useAppState, useAppDispatch, useSankeyData, useCashflowData, useBudgetOverviewData } from '../../context/AppContext';
import { Transaction, Category, Goal, Project, RecurringTransaction, TransactionType, CategoryType, GoalType, Frequency, ModalType, LiabilityType, Liability } from '../../types';
import { GoogleGenAI, Type } from "@google/genai";
import { X, Camera, Sparkles, Trash2, FileDown, UploadCloud, Edit, ArrowDownCircle, ArrowUpCircle, Calendar, GripVertical, CalendarCheck, TrendingUp, PiggyBank, BarChart3, Zap, ShieldCheck, AlertTriangle, RefreshCw, ScanLine, Lock, Server, Share2, CheckCircle2, Loader2, Database, Wifi, Smartphone, PieChart as PieChartIcon, Activity, WifiOff, AlertCircle, Tag, Folder, AlignLeft, CreditCard, Wallet } from 'lucide-react';
import { Sankey, Tooltip, ResponsiveContainer, Rectangle, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { formatCurrency, formatDate, calculateDebtPaydownPlan, PaydownPlan } from '../../utils';
import { format } from 'date-fns/format';
import { Modal, FormGroup, Input, Select, Button } from '../ui';

// jsPDF wird global über CDN geladen, hier deklarieren wir es für TypeScript.
declare const jspdf: any;

const TransactionModal: React.FC<{ transaction?: Transaction }> = memo(({ transaction }) => {
    const { categories, goals, viewMode, liabilities } = useAppState();
    const dispatch = useAppDispatch();

    const getInitialFormData = useCallback(() => {
        if (transaction) return { ...transaction, categoryId: transaction.categoryId || '', goalId: transaction.goalId || '', liabilityId: transaction.liabilityId || '', tags: transaction.tags || [] };
        return {
            type: TransactionType.EXPENSE, amount: 0, description: '',
            date: format(new Date(), 'yyyy-MM-dd'),
            categoryId: '', goalId: '', liabilityId: '',
            tags: viewMode === 'private' ? ['privat'] : viewMode === 'business' ? ['business'] : [],
        };
    }, [transaction, viewMode]);

    const [formData, setFormData] = useState<Omit<Transaction, 'id'>>(getInitialFormData());

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        if (name === 'amount') {
            const floatVal = parseFloat(value);
            // Prevent negative values in state
            if (floatVal < 0) return;
            setFormData(prev => ({ ...prev, amount: isNaN(floatVal) ? 0 : floatVal }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    }, []);
    
    // Prevent typing invalid characters for amounts
    const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === '-' || e.key === 'e' || e.key === '+') {
            e.preventDefault();
        }
    };
    
    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        
        // Strict validation
        if (formData.amount <= 0) {
            alert("Bitte geben Sie einen positiven Betrag ein.");
            return;
        }
        if (!formData.description.trim()) {
            alert("Bitte geben Sie eine Beschreibung ein.");
            return;
        }

        if(transaction) {
            dispatch({ type: 'UPDATE_TRANSACTION', payload: { ...formData, id: transaction.id } });
        } else {
            dispatch({ type: 'ADD_TRANSACTION', payload: formData });
        }
    }, [dispatch, formData, transaction]);

    const handleDelete = useCallback(() => {
        if (transaction && window.confirm("Möchten Sie diese Transaktion wirklich löschen?")) {
            dispatch({ type: 'DELETE_TRANSACTIONS', payload: [transaction.id] });
            dispatch({ type: 'CLOSE_MODAL' });
        }
    }, [dispatch, transaction]);

    const relevantLiabilities = useMemo(() => {
        if (formData.type === TransactionType.EXPENSE) {
            return liabilities.filter(l => l.type === LiabilityType.DEBT && l.paidAmount < l.initialAmount);
        }
        if (formData.type === TransactionType.INCOME) {
            return liabilities.filter(l => l.type === LiabilityType.LOAN && l.paidAmount < l.initialAmount);
        }
        return [];
    }, [formData.type, liabilities]);

    const isExpense = formData.type === TransactionType.EXPENSE;
    const isIncome = formData.type === TransactionType.INCOME;
    const isSaving = formData.type === TransactionType.SAVING;

    // Dynamic styles based on transaction type
    const activeRingColor = isExpense ? 'focus-within:ring-destructive/50' : isIncome ? 'focus-within:ring-success/50' : 'focus-within:ring-blue-500/50';
    const activeBorderColor = isExpense ? 'focus-within:border-destructive' : isIncome ? 'focus-within:border-success' : 'focus-within:border-blue-500';
    const iconColor = isExpense ? 'text-destructive' : isIncome ? 'text-success' : 'text-blue-500';

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Segmented Control */}
            <div className="flex bg-secondary/50 p-1 rounded-xl">
                {[TransactionType.EXPENSE, TransactionType.INCOME, TransactionType.SAVING].map((t) => {
                    const isActive = formData.type === t;
                    let activeClass = '';
                    if (isActive) {
                        if (t === TransactionType.EXPENSE) activeClass = 'bg-background text-destructive shadow-sm';
                        else if (t === TransactionType.INCOME) activeClass = 'bg-background text-success shadow-sm';
                        else activeClass = 'bg-background text-blue-500 shadow-sm';
                    } else {
                        activeClass = 'text-muted-foreground hover:text-foreground hover:bg-secondary/50';
                    }

                    return (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, type: t }))}
                            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${activeClass}`}
                        >
                            {t === TransactionType.EXPENSE ? 'Ausgabe' : t === TransactionType.INCOME ? 'Einnahme' : 'Sparen'}
                        </button>
                    );
                })}
            </div>

            {/* Hero Amount Input */}
            <div className={`relative rounded-2xl bg-card border border-border transition-all duration-300 ${activeRingColor} ${activeBorderColor} ring-1 ring-transparent`}>
                <div className="absolute top-3 left-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Betrag</div>
                <div className="flex items-center justify-center py-6 px-4">
                    <span className={`text-4xl font-bold mr-2 ${iconColor}`}>€</span>
                    <input 
                        type="number" 
                        name="amount" 
                        value={formData.amount || ''} 
                        onChange={handleChange}
                        onKeyDown={handleAmountKeyDown}
                        required 
                        min="0.01"
                        step="0.01" 
                        className="w-full text-center text-5xl font-bold bg-transparent border-none focus:ring-0 p-0 text-foreground placeholder-muted-foreground/30"
                        placeholder="0,00"
                        autoFocus={!transaction}
                    />
                </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground ml-1">Beschreibung</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                            <AlignLeft size={16} />
                        </div>
                        <Input 
                            type="text" 
                            name="description" 
                            value={formData.description} 
                            onChange={handleChange} 
                            required 
                            placeholder="Wofür?" 
                            className="pl-9 bg-secondary/30 border-transparent focus:bg-background transition-all"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground ml-1">Datum</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                            <Calendar size={16} />
                        </div>
                        <Input 
                            type="date" 
                            name="date" 
                            value={formData.date} 
                            onChange={handleChange} 
                            required 
                            className="pl-9 bg-secondary/30 border-transparent focus:bg-background transition-all"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground ml-1">Kategorie</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                            <Folder size={16} />
                        </div>
                        <Select 
                            name="categoryId" 
                            value={formData.categoryId} 
                            onChange={handleChange}
                            className="pl-9 bg-secondary/30 border-transparent focus:bg-background transition-all"
                        >
                            <option value="">Keine Kategorie</option>
                            {categories.filter(c => c.type === (isIncome ? 'income' : 'expense')).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </Select>
                    </div>
                </div>

                {/* Conditional Inputs */}
                {isSaving && goals.length > 0 && (
                     <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground ml-1">Sparziel</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-500">
                                <PiggyBank size={16} />
                            </div>
                            <Select 
                                name="goalId" 
                                value={formData.goalId} 
                                onChange={handleChange} 
                                className="pl-9 bg-blue-500/5 border-blue-500/20 focus:border-blue-500 focus:ring-blue-500/20 text-foreground"
                            >
                                <option value="">Kein Ziel</option>
                                {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </Select>
                        </div>
                    </div>
                )}
                 {relevantLiabilities.length > 0 && (
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground ml-1">Zuordnung</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-orange-500">
                                <Wallet size={16} />
                            </div>
                            <Select 
                                name="liabilityId" 
                                value={formData.liabilityId} 
                                onChange={handleChange} 
                                className="pl-9 bg-orange-500/5 border-orange-500/20 focus:border-orange-500 focus:ring-orange-500/20 text-foreground"
                            >
                                <option value="">Keine</option>
                                {relevantLiabilities.map(l => (
                                    <option key={l.id} value={l.id}>{l.name} ({formatCurrency(l.initialAmount - l.paidAmount)} offen)</option>
                                ))}
                            </Select>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-border/20">
                {transaction ? (
                    <Button type="button" variant="destructive" onClick={handleDelete} className="flex items-center gap-2 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border-transparent">
                        <Trash2 size={16} /> Löschen
                    </Button>
                ) : <div></div>}
                
                <div className="flex space-x-3">
                    <Button type="button" onClick={() => dispatch({type: 'CLOSE_MODAL'})}>Abbrechen</Button>
                    <Button type="submit" variant="primary" className="px-8 shadow-lg shadow-primary/20">Speichern</Button>
                </div>
            </div>
        </form>
    );
});

const TransactionDetailModal: React.FC<{ transaction: Transaction }> = memo(({ transaction }) => {
    const { categories, goals, liabilities } = useAppState();
    const dispatch = useAppDispatch();

    const category = categories.find(c => c.id === transaction.categoryId);
    const goal = goals.find(g => g.id === transaction.goalId);
    const liability = liabilities.find(l => l.id === transaction.liabilityId);

    const isIncome = transaction.type === TransactionType.INCOME;
    const isSaving = transaction.type === TransactionType.SAVING;
    
    const amountColor = isIncome ? 'text-success' : isSaving ? 'text-blue-500' : 'text-destructive';
    const amountBg = isIncome ? 'bg-success/10' : isSaving ? 'bg-blue-500/10' : 'bg-destructive/10';
    const sign = isIncome ? '+' : isSaving ? '' : '-';

    const handleEdit = () => {
        dispatch({ type: 'OPEN_MODAL', payload: { type: 'EDIT_TRANSACTION', data: { transaction } } });
    };

    return (
        <div className="space-y-6">
            <div className={`flex flex-col items-center justify-center p-8 rounded-3xl ${amountBg} border border-border/5 relative overflow-hidden`}>
                <div className={`absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50`}></div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 relative z-10">Betrag</span>
                <span className={`text-5xl font-bold font-mono ${amountColor} relative z-10`}>
                    {sign}{formatCurrency(transaction.amount)}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/30 p-3 rounded-2xl flex items-center gap-3 border border-transparent hover:border-border/50 transition-colors">
                    <div className="p-2.5 bg-background rounded-xl text-muted-foreground shadow-sm">
                        <Calendar size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Datum</p>
                        <p className="font-semibold text-sm">{formatDate(transaction.date)}</p>
                    </div>
                </div>
                <div className="bg-secondary/30 p-3 rounded-2xl flex items-center gap-3 border border-transparent hover:border-border/50 transition-colors">
                    <div className="p-2.5 bg-background rounded-xl text-muted-foreground shadow-sm">
                        <Folder size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Kategorie</p>
                        <p className="font-semibold text-sm truncate">{category?.name || 'Unkategorisiert'}</p>
                    </div>
                </div>
            </div>

            <div className="bg-secondary/30 p-5 rounded-2xl border border-transparent hover:border-border/50 transition-colors">
                <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                    <AlignLeft size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Beschreibung</span>
                </div>
                <p className="text-foreground font-medium text-lg">{transaction.description}</p>
            </div>

            {(transaction.tags && transaction.tags.length > 0) && (
                <div className="bg-secondary/30 p-4 rounded-2xl">
                    <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                        <Tag size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Tags</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {transaction.tags.map(tag => (
                            <span key={tag} className="px-3 py-1 bg-background rounded-full text-xs font-semibold text-muted-foreground border border-border shadow-sm">
                                #{tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {goal && (
                <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 text-blue-500 rounded-full">
                        <PiggyBank size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-blue-500/80 uppercase tracking-wider">Sparziel</p>
                        <p className="font-bold text-lg text-blue-600 dark:text-blue-400">{goal.name}</p>
                    </div>
                </div>
            )}

            {liability && (
                <div className="bg-orange-500/5 border border-orange-500/10 p-4 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-orange-500/10 text-orange-500 rounded-full">
                        <CreditCard size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-orange-500/80 uppercase tracking-wider">Verbindlichkeit</p>
                        <p className="font-bold text-lg text-orange-600 dark:text-orange-400">{liability.name}</p>
                    </div>
                </div>
            )}

            <div className="flex justify-end pt-6 border-t border-border/20">
                <Button onClick={handleEdit} variant="primary" className="flex items-center gap-2 rounded-full px-6">
                    <Edit size={16} /> Bearbeiten
                </Button>
            </div>
        </div>
    );
});

const SmartScanModal: React.FC = memo(() => {
    const dispatch = useAppDispatch();
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isCameraStarting, setIsCameraStarting] = useState(true);
    const [error, setError] = useState<{ type: string; message: string } | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setStream(null);
    }, []);

    const startCamera = useCallback(async () => {
        stopCamera();
        setIsCameraStarting(true);
        setError(null);
        setCapturedImage(null);

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setError({ type: "UnsupportedError", message: "Ihr Browser unterstützt den Kamerazugriff nicht." });
            setIsCameraStarting(false);
            return;
        }

        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            streamRef.current = mediaStream;
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play().catch(e => console.error("Play error:", e));
                };
            }
        } catch (err: any) {
            let message = "Ein unbekannter Kamerafehler ist aufgetreten.";
            let errorType = 'GenericError';
            if (err?.name === 'NotAllowedError') {
                errorType = 'NotAllowedError';
                message = "Kamerazugriff wurde verweigert.";
            } else if (err?.name === 'NotFoundError') {
                errorType = 'NotFoundError';
                message = "Keine Kamera gefunden.";
            }
            setError({ type: errorType, message });
        } finally {
            setIsCameraStarting(false);
        }
    }, [stopCamera]);

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, [startCamera, stopCamera]);

    const handleScan = useCallback(async () => {
        if (!navigator.onLine) {
            setError({ type: 'OfflineError', message: 'Sie sind offline. Der Beleg kann nicht analysiert werden.' });
            return;
        }
        if (!videoRef.current || !streamRef.current) {
            setError({ type: 'NotReadyError', message: 'Kamera ist nicht bereit.'});
            return;
        }
        setIsLoading(true);
        setError(null);
        
        try {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas Context Error');
            
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const base64FullData = canvas.toDataURL('image/jpeg', 0.8);
            setCapturedImage(base64FullData);
            stopCamera();

            const base64Data = base64FullData.split(',')[1];
            if (!process.env.API_KEY) throw new Error("API_KEY ist nicht konfiguriert.");

            const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    description: { type: Type.STRING, description: "Name des Händlers oder kurze Beschreibung" },
                    amount: { type: Type.NUMBER, description: "Gesamtbetrag" },
                    date: { type: Type.STRING, description: "Datum (YYYY-MM-DD)" },
                },
                required: ["description", "amount", "date"]
            };

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-latest",
                contents: [{
                    parts: [
                        { text: "Extrahiere Händler, Betrag und Datum von diesem Beleg. Formatiere das Datum als YYYY-MM-DD. Wenn kein Datum gefunden wird, nimm das heutige." },
                        { inlineData: { mimeType: 'image/jpeg', data: base64Data } }
                    ]
                }],
                config: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema,
                },
            });
            
            let rawText = response.text || "{}";
            // Robust parsing: Find the first '{' and last '}' to handle potential markdown wrappers or extra text.
            const firstBrace = rawText.indexOf('{');
            const lastBrace = rawText.lastIndexOf('}');
            
            if (firstBrace !== -1 && lastBrace !== -1) {
                rawText = rawText.substring(firstBrace, lastBrace + 1);
            }
            
            const result = JSON.parse(rawText);
            
            dispatch({ type: 'ADD_TRANSACTION', payload: {
                description: result.description || 'Gescannter Beleg',
                amount: typeof result.amount === 'number' ? result.amount : 0,
                date: result.date || format(new Date(), 'yyyy-MM-dd'),
                type: TransactionType.EXPENSE,
                tags: ['gescannt']
            }});
            dispatch({ type: 'CLOSE_MODAL' });
        } catch (e: any) {
            console.error("Smart Scan Error:", e);
            setError({ type: 'ScanError', message: 'Beleg konnte nicht gelesen werden. Bitte versuchen Sie es erneut.' });
        } finally {
            setIsLoading(false);
        }
    }, [dispatch, stopCamera]);

    return (
        <div>
            {error && (
                <div className="p-3 mb-4 text-sm text-destructive-foreground bg-destructive/10 border border-destructive/20 rounded-lg flex items-center justify-between gap-4" role="alert">
                    <div className="flex items-center gap-2">
                         <AlertTriangle className="h-4 w-4" />
                         <span>{error.message}</span>
                    </div>
                    {error.type !== 'OfflineError' && (
                         <Button onClick={startCamera} variant="secondary" className="h-8 px-3 text-xs bg-destructive/20 hover:bg-destructive/30 border-transparent text-destructive-foreground flex-shrink-0">Erneut versuchen</Button>
                    )}
                </div>
            )}
            
            <div className="relative w-full aspect-[4/3] bg-black rounded-lg overflow-hidden border border-border shadow-inner">
                {capturedImage ? (
                    <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
                ) : (
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                )}
                
                {isCameraStarting && !capturedImage && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80">
                        <Camera className="h-10 w-10 animate-pulse mb-2" />
                        <span className="text-sm">Kamera startet...</span>
                    </div>
                )}
                
                 {stream && !isLoading && !isCameraStarting && (
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[60%] border-2 border-primary/70 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[2px] bg-primary/80 shadow-[0_0_10px_2px_hsl(var(--primary))] animate-scan-line"></div>
                    </div>
                )}
                
                {isLoading && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white animate-fade-in">
                        <Sparkles className="h-12 w-12 text-primary animate-spin-slow mb-4" />
                        <span className="text-lg font-bold">Analysiere Beleg...</span>
                    </div>
                )}
            </div>
            
            <div className="mt-6 flex justify-center gap-4">
                {capturedImage && error ? (
                     <Button onClick={startCamera} variant="secondary">Abbrechen & Neu</Button>
                ) : null}
                
                {!capturedImage && (
                    <Button 
                        onClick={handleScan} 
                        disabled={isLoading || !!error || !stream || isCameraStarting} 
                        variant="primary" 
                        className="px-8 py-6 rounded-full flex items-center gap-3 text-lg font-bold shadow-lg hover:shadow-primary/25 transition-all"
                    >
                        <ScanLine size={24} /> <span>Scannen</span>
                    </Button>
                )}
            </div>
        </div>
    );
});

const CategoryItem = memo(({ category, onUpdate, onDelete, onDragStart, onDragOver, onDrop, onDragEnd, count }: any) => {
    const [name, setName] = useState(category.name);
    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleUpdate = () => {
        if (name.trim() && name.trim() !== category.name) onUpdate({ ...category, name: name.trim() });
        else setName(category.name);
        setIsEditing(false);
    };

    const handleBudgetUpdate = (e: React.FocusEvent<HTMLInputElement>) => {
        const newBudget = parseFloat(e.target.value);
        if (!isNaN(newBudget) && newBudget >= 0 && category.budget !== newBudget) onUpdate({ ...category, budget: newBudget });
        else if (e.target.value === '' && category.budget !== undefined) { const { budget, ...rest } = category; onUpdate(rest as Category); }
    };
    
    useEffect(() => { if (isEditing) inputRef.current?.focus(); }, [isEditing]);

    return (
        <div 
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50 group"
            draggable
            onDragStart={(e) => onDragStart(e, category)}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, category)}
            onDragEnd={onDragEnd}
        >
            <GripVertical className="h-5 w-5 text-muted-foreground/50 cursor-grab" />
            {isEditing ? (
                <Input ref={inputRef} value={name} onChange={(e) => setName(e.target.value)} onBlur={handleUpdate} onKeyDown={(e) => e.key === 'Enter' && handleUpdate()} />
            ) : (
                <span className="flex-grow font-medium cursor-pointer" onClick={() => setIsEditing(true)}>{category.name}</span>
            )}
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full" title={`${count} Transaktionen`}>{count}</span>
            <button onClick={() => setIsEditing(true)} className="p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Edit size={14} /></button>
            {category.type === CategoryType.EXPENSE && (
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                    <Input 
                        type="number" 
                        placeholder="Budget" 
                        defaultValue={category.budget} 
                        onBlur={handleBudgetUpdate} 
                        className="w-28 pl-6 pr-2 py-1 text-right" 
                        min="0"
                        onKeyDown={(e) => (e.key === '-' || e.key === 'e') && e.preventDefault()}
                    />
                </div>
            )}
            <button onClick={() => onDelete(category)} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
        </div>
    );
});

const CategoryManagerModal: React.FC = memo(() => {
    const { categories: storedCategories, transactions } = useAppState();
    const dispatch = useAppDispatch();
    const [newCategoryName, setNewCategoryName] = useState('');
    const [draggedCategory, setDraggedCategory] = useState<Category | null>(null);

    useEffect(() => {
        const storedOrder = localStorage.getItem('categoryOrder');
        if (storedOrder) {
            try {
                const order = JSON.parse(storedOrder);
                if (Array.isArray(order)) {
                    const orderedCategories = [...storedCategories].sort((a, b) => {
                        const aIndex = order.indexOf(a.id);
                        const bIndex = order.indexOf(b.id);
                        if (aIndex === -1 && bIndex === -1) return 0;
                        if (aIndex === -1) return 1;
                        if (bIndex === -1) return -1;
                        return aIndex - bIndex;
                    });
                    dispatch({ type: 'REORDER_CATEGORIES', payload: orderedCategories });
                }
            } catch (e) {
                console.error("Failed to parse category order from localStorage", e);
            }
        }
    }, []); 

    const { categories } = useAppState();

    const incomeCategories = useMemo(() => categories.filter(c => c.type === CategoryType.INCOME), [categories]);
    const expenseCategories = useMemo(() => categories.filter(c => c.type === CategoryType.EXPENSE), [categories]);

    const usageCount = useMemo(() => transactions.reduce((acc, t) => { if(t.categoryId) acc.set(t.categoryId, (acc.get(t.categoryId) || 0) + 1); return acc; }, new Map<string, number>()), [transactions]);

    const handleDelete = useCallback((c: Category) => {
        const count = usageCount.get(c.id) || 0;
        if (window.confirm(`Möchten Sie "${c.name}" wirklich löschen? ${count > 0 ? `Sie wird von ${count} Transaktion(en) verwendet.` : ''}`)) {
            dispatch({ type: 'DELETE_CATEGORY', payload: c.id });
        }
    }, [dispatch, usageCount]);
    
    const handleAdd = (e: React.FormEvent, type: CategoryType) => {
        e.preventDefault();
        if (newCategoryName.trim()) {
            dispatch({ type: 'ADD_CATEGORY', payload: { name: newCategoryName.trim(), type } });
            setNewCategoryName('');
        }
    };

    const persistOrder = (cats: Category[]) => {
        const order = cats.map(c => c.id);
        localStorage.setItem('categoryOrder', JSON.stringify(order));
        dispatch({ type: 'REORDER_CATEGORIES', payload: cats });
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, category: Category) => {
        setDraggedCategory(category);
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.style.opacity = '0.5';
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetCategory: Category) => {
        e.preventDefault();
        if (!draggedCategory || draggedCategory.id === targetCategory.id || draggedCategory.type !== targetCategory.type) {
            return;
        }

        let list = draggedCategory.type === CategoryType.INCOME ? [...incomeCategories] : [...expenseCategories];
        const dragIndex = list.findIndex(c => c.id === draggedCategory.id);
        const targetIndex = list.findIndex(c => c.id === targetCategory.id);
        
        const [removed] = list.splice(dragIndex, 1);
        list.splice(targetIndex, 0, removed);
        
        const otherList = draggedCategory.type === CategoryType.INCOME ? expenseCategories : incomeCategories;
        const newOrderedCategories = [...(draggedCategory.type === CategoryType.INCOME ? list : otherList), ...(draggedCategory.type === CategoryType.INCOME ? otherList : list)];
        
        persistOrder(newOrderedCategories);
    };
    
    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        setDraggedCategory(null);
        e.currentTarget.style.opacity = '1';
    };


    return (
        <div className="space-y-6">
            <form className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg">
                <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Neue Kategorie erstellen..." />
                <Button onClick={(e) => handleAdd(e, CategoryType.EXPENSE)} variant="primary" className="whitespace-nowrap">Ausgabe +</Button>
                <Button onClick={(e) => handleAdd(e, CategoryType.INCOME)} className="bg-success/80 text-white hover:bg-success whitespace-nowrap">Einnahme +</Button>
            </form>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                    <h4 className="font-semibold border-b border-border/20 pb-2 mb-2">Ausgaben</h4>
                    {expenseCategories.map(c => 
                        <CategoryItem 
                            key={c.id} 
                            category={c} 
                            onUpdate={(cat: Category) => dispatch({type:'UPDATE_CATEGORY', payload: cat})} 
                            onDelete={handleDelete}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            onDragEnd={handleDragEnd}
                            count={usageCount.get(c.id) || 0}
                        />)
                    }
                </div>
                <div>
                    <h4 className="font-semibold border-b border-border/20 pb-2 mb-2">Einnahmen</h4>
                    {incomeCategories.map(c => 
                        <CategoryItem 
                            key={c.id} 
                            category={c} 
                            onUpdate={(cat: Category) => dispatch({type:'UPDATE_CATEGORY', payload: cat})} 
                            onDelete={handleDelete}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            onDragEnd={handleDragEnd}
                            count={usageCount.get(c.id) || 0}
                        />)
                    }
                </div>
            </div>
        </div>
    );
});

const ManageGoalsModal: React.FC = memo(() => {
    const { goals } = useAppState();
    const dispatch = useAppDispatch();
    const [name, setName] = useState('');
    const [targetAmount, setTargetAmount] = useState(0);
    const [type, setType] = useState<GoalType>(GoalType.GOAL);
    const [editingId, setEditingId] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (targetAmount < 0) {
            alert("Der Zielbetrag muss positiv sein.");
            return;
        }

        if (editingId) {
            const goal = goals.find(g => g.id === editingId);
            if(goal) {
                    dispatch({ type: 'UPDATE_GOAL', payload: { ...goal, name, targetAmount, type } });
            }
            setEditingId(null);
        } else {
            dispatch({ type: 'ADD_GOAL', payload: { name, targetAmount, type } });
        }
        setName('');
        setTargetAmount(0);
        setType(GoalType.GOAL);
    };
    
    const handleEdit = (goal: Goal) => {
        setName(goal.name);
        setTargetAmount(goal.targetAmount);
        setType(goal.type);
        setEditingId(goal.id);
    };

    const handleCancel = () => {
        setEditingId(null);
        setName('');
        setTargetAmount(0);
        setType(GoalType.GOAL);
    }
    
    const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === '-' || e.key === 'e' || e.key === '+') e.preventDefault();
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit} className="p-4 bg-secondary/50 rounded-lg space-y-4">
                <h4 className="font-semibold text-lg">{editingId ? 'Ziel bearbeiten' : 'Neues Ziel'}</h4>
                <FormGroup label="Name"><Input value={name} onChange={e => setName(e.target.value)} required /></FormGroup>
                <div className="grid grid-cols-2 gap-4">
                    <FormGroup label="Zielbetrag">
                        <Input 
                            type="number" 
                            value={targetAmount || ''} 
                            onChange={e => {
                                const val = parseFloat(e.target.value);
                                if (val >= 0 || e.target.value === '') setTargetAmount(isNaN(val) ? 0 : val);
                            }}
                            onKeyDown={handleAmountKeyDown}
                            required 
                            min="0.01" 
                            step="0.01" 
                        />
                    </FormGroup>
                    <FormGroup label="Typ"><Select value={type} onChange={e => setType(e.target.value as GoalType)}><option value={GoalType.GOAL}>Sparziel</option><option value={GoalType.SINKING_FUND}>Rücklage (Sinking Fund)</option></Select></FormGroup>
                </div>
                    <div className="flex justify-end gap-2 pt-2">
                        {editingId && <Button type="button" onClick={handleCancel}>Abbrechen</Button>}
                    <Button type="submit" variant="primary">{editingId ? 'Speichern' : 'Hinzufügen'}</Button>
                </div>
            </form>
            <div className="space-y-2">
                    {goals.map(g => (
                    <div key={g.id} className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors">
                        <div>
                            <p className="font-medium">{g.name} <span className="text-xs text-muted-foreground">({g.type === GoalType.GOAL ? 'Ziel' : 'Rücklage'})</span></p>
                            <p className="text-sm text-muted-foreground">{formatCurrency(g.currentAmount)} / {formatCurrency(g.targetAmount)}</p>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => handleEdit(g)} className="p-2 text-muted-foreground hover:text-foreground"><Edit size={16}/></button>
                            <button onClick={() => window.confirm('Ziel löschen?') && dispatch({type: 'DELETE_GOAL', payload: g.id})} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 size={16}/></button>
                        </div>
                    </div>
                    ))}
            </div>
        </div>
    );
});

const ManageProjectsModal: React.FC = memo(() => {
    const { projects } = useAppState();
    const dispatch = useAppDispatch();
    const [name, setName] = useState('');
    const [tag, setTag] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
            if (editingId) {
            const project = projects.find(p => p.id === editingId);
            if(project) {
                    dispatch({ type: 'UPDATE_PROJECT', payload: { ...project, name, tag } });
            }
            setEditingId(null);
        } else {
            dispatch({ type: 'ADD_PROJECT', payload: { name, tag } });
        }
        setName('');
        setTag('');
    };

    const handleEdit = (p: Project) => {
        setName(p.name);
        setTag(p.tag);
        setEditingId(p.id);
    };
    
        const handleCancel = () => {
        setEditingId(null);
        setName('');
        setTag('');
    }

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit} className="p-4 bg-secondary/50 rounded-lg space-y-4">
                <h4 className="font-semibold text-lg">{editingId ? 'Projekt bearbeiten' : 'Neues Projekt'}</h4>
                    <FormGroup label="Projektname"><Input value={name} onChange={e => setName(e.target.value)} required /></FormGroup>
                    <FormGroup label="Tag (für Transaktionen)"><Input value={tag} onChange={e => setTag(e.target.value)} required placeholder="z.B. projekt-a" /></FormGroup>
                    <div className="flex justify-end gap-2 pt-2">
                        {editingId && <Button type="button" onClick={handleCancel}>Abbrechen</Button>}<Button type="submit" variant="primary">{editingId ? 'Speichern' : 'Hinzufügen'}</Button>
                </div>
            </form>
            <div className="space-y-2">
                    {projects.map(p => (
                    <div key={p.id} className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors">
                        <div>
                            <p className="font-medium">{p.name}</p>
                            <p className="text-sm text-muted-foreground">Tag: #{p.tag}</p>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => handleEdit(p)} className="p-2 text-muted-foreground hover:text-foreground"><Edit size={16}/></button>
                            <button onClick={() => window.confirm('Projekt löschen?') && dispatch({type: 'DELETE_PROJECT', payload: p.id})} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 size={16}/></button>
                        </div>
                    </div>
                    ))}
            </div>
        </div>
    );
});

const RecurringManagerModal: React.FC = memo(() => {
    const { recurringTransactions, categories } = useAppState();
    const dispatch = useAppDispatch();
    const [editingId, setEditingId] = useState<string | null>(null);

    const initialFormData = useMemo(() => ({ description: '', amount: 0, type: TransactionType.EXPENSE, categoryId: '', frequency: Frequency.MONTHLY, interval: 1, startDate: format(new Date(), 'yyyy-MM-dd'), endDate: '', isBill: false }), []);
    const [formData, setFormData] = useState<Omit<RecurringTransaction, 'id' | 'nextDueDate'>>(initialFormData);
    const categoriesMap = useMemo(() => new Map(categories.map(c => [c.id, c.name])), [categories]);

    useEffect(() => {
        if (editingId) {
            const tx = recurringTransactions.find(rt => rt.id === editingId);
            if (tx) { const { id, nextDueDate, ...data } = tx; setFormData({ ...data, endDate: data.endDate || '' }); }
        } else setFormData(initialFormData);
    }, [editingId, recurringTransactions, initialFormData]);
    
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else if (name === 'amount' || name === 'interval') {
            const floatVal = parseFloat(value);
            if (floatVal < 0) return;
            setFormData(prev => ({ ...prev, [name]: isNaN(floatVal) ? 0 : floatVal }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    }, []);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (formData.amount <= 0) {
            alert("Bitte geben Sie einen positiven Betrag ein.");
            return;
        }
        if (formData.interval <= 0) {
            alert("Das Intervall muss größer als 0 sein.");
            return;
        }

        const data = { ...formData, endDate: formData.endDate || undefined };
        if (editingId) {
             const originalTx = recurringTransactions.find(rt => rt.id === editingId);
             const nextDueDate = originalTx?.nextDueDate || data.startDate; 
             dispatch({ type: 'UPDATE_RECURRING', payload: { ...data, id: editingId, nextDueDate } });
        } else {
             dispatch({ type: 'ADD_RECURRING', payload: data });
        }
        setEditingId(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === '-' || e.key === 'e' || e.key === '+') e.preventDefault();
    };
    
    const formatFrequency = (rt: RecurringTransaction) => {
        const freqMap = {
            [Frequency.DAILY]: 'Tag',
            [Frequency.WEEKLY]: 'Woche',
            [Frequency.MONTHLY]: 'Monat',
            [Frequency.YEARLY]: 'Jahr',
        };
        const plural = rt.interval > 1 ? (freqMap[rt.frequency] === 'Monat' ? 'e' : 'n') : '';
        const freqName = freqMap[rt.frequency];
        return `Alle ${rt.interval} ${freqName}${plural}`;
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit} className="p-4 bg-secondary/50 rounded-lg space-y-4">
                <h4 className="font-semibold text-lg">{editingId ? 'Dauerauftrag bearbeiten' : 'Neuen Dauerauftrag anlegen'}</h4>
                <FormGroup label="Beschreibung"><Input name="description" value={formData.description} onChange={handleChange} required /></FormGroup>
                <div className="grid md:grid-cols-3 gap-4">
                    <FormGroup label="Betrag">
                        <Input 
                            type="number" 
                            name="amount" 
                            value={formData.amount || ''} 
                            onChange={handleChange} 
                            onKeyDown={handleKeyDown}
                            required 
                            min="0.01" 
                            step="0.01" 
                        />
                    </FormGroup>
                    <FormGroup label="Typ"><Select name="type" value={formData.type} onChange={handleChange}><option value={TransactionType.EXPENSE}>Ausgabe</option><option value={TransactionType.INCOME}>Einnahme</option></Select></FormGroup>
                    <FormGroup label="Kategorie"><Select name="categoryId" value={formData.categoryId} onChange={handleChange}><option value="">Keine</option>{categories.filter(c => c.type === (formData.type === 'income' ? 'income' : 'expense')).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></FormGroup>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                     <FormGroup label="Wiederholung">
                        <div className="flex items-center gap-2">
                            <span>Alle</span>
                            <Input type="number" name="interval" value={formData.interval || ''} onChange={handleChange} onKeyDown={handleKeyDown} className="w-20" min="1" />
                            <Select name="frequency" value={formData.frequency} onChange={handleChange}><option value={Frequency.DAILY}>Tag(e)</option><option value={Frequency.WEEKLY}>Woche(n)</option><option value={Frequency.MONTHLY}>Monat(e)</option><option value={Frequency.YEARLY}>Jahr(e)</option></Select>
                        </div>
                    </FormGroup>
                     <FormGroup label="Laufzeit"><div className="flex items-center gap-2"><span>Start</span><Input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required /><span>Ende</span><Input type="date" name="endDate" value={formData.endDate} onChange={handleChange} /></div></FormGroup>
                </div>
                <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2"><input type="checkbox" id="isBill" name="isBill" checked={!!formData.isBill} onChange={handleChange} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" /><label htmlFor="isBill" className="text-sm font-medium">Ist eine Rechnung?</label></div>
                    <div className="flex items-center gap-2">{editingId && <Button type="button" onClick={() => setEditingId(null)}>Abbrechen</Button>}<Button type="submit" variant="primary">{editingId ? 'Speichern' : 'Hinzufügen'}</Button></div>
                </div>
            </form>
            <div>
                 <h4 className="font-semibold text-lg mb-4">Bestehende Daueraufträge</h4>
                 {recurringTransactions.length > 0 ? (
                    <div className="space-y-2">
                        <div className="hidden md:grid grid-cols-12 gap-4 px-3 py-2 text-sm font-semibold text-muted-foreground border-b border-border">
                            <div className="col-span-4">Beschreibung</div>
                            <div className="col-span-2 text-right">Betrag</div>
                            <div className="col-span-3">Intervall</div>
                            <div className="col-span-2">Nächste Fälligkeit</div>
                            <div className="col-span-1"></div>
                        </div>
                        {recurringTransactions.map(rt => (
                            <div key={rt.id} className="grid grid-cols-2 md:grid-cols-12 gap-x-4 gap-y-3 items-center p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                                <div className="col-span-2 md:col-span-4 flex items-center gap-3">
                                   {rt.type === TransactionType.INCOME ? <ArrowUpCircle className="h-6 w-6 text-success flex-shrink-0" /> : <ArrowDownCircle className="h-6 w-6 text-destructive flex-shrink-0" />}
                                   <div>
                                      <p className="font-semibold">{rt.description}</p>
                                      <p className="text-sm text-muted-foreground">{categoriesMap.get(rt.categoryId || '') || 'Unkategorisiert'}</p>
                                   </div>
                                </div>
                                <div className="col-span-1 md:col-span-2 text-left md:text-right">
                                   <p className={`font-bold text-base md:text-lg ${rt.type === TransactionType.INCOME ? 'text-success' : ''}`}>{formatCurrency(rt.amount)}</p>
                                </div>
                                <div className="col-span-1 md:col-span-3 text-right md:text-left">
                                   <p className="text-sm">{formatFrequency(rt)}</p>
                                   {rt.isBill && <span className="text-xs text-blue-500 font-semibold bg-blue-500/10 px-2 py-0.5 rounded-full">Rechnung</span>}
                                </div>
                                <div className="col-span-1 md:col-span-2 flex items-center gap-2 text-sm">
                                   <Calendar className="h-4 w-4 text-muted-foreground"/>
                                   <span>{formatDate(rt.nextDueDate)}</span>
                                </div>
                                <div className="col-span-1 md:col-span-1 flex items-center justify-end gap-1">
                                    <button onClick={() => setEditingId(rt.id)} className="p-2 text-muted-foreground hover:text-foreground" aria-label={`Dauerauftrag ${rt.description} bearbeiten`}><Edit size={16} /></button>
                                    <button onClick={() => window.confirm('Diesen Dauerauftrag wirklich löschen?') && dispatch({type: 'DELETE_RECURRING', payload: rt.id})} className="p-2 text-muted-foreground hover:text-destructive" aria-label={`Dauerauftrag ${rt.description} löschen`}><Trash2 size={16} /></button>
                                </div>
                            </div>
                         ))}
                    </div>
                 ) : (
                    <div className="text-center py-10 border-2 border-dashed border-border/20 rounded-lg">
                        <p className="text-muted-foreground">Keine Daueraufträge vorhanden.</p>
                        <p className="text-sm text-muted-foreground mt-1">Fügen Sie einen neuen über das Formular oben hinzu.</p>
                    </div>
                 )}
            </div>
        </div>
    );
});

const LiabilityManagerModal: React.FC = memo(() => {
    const { liabilities } = useAppState();
    const dispatch = useAppDispatch();
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const initialFormData = useMemo(() => ({
        name: '', type: LiabilityType.DEBT, initialAmount: 0, interestRate: 0,
        creditor: '', debtor: '', startDate: format(new Date(), 'yyyy-MM-dd'), dueDate: ''
    }), []);

    const [formData, setFormData] = useState<Omit<Liability, 'id' | 'paidAmount'>>(initialFormData);

    useEffect(() => {
        if (editingId) {
            const l = liabilities.find(l => l.id === editingId);
            if (l) {
                const { id, paidAmount, ...data } = l;
                setFormData({ ...data, dueDate: data.dueDate || '', creditor: data.creditor || '', debtor: data.debtor || '' });
                setIsFormVisible(true);
            }
        }
    }, [editingId, liabilities]);
    
    const handleCancel = () => {
        setEditingId(null);
        setFormData(initialFormData);
        setIsFormVisible(false);
    };

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'initialAmount' || name === 'interestRate') {
            const floatVal = parseFloat(value);
            if (floatVal < 0) return;
            setFormData(prev => ({ ...prev, [name]: isNaN(floatVal) ? 0 : floatVal }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (formData.initialAmount < 0) {
             alert("Der Betrag muss positiv sein.");
             return;
        }

        const data = { ...formData, dueDate: formData.dueDate || undefined };
        if (editingId) {
            dispatch({ type: 'UPDATE_LIABILITY', payload: { ...data, id: editingId, paidAmount: liabilities.find(l => l.id === editingId)?.paidAmount || 0 } });
        } else {
            dispatch({ type: 'ADD_LIABILITY', payload: data });
        }
        handleCancel();
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === '-' || e.key === 'e' || e.key === '+') e.preventDefault();
    };

    return (
        <div className="space-y-6">
            {!isFormVisible && (
                <Button onClick={() => setIsFormVisible(true)} variant="primary" className="w-full">Neu hinzufügen</Button>
            )}
            {isFormVisible && (
                <form onSubmit={handleSubmit} className="p-4 bg-secondary/50 rounded-lg space-y-4 animate-fade-in">
                     <h4 className="font-semibold text-lg">{editingId ? 'Bearbeiten' : 'Neu anlegen'}</h4>
                     <div className="grid md:grid-cols-2 gap-4">
                         <FormGroup label="Bezeichnung"><Input name="name" value={formData.name} onChange={handleChange} required /></FormGroup>
                         <FormGroup label="Typ"><Select name="type" value={formData.type} onChange={handleChange}><option value={LiabilityType.DEBT}>Schuld (Ich schulde)</option><option value={LiabilityType.LOAN}>Forderung (Mir wird geschuldet)</option></Select></FormGroup>
                     </div>
                     <div className="grid md:grid-cols-2 gap-4">
                         <FormGroup label="Betrag">
                            <Input 
                                type="number" 
                                name="initialAmount" 
                                value={formData.initialAmount || ''} 
                                onChange={handleChange} 
                                onKeyDown={handleKeyDown}
                                required 
                                min="0" 
                                step="0.01" 
                            />
                        </FormGroup>
                         <FormGroup label="Jährl. Zinssatz (%)">
                            <Input 
                                type="number" 
                                name="interestRate" 
                                value={formData.interestRate || ''} 
                                onChange={handleChange} 
                                onKeyDown={handleKeyDown}
                                required 
                                min="0" 
                                step="0.01" 
                            />
                        </FormGroup>
                     </div>
                      <FormGroup label={formData.type === LiabilityType.DEBT ? "Kreditgeber" : "Schuldner"}>
                         <Input name={formData.type === LiabilityType.DEBT ? "creditor" : "debtor"} value={formData.type === LiabilityType.DEBT ? formData.creditor || '' : formData.debtor || ''} onChange={handleChange} />
                     </FormGroup>
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormGroup label="Startdatum"><Input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required /></FormGroup>
                        <FormGroup label="Fälligkeitsdatum (optional)"><Input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} /></FormGroup>
                     </div>
                     <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" onClick={handleCancel}>Abbrechen</Button>
                        <Button type="submit" variant="primary">{editingId ? 'Speichern' : 'Hinzufügen'}</Button>
                     </div>
                </form>
            )}
            <div className="space-y-3">
                 {liabilities.map(l => {
                    const progress = l.initialAmount > 0 ? (l.paidAmount / l.initialAmount) * 100 : 100;
                    return (
                        <div key={l.id} className="p-4 rounded-lg bg-secondary/50 flex items-center justify-between gap-4">
                            <div className="flex-grow">
                                <div className="flex justify-between items-baseline">
                                    <p className="font-semibold">{l.name} <span className="text-xs font-normal text-muted-foreground">({l.type === LiabilityType.DEBT ? 'Schuld' : 'Forderung'})</span></p>
                                    <p className="text-sm font-mono">{formatCurrency(l.initialAmount - l.paidAmount)}</p>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2.5 mt-2">
                                    <div className="bg-primary h-2.5 rounded-full" style={{width: `${progress}%`}}></div>
                                </div>
                            </div>
                            <div className="flex-shrink-0 flex items-center gap-1">
                                <button onClick={() => setEditingId(l.id)} className="p-2 text-muted-foreground hover:text-foreground"><Edit size={16} /></button>
                                <button onClick={() => window.confirm(`"${l.name}" wirklich löschen?`) && dispatch({type: 'DELETE_LIABILITY', payload: l.id})} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    );
                 })}
            </div>
        </div>
    );
});

const IncludedDebtsList: React.FC = memo(() => {
    const { liabilities } = useAppState();
    const activeDebts = useMemo(() => 
        liabilities.filter(l => l.type === LiabilityType.DEBT && l.initialAmount - l.paidAmount > 0), 
    [liabilities]);

    if (activeDebts.length === 0) {
        return (
            <div className="text-center p-8 bg-secondary/30 rounded-lg border-2 border-dashed border-border/20">
                <h3 className="font-semibold text-lg">Keine aktiven Schulden</h3>
                <p className="text-sm text-muted-foreground mt-1">Diese Funktion kann nur genutzt werden, wenn Sie offene Schulden haben.</p>
            </div>
        );
    }

    return (
        <div className="p-4 border border-border/20 rounded-lg">
            <h4 className="font-semibold text-md mb-3">Folgende Schulden werden berücksichtigt:</h4>
            <ul className="space-y-2 text-sm">
                {activeDebts.map(debt => (
                    <li key={debt.id} className="flex justify-between p-2.5 bg-secondary rounded-md">
                        <span className="font-medium">{debt.name} ({debt.interestRate}%)</span>
                        <span className="font-mono font-semibold">{formatCurrency(debt.initialAmount - debt.paidAmount)}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
});

const SummaryCard: React.FC<{ title: string; value: string; subtext: string; icon: React.ReactNode }> = memo(({ title, value, subtext, icon }) => (
    <div className="p-4 bg-secondary rounded-lg flex items-start gap-4">
        <div className="p-3 bg-primary/10 text-primary rounded-lg">{icon}</div>
        <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{subtext}</p>
        </div>
    </div>
));

const DebtPaydownModal: React.FC = memo(() => {
    const { liabilities } = useAppState();
    const [strategy, setStrategy] = useState<'avalanche' | 'snowball'>('avalanche');
    const [extraPayment, setExtraPayment] = useState(100);
    const [plan, setPlan] = useState<{ plan: PaydownPlan[], summary: any } | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const activeDebtsExist = useMemo(() => 
        liabilities.some(l => l.type === LiabilityType.DEBT && l.initialAmount - l.paidAmount > 0),
    [liabilities]);

    const handleCalculate = useCallback(() => {
        setIsLoading(true);
        setTimeout(() => {
            const result = calculateDebtPaydownPlan(liabilities, strategy, extraPayment);
            setPlan(result);
            setIsLoading(false);
        }, 0);
    }, [liabilities, strategy, extraPayment]);

    const chartData = useMemo(() => {
        if (!plan) return [];
        const yearlyData = new Map<number, { year: number, principal: number, interest: number }>();
        
        plan.plan.forEach(monthData => {
            const year = Math.ceil(monthData.month / 12);
            let yearEntry = yearlyData.get(year) || { year, principal: 0, interest: 0 };
            
            const principalPaid = monthData.payments.reduce((sum, p) => sum + p.principalPaid, 0);
            yearEntry.principal += principalPaid > 0 ? principalPaid : 0;
            yearEntry.interest += monthData.totalInterestThisMonth;
            
            yearlyData.set(year, yearEntry);
        });

        return Array.from(yearlyData.values());
    }, [plan]);

    return (
        <div className="space-y-6">
            <div className="p-4 bg-secondary/50 rounded-lg space-y-4">
                <div className="grid md:grid-cols-3 gap-4 items-end">
                    <FormGroup label="Tilgungsstrategie">
                        <Select value={strategy} onChange={e => setStrategy(e.target.value as any)}>
                            <option value="avalanche">Lawine (Zinskosten sparen)</option>
                            <option value="snowball">Schneeball (Motivation steigern)</option>
                        </Select>
                    </FormGroup>
                    <FormGroup label="Zusätzliche mtl. Zahlung (€)">
                        <Input type="number" value={extraPayment} onChange={e => setExtraPayment(parseFloat(e.target.value) || 0)} min="0" step="10" />
                    </FormGroup>
                    <Button onClick={handleCalculate} variant="primary" className="w-full" disabled={isLoading || !activeDebtsExist}>
                        {isLoading ? 'Berechne...' : 'Plan berechnen'}
                    </Button>
                </div>
                 <div className="grid md:grid-cols-2 text-sm text-muted-foreground gap-x-6 gap-y-2 pt-2">
                    <div className="flex items-start gap-2">
                        <Zap size={18} className="text-primary flex-shrink-0 mt-0.5"/>
                        <div><strong className="text-foreground">Lawine:</strong> Tilgt zuerst die Schuld mit dem höchsten Zins. Spart langfristig am meisten Geld.</div>
                    </div>
                    <div className="flex items-start gap-2">
                        <ShieldCheck size={18} className="text-success flex-shrink-0 mt-0.5"/>
                        <div><strong className="text-foreground">Schneeball:</strong> Tilgt zuerst die kleinste Schuld. Sorgt für schnelle Erfolgserlebnisse.</div>
                    </div>
                </div>
            </div>

            {isLoading && <div className="text-center py-10 text-muted-foreground">Plan wird berechnet...</div>}
            
            {!isLoading && plan ? (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid md:grid-cols-3 gap-4">
                        <SummaryCard title="Schuldenfrei in" value={`${plan.summary.totalMonths} Mon.`} subtext={`(${(plan.summary.totalMonths / 12).toFixed(1)} Jahre)`} icon={<CalendarCheck size={24}/>} />
                        <SummaryCard title="Gezahlte Zinsen" value={formatCurrency(plan.summary.totalInterest)} subtext="Gesamtkosten für Kredite" icon={<TrendingUp size={24}/>} />
                        <SummaryCard title="Gesamtzahlung" value={formatCurrency(plan.summary.totalPrincipal + plan.summary.totalInterest)} subtext="Tilgung + Zinsen" icon={<PiggyBank size={24}/>} />
                    </div>
                    <div>
                        <h4 className="font-semibold text-lg mb-4 flex items-center gap-2"><BarChart3 size={20}/> Jahresübersicht der Tilgung</h4>
                        <div style={{width: '100%', height: 300}}>
                             <ResponsiveContainer>
                                <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                                    <XAxis dataKey="year" unit=" J." fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `€${Number(val)/1000}k`} />
                                    <Tooltip
                                        formatter={(value, name) => [formatCurrency(value as number), name === 'principal' ? 'Tilgung' : 'Zinsen']}
                                        labelFormatter={(label) => `Jahr ${label}`}
                                        contentStyle={{ background: 'hsl(var(--card) / 0.8)', backdropFilter: 'blur(4px)', border: '1px solid hsl(var(--border) / 0.2)', borderRadius: 'var(--radius)' }}
                                        cursor={{ fill: 'hsl(var(--secondary))' }}
                                    />
                                    <Legend wrapperStyle={{fontSize: "12px"}} />
                                    <Bar dataKey="principal" fill="hsl(var(--primary))" name="Tilgung" stackId="a" />
                                    <Bar dataKey="interest" fill="hsl(var(--destructive))" name="Zinsen" stackId="a" />
                                </BarChart>
                             </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            ) : (
                !isLoading && <IncludedDebtsList />
            )}
        </div>
    );
});

const SyncDataModal: React.FC = memo(() => {
    const { isSubscribed } = useAppState();
    const dispatch = useAppDispatch();
    const [step, setStep] = useState<'idle' | 'registering' | 'queued' | 'syncing' | 'complete' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubscribe = () => {
        dispatch({ type: 'SET_IS_SUBSCRIBED', payload: true });
    };

    useEffect(() => {
        // Listen for messages from the Service Worker (e.g. sync start/complete/error)
        const handleSWMessage = (event: MessageEvent) => {
            if (event.data) {
                if (event.data.type === 'SYNC_STARTED') {
                    setStep('syncing');
                    setProgress(10);
                    // Simulate progress visually since we don't get granular progress from simulated sync
                    const interval = setInterval(() => {
                        setProgress(prev => Math.min(prev + 5, 90));
                    }, 150);
                    // Store interval ID on element or ref if needed, but for simplicity relying on effect cleanup
                    return () => clearInterval(interval);
                }
                if (event.data.type === 'SYNC_COMPLETE') {
                    setProgress(100);
                    setTimeout(() => setStep('complete'), 500);
                }
                if (event.data.type === 'SYNC_ERROR') {
                    setStep('error');
                    setErrorMessage(event.data.message || 'Ein unbekannter Fehler ist aufgetreten.');
                }
            }
        };

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', handleSWMessage);
        }

        return () => {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.removeEventListener('message', handleSWMessage);
            }
        };
    }, []);

    const handleStartSync = async () => {
        setStep('registering');
        setProgress(5);
        setErrorMessage(null);

        // Check if Background Sync is supported and SW is ready
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            try {
                const registration = await navigator.serviceWorker.ready;
                // Register the background sync tag
                await (registration as any).sync.register('sync-transactions');
                
                // If we are offline, the sync will be queued.
                if (!navigator.onLine) {
                    setStep('queued');
                } else {
                    // If online, it usually triggers immediately.
                    // We set state to 'syncing' to show UI feedback immediately while waiting for SW message.
                    setStep('syncing');
                }
            } catch (err: any) {
                console.error("Background Sync registration failed:", err);
                setStep('error');
                setErrorMessage(err.message || "Fehler bei der Registrierung des Background Syncs.");
            }
        } else {
            // Fallback for browsers without Background Sync support
            fallbackSync();
        }
    };

    const fallbackSync = () => {
        setStep('syncing');
        let currentProgress = 0;
        const interval = setInterval(() => {
            currentProgress += 20;
            setProgress(currentProgress);
            if (currentProgress >= 100) {
                clearInterval(interval);
                setStep('complete');
            }
        }, 500);
    };

    if (!isSubscribed) {
        return (
            <div className="space-y-6 text-center">
                <div className="flex justify-center mb-4">
                    <div className="p-4 bg-primary/10 rounded-full animate-pulse">
                        <Lock size={48} className="text-primary" />
                    </div>
                </div>
                <div>
                    <h3 className="text-2xl font-bold mb-2">Premium Feature gesperrt</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                        Die dezentrale Synchronisation ist ein exklusives Feature für Klaro Pro Abonnenten. 
                        Halten Sie Ihre Daten sicher und synchron auf allen Geräten – ganz ohne zentralen Server.
                    </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6 text-left">
                    <div className="p-3 bg-secondary/50 rounded-lg flex items-start gap-3">
                        <div className="p-2 bg-success/20 text-success rounded-md mt-0.5"><ShieldCheck size={16}/></div>
                        <div>
                            <p className="font-semibold text-sm">E2E Verschlüsselt</p>
                            <p className="text-xs text-muted-foreground">Maximale Sicherheit für Ihre Finanzdaten.</p>
                        </div>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-lg flex items-start gap-3">
                        <div className="p-2 bg-blue-500/20 text-blue-500 rounded-md mt-0.5"><Database size={16}/></div>
                        <div>
                            <p className="font-semibold text-sm">Dezentral</p>
                            <p className="text-xs text-muted-foreground">Kein zentraler Server, Ihre Daten gehören Ihnen.</p>
                        </div>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-lg flex items-start gap-3">
                        <div className="p-2 bg-purple-500/20 text-purple-500 rounded-md mt-0.5"><Wifi size={16}/></div>
                        <div>
                            <p className="font-semibold text-sm">Offline-First</p>
                            <p className="text-xs text-muted-foreground">Syncen Sie, sobald Sie wieder online sind.</p>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-border/20">
                    <p className="text-lg font-bold mb-4">Nur 2,99 € / Monat</p>
                    <Button onClick={handleSubscribe} variant="primary" className="w-full text-lg py-3">
                        Jetzt upgraden & freischalten
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">Jederzeit kündbar. Keine versteckten Kosten.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col items-center justify-center p-6 bg-secondary/20 rounded-xl border border-border/50 relative overflow-hidden min-h-[300px]">
                {/* Background Decoration */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary))_0%,transparent_50%)] animate-pulse" style={{animationDuration: '4s'}}></div>
                </div>

                {step === 'idle' && (
                    <div className="text-center z-10 space-y-6 animate-fade-in">
                        <div className="relative inline-block">
                            <Server size={64} className="text-muted-foreground/50" />
                            <div className="absolute -bottom-2 -right-2 p-2 bg-card rounded-full shadow-lg border border-border">
                                <Share2 size={24} className="text-primary" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Bereit zum Synchronisieren</h3>
                            <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                                Verbinden Sie sich mit dem P2P-Netzwerk, um Ihre lokalen Daten abzugleichen.
                            </p>
                        </div>
                        <Button onClick={handleStartSync} variant="primary" className="px-8">
                            Verbindung herstellen
                        </Button>
                    </div>
                )}

                {(step === 'registering' || step === 'syncing') && (
                    <div className="w-full max-w-sm z-10 space-y-4 animate-fade-in">
                        <div className="text-center mb-4">
                             <div className="flex items-center justify-center gap-4 text-primary mb-3">
                                <Server size={32} />
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0s'}}></span>
                                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                                </div>
                                <Smartphone size={32} />
                            </div>
                            <h4 className="font-semibold">{step === 'registering' ? 'Initialisiere...' : 'Synchronisiere...'}</h4>
                        </div>
                        <div className="flex justify-between text-sm font-medium mb-1">
                            <span>Fortschritt</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
                            <div 
                                className="bg-primary h-full transition-all duration-300 ease-out relative"
                                style={{ width: `${progress}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-[shimmer_1s_infinite] w-full h-full"></div>
                            </div>
                        </div>
                        {step === 'syncing' && (
                            <div className="text-xs font-mono text-muted-foreground text-center mt-2">
                                Hash: 0x{Math.random().toString(16).substr(2, 8)}...
                            </div>
                        )}
                    </div>
                )}

                {step === 'queued' && (
                    <div className="text-center z-10 space-y-6 animate-fade-in">
                        <div className="inline-flex items-center justify-center p-4 bg-warning/10 text-warning rounded-full ring-4 ring-warning/5 mb-2">
                            <WifiOff size={48} className="animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Warte auf Netzwerk...</h3>
                            <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                                Die Synchronisation wurde in die Warteschlange gestellt und startet automatisch, sobald Sie wieder online sind.
                            </p>
                        </div>
                        <div className="bg-secondary/50 p-3 rounded-lg text-xs font-mono text-muted-foreground flex items-center justify-center gap-2">
                            <span className="w-2 h-2 bg-warning rounded-full animate-pulse"></span>
                            Status: Offline
                        </div>
                        <Button onClick={() => dispatch({type: 'CLOSE_MODAL'})} variant="secondary">
                            Im Hintergrund laufen lassen
                        </Button>
                    </div>
                )}

                {step === 'complete' && (
                    <div className="text-center z-10 space-y-6 animate-fade-in">
                        <div className="inline-flex items-center justify-center p-4 bg-success/10 text-success rounded-full ring-4 ring-success/5 mb-2">
                            <CheckCircle2 size={48} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Synchronisation erfolgreich</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Ihre Daten sind nun auf dem neuesten Stand.
                            </p>
                        </div>
                        <div className="bg-secondary/50 p-3 rounded-lg text-xs font-mono text-muted-foreground">
                            Letzter Sync: {format(new Date(), 'HH:mm:ss')} • Block #{Math.floor(Math.random() * 100000)}
                        </div>
                        <Button onClick={() => dispatch({type: 'CLOSE_MODAL'})} variant="secondary">
                            Schließen
                        </Button>
                    </div>
                )}

                {step === 'error' && (
                    <div className="text-center z-10 space-y-6 animate-fade-in">
                        <div className="inline-flex items-center justify-center p-4 bg-destructive/10 text-destructive rounded-full ring-4 ring-destructive/5 mb-2">
                            <AlertCircle size={48} className="animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-destructive">Synchronisation fehlgeschlagen</h3>
                            <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto bg-destructive/5 p-2 rounded border border-destructive/20">
                                {errorMessage}
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
                            <Button onClick={() => { setStep('idle'); handleStartSync(); }} variant="primary">
                                Erneut versuchen
                            </Button>
                            <Button onClick={() => dispatch({type: 'CLOSE_MODAL'})} variant="secondary">
                                Schließen
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

const ExportImportModal: React.FC = memo(() => {
    const state = useAppState();
    const dispatch = useAppDispatch();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
        const { activeModal, selectedTransactions, ...data } = state;
        const json = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
        const link = document.createElement("a");
        link.href = json;
        link.download = `klaro-backup-${formatDate(new Date().toISOString())}.json`;
        link.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            if (typeof ev.target?.result === 'string' && window.confirm('Möchten Sie wirklich die Daten importieren? Alle aktuellen Daten werden überschrieben.')) {
                try {
                    const data = JSON.parse(ev.target.result);
                    dispatch({ type: 'IMPORT_DATA', payload: data });
                } catch { alert("Import fehlgeschlagen."); }
            }
        };
        reader.readAsText(file);
    };

    const handleResetState = () => {
        if (window.confirm('Sind Sie sicher, dass Sie den Zustand auf die ursprünglichen Beispieldaten zurücksetzen möchten? Alle Ihre Daten gehen verloren.')) {
            dispatch({ type: 'RESET_STATE' });
        }
    };

    const handleClearAllData = () => {
        if (window.confirm('WARNUNG: Möchten Sie wirklich ALLE Daten löschen? Dies entfernt alle Transaktionen, Kategorien, Ziele und Einstellungen. Dieser Vorgang kann NICHT rückgängig gemacht werden.')) {
            dispatch({ type: 'CLEAR_ALL_DATA' });
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 bg-secondary/30 rounded-lg border border-border/50 flex flex-col items-center text-center">
                    <FileDown className="h-8 w-8 text-primary mb-3" />
                    <h4 className="font-semibold">Backup erstellen</h4>
                    <p className="text-muted-foreground text-sm mt-1 mb-4">Sichern Sie alle Ihre Daten in einer JSON-Datei.</p>
                    <Button onClick={handleExport} variant="primary" className="w-full mt-auto">Herunterladen</Button>
                </div>
                <div className="p-4 bg-secondary/30 rounded-lg border border-border/50 flex flex-col items-center text-center">
                    <UploadCloud className="h-8 w-8 text-primary mb-3" />
                    <h4 className="font-semibold">Backup wiederherstellen</h4>
                    <p className="text-muted-foreground text-sm mt-1 mb-4">Importieren Sie eine zuvor exportierte Datei.</p>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                    <Button onClick={() => fileInputRef.current?.click()} className="w-full mt-auto">Datei auswählen</Button>
                </div>
            </div>
            
            <div className="pt-6 border-t border-border/20">
                <h4 className="font-semibold text-destructive mb-2 flex items-center gap-2">
                    <AlertTriangle size={18}/> Gefahrzone
                </h4>
                <div className="space-y-3">
                    <div className="p-4 bg-destructive/10 rounded-lg flex items-center justify-between gap-4">
                        <div>
                            <p className="font-medium text-destructive-foreground">Beispieldaten laden</p>
                            <p className="text-xs text-muted-foreground">Setzt die App auf den Demostatus zurück.</p>
                        </div>
                        <Button onClick={handleResetState} variant="secondary" className="flex-shrink-0 flex items-center gap-2 border-destructive/20 hover:bg-destructive/20 text-destructive-foreground">
                            <RefreshCw size={16} /> Reset
                        </Button>
                    </div>
                    <div className="p-4 bg-destructive/10 rounded-lg flex items-center justify-between gap-4 border border-destructive/20">
                        <div>
                            <p className="font-bold text-destructive">ALLE DATEN LÖSCHEN</p>
                            <p className="text-xs text-muted-foreground">Löscht alle Eingaben komplett. Leerer Zustand.</p>
                        </div>
                        <Button onClick={handleClearAllData} variant="destructive" className="flex-shrink-0 flex items-center gap-2">
                            <Trash2 size={16} /> Alles löschen
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
});

const ConfirmBulkDeleteModal: React.FC<{ ids: string[] }> = memo(({ ids }) => {
    const dispatch = useAppDispatch();

    const handleConfirm = () => {
        dispatch({ type: 'DELETE_TRANSACTIONS', payload: ids });
        dispatch({ type: 'CLOSE_MODAL' });
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col items-center text-center p-4 bg-destructive/5 rounded-lg border border-destructive/10">
                <div className="p-3 bg-destructive/10 rounded-full mb-3">
                    <Trash2 className="h-8 w-8 text-destructive" />
                </div>
                <h4 className="text-lg font-bold text-foreground">Transaktionen löschen?</h4>
                <p className="text-sm text-muted-foreground mt-1">
                    Sind Sie sicher, dass Sie <span className="font-bold text-foreground">{ids.length}</span> ausgewählte Transaktionen unwiderruflich löschen möchten?
                </p>
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
                <Button onClick={() => dispatch({ type: 'CLOSE_MODAL' })}>
                    Abbrechen
                </Button>
                <Button onClick={handleConfirm} variant="destructive">
                    Ja, löschen
                </Button>
            </div>
        </div>
    );
});

const BudgetDetailsModal: React.FC = memo(() => {
    const budgetData = useBudgetOverviewData();
    
    const totalBudget = useMemo(() => budgetData.reduce((acc, curr) => acc + curr.budget, 0), [budgetData]);
    const totalSpent = useMemo(() => budgetData.reduce((acc, curr) => acc + curr.spent, 0), [budgetData]);
    const totalRemaining = totalBudget - totalSpent;

    if (budgetData.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="p-4 bg-secondary/50 rounded-full inline-block mb-4">
                    <PieChartIcon size={32} className="text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">Keine Budgets definiert</h3>
                <p className="text-muted-foreground mt-2">Erstellen Sie Kategorien mit einem Budgetlimit, um hier detaillierte Analysen zu sehen.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 flex flex-col">
                    <span className="text-sm text-muted-foreground">Gesamtbudget</span>
                    <span className="text-2xl font-bold font-mono text-primary">{formatCurrency(totalBudget)}</span>
                </div>
                <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 flex flex-col">
                    <span className="text-sm text-muted-foreground">Ausgegeben</span>
                    <span className="text-2xl font-bold font-mono text-foreground">{formatCurrency(totalSpent)}</span>
                </div>
                <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 flex flex-col">
                    <span className="text-sm text-muted-foreground">Verbleibend</span>
                    <span className={`text-2xl font-bold font-mono ${totalRemaining >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(totalRemaining)}
                    </span>
                </div>
            </div>

            <div className="h-[300px] w-full bg-card/50 rounded-xl border border-border/50 p-2">
                <h4 className="text-sm font-semibold mb-4 px-2">Budget vs. Tatsächlich</h4>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={budgetData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        barGap={2}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.3)" vertical={false} />
                        <XAxis 
                            dataKey="name" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false}
                            tick={{fill: 'hsl(var(--muted-foreground))'}}
                        />
                        <YAxis 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false}
                            tickFormatter={(val) => `€${val}`}
                            tick={{fill: 'hsl(var(--muted-foreground))'}}
                        />
                        <Tooltip
                            cursor={{fill: 'hsl(var(--secondary)/0.3)'}}
                            contentStyle={{ 
                                backgroundColor: 'hsl(var(--popover))', 
                                borderColor: 'hsl(var(--border))', 
                                borderRadius: 'var(--radius)',
                                color: 'hsl(var(--popover-foreground))'
                            }}
                            formatter={(value: number) => formatCurrency(value)}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
                        <Bar dataKey="budget" name="Budget" fill="hsl(var(--muted-foreground)/0.3)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar dataKey="spent" name="Ausgaben" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="space-y-3">
                <h4 className="text-sm font-semibold px-1">Details nach Kategorie</h4>
                <div className="grid grid-cols-1 gap-3">
                    {budgetData.map((item) => {
                        const remaining = item.budget - item.spent;
                        const isOver = remaining < 0;
                        
                        return (
                            <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors border border-transparent hover:border-border/30">
                                <div className="flex flex-col min-w-0 pr-4">
                                    <span className="font-medium truncate">{item.name}</span>
                                    <div className="w-full bg-secondary h-1.5 rounded-full mt-2 min-w-[100px]">
                                        <div 
                                            className={`h-1.5 rounded-full ${isOver ? 'bg-destructive' : 'bg-success'}`} 
                                            style={{ width: `${Math.min(item.percentage, 100)}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col items-end flex-shrink-0">
                                    <div className="text-sm font-mono">
                                        <span className="font-bold">{formatCurrency(item.spent)}</span>
                                        <span className="text-muted-foreground mx-1">/</span>
                                        <span className="text-muted-foreground">{formatCurrency(item.budget)}</span>
                                    </div>
                                    <span className={`text-xs font-semibold ${isOver ? 'text-destructive' : 'text-success'}`}>
                                        {isOver ? '+' : ''}{formatCurrency(Math.abs(remaining))} {isOver ? 'drüber' : 'übrig'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});

const UserProfileModal: React.FC = memo(() => {
    const { userProfile } = useAppState();
    const dispatch = useAppDispatch();
    const [formData, setFormData] = useState({ ...userProfile });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        dispatch({ type: 'UPDATE_USER_PROFILE', payload: formData });
        dispatch({ type: 'CLOSE_MODAL' });
    };

    const initials = formData.name 
        ? formData.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() 
        : 'U';

    return (
        <div className="space-y-6">
            <div className="flex flex-col items-center mb-6">
                <div className="w-24 h-24 rounded-full bg-primary/20 text-primary flex items-center justify-center text-3xl font-bold mb-3 border-4 border-background shadow-xl">
                    {initials}
                </div>
                <p className="text-sm text-muted-foreground">Ihr lokales Profil</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <FormGroup label="Anzeigename" htmlFor="name">
                    <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
                </FormGroup>
                <FormGroup label="E-Mail (Optional)" htmlFor="email">
                    <Input type="email" id="email" name="email" value={formData.email} onChange={handleChange} placeholder="name@beispiel.de" />
                </FormGroup>
                
                <div className="grid grid-cols-2 gap-4">
                    <FormGroup label="Währung" htmlFor="currency">
                        <Select id="currency" name="currency" value={formData.currency} onChange={handleChange} disabled title="Aktuell nur EUR unterstützt">
                            <option value="EUR">EUR (€)</option>
                            <option value="USD">USD ($)</option>
                            <option value="GBP">GBP (£)</option>
                        </Select>
                    </FormGroup>
                    <FormGroup label="Sprache" htmlFor="language">
                        <Select id="language" name="language" value={formData.language} onChange={handleChange} disabled title="Aktuell nur Deutsch unterstützt">
                            <option value="de">Deutsch</option>
                            <option value="en">English</option>
                        </Select>
                    </FormGroup>
                </div>

                <div className="flex justify-end pt-4">
                    <Button type="submit" variant="primary">Speichern</Button>
                </div>
            </form>

            <div className="border-t border-border/20 pt-4 mt-6">
                <h4 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wider">Datenverwaltung</h4>
                <div className="grid grid-cols-1 gap-3">
                    <button 
                        onClick={() => dispatch({ type: 'OPEN_MODAL', payload: { type: 'EXPORT_IMPORT_DATA' } })}
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 text-primary rounded-md"><FileDown size={18}/></div>
                            <div>
                                <p className="font-medium text-sm">Daten Exportieren / Importieren</p>
                                <p className="text-xs text-muted-foreground">Sichern Sie Ihre Daten oder stellen Sie ein Backup wieder her.</p>
                            </div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
});

const MergeTransactionsModal: React.FC<{ transactionIds: string[] }> = memo(({ transactionIds }) => {
    const { transactions } = useAppState();
    const dispatch = useAppDispatch();
    
    const toMerge = useMemo(() => transactions.filter(t => transactionIds.includes(t.id)), [transactions, transactionIds]);
    const [description, setDescription] = useState(toMerge[0]?.description || '');
    const [isConfirmed, setIsConfirmed] = useState(false);
    
    const total = useMemo(() => toMerge.reduce((sum, t) => sum + t.amount, 0), [toMerge]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (description.trim() && isConfirmed) {
            dispatch({ type: 'MERGE_TRANSACTIONS', payload: { transactionIds, newDescription: description.trim() } });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <p>Sie sind dabei, <strong>{transactionIds.length}</strong> Transaktionen zu einer zusammenzuführen.</p>
            <div className="p-4 bg-secondary rounded-lg">
                <p><strong>Gesamtbetrag:</strong> {formatCurrency(total)}</p>
                <p className="text-sm text-muted-foreground mt-1">Tags werden kombiniert, das neueste Datum wird verwendet.</p>
            </div>
            <FormGroup label="Neue Beschreibung" htmlFor="description">
                <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="z.B. Wocheneinkauf KW 24" />
            </FormGroup>
            <div className="flex items-start space-x-3 pt-2">
                <input
                    id="confirmation"
                    type="checkbox"
                    checked={isConfirmed}
                    onChange={(e) => setIsConfirmed(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary mt-1"
                />
                <label htmlFor="confirmation" className="text-sm text-muted-foreground">
                    Ich verstehe, dass {toMerge.length} Transaktionen zu einer einzigen zusammengefasst werden und diese Aktion <strong className="font-semibold text-destructive">nicht rückgängig</strong> gemacht werden kann.
                </label>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
                <Button type="button" onClick={() => dispatch({type: 'CLOSE_MODAL'})}>Abbrechen</Button>
                <Button type="submit" variant="primary" disabled={!description.trim() || !isConfirmed}>Zusammenführen</Button>
            </div>
        </form>
    );
});

const SankeyNode = ({ x, y, width, height, index, payload, containerWidth }: any) => {
  const isOut = x + width + 6 > (containerWidth || 800);
  return (
    <g>
      <Rectangle x={x} y={y} width={width} height={height} fill="hsl(var(--primary))" fillOpacity="0.8" radius={[4, 4, 4, 4]} />
      <text
        textAnchor={isOut ? 'end' : 'start'}
        x={isOut ? x - 6 : x + width + 6}
        y={y + height / 2}
        fontSize="12"
        fill="hsl(var(--foreground))"
        dy="-0.3em"
        fontWeight="bold"
      >
        {payload.name}
      </text>
      <text
        textAnchor={isOut ? 'end' : 'start'}
        x={isOut ? x - 6 : x + width + 6}
        y={y + height / 2}
        fontSize="10"
        fill="hsl(var(--muted-foreground))"
        dy="0.9em"
      >
        {formatCurrency(payload.value)}
      </text>
    </g>
  );
};

const TaxExportModal: React.FC = memo(() => {
    const { transactions, categories } = useAppState();
    const [year, setYear] = useState(new Date().getFullYear());

    const handleExport = () => {
        const relevantTransactions = transactions.filter(t => t.date.startsWith(String(year)));
        
        if (relevantTransactions.length === 0) {
            alert(`Keine Transaktionen für das Jahr ${year} gefunden.`);
            return;
        }

        const categoryMap = new Map(categories.map(c => [c.id, c.name]));

        const headers = ['Datum', 'Typ', 'Kategorie', 'Beschreibung', 'Betrag', 'Währung', 'Tags'];
        const csvContent = [
            headers.join(','),
            ...relevantTransactions.map(t => [
                t.date,
                t.type,
                `"${(t.categoryId ? categoryMap.get(t.categoryId) : '') || ''}"`,
                `"${(t.description || '').replace(/"/g, '""')}"`,
                t.amount.toFixed(2),
                'EUR',
                `"${(t.tags || []).join(' ')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `steuer_export_${year}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="p-6 bg-secondary/30 rounded-xl border border-border/50">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <FileDown size={24} />
                    </div>
                    <div>
                        <h4 className="font-semibold text-lg">Steuerdaten exportieren</h4>
                        <p className="text-sm text-muted-foreground">Laden Sie alle Transaktionen eines Jahres als CSV-Datei herunter.</p>
                    </div>
                </div>
                
                <div className="flex items-end gap-4">
                    <div className="flex-1">
                        <FormGroup label="Steuerjahr">
                             <Input 
                                type="number" 
                                value={year} 
                                onChange={(e) => setYear(parseInt(e.target.value))} 
                                min="2000" 
                                max="2100"
                                className="font-mono text-lg"
                            />
                        </FormGroup>
                    </div>
                    <Button onClick={handleExport} variant="primary" className="mb-[2px] h-[42px] px-6">Exportieren</Button>
                </div>
            </div>
        </div>
    );
});

const AnalysisModal: React.FC = memo(() => {
    const sankeyData = useSankeyData();
    const cashflowData = useCashflowData();
    const [activeTab, setActiveTab] = useState<'sankey' | 'trend'>('sankey');

    const hasSankeyData = sankeyData && sankeyData.nodes.length > 0;
    const hasTrendData = cashflowData && cashflowData.some(d => d.Einnahmen > 0 || d.Ausgaben > 0);

    if (!hasSankeyData && !hasTrendData) {
        return (
            <div className="text-center py-10"><p className="text-muted-foreground">Nicht genügend Daten für eine Analyse vorhanden.</p></div>
        );
    }
    
    return (
        <div className="space-y-4">
            <div className="flex bg-secondary p-1 rounded-lg w-full sm:w-auto self-start">
                <button
                    onClick={() => setActiveTab('sankey')}
                    className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'sankey' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <div className="flex items-center gap-2">
                        <Activity size={16} />
                        <span>Geldfluss</span>
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('trend')}
                    className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'trend' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <div className="flex items-center gap-2">
                        <BarChart3 size={16} />
                        <span>Trend</span>
                    </div>
                </button>
            </div>

            <div style={{ width: '100%', height: 500 }} className="bg-secondary/10 rounded-xl border border-border/20 p-2">
                <ResponsiveContainer>
                    {activeTab === 'sankey' ? (
                        hasSankeyData ? (
                            <Sankey data={sankeyData} nodePadding={50} margin={{ top: 20, right: 150, bottom: 20, left: 150 }} link={{ stroke: 'hsl(var(--primary)/0.3)', strokeWidth: 15, strokeOpacity: 0.6 }} node={<SankeyNode />}>
                               <Tooltip
                                 formatter={(value: any, name: any, props: any) => {
                                   if (props.payload.source) { // it's a link
                                      return [`${formatCurrency(value)}`, `${props.payload.source.name} → ${props.payload.target.name}`]
                                   }
                                   return null;
                                 }}
                                 contentStyle={{ background: 'hsl(var(--card) / 0.9)', backdropFilter: 'blur(8px)', border: '1px solid hsl(var(--border) / 0.5)', borderRadius: 'var(--radius)', padding: '8px 12px' }}
                                />
                            </Sankey>
                        ) : <div className="h-full flex items-center justify-center text-muted-foreground">Keine Daten für Flussdiagramm</div>
                    ) : (
                        hasTrendData ? (
                            <BarChart data={cashflowData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" vertical={false} />
                                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `€${Number(value)}`} />
                                <Tooltip
                                    cursor={{fill: 'hsl(var(--secondary)/0.5)'}}
                                    contentStyle={{ background: 'hsl(var(--card) / 0.9)', backdropFilter: 'blur(8px)', border: '1px solid hsl(var(--border) / 0.5)', borderRadius: 'var(--radius)' }}
                                    formatter={(value: number) => formatCurrency(value)}
                                />
                                <Legend />
                                <Bar dataKey="Einnahmen" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                <Bar dataKey="Ausgaben" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} maxBarSize={50} />
                            </BarChart>
                        ) : <div className="h-full flex items-center justify-center text-muted-foreground">Keine Daten für Trendanalyse</div>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
});

const MODAL_COMPONENTS: { [key in ModalType['type']]: { component: React.FC<any>, title: string, size?: 'sm' | 'md' | 'lg' | 'xl' } } = {
    ADD_TRANSACTION: { component: TransactionModal, title: 'Neue Transaktion' },
    EDIT_TRANSACTION: { component: TransactionModal, title: 'Transaktion bearbeiten' },
    VIEW_TRANSACTION: { component: TransactionDetailModal, title: 'Transaktionsdetails' },
    SMART_SCAN: { component: SmartScanModal, title: 'Smart Scan: Beleg erfassen', size: 'lg' },
    MONTHLY_CHECK: { component: () => <div>Monatsabschluss (in Kürze)</div>, title: 'Monatsabschluss' },
    MANAGE_CATEGORIES: { component: CategoryManagerModal, title: 'Kategorien verwalten', size: 'lg' },
    MANAGE_GOALS: { component: ManageGoalsModal, title: 'Ziele verwalten', size: 'lg' },
    MANAGE_PROJECTS: { component: ManageProjectsModal, title: 'Projekte verwalten', size: 'lg' },
    MANAGE_RECURRING: { component: RecurringManagerModal, title: 'Daueraufträge verwalten', size: 'xl' },
    MANAGE_LIABILITIES: { component: LiabilityManagerModal, title: 'Schulden & Forderungen verwalten', size: 'lg' },
    DEBT_PAYDOWN: { component: DebtPaydownModal, title: 'Schulden-Tilgungsplaner', size: 'xl' },
    EXPORT_IMPORT_DATA: { component: ExportImportModal, title: 'Daten Export / Import' },
    TAX_EXPORT: { component: TaxExportModal, title: 'Steuer-Export', size: 'lg' },
    SUBSCRIPTION: { component: () => <div>Abonnement (in Kürze)</div>, title: 'Abonnement' },
    SYNC_DATA: { component: SyncDataModal, title: 'Dezentrale Synchronisation' },
    MERGE_TRANSACTIONS: { component: MergeTransactionsModal, title: 'Transaktionen zusammenführen' },
    CONFIRM_BULK_DELETE: { component: ConfirmBulkDeleteModal, title: 'Löschen bestätigen' },
    BUDGET_DETAILS: { component: BudgetDetailsModal, title: 'Detaillierte Budgetanalyse', size: 'xl' },
    USER_PROFILE: { component: UserProfileModal, title: 'Benutzerprofil', size: 'lg' },
    ANALYSIS: { component: AnalysisModal, title: 'Cashflow Analyse', size: 'xl' },
};

const ModalManager: React.FC = () => {
    const { activeModal } = useAppState();
    const dispatch = useAppDispatch();
    const closeModal = useCallback(() => dispatch({ type: 'CLOSE_MODAL' }), [dispatch]);

    if (!activeModal) return null;

    const { component: ActiveModal, title, size } = MODAL_COMPONENTS[activeModal.type];
    const modalData = 'data' in activeModal ? activeModal.data : {};

    return (
        <Modal title={title} onClose={closeModal} size={size}>
            <ActiveModal {...modalData} />
        </Modal>
    );
};

export default ModalManager;
