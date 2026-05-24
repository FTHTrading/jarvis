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

    if (BRAIN() === "openclaw") {
      answer = await callOpenClaw({ context, mode, prompt });
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
