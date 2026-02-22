
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Brain, Lightbulb, TrendingUp, AlertTriangle } from 'lucide-react';
import { useAppState } from '../context/AppContext';
import { formatCurrency } from '../utils';

const AIAdvisor: React.FC = () => {
    const { transactions, categories, userProfile } = useAppState();
    const [insight, setInsight] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const generateInsight = async () => {
            if (transactions.length === 0) return;
            
            // Simple caching to avoid spamming API on re-renders
            // We use a hash of the data to invalidate cache if data changes
            const dataHash = JSON.stringify({ 
                tCount: transactions.length, 
                tSum: transactions.reduce((s, t) => s + t.amount, 0),
                cCount: categories.length 
            });
            const cacheKey = `ai-insight-${dataHash}`;
            const cached = localStorage.getItem(cacheKey);
            
            if (cached) {
                setInsight(cached);
                return;
            }

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

                const prompt = `
                    Analysiere diese Finanzdaten kurz und prägnant auf Deutsch.
                    Gesamtausgaben: ${formatCurrency(totalSpent, userProfile.currency, userProfile.language)}.
                    Top Kategorien: ${topCategories.map(c => `${c.name}: ${formatCurrency(c.spent, userProfile.currency, userProfile.language)}`).join(', ')}.
                    Gib mir EINEN wertvollen, motivierenden Tipp oder eine Beobachtung (max 2 Sätze).
                    Sei wie ein cooler Finanz-Coach.
                `;

                const response = await ai.models.generateContent({
                    model: "gemini-3-flash-preview",
                    contents: [{ parts: [{ text: prompt }] }],
                });

                const text = response.text || "Behalte deine Ausgaben im Blick, du machst das super!";
                setInsight(text);
                localStorage.setItem(cacheKey, text);
            } catch (e) {
                console.error("AI Error", e);
            } finally {
                setLoading(false);
            }
        };

        generateInsight();
    }, [transactions, categories, userProfile.currency, userProfile.language]); 

    if (!insight && !loading) return null;

    return (
        <div className="glass-card rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[60px] rounded-full group-hover:bg-primary/20 transition-all duration-1000"></div>
            
            <div className="flex items-start gap-5 relative z-10">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20 shrink-0 animate-bounce-slow">
                    <Sparkles size={24} fill="currentColor" className="text-white/90" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 flex items-center gap-2">
                        Klaro AI Insight <Brain size={12} />
                    </h3>
                    {loading ? (
                        <div className="h-4 w-48 bg-secondary/50 rounded-full animate-pulse"></div>
                    ) : (
                        <p className="text-sm font-medium leading-relaxed text-foreground/90 italic">
                            "{insight}"
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIAdvisor;
