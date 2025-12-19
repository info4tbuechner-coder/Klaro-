
import React, { useState, useCallback, useRef, useEffect, memo, useMemo } from 'react';
import { useAppState, useAppDispatch, useSankeyData, useProjectReportData } from '../../context/AppContext';
import { Transaction, Category, Goal, Project, RecurringTransaction, TransactionType, CategoryType, GoalType, Frequency, ModalType, LiabilityType, Liability } from '../../types';
import { GoogleGenAI, Type } from "@google/genai";
import { X, Camera, Sparkles, Trash2, FileDown, UploadCloud, Edit, FileText, ArrowDownCircle, ArrowUpCircle, Calendar, GripVertical, CalendarCheck, TrendingUp, PiggyBank, BarChart3, Zap, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Sankey, Tooltip, ResponsiveContainer, Rectangle, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { formatCurrency, formatDate, calculateDebtPaydownPlan, PaydownPlan } from '../../utils';
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
            date: new Date().toISOString().split('T')[0], categoryId: '', goalId: '', liabilityId: '',
            tags: viewMode === 'private' ? ['privat'] : viewMode === 'business' ? ['business'] : [],
        };
    }, [transaction, viewMode]);

    const [formData, setFormData] = useState<Omit<Transaction, 'id'>>(getInitialFormData());

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'amount' ? parseFloat(value) : value }));
    }, []);
    
    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if(transaction) {
            dispatch({ type: 'UPDATE_TRANSACTION', payload: { ...formData, id: transaction.id } });
        } else {
            dispatch({ type: 'ADD_TRANSACTION', payload: formData });
        }
    }, [dispatch, formData, transaction]);

    const relevantLiabilities = useMemo(() => {
        if (formData.type === TransactionType.EXPENSE) {
            return liabilities.filter(l => l.type === LiabilityType.DEBT && l.paidAmount < l.initialAmount);
        }
        if (formData.type === TransactionType.INCOME) {
            return liabilities.filter(l => l.type === LiabilityType.LOAN && l.paidAmount < l.initialAmount);
        }
        return [];
    }, [formData.type, liabilities]);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <FormGroup label="Beschreibung" htmlFor="description">
                <Input type="text" id="description" name="description" value={formData.description} onChange={handleChange} required />
            </FormGroup>
            <div className="grid grid-cols-2 gap-4">
                <FormGroup label="Betrag" htmlFor="amount">
                    <Input type="number" id="amount" name="amount" value={formData.amount} onChange={handleChange} required step="0.01" />
                </FormGroup>
                <FormGroup label="Datum" htmlFor="date">
                    <Input type="date" id="date" name="date" value={formData.date} onChange={handleChange} required />
                </FormGroup>
            </div>
             <FormGroup label="Typ" htmlFor="type">
                <Select name="type" id="type" value={formData.type} onChange={handleChange}>
                    <option value={TransactionType.EXPENSE}>Ausgabe</option>
                    <option value={TransactionType.INCOME}>Einnahme</option>
                    <option value={TransactionType.SAVING}>Sparen</option>
                </Select>
            </FormGroup>
            <FormGroup label="Kategorie" htmlFor="categoryId">
                <Select name="categoryId" id="categoryId" value={formData.categoryId} onChange={handleChange}>
                    <option value="">Keine Kategorie</option>
                    {categories.filter(c => c.type === (formData.type === 'income' ? 'income' : 'expense')).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
            </FormGroup>
            {formData.type === TransactionType.SAVING && goals.length > 0 && (
                 <FormGroup label="Sparziel zuordnen" htmlFor="goalId">
                    <Select name="goalId" id="goalId" value={formData.goalId} onChange={handleChange}>
                        <option value="">Kein Ziel</option>
                        {goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </Select>
                </FormGroup>
            )}
             {relevantLiabilities.length > 0 && (
                <FormGroup label="Schuld/Forderung zuordnen" htmlFor="liabilityId">
                    <Select name="liabilityId" id="liabilityId" value={formData.liabilityId} onChange={handleChange}>
                        <option value="">Keine Zuordnung</option>
                        {relevantLiabilities.map(l => (
                            <option key={l.id} value={l.id}>{l.name} ({formatCurrency(l.initialAmount - l.paidAmount)} offen)</option>
                        ))}
                    </Select>
                </FormGroup>
            )}
            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" onClick={() => dispatch({type: 'CLOSE_MODAL'})}>Abbrechen</Button>
                <Button type="submit" variant="primary">Speichern</Button>
            </div>
        </form>
    );
});

