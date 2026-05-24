/**
 * POST /agent — main dispatch endpoint.
 *
 * Request: see browser/docs/payload-spec.md
 * Returns: { ok, answer, mode }
 */
"use strict";

import { Router }                        from "express";
import { buildSystemPrompt, buildUserPrompt } from "../tools/prompts.js";
import { callLLM }                       from "../tools/llm.js";
import { callOpenClaw }                  from "../tools/openclaw.js";
import { logToGraph, enrichWithIdentity, resolveIdentity } from "../tools/nil33.js";

const router = Router();
const BRAIN  = () => process.env.DAEMON_BRAIN ?? "openai";

// ── NIL33 identity resolution (internal call from wallet shim) ────────────────
router.post("/", async (req, res, next) => {
  if (req.body?.mode === "_nil33_resolve") {
    const { walletAddress, chain } = req.body;
    const chainName = resolveChainName(req.body.chain, req.body.hasSolana ?? false);
    try {
      const identity = await resolveIdentity(walletAddress, chainName);
      return res.json({ ok: true, identity, mode: "_nil33_resolve" });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }
  next();
});

router.post("/", async (req, res) => {
  const {
    url          = "",
    title        = "",
    fullText     = "",
    selection    = "",
    contracts    = [],
    isKnownDapp  = false,
    hasEthereum  = false,
    hasSolana    = false,
    chain        = null,
    walletAddress = null,
    mode         = "freeform",
    prompt       = "",
  } = req.body;

  const context = {
    url, title, fullText, selection,
    contracts, isKnownDapp, hasEthereum, hasSolana, chain,
  };

  try {
    let answer;
    const brain = BRAIN();

    if (brain === "openclaw") {
      try {
        answer = await callOpenClaw({ context, mode, prompt });
      } catch (ocErr) {
        // OpenClaw unavailable — fall back gracefully
        console.warn(`[agent] OpenClaw unreachable (${ocErr.message}) — using fallback`);
        const fallback = process.env.DAEMON_FALLBACK_BRAIN ?? "ollama";
        if (fallback !== "openclaw") {
          try {
            const origBrain = process.env.DAEMON_BRAIN;
            process.env.DAEMON_BRAIN = fallback;
            const systemPrompt = buildSystemPrompt(mode, context);
            const userPrompt   = buildUserPrompt(mode, context, prompt);
            answer = await callLLM(systemPrompt, userPrompt);
            process.env.DAEMON_BRAIN = origBrain;
          } catch (fallbackErr) {
            answer = [
              `**Unykorn Agent — both brains offline**`,
              ``,
              `- OpenClaw (:18789): offline`,
              `- Fallback (${fallback}): offline`,
              ``,
              `**To fix, choose one:**`,
              `- Start OpenClaw: it should be running at \`127.0.0.1:18789\``,
              `- Or set a direct key in \`daemon/.env\`:`,
              `  \`DAEMON_BRAIN=openai\` + \`OPENAI_API_KEY=sk-...\``,
              `  \`DAEMON_BRAIN=ollama\` + run \`ollama pull gemma4\``,
            ].join("\n");
          }
        } else {
          answer = `**OpenClaw offline** (${ocErr.message})\n\nSet \`DAEMON_FALLBACK_BRAIN=ollama\` or \`openai\` in \`daemon/.env\` to enable fallback.`;
        }
      }
    } else {
      const systemPrompt = buildSystemPrompt(mode, context);
      const userPrompt   = buildUserPrompt(mode, context, prompt);
      answer = await callLLM(systemPrompt, userPrompt);
    }

    // NIL33 identity enrichment — appends verified profile block when wallet known
    if (walletAddress) {
      const chainName = resolveChainName(chain, hasSolana);
      answer = await enrichWithIdentity(answer, walletAddress, chainName);
    }

    // Async graph logging (fire-and-forget, never blocks response)
    if (isKnownDapp || url.includes("unykorn")) {
      logToGraph({ url, title, mode, answer, walletAddress, contracts });
    }

    res.json({ ok: true, answer, mode });

  } catch (err) {
    console.error("[agent] error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

function resolveChainName(chainId, hasSolana) {
  if (hasSolana) return "solana";
  const map = {
    "0x1":     "ethereum",
    "0x89":    "polygon",
    "0x2105":  "base",
    "0xa4b1":  "arbitrum",
    "0xa":     "optimism",
    "0x38":    "bnb",
  };
  return map[chainId] ?? "ethereum";
}

export default router;
