import express, { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import "dotenv/config";
import { callUnykornAgent } from "./openclawClient";
import { callLLM }          from "./llmClient";
import type { AgentRequest, AgentResponse, HealthResponse } from "./types";

const app  = express();
const PORT = parseInt(process.env.PORT ?? "40201", 10);
const BRAIN = () => process.env.DAEMON_BRAIN ?? "openai";

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({
  origin(origin, cb) {
    if (
      !origin ||
      origin.startsWith("chrome-extension://") ||
      origin.startsWith("moz-extension://")    ||
      origin.startsWith("http://localhost")     ||
      origin.startsWith("http://127.0.0.1")
    ) return cb(null, true);
    cb(new Error(`CORS: blocked ${origin}`));
  },
}));
app.use(bodyParser.json({ limit: "512kb" }));

// ── Health ─────────────────────────────────────────────────────────────────────
app.get("/health", async (_req: Request, res: Response) => {
  const [openclawOnline, ollamaOnline] = await Promise.all([
    probe(process.env.OPENCLAW_URL ?? "http://127.0.0.1:18789", "/health"),
    probe(process.env.OLLAMA_HOST  ?? "http://127.0.0.1:11434",  "/api/tags"),
  ]);
  const body: HealthResponse = {
    ok: true,
    version:        "0.1.0",
    brain:          BRAIN(),
    openclawOnline,
    ollamaOnline,
    ts:             new Date().toISOString(),
  };
  res.json(body);
});

// ── Agent ─────────────────────────────────────────────────────────────────────
app.post("/agent", async (req: Request, res: Response) => {
  const payload = req.body as AgentRequest;
  if (!payload.url) {
    res.status(400).json({ error: "url is required" });
    return;
  }

  console.log(`[daemon] /agent  mode=${payload.mode}  url=${payload.url.slice(0, 60)}`);

  try {
    let result: AgentResponse;

    if (BRAIN() === "openclaw") {
      result = await callUnykornAgent(payload);
    } else {
      const answer = await callLLM(payload);
      result = { answer, actions: [], metadata: { mode: payload.mode }, mode: payload.mode };
    }

    res.json({ ok: true, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[daemon] agent error:", msg);
    res.status(500).json({ ok: false, error: msg });
  }
});

// ── Error handler ──────────────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[daemon]", err.message);
  res.status(500).json({ error: err.message });
});

// ── Helpers ────────────────────────────────────────────────────────────────────
async function probe(base: string, path: string): Promise<boolean> {
  try {
    const res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch { return false; }
}

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, "127.0.0.1", () => {
  console.log(`[daemon] Unykorn daemon v0.1.0  →  http://127.0.0.1:${PORT}`);
  console.log(`[daemon] brain=${BRAIN()}  openclaw=${process.env.OPENCLAW_URL ?? "http://127.0.0.1:18789"}`);
});