const SmartScanModal: React.FC = memo(() => {
    const dispatch = useAppDispatch();
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isLoading, setIsLoading] = useState(false); // For AI scan
    const [isCameraStarting, setIsCameraStarting] = useState(true);
    const [error, setError] = useState<{ type: string; message: string } | null>(null);

    const startCamera = useCallback(async () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        
        setIsCameraStarting(true);
        setError(null);
        setStream(null);

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setError({ type: "UnsupportedError", message: "Ihr Browser unterstützt den Kamerazugriff nicht." });
            setIsCameraStarting(false);
            return;
        }

        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setStream(mediaStream);
            streamRef.current = mediaStream;
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err: any) {
            const errorName = err?.name || '';
            const errorMessage = err?.message || (typeof err === 'string' ? err : '');

            const isPermissionError = 
                errorName === 'NotAllowedError' || 
                errorName === 'PermissionDeniedError' || 
                errorMessage.toLowerCase().includes('permission denied') ||
                errorMessage.toLowerCase().includes('permission dismissed');

            if (!isPermissionError) {
                console.error("Camera Error:", err);
            } else {
                console.warn("Camera permission denied by user.");
            }

            let message = "Ein unbekannter Kamerafehler ist aufgetreten.";
            let errorType = 'GenericError';
            
            if (isPermissionError) {
                errorType = 'NotAllowedError';
                message = "Kamerazugriff wurde verweigert.";
            } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
                errorType = 'NotFoundError';
                message = "Keine passende Kamera gefunden. Stellen Sie sicher, dass eine Kamera angeschlossen ist.";
            } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
                errorType = 'NotReadableError';
                message = "Die Kamera wird bereits von einer anderen Anwendung verwendet oder ist defekt.";
            } else if (errorMessage) {
                 message = errorMessage;
            }
            
            setError({ type: errorType, message });
        } finally {
            setIsCameraStarting(false);
        }
    }, []);

    useEffect(() => {
        startCamera();
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [startCamera]);

    const handleScan = useCallback(async () => {
        if (!navigator.onLine) {
            setError({ type: 'OfflineError', message: 'Sie sind offline. Der Beleg kann nicht analysiert werden.' });
            return;
        }

        if (!videoRef.current || !videoRef.current.srcObject) {
            setError({ type: 'NotReadyError', message: 'Kamera ist nicht bereit.'});
            return;
        }
        setIsLoading(true);
        setError(null);
        
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            setError({ type: 'CanvasError', message: 'Fehler beim Erfassen des Bildes.' });
            setIsLoading(false);
            return;
        }
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        
        const base64Data = canvas.toDataURL('image/jpeg').split(',')[1];

        try {
            if (!process.env.API_KEY) throw new Error("API_KEY ist nicht konfiguriert.");

            const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    description: { type: Type.STRING, description: "Der Name des Händlers oder Geschäfts." },
                    amount: { type: Type.NUMBER, description: "Der Gesamtbetrag der Transaktion." },
                    date: { type: Type.STRING, description: "Das Transaktionsdatum im Format YYYY-MM-DD." },
                },
                required: ["description", "amount", "date"]
            };

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [{
                    parts: [
                        { text: "Extrahiere die Details von diesem Beleg." },
                        { inlineData: { mimeType: 'image/jpeg', data: base64Data } }
                    ]
                }],
                config: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema,
                },
            });
            
            const jsonStr = response.text.trim();
            const result = JSON.parse(jsonStr);
            
            dispatch({ type: 'ADD_TRANSACTION', payload: {
                description: result.description || 'Gescannte Transaktion',
                amount: typeof result.amount === 'number' ? result.amount : 0,
                date: result.date || new Date().toISOString().split('T')[0],
                type: TransactionType.EXPENSE,
                tags: ['gescannt']
            }});
            dispatch({ type: 'CLOSE_MODAL' });
        } catch (e) {
            console.error("Smart Scan Error:", e);
            setError({ type: 'ScanError', message: 'Analyse fehlgeschlagen. Der Beleg konnte nicht gelesen werden. Bitte versuchen Sie es erneut oder geben Sie die Daten manuell ein.' });
        } finally {
            setIsLoading(false);
        }
    }, [dispatch]);

    return (
        <div>
            {error && (
                error.type === 'NotAllowedError' ? (
                    <div className="p-4 mb-4 text-sm text-destructive-foreground bg-destructive rounded-lg flex flex-col items-center text-center gap-3" role="alert">
                        <AlertTriangle className="h-8 w-8" />
                        <h3 className="font-semibold text-lg">Kamerazugriff verweigert</h3>
                        <p>
                            Um Belege scannen zu können, benötigt Klaro Zugriff auf Ihre Kamera.
                            Bitte aktivieren Sie den Kamerazugriff in Ihren Browser-Einstellungen und versuchen Sie es erneut.
                        </p>
                        <p className="text-xs text-destructive-foreground/80">
                            Tipp: Suchen Sie nach dem Schloss-Symbol in der Adressleiste Ihres Browsers, um die Berechtigungen für diese Seite zu ändern.
                        </p>
                        <Button onClick={startCamera} variant="secondary" className="bg-destructive/20 hover:bg-destructive/40 border-destructive-foreground/50 text-destructive-foreground mt-2">
                            Erneut versuchen
                        </Button>
                    </div>
                ) : (
                    <div className="p-3 mb-4 text-sm text-destructive-foreground bg-destructive rounded-lg flex items-center justify-between gap-4" role="alert">
                        <span>{error.message}</span>
                        {error.type !== 'OfflineError' && (
                             <Button onClick={startCamera} variant="secondary" className="bg-destructive/20 hover:bg-destructive/40 border-destructive-foreground/50 text-destructive-foreground flex-shrink-0">Erneut versuchen</Button>
                        )}
                    </div>
                )
            )}
            <div className="relative w-full aspect-video bg-secondary rounded-lg overflow-hidden border-2 border-dashed border-border">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                {isCameraStarting && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-primary-foreground animate-fade-in">
                        <Camera className="h-10 w-10 animate-pulse mb-4" />
                        <span className="text-lg font-semibold">Kamera wird gestartet...</span>
                    </div>
                )}
                 {stream && !isLoading && !isCameraStarting && (
                    <>
                        <div className="absolute inset-0 bg-transparent border-primary/50 border-8 rounded-lg" style={{ clipPath: 'polygon(0% 0%, 0% 100%, 25% 100%, 25% 25%, 75% 25%, 75% 75%, 25% 75%, 25% 100%, 100% 100%, 100% 0%)' }}></div>
                        <div className="absolute top-0 left-0 right-0 h-1 bg-primary/80 shadow-[0_0_20px_3px_hsl(var(--primary))] animate-scan-line"></div>
                    </>
                )}
                {isLoading && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-primary-foreground animate-fade-in">
                        <Sparkles className="h-10 w-10 text-primary animate-pulse mb-4" />
                        <span className="text-lg font-semibold">Beleg wird analysiert...</span>
                        <span className="text-sm">Bitte haben Sie einen Moment Geduld.</span>
                    </div>
                )}
            </div>
            <div className="mt-6 flex justify-center">
                <Button 
                    onClick={handleScan} 
                    disabled={isLoading || !!error || !stream || isCameraStarting} 
                    variant="primary" 
                    className="px-8 py-4 rounded-full flex items-center space-x-3 text-lg font-bold transform hover:scale-105"
                    aria-label="Beleg scannen"
                >
                    <Camera size={24} /> <span>Jetzt Scannen</span>
                </Button>
            </div>
        </div>
    );
});

