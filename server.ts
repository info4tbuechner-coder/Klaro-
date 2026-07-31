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
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is required' });
      }

      const ai = new GoogleGenAI({ apiKey });
      const { prompt } = req.body;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
      });

      res.json({ insight: response.text });
    } catch (error: any) {
      console.error("AI Error", error);
      res.status(500).json({ error: error.message || 'Error generating insight' });
    }
  });

  // API route for News Feed
  app.get("/api/news", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is required' });
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Nenne mir die 3 wichtigsten Schlagzeilen zu Finanzen und Börse in Deutschland von heute. Sei präzise und kurz.",
        config: {
          systemInstruction: "Antworte nur mit Schlagzeilen, eine pro Zeile. Keine Symbole oder Aufzählungszeichen.",
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text || "";
      const lines = text.split('\n').filter(l => l.trim().length > 5).slice(0, 3);
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

      res.json({ headlines: lines, sources: chunks });
    } catch (error: any) {
      console.error("News Error", error);
      res.status(500).json({ error: error.message || 'Error fetching news' });
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
