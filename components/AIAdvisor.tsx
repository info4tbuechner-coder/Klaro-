
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Brain, Lightbulb, TrendingUp, AlertTriangle } from 'lucide-react';
import { useAppState } from '../context/AppContext';
import { formatCurrency } from '../utils';

const AIAdvisor: React.FC = () => {
    const { transactions, categories, userProfile } = useAppState();
    const [insight, setInsight] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [focus, setFocus] = useState<'general' | 'spending' | 'savings' | 'investment'>('general');

    const generateInsight = async () => {
        if (transactions.length === 0) return;
        
        setLoading(true);
        try {
            const apiKey = process.env.API_KEY;
            if (!apiKey) return;

            const ai = new GoogleGenAI({ apiKey });
            
            // Prepare a summary for the AI
            const totalSpent = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
            const topCategories = categories.map(c => {
                const spent = transactions.filter(t => t.categoryId === c.id && t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                return { name: c.name, spent };
            }).sort((a, b) => b.spent - a.spent).slice(0, 3);

            let focusPrompt = "";
            switch (focus) {
                case 'spending': focusPrompt = "Fokussiere dich auf Ausgabegewohnheiten und Einsparpotenziale."; break;
                case 'savings': focusPrompt = "Fokussiere dich auf Sparziele und Rücklagenbildung."; break;
                case 'investment': focusPrompt = "Gib allgemeine Tipps zu Investitionsmöglichkeiten basierend auf dem Überschuss (keine Finanzberatung)."; break;
                default: focusPrompt = "Gib einen allgemeinen Überblick.";
            }

            const prompt = `
                Analysiere diese Finanzdaten kurz und prägnant auf Deutsch.
                Gesamtausgaben: ${formatCurrency(totalSpent, userProfile.currency, userProfile.language)}.
                Top Kategorien: ${topCategories.map(c => `${c.name}: ${formatCurrency(c.spent, userProfile.currency, userProfile.language)}`).join(', ')}.
                ${focusPrompt}
                Gib mir EINEN wertvollen, motivierenden Tipp oder eine Beobachtung (max 2 Sätze).
                Sei wie ein cooler Finanz-Coach.
            `;

            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: [{ parts: [{ text: prompt }] }],
            });

            const text = response.text || "Behalte deine Ausgaben im Blick, du machst das super!";
            setInsight(text);
        } catch (e) {
            console.error("AI Error", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[60px] rounded-full group-hover:bg-primary/20 transition-all duration-1000"></div>
            
            <div className="flex flex-col gap-5 relative z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20 shrink-0 animate-bounce-slow">
                            <Sparkles size={24} fill="currentColor" className="text-white/90" />
                        </div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 flex items-center gap-2">
                            Klaro AI <Brain size={12} />
                        </h3>
                    </div>
                    <div className="flex gap-2">
                        <select 
                            value={focus} 
                            onChange={(e) => setFocus(e.target.value as any)}
                            className="bg-secondary/30 border-none rounded-xl text-[10px] font-bold uppercase tracking-wider px-3 py-2 outline-none focus:ring-2 focus:ring-primary/50"
                        >
                            <option value="general">Allgemein</option>
                            <option value="spending">Ausgaben</option>
                            <option value="savings">Sparen</option>
                            <option value="investment">Invest</option>
                        </select>
                        <button 
                            onClick={generateInsight} 
                            disabled={loading}
                            className="p-2 bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Lightbulb size={16} />}
                        </button>
                    </div>
                </div>

                <div className="space-y-2 min-h-[60px]">
                    {loading ? (
                        <div className="space-y-2 animate-pulse">
                            <div className="h-4 w-3/4 bg-secondary/50 rounded-full"></div>
                            <div className="h-4 w-1/2 bg-secondary/50 rounded-full"></div>
                        </div>
                    ) : (
                        <p className="text-sm font-medium leading-relaxed text-foreground/90 italic">
                            "{insight || "Wähle einen Fokus und starte die Analyse für persönliche Insights."}"
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIAdvisor;