const CategoryItem = memo(({ category, onUpdate, onDelete, onDragStart, onDragOver, onDrop, onDragEnd }: { 
    category: Category; 
    onUpdate: (c: Category) => void; 
    onDelete: (c: Category) => void;
    onDragStart: (e: React.DragEvent<HTMLDivElement>, c: Category) => void;
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>, c: Category) => void;
    onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
}) => {
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
                <span className="flex-grow font-medium" onClick={() => setIsEditing(true)}>{category.name}</span>
            )}
            <button onClick={() => setIsEditing(true)} className="p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"><Edit size={14} /></button>
            {category.type === CategoryType.EXPENSE && (
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                    <Input type="number" placeholder="Budget" defaultValue={category.budget} onBlur={handleBudgetUpdate} className="w-28 pl-6 pr-2 py-1 text-right" />
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

    // Get order from localStorage on mount
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
    }, []); // Run only once

    const { categories } = useAppState(); // Use the potentially reordered state

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
                            onUpdate={(cat) => dispatch({type:'UPDATE_CATEGORY', payload: cat})} 
                            onDelete={handleDelete}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            onDragEnd={handleDragEnd}
                        />)
                    }
                </div>
                <div>
                    <h4 className="font-semibold border-b border-border/20 pb-2 mb-2">Einnahmen</h4>
                    {incomeCategories.map(c => 
                        <CategoryItem 
                            key={c.id} 
                            category={c} 
                            onUpdate={(cat) => dispatch({type:'UPDATE_CATEGORY', payload: cat})} 
                            onDelete={handleDelete}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            onDragEnd={handleDragEnd}
                        />)
                    }
                </div>
            </div>
        </div>
    );
});

