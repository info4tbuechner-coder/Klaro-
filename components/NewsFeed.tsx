
import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Newspaper, Link as LinkIcon, AlertTriangle } from 'lucide-react';

// Define the type for the source links from grounding metadata
// The `web` property is made optional, as chunks can be for other sources (e.g., maps).
interface GroundingChunk {
    web?: {
        uri: string;
        title: string;
    }
}

const NewsFeed: React.FC = () => {
    const [headlines, setHeadlines] = useState<string[]>([]);
    const [sources, setSources] = useState<GroundingChunk[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchNews = async () => {
            setIsLoading(true);
            setError(null);

            if (!navigator.onLine) {
                if (isMounted) {
                    setError("Sie sind offline. Finanznachrichten können nicht geladen werden.");
                    setIsLoading(false);
                }
                return;
            }

            try {
                if (!process.env.API_KEY) {
                    throw new Error("API-Schlüssel nicht gefunden. Die Nachrichten konnten nicht geladen werden.");
                }

                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                
                // Definition des erwarteten Antwortschemas
                const responseSchema = {
                    type: Type.ARRAY,
                    description: "Eine Liste von aktuellen Schlagzeilen.",
                    items: {
                        type: Type.STRING,
                        description: "Der Text der Schlagzeile."
                    }
                };

                const response = await ai.models.generateContent({
                   model: "gemini-2.5-flash",
                   contents: "Liste 5 aktuelle und wichtige Schlagzeilen zum Thema persönliche Finanzen, Sparen, Inflation oder Investieren in Deutschland.",
                   config: {
                     tools: [{googleSearch: {}}],
                     responseMimeType: "application/json",
                     responseSchema: responseSchema,
                   },
                });

                if (!isMounted) return;

                const jsonStr = response.text;
                if (jsonStr) {
                    try {
                        const parsedHeadlines = JSON.parse(jsonStr);
                        if (Array.isArray(parsedHeadlines)) {
                            setHeadlines(parsedHeadlines);
                        } else {
                            setHeadlines([]);
                        }
                    } catch (e) {
                        console.error("Fehler beim Parsen der Nachrichten:", e);
                        setHeadlines([]);
                    }
                }

                const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
                if (Array.isArray(groundingChunks)) {
                    setSources(groundingChunks as GroundingChunk[]);
                } else {
                    setSources([]);
                }

            } catch (err) {
                if (isMounted) {
                    console.error("Fehler beim Abrufen der Finanznachrichten:", err);
                    setError("Die Finanznachrichten konnten nicht geladen werden. Bitte versuchen Sie es später erneut.");
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
                <div className="space-y-4 animate-pulse">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-4 bg-secondary rounded w-3/4"></div>
                    ))}
                     <div className="h-4 bg-secondary rounded w-1/2 mt-6"></div>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center text-center text-destructive p-4">
                    <AlertTriangle className="h-8 w-8 mb-2" />
                    <p className="font-semibold">Fehler</p>
                    <p className="text-sm">{error}</p>
                </div>
            );
        }

        if (headlines.length === 0) {
            return <p className="text-sm text-muted-foreground">Derzeit sind keine Nachrichten verfügbar.</p>;
        }

        return (
            <>
                <ul className="space-y-3">
                    {headlines.map((headline, index) => (
                        <li key={index} className="text-foreground text-base pl-2 border-l-2 border-primary/30">
                           {headline}
                        </li>
                    ))}
                </ul>
                {sources.length > 0 && (
                    <div className="mt-6 border-t border-border/20 pt-4">
                        <h4 className="text-sm font-semibold text-muted-foreground mb-3">Quellen</h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                            {sources.map((source, index) => (
                                source.web && (
                                    <a
                                        key={index}
                                        href={source.web.uri}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                                        title={source.web.title}
                                    >
                                        <LinkIcon size={12} />
                                        <span className="truncate max-w-[150px]">{new URL(source.web.uri).hostname.replace('www.','')}</span>
                                    </a>
                                )
                            ))}
                        </div>
                    </div>
                )}
            </>
        );
    };

    return (
        <section className="glass-card rounded-2xl p-6">
            <div className="flex items-center mb-4">
                <Newspaper className="h-6 w-6 mr-3 text-primary" />
                <h2 className="text-xl font-bold">Finanz-Nachrichten</h2>
            </div>
            {renderContent()}
        </section>
    );
};

export default NewsFeed;
