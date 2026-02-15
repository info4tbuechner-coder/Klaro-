
import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Newspaper, Link as LinkIcon, Clock, ChevronRight, RefreshCw, WifiOff } from 'lucide-react';

interface GroundingChunk {
    web?: {
        uri: string;
        title: string;
    }
}

const CACHE_KEY = 'klaro-news-cache-v2';
const CACHE_DURATION = 1000 * 60 * 60 * 4;

const NewsSkeleton: React.FC = () => (
    <div className="glass-card rounded-[2.5rem] p-8 space-y-6 h-[220px]">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary rounded-2xl shimmer" />
            <div className="h-4 w-32 bg-secondary rounded-full shimmer" />
        </div>
        <div className="space-y-4">
            <div className="h-4 w-full bg-secondary rounded-lg shimmer" />
            <div className="h-4 w-[85%] bg-secondary rounded-lg shimmer" />
            <div className="h-4 w-[60%] bg-secondary rounded-lg shimmer" />
        </div>
    </div>
);

const NewsFeed: React.FC = () => {
    const [headlines, setHeadlines] = useState<string[]>([]);
    const [sources, setSources] = useState<GroundingChunk[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<number | null>(null);

    const fetchNews = useCallback(async (isRetry = false) => {
        setIsLoading(true);
        setError(null);

        const cached = localStorage.getItem(CACHE_KEY);
        if (cached && !isRetry) {
            const parsed = JSON.parse(cached);
            if (Date.now() - parsed.timestamp < CACHE_DURATION) {
                setHeadlines(parsed.headlines);
                setSources(parsed.sources);
                setLastUpdated(parsed.timestamp);
                setIsLoading(false);
                return;
            }
        }

        if (!navigator.onLine) {
            setError("Offline");
            setIsLoading(false);
            return;
        }

        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            setError("Key fehlt");
            setIsLoading(false);
            return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
               model: "gemini-3-flash-preview",
               contents: "Nenne mir die 3 wichtigsten Schlagzeilen zu Finanzen und Börse in Deutschland von heute. Sei präzise und kurz.",
               config: {
                 systemInstruction: "Antworte nur mit Schlagzeilen, eine pro Zeile. Keine Symbole oder Aufzählungszeichen.",
                 tools: [{googleSearch: {}}],
               },
            });

            const text = response.text || "";
            const lines = text.split('\n').filter(l => l.trim().length > 5).slice(0, 3);
            const chunks = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || []) as GroundingChunk[];

            if (lines.length === 0) throw new Error("Keine News gefunden");

            setHeadlines(lines);
            setSources(chunks);
            setLastUpdated(Date.now());
            localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), headlines: lines, sources: chunks }));
        } catch (err) {
            setError("Fehler beim Laden");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNews();
    }, [fetchNews]);

    if (isLoading) return <NewsSkeleton />;

    return (
        <section className="glass-card rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden group min-h-[220px] transition-all duration-500">
            <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-2xl text-primary"><Newspaper size={20} /></div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-foreground/60">Markt-Update</h2>
                </div>
                <div className="flex items-center gap-4">
                    {lastUpdated && <div className="text-[9px] font-black text-muted-foreground uppercase opacity-40 flex items-center gap-1"><Clock size={10}/> {new Date(lastUpdated).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>}
                    <button 
                        onClick={() => {
                            if (navigator.vibrate) navigator.vibrate(10);
                            fetchNews(true);
                        }}
                        className="p-2 rounded-xl bg-secondary/30 hover:bg-primary/20 text-muted-foreground hover:text-primary transition-all active:rotate-180 duration-500"
                        aria-label="Aktualisieren"
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {error ? (
                <div className="flex flex-col items-center justify-center py-6 text-center animate-in">
                    <div className="mb-4 text-rose-500/40"><WifiOff size={32} /></div>
                    <p className="text-xs text-muted-foreground/60 font-bold italic mb-2">{error === 'Offline' ? 'Keine Internetverbindung' : error}</p>
                    <p className="text-[9px] uppercase tracking-widest opacity-30">News benötigen Online-Zugang</p>
                </div>
            ) : (
                <ul className="space-y-4 relative z-10">
                    {headlines.map((h, i) => (
                        <li key={i} className="flex gap-3 group/item animate-in" style={{ animationDelay: `${i * 100}ms` }}>
                            <ChevronRight size={14} className="mt-1 text-primary/40 group-hover/item:text-primary transition-colors flex-shrink-0" />
                            <span className="text-sm font-bold leading-relaxed text-foreground/80 group-hover:text-foreground transition-colors">{h}</span>
                        </li>
                    ))}
                </ul>
            )}

            {sources.length > 0 && !error && (
                <div className="flex gap-2 mt-8 pt-6 border-t border-border/20 overflow-x-auto no-scrollbar relative z-10">
                    {sources.map((s, i) => s.web && (
                        <a key={i} href={s.web.uri} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/50 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all whitespace-nowrap active:scale-95">
                            <LinkIcon size={10} /> {new URL(s.web.uri).hostname.replace('www.', '')}
                        </a>
                    ))}
                </div>
            )}
        </section>
    );
};

export default NewsFeed;