const RecurringManagerModal: React.FC = memo(() => {
    const { recurringTransactions, categories } = useAppState();
    const dispatch = useAppDispatch();
    const [editingId, setEditingId] = useState<string | null>(null);

    const initialFormData = useMemo(() => ({ description: '', amount: 0, type: TransactionType.EXPENSE, categoryId: '', frequency: Frequency.MONTHLY, interval: 1, startDate: new Date().toISOString().split('T')[0], endDate: '', isBill: false }), []);
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
        if (type === 'checkbox') setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        else setFormData(prev => ({ ...prev, [name]: (name === 'amount' || name === 'interval') ? parseFloat(value) : value }));
    }, []);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = { ...formData, endDate: formData.endDate || undefined };
        if (editingId) dispatch({ type: 'UPDATE_RECURRING', payload: { ...data, id: editingId, nextDueDate: '' } });
        else dispatch({ type: 'ADD_RECURRING', payload: data });
        setEditingId(null);
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
                    <FormGroup label="Betrag"><Input type="number" name="amount" value={formData.amount} onChange={handleChange} required /></FormGroup>
                    <FormGroup label="Typ"><Select name="type" value={formData.type} onChange={handleChange}><option value={TransactionType.EXPENSE}>Ausgabe</option><option value={TransactionType.INCOME}>Einnahme</option></Select></FormGroup>
                    <FormGroup label="Kategorie"><Select name="categoryId" value={formData.categoryId} onChange={handleChange}><option value="">Keine</option>{categories.filter(c => c.type === (formData.type === 'income' ? 'income' : 'expense')).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></FormGroup>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                     <FormGroup label="Wiederholung"><div className="flex items-center gap-2"><span>Alle</span><Input type="number" name="interval" value={formData.interval} onChange={handleChange} className="w-20" min="1" /><Select name="frequency" value={formData.frequency} onChange={handleChange}><option value={Frequency.DAILY}>Tag(e)</option><option value={Frequency.WEEKLY}>Woche(n)</option><option value={Frequency.MONTHLY}>Monat(e)</option><option value={Frequency.YEARLY}>Jahr(e)</option></Select></div></FormGroup>
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
        creditor: '', debtor: '', startDate: new Date().toISOString().split('T')[0], dueDate: ''
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
        setFormData(prev => ({ ...prev, [name]: (name === 'initialAmount' || name === 'interestRate') ? parseFloat(value) : value }));
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = { ...formData, dueDate: formData.dueDate || undefined };
        if (editingId) {
            dispatch({ type: 'UPDATE_LIABILITY', payload: { ...data, id: editingId, paidAmount: liabilities.find(l => l.id === editingId)?.paidAmount || 0 } });
        } else {
            dispatch({ type: 'ADD_LIABILITY', payload: data });
        }
        handleCancel();
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
                         <FormGroup label="Betrag"><Input type="number" name="initialAmount" value={formData.initialAmount} onChange={handleChange} required min="0" step="0.01" /></FormGroup>
                         <FormGroup label="Jährl. Zinssatz (%)"><Input type="number" name="interestRate" value={formData.interestRate} onChange={handleChange} required min="0" step="0.01" /></FormGroup>
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
        // Use a zero-delay timeout to allow the UI to update to the loading state
        // before starting the potentially intensive calculation.
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

    return (
        <div className="space-y-6 text-center">
            <div>
                <h4 className="font-semibold text-lg">Daten exportieren</h4>
                <p className="text-muted-foreground text-sm mt-1">Sichern Sie alle Ihre Daten in einer JSON-Datei.</p>
                <Button onClick={handleExport} variant="primary" className="mt-4 flex items-center gap-2 mx-auto"><FileDown size={18} /> Backup herunterladen</Button>
            </div>
            <div className="border-t border-border/20 pt-6">
                <h4 className="font-semibold text-lg">Daten importieren</h4>
                <p className="text-muted-foreground text-sm mt-1"><strong className="text-destructive">Achtung:</strong> Dies überschreibt alle aktuellen Daten.</p>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                <Button onClick={() => fileInputRef.current?.click()} className="mt-4 flex items-center gap-2 mx-auto"><UploadCloud size={18} /> Backup wiederherstellen</Button>
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


const SankeyNode = memo(({ x, y, width, height, payload, containerWidth }: any) => {
  const isOut = x + width + 6 > containerWidth;
  return (
    <g>
      <Rectangle x={x} y={y} width={width} height={height} fill="hsl(var(--primary))" fillOpacity="0.8" />
      <text x={isOut ? x - 6 : x + width + 6} y={y + height / 2} dy="0.355em" textAnchor={isOut ? 'end' : 'start'} fill="hsl(var(--foreground))" className="font-medium">
        {String(payload?.name ?? '')} ({formatCurrency(payload?.value || 0)})
      </text>
    </g>
  );
});

const AnalysisModal: React.FC = memo(() => {
    const sankeyData = useSankeyData();

    if (!sankeyData || sankeyData.nodes.length === 0) {
        return (
            <div className="text-center py-10"><p className="text-muted-foreground">Nicht genügend Daten für eine Analyse vorhanden.</p></div>
        );
    }
    
    return (
        <div style={{ width: '100%', height: 500 }}>
            <ResponsiveContainer>
                <Sankey data={sankeyData} nodePadding={50} margin={{ top: 20, right: 150, bottom: 20, left: 150 }} link={{ stroke: 'hsl(var(--primary)/0.3)', strokeWidth: 15, strokeOpacity: 0.6 }} node={<SankeyNode />}>
                   <Tooltip
                     formatter={(value: any, name: any, props: any) => {
                       if (props.payload.source) { // it's a link
                          return [`${formatCurrency(value)} von ${props.payload.source.name} nach ${props.payload.target.name}`]
                       }
                       return null; // Don't show tooltip for nodes
                     }}
                     contentStyle={{ background: 'hsl(var(--card) / 0.8)', backdropFilter: 'blur(4px)', border: '1px solid hsl(var(--border) / 0.2)', borderRadius: 'var(--radius)' }}
                    />
                </Sankey>
            </ResponsiveContainer>
        </div>
    );
});

const TaxExportModal: React.FC = memo(() => {
    const { transactions, categories } = useAppState();
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
    const [isGenerating, setIsGenerating] = useState(false);

    const availableYears = useMemo(() => {
        const years = new Set<string>();
        transactions.forEach(t => years.add(t.date.substring(0, 4)));
        return Array.from(years).sort((a, b) => b.localeCompare(a));
    }, [transactions]);

    const expenseCategories = useMemo(() =>
        categories.filter(c => c.type === CategoryType.EXPENSE),
    [categories]);

    useEffect(() => {
        // Pre-select all expense categories by default
        setSelectedCategoryIds(new Set(expenseCategories.map(c => c.id)));
    }, [expenseCategories]);

    const handleCategoryToggle = (categoryId: string) => {
        setSelectedCategoryIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(categoryId)) {
                newSet.delete(categoryId);
            } else {
                newSet.add(categoryId);
            }
            return newSet;
        });
    };

    const handleGeneratePDF = () => {
        setIsGenerating(true);
        setTimeout(() => {
            const businessTransactions = transactions.filter(t =>
                t.date.startsWith(selectedYear) && t.tags?.includes('business')
            );

            const incomeTransactions = businessTransactions.filter(t => t.type === TransactionType.INCOME);
            const expenseTransactions = businessTransactions.filter(t =>
                t.type === TransactionType.EXPENSE && t.categoryId && selectedCategoryIds.has(t.categoryId)
            );
            
            const categoriesMap = new Map(categories.map(c => [c.id, c.name]));

            const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
            const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
            const result = totalIncome - totalExpense;

            const { jsPDF } = jspdf;
            const doc = new jsPDF();

            doc.setFontSize(22);
            doc.text(`Steuerübersicht ${selectedYear}`, 14, 22);
            doc.setFontSize(11);
            doc.setTextColor(100);
            doc.text(`Generiert am: ${formatDate(new Date().toISOString())}`, 14, 30);

            doc.setFontSize(16);
            doc.text("Zusammenfassung", 14, 45);
            (doc as any).autoTable({
                startY: 50,
                head: [['', 'Betrag']],
                body: [
                    ['Betriebseinnahmen', formatCurrency(totalIncome)],
                    ['Betriebsausgaben', formatCurrency(totalExpense)],
                    [{ content: 'Ergebnis (Gewinn / Verlust)', styles: { fontStyle: 'bold' } }, { content: formatCurrency(result), styles: { fontStyle: 'bold' } }]
                ],
                theme: 'striped',
                headStyles: { fillColor: [41, 128, 185] }
            });

            let finalY = (doc as any).lastAutoTable.finalY || 10;

            if (incomeTransactions.length > 0) {
                doc.setFontSize(16);
                doc.text("Betriebseinnahmen", 14, finalY + 15);
                (doc as any).autoTable({
                    startY: finalY + 20,
                    head: [['Datum', 'Beschreibung', 'Betrag']],
                    body: incomeTransactions.sort((a,b) => a.date.localeCompare(b.date)).map(t => [formatDate(t.date), t.description, formatCurrency(t.amount)]),
                    theme: 'striped',
                    headStyles: { fillColor: [39, 174, 96] }
                });
                finalY = (doc as any).lastAutoTable.finalY;
            }

            if (expenseTransactions.length > 0) {
                doc.setFontSize(16);
                doc.text("Betriebsausgaben", 14, finalY + 15);
                (doc as any).autoTable({
                    startY: finalY + 20,
                    head: [['Datum', 'Beschreibung', 'Kategorie', 'Betrag']],
                    body: expenseTransactions.sort((a,b) => a.date.localeCompare(b.date)).map(t => [formatDate(t.date), t.description, categoriesMap.get(t.categoryId!) || 'N/A', formatCurrency(t.amount)]),
                    theme: 'striped',
                    headStyles: { fillColor: [192, 57, 43] }
                });
            }

            doc.save(`steuer-export-${selectedYear}.pdf`);
            setIsGenerating(false);
        }, 100); // Small timeout to allow UI to update
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormGroup label="Steuerjahr auswählen" htmlFor="tax-year">
                    <Select id="tax-year" value={selectedYear} onChange={e => setSelectedYear(e.target.value)} disabled={availableYears.length === 0}>
                        {availableYears.length > 0 ? (
                            availableYears.map(year => <option key={year} value={year}>{year}</option>)
                        ) : (
                            <option>{new Date().getFullYear()}</option>
                        )}
                    </Select>
                </FormGroup>
                 <div className="md:pt-8">
                     <p className="text-xs text-muted-foreground">
                        Es werden nur Transaktionen mit dem Tag "business" berücksichtigt.
                     </p>
                 </div>
            </div>
            
            <div>
                <h4 className="font-semibold text-md mb-3">Auszugebende Ausgabenkategorien</h4>
                 <div className="max-h-60 overflow-y-auto space-y-2 p-3 bg-secondary rounded-lg border border-border/20">
                    {expenseCategories.length > 0 ? expenseCategories.map(category => (
                         <div key={category.id} className="flex items-center">
                            <input
                                type="checkbox"
                                id={`cat-${category.id}`}
                                checked={selectedCategoryIds.has(category.id)}
                                onChange={() => handleCategoryToggle(category.id)}
                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                            />
                            <label htmlFor={`cat-${category.id}`} className="ml-3 text-sm">
                                {category.name}
                            </label>
                        </div>
                    )) : (
                        <p className="text-sm text-muted-foreground text-center py-4">Keine Ausgabenkategorien vorhanden.</p>
                    )}
                 </div>
            </div>

            <div className="flex justify-end pt-4">
                 <Button
                    onClick={handleGeneratePDF}
                    variant="primary"
                    disabled={isGenerating || selectedCategoryIds.size === 0 || availableYears.length === 0}
                 >
                    {isGenerating ? 'Generiere...' : 'PDF Export generieren'}
                 </Button>
            </div>
        </div>
    );
});

