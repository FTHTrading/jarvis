/**
 * GET /health — daemon + dependency liveness check.
 */
"use strict";

import { Router } from "express";

const router = Router();

const OPENCLAW_URL  = process.env.OPENCLAW_GATEWAY_URL ?? "http://127.0.0.1:18789";
const OLLAMA_URL    = process.env.OLLAMA_HOST           ?? "http://127.0.0.1:11434";

async function probe(url, path = "/health") {
  try {
    const res = await fetch(`${url}${path}`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch (_) {
    return false;
  }
}

router.get("/", async (_req, res) => {
  const [openclawOnline, ollamaOnline] = await Promise.all([
    probe(OPENCLAW_URL),
    probe(OLLAMA_URL, "/api/tags"),
  ]);

  res.json({
    ok:             true,
    version:        "0.1.0",
    brain:          process.env.DAEMON_BRAIN ?? "openai",
    openclawOnline,
    ollamaOnline,
    ts:             new Date().toISOString(),
  });
});

export default router;
