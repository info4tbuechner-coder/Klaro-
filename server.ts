import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route for AI Advisor
  app.post("/api/insight", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_API_KEY') {
        return res.json({
          insight: "Tipp: Für personalisierte KI-Analysen hinterlege bitte deinen GEMINI_API_KEY in den App-Einstellungen. Allgemein gilt: Strebe eine Sparquote von mindestens 15% deiner Einnahmen an!"
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const { prompt } = req.body;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: [{ parts: [{ text: prompt }] }],
      });

      res.json({ insight: response.text });
    } catch (error: any) {
      console.warn("AI Advisor fallback activated:", error.message || error);
      res.json({
        insight: "Dein Finanz-Status ist solide! Tipp: Überprüfe monatlich deine fixen Abonnements auf Einsparpotenziale."
      });
    }
  });

  // API route for News Feed
  app.get("/api/news", async (req, res) => {
    const fallbackNews = {
      headlines: [
        "DAX zeigt sich robust: Deutsche Aktienmärkte mit stabiler Tendenz im frühen Handel",
        "EZB signalisiert weitere Zinspause: Fokus auf mittelfristige Inflationsentwicklung",
        "Anleiherenditen pendeln sich ein: Sparer profitieren weiterhin von Festgeldangeboten"
      ],
      sources: []
    };

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_API_KEY') {
        return res.json(fallbackNews);
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: "Nenne mir die 3 wichtigsten Schlagzeilen zu Finanzen und Börse in Deutschland von heute. Sei präzise und kurz.",
        config: {
          systemInstruction: "Antworte nur mit Schlagzeilen, eine pro Zeile. Keine Symbole oder Aufzählungszeichen.",
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text || "";
      const lines = text.split('\n').filter(l => l.trim().length > 5).slice(0, 3);
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

      if (lines.length === 0) {
        return res.json(fallbackNews);
      }

      res.json({ headlines: lines, sources: chunks });
    } catch (error: any) {
      console.warn("News fallback activated:", error.message || error);
      res.json(fallbackNews);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
