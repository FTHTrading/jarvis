/**
 * Unykorn Daemon — server entry point.
 *
 * Listens on localhost:40201 (configurable via DAEMON_PORT).
 * Routes extension payloads to OpenClaw, OpenAI, Anthropic, or Ollama.
 *
 * Usage: node server.js  (or npm start)
 */
"use strict";

import "dotenv/config";
import express from "express";
import cors    from "cors";

import agentRouter  from "./routes/agent.js";
import healthRouter from "./routes/health.js";

const PORT = parseInt(process.env.DAEMON_PORT ?? "40201", 10);
const LOG  = process.env.DAEMON_LOG_LEVEL ?? "info";

const app = express();

// ── CORS — only allow the extension and localhost ─────────────────────────────
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // curl / same-origin
    if (
      origin.startsWith("chrome-extension://") ||
      origin.startsWith("moz-extension://")    ||
      origin.startsWith("http://localhost")     ||
      origin.startsWith("http://127.0.0.1")
    ) {
      return cb(null, true);
    }
    cb(new Error(`CORS blocked: ${origin}`));
  },
}));

app.use(express.json({ limit: "512kb" }));

// ── Request logging ───────────────────────────────────────────────────────────
if (LOG !== "silent") {
  app.use((req, _res, next) => {
    if (req.path !== "/health") {
      console.log(`[daemon] ${req.method} ${req.path}  mode=${req.body?.mode ?? "-"}`);
    }
    next();
  });
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/health", healthRouter);
app.use("/agent",  agentRouter);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("[daemon] error:", err.message);
  res.status(500).json({ error: err.message });
});

// ── Boot ──────────────────────────────────────────────────────────────────────
app.listen(PORT, "127.0.0.1", () => {
  console.log(`[daemon] Unykorn daemon v0.1.0 → http://127.0.0.1:${PORT}`);
  console.log(`[daemon] brain=${process.env.DAEMON_BRAIN ?? "openai"}  openclaw=${process.env.OPENCLAW_GATEWAY_URL ?? "http://127.0.0.1:18789"}`);
});
