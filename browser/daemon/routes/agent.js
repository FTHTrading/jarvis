/**
 * POST /agent — main dispatch endpoint.
 *
 * Request body:
 *   { url, title, fullText, selection, contracts, isKnownDapp, hasEthereum,
 *     hasSolana, mode, prompt }
 *
 * mode: "summarize" | "explain" | "web3_explain" | "freeform"
 *
 * Returns: { answer, mode, tools_used?, metadata? }
 */
"use strict";

import { Router } from "express";
import { buildSystemPrompt, buildUserPrompt } from "../tools/prompts.js";
import { callLLM }                            from "../tools/llm.js";
import { callOpenClaw }                       from "../tools/openclaw.js";
import { logToGraph }                         from "../tools/graph.js";

const router = Router();
const BRAIN  = () => process.env.DAEMON_BRAIN ?? "openai";

router.post("/", async (req, res) => {
  const {
    url        = "",
    title      = "",
    fullText   = "",
    selection  = "",
    contracts  = [],
    isKnownDapp  = false,
    hasEthereum  = false,
    hasSolana    = false,
    mode       = "freeform",
    prompt     = "",
  } = req.body;

  const context = { url, title, fullText, selection, contracts, isKnownDapp, hasEthereum, hasSolana };

  try {
    let answer;

    if (BRAIN() === "openclaw") {
      answer = await callOpenClaw({ context, mode, prompt });
    } else {
      const systemPrompt = buildSystemPrompt(mode, context);
      const userPrompt   = buildUserPrompt(mode, context, prompt);
      answer = await callLLM(systemPrompt, userPrompt);
    }

    // Async graph logging for UnyKorn pages (fire-and-forget)
    if (isKnownDapp || url.includes("unykorn")) {
      logToGraph({ url, title, mode, answer }).catch(() => {});
    }

    res.json({ ok: true, answer, mode });

  } catch (err) {
    console.error("[agent] error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