const ManageGoalsModal: React.FC = memo(() => {
    const { goals } = useAppState();
    const dispatch = useAppDispatch();
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
    const [formState, setFormState] = useState({ name: '', targetAmount: '' });

    useEffect(() => {
        if (editingGoal) {
            setFormState({ name: editingGoal.name, targetAmount: String(editingGoal.targetAmount) });
        } else {
            setFormState({ name: '', targetAmount: '' });
        }
    }, [editingGoal]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const targetAmount = parseFloat(formState.targetAmount);
        if (!formState.name.trim() || isNaN(targetAmount) || targetAmount <= 0) return;

        if (editingGoal) {
            dispatch({ type: 'UPDATE_GOAL', payload: { ...editingGoal, name: formState.name.trim(), targetAmount } });
        } else {
            dispatch({ type: 'ADD_GOAL', payload: { name: formState.name.trim(), targetAmount, type: GoalType.GOAL } });
        }
        setEditingGoal(null);
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Möchten Sie dieses Ziel wirklich löschen? Zugeordnete Transaktionen werden nicht gelöscht, aber die Zuordnung wird entfernt.")) {
            dispatch({ type: 'DELETE_GOAL', payload: id });
        }
    };
    
    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit} className="p-4 bg-secondary/50 rounded-lg space-y-4">
                <h4 className="font-semibold text-lg">{editingGoal ? 'Ziel bearbeiten' : 'Neues Ziel anlegen'}</h4>
                <div className="grid md:grid-cols-[1fr,auto] gap-4">
                    <FormGroup label="Bezeichnung"><Input name="name" value={formState.name} onChange={e => setFormState(s => ({...s, name: e.target.value}))} required /></FormGroup>
                    <FormGroup label="Zielbetrag (€)"><Input type="number" name="targetAmount" value={formState.targetAmount} onChange={e => setFormState(s => ({...s, targetAmount: e.target.value}))} required min="0.01" step="0.01" /></FormGroup>
                </div>
                <div className="flex justify-end gap-2">
                    {editingGoal && <Button type="button" onClick={() => setEditingGoal(null)}>Abbrechen</Button>}
                    <Button type="submit" variant="primary">{editingGoal ? 'Speichern' : 'Hinzufügen'}</Button>
                </div>
            </form>
            <div className="space-y-4">
                {goals.map(goal => {
                    const percentage = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                    return (
                        <div key={goal.id} className="p-4 rounded-lg bg-secondary/50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold">{goal.name}</p>
                                    <p className="text-sm text-muted-foreground">{formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setEditingGoal(goal)} className="p-2 text-muted-foreground hover:text-foreground"><Edit size={16} /></button>
                                    <button onClick={() => handleDelete(goal.id)} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
                                </div>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2.5 mt-2">
                                <div className="bg-primary h-2.5 rounded-full" style={{width: `${percentage}%`}}></div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
});

const ManageProjectsModal: React.FC = memo(() => {
    const { projects } = useAppState();
    const projectReportData = useProjectReportData();
    const dispatch = useAppDispatch();
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [formState, setFormState] = useState({ name: '', tag: '' });
    
    const profitMap = useMemo(() => new Map(projectReportData.map(p => [p.tag, p.profit])), [projectReportData]);

    useEffect(() => {
        if (editingProject) {
            setFormState({ name: editingProject.name, tag: editingProject.tag });
        } else {
            setFormState({ name: '', tag: '' });
        }
    }, [editingProject]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formState.name.trim() || !formState.tag.trim()) return;

        const formattedTag = formState.tag.trim().toLowerCase().replace(/\s+/g, '-');
        
        if (editingProject) {
            dispatch({ type: 'UPDATE_PROJECT', payload: { ...editingProject, name: formState.name.trim(), tag: formattedTag } });
        } else {
            dispatch({ type: 'ADD_PROJECT', payload: { name: formState.name.trim(), tag: formattedTag } });
        }
        setEditingProject(null);
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Möchten Sie dieses Projekt wirklich löschen? Zugeordnete Transaktionen bleiben erhalten, aber die Projektverbindung geht verloren.")) {
            dispatch({ type: 'DELETE_PROJECT', payload: id });
        }
    };
    
    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit} className="p-4 bg-secondary/50 rounded-lg space-y-4">
                <h4 className="font-semibold text-lg">{editingProject ? 'Projekt bearbeiten' : 'Neues Projekt anlegen'}</h4>
                <div className="grid md:grid-cols-2 gap-4">
                    <FormGroup label="Projektname"><Input name="name" value={formState.name} onChange={e => setFormState(s => ({...s, name: e.target.value}))} required /></FormGroup>
                    <FormGroup label="Tag (für Transaktionen)"><Input name="tag" value={formState.tag} onChange={e => setFormState(s => ({...s, tag: e.target.value}))} required /></FormGroup>
                </div>
                <div className="flex justify-end gap-2">
                    {editingProject && <Button type="button" onClick={() => setEditingProject(null)}>Abbrechen</Button>}
                    <Button type="submit" variant="primary">{editingProject ? 'Speichern' : 'Hinzufügen'}</Button>
                </div>
            </form>
            <div className="space-y-3">
                {projects.map(project => (
                    <div key={project.id} className="p-4 rounded-lg bg-secondary/50 flex justify-between items-center">
                        <div>
                            <p className="font-semibold">{project.name}</p>
                            <p className="text-sm text-muted-foreground">Gewinn (akt. Zeitraum): <span className={`font-bold ${profitMap.get(project.tag) ?? 0 >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(profitMap.get(project.tag) ?? 0)}</span></p>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setEditingProject(project)} className="p-2 text-muted-foreground hover:text-foreground"><Edit size={16} /></button>
                            <button onClick={() => handleDelete(project.id)} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});


const MODAL_COMPONENTS: { [key in ModalType['type']]: { component: React.FC<any>, title: string, size?: 'sm' | 'md' | 'lg' | 'xl' } } = {
    ADD_TRANSACTION: { component: TransactionModal, title: 'Neue Transaktion' },
    EDIT_TRANSACTION: { component: TransactionModal, title: 'Transaktion bearbeiten' },
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
    SYNC_DATA: { component: () => <div>Datensynchronisation (in Kürze)</div>, title: 'Datensynchronisation' },
    MERGE_TRANSACTIONS: { component: MergeTransactionsModal, title: 'Transaktionen zusammenführen' },
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
