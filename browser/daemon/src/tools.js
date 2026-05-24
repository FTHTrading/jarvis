import { callOpenClaw } from "./openclaw.js";
import { callOpenAI } from "./fallback.js";
import { detectDapp, extractOnchainArtifacts, isLikelyWeb3Page } from "./web3.js";

const SYSTEM_PROMPT = `You are the Unykorn Sovereign Browser agent. You assist a sovereign operator running on the FTH / Unykorn mesh (OpenClaw, Jarvis, NIL33, Troptions, Digital Giant).
Be concise, accurate, and risk-aware. Surface concrete facts from the page over speculation.
For Web3 pages: explain what the dApp does, what the user is being asked to sign, and any obvious risks. Never invent contract behavior.
If you do not know something, say so plainly.`;

const MAX_PAGE_TEXT = 12_000;

function truncate(text = "") {
  if (!text || text.length <= MAX_PAGE_TEXT) return text;
  return `${text.slice(0, MAX_PAGE_TEXT)}\n\n[... truncated ${text.length - MAX_PAGE_TEXT} chars ...]`;
}

function buildContext(payload) {
  const dapp = detectDapp({ url: payload.url });
  const onchain = extractOnchainArtifacts(payload.fullText || payload.selection || "");
  return {
    url: payload.url,
    title: payload.title,
    selection: payload.selection || "",
    pageText: truncate(payload.fullText || ""),
    dapp,
    onchain,
    isWeb3: isLikelyWeb3Page({
      url: payload.url,
      hasEthereumProvider: !!payload.hasEthereumProvider,
      hasSolanaProvider: !!payload.hasSolanaProvider,
      fullText: payload.fullText,
    }),
  };
}

function buildUserMessage(mode, ctx, prompt) {
  const header = [
    `Mode: ${mode}`,
    `URL: ${ctx.url || "(none)"}`,
    `Title: ${ctx.title || "(none)"}`,
    ctx.dapp ? `Detected dApp: ${ctx.dapp.name} (${ctx.dapp.chain}, ${ctx.dapp.category})` : null,
    ctx.onchain.evmAddresses.length ? `EVM addresses: ${ctx.onchain.evmAddresses.join(", ")}` : null,
    ctx.onchain.txHashes.length ? `Tx hashes: ${ctx.onchain.txHashes.join(", ")}` : null,
    ctx.onchain.solanaAddresses.length ? `Solana addresses: ${ctx.onchain.solanaAddresses.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const body = ctx.selection
    ? `Selected text:\n"""\n${ctx.selection}\n"""`
    : ctx.pageText
      ? `Page text:\n"""\n${ctx.pageText}\n"""`
      : "(no page content captured)";

  const ask = (() => {
    switch (mode) {
      case "summarize":
        return "Give a 5-bullet summary of this page. End with one line: 'Bottom line: ...'.";
      case "explain":
        return "Explain what this site is, who runs it, what the user can do here, and any risks.";
      case "web3_explain":
        return "Explain this dApp / contract / transaction. Cover: what it does, what the user signs, token movements, approval scope, and risk flags.";
      case "freeform":
        return prompt || "Answer the user's implicit question about this page.";
      default:
        return prompt || "Help the user understand this page.";
    }
  })();

  return `${header}\n\n${body}\n\nTask: ${ask}`;
}

/**
 * Primary entry point used by the HTTP layer.
 * Tries OpenClaw first; falls back to OpenAI; otherwise returns a structured error.
 */
export async function runAgent({ mode = "freeform", payload = {}, prompt = "" }) {
  const context = buildContext(payload);
  const tool = mapModeToTool(mode);

  try {
    const result = await callOpenClaw({
      tool,
      input: { mode, prompt, ...payload },
      context,
    });
    return {
      ok: true,
      via: "openclaw",
      mode,
      context,
      answer: result.answer ?? result.output ?? result.text ?? JSON.stringify(result),
      raw: result,
    };
  } catch (openclawErr) {
    try {
      const answer = await callOpenAI({
        system: SYSTEM_PROMPT,
        user: buildUserMessage(mode, context, prompt),
      });
      return {
        ok: true,
        via: "openai-fallback",
        mode,
        context,
        answer,
        warning: `OpenClaw unreachable: ${openclawErr.message}`,
      };
    } catch (fallbackErr) {
      return {
        ok: false,
        via: "none",
        mode,
        context,
        error: `OpenClaw failed (${openclawErr.message}); fallback failed (${fallbackErr.message}).`,
      };
    }
  }
}

function mapModeToTool(mode) {
  switch (mode) {
    case "summarize":
      return "browser.summarize_page";
    case "explain":
      return "browser.analyze_site";
    case "web3_explain":
      return "browser.web3_explain";
    case "log":
      return "browser.log_to_graph";
    case "freeform":
    default:
      return "browser.freeform";
  }
}
