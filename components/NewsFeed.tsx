
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Newspaper, Link as LinkIcon, AlertTriangle, ChevronRight, Clock, RefreshCw } from 'lucide-react';

interface GroundingChunk {
    web?: {
        uri: string;
        title: string;
    }
}

const CACHE_KEY = 'klaro-news-cache';
const QUOTA_LOCKOUT_KEY = 'klaro-news-quota-lockout';
const CACHE_DURATION = 1000 * 60 * 60 * 4; // 4 hours cache
const LOCKOUT_DURATION = 1000 * 60 * 60 * 12; // 12 hours lockout on 429

const NewsFeed: React.FC = () => {
    const [headlines, setHeadlines] = useState<string[]>([]);
    const [sources, setSources] = useState<GroundingChunk[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<number | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchNews = async () => {
            setIsLoading(true);
            setError(null);
            setWarning(null);

            // Load Cache
            let cachedDataStr = localStorage.getItem(CACHE_KEY);
            let parsedCache: { timestamp: number; headlines: string[]; sources: GroundingChunk[] } | null = null;

            if (cachedDataStr) {
                try {
                    parsedCache = JSON.parse(cachedDataStr);
                } catch (e) {
                    console.warn("Failed to parse news cache", e);
                }
            }

            // Check Quota Lockout
            const lockoutStr = localStorage.getItem(QUOTA_LOCKOUT_KEY);
            if (lockoutStr) {
                const lockoutUntil = parseInt(lockoutStr, 10);
                if (Date.now() < lockoutUntil) {
                    if (isMounted) {
                        if (parsedCache) {
                            setHeadlines(parsedCache.headlines);
                            setSources(parsedCache.sources);
                            setLastUpdated(parsedCache.timestamp);
                            setWarning("Tageslimit erreicht. Zeige gespeicherte Nachrichten.");
                        } else {
                            setError("Das Tageslimit für Nachrichten ist erreicht. Bitte versuchen Sie es morgen erneut.");
                        }
                        setIsLoading(false);
                    }
                    return;
                } else {
                    localStorage.removeItem(QUOTA_LOCKOUT_KEY);
                }
            }

            // 1. Try to use valid Cache
            if (parsedCache && Date.now() - parsedCache.timestamp < CACHE_DURATION) {
                if (isMounted) {
                    setHeadlines(parsedCache.headlines);
                    setSources(parsedCache.sources);
                    setLastUpdated(parsedCache.timestamp);
                    setIsLoading(false);
                }
                return;
            }

            if (!navigator.onLine) {
                if (isMounted) {
                    if (parsedCache) {
                        setHeadlines(parsedCache.headlines);
                        setSources(parsedCache.sources);
                        setLastUpdated(parsedCache.timestamp);
                        setWarning("Sie sind offline. Zeige gespeicherte Nachrichten.");
                    } else {
                        setError("Sie sind offline. Finanznachrichten können nicht geladen werden.");
                    }
                    setIsLoading(false);
                }
                return;
            }

            try {
                if (!process.env.API_KEY) {
                    throw new Error("API-Schlüssel nicht gefunden.");
                }

                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                
                // Optimized for faster text generation
                const response = await ai.models.generateContent({
                   model: "gemini-3-flash-preview",
                   contents: "Finde 3-5 hochaktuelle, relevante Schlagzeilen zu Finanzen, Börse oder Inflation in Deutschland/Europa. Gib NUR die Schlagzeilen zurück, jede in einer neuen Zeile. Keine Nummerierung, keine Aufzählungszeichen.",
                   config: {
                     tools: [{googleSearch: {}}],
                   },
                });

                if (!isMounted) return;

                const text = response.text;
                let lines: string[] = [];
                if (text) {
                    lines = text.split('\n')
                        .map(line => line.trim())
                        .filter(line => line.length > 0)
                        .map(line => line.replace(/^[\d\.\-\*•]+\s+/, '')) // Robust cleanup
                        .slice(0, 5);
                    
                    setHeadlines(lines);
                } else {
                    setHeadlines([]);
                }

                const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
                const validSources = Array.isArray(groundingChunks) ? groundingChunks as GroundingChunk[] : [];
                setSources(validSources);
                setLastUpdated(Date.now());

                // Update Cache
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    timestamp: Date.now(),
                    headlines: lines,
                    sources: validSources
                }));

            } catch (err: any) {
                if (isMounted) {
                    // Robust error message detection for quota limits
                    const errString = JSON.stringify(err);
                    const errMsg = err.message || '';
                    const isQuotaError = 
                        errString.includes('429') || 
                        errMsg.includes('429') || 
                        errString.includes('RESOURCE_EXHAUSTED') || 
                        errMsg.includes('Quota exceeded');

                    if (isQuotaError) {
                        console.warn("News Feed Quota Exceeded. Locking out for 12h.");
                        localStorage.setItem(QUOTA_LOCKOUT_KEY, (Date.now() + LOCKOUT_DURATION).toString());
                    } else {
                        console.error("News Feed Error:", err);
                    }

                    if (parsedCache) {
                        // Fallback to stale cache
                        setHeadlines(parsedCache.headlines);
                        setSources(parsedCache.sources);
                        setLastUpdated(parsedCache.timestamp);
                        setWarning(isQuotaError 
                            ? "Tageslimit erreicht. Zeige gespeicherte Nachrichten." 
                            : "Aktualisierung fehlgeschlagen. Zeige gespeicherte Nachrichten.");
                    } else {
                        if (isQuotaError) {
                            setError("Das Limit für Live-Nachrichten wurde erreicht. Bitte versuchen Sie es später erneut.");
                        } else {
                            setError("Nachrichten konnten nicht geladen werden.");
                        }
                    }
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchNews();

        return () => {
            isMounted = false;
        };
    }, []);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="space-y-3 animate-pulse">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex gap-3">
                            <div className="h-5 w-5 bg-secondary rounded-full flex-shrink-0" />
                            <div className="h-5 bg-secondary rounded w-3/4" />
                        </div>
                    ))}
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg text-sm">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            );
        }

        if (headlines.length === 0) {
            return <p className="text-sm text-muted-foreground italic">Keine aktuellen Nachrichten gefunden.</p>;
        }

        return (
            <div className="space-y-4">
                {warning && (
                    <div className="flex items-center gap-2 text-yellow-600 bg-yellow-500/10 p-2 rounded-lg text-xs mb-2 border border-yellow-500/20">
                        <RefreshCw className="h-3 w-3 flex-shrink-0" />
                        <span>{warning}</span>
                    </div>
                )}
                <ul className="space-y-2">
                    {headlines.map((headline, index) => (
                        <li key={index} className="group flex items-start gap-2 text-sm text-foreground/90 hover:text-primary transition-colors cursor-default">
                            <ChevronRight className="h-4 w-4 mt-0.5 text-primary/60 group-hover:text-primary transition-colors flex-shrink-0" />
                            <span>{headline}</span>
                        </li>
                    ))}
                </ul>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/20">
                    {sources.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {sources.map((source, index) => (
                                source.web && (
                                    <a
                                        key={index}
                                        href={source.web.uri}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-secondary hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                                        title={source.web.title}
                                    >
                                        <LinkIcon size={10} />
                                        <span className="truncate max-w-[120px]">{new URL(source.web.uri).hostname.replace('www.','')}</span>
                                    </a>
                                )
                            ))}
                        </div>
                    )}
                    {lastUpdated && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
                            <Clock size={10} />
                            <span>{new Date(lastUpdated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <section className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <Newspaper className="h-5 w-5" />
                    </div>
                    <h2 className="font-bold text-lg">Markt-Update</h2>
                </div>
                {!isLoading && !error && !warning && (
                    <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success font-medium">
                        Live
                    </span>
                )}
            </div>
            {renderContent()}
        </section>
    );
};

export default NewsFeed;
