/**
 * contentScript.ts — injected into every page.
 * Captures page context and detects Web3 signals.
 */

import type { AgentRequest, AgentMode } from "./types";

// ── Known dApp domains ─────────────────────────────────────────────────────────
const KNOWN_DAPPS = new Set([
  "uniswap.org", "app.uniswap.org", "opensea.io", "aave.com", "app.aave.com",
  "compound.finance", "curve.fi", "raydium.io", "jup.ag", "app.1inch.io",
  "sushi.com", "app.sushi.com", "dydx.exchange", "gmx.io", "app.gmx.io",
  "pancakeswap.finance", "balancer.fi", "yearn.finance", "lido.fi", "staking.lido.fi",
  "etherscan.io", "bscscan.com", "polygonscan.com", "solscan.io",
  "drift.trade", "mango.markets", "phantom.app", "magic.eden", "tensor.trade",
  // UnyKorn ecosystem
  "unykorn.ai", "unykorn.org", "hail.unykorn.org", "law.unykorn.org",
  "paid.unykorn.org", "x402.unykorn.org", "storm.unykorn.org",
]);

function hostname(): string {
  try { return new URL(location.href).hostname.replace(/^www\./, ""); }
  catch { return ""; }
}

function captureContext(): Omit<AgentRequest, "mode"> {
  const bodyText   = document.body?.innerText ?? "";
  const contracts  = [...new Set(bodyText.match(/0x[a-fA-F0-9]{40}/g) ?? [])].slice(0, 5);
  const host       = hostname();

  return {
    url:          location.href,
    title:        document.title,
    fullText:     bodyText.slice(0, 8000),
    selection:    window.getSelection()?.toString() ?? "",
    contracts,
    isKnownDapp:  KNOWN_DAPPS.has(host),
    hasEthereum:  typeof (window as Window & { ethereum?: unknown }).ethereum !== "undefined",
    hasSolana:    typeof (window as Window & { solana?: unknown }).solana    !== "undefined",
    chain:        (window as Window & { ethereum?: { chainId?: string } }).ethereum?.chainId ?? null,
  };
}

// ── Message listener ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener(
  (msg: { type: string }, _sender, sendResponse: (r: unknown) => void) => {
    if (msg.type === "CAPTURE_CONTEXT") {
      sendResponse(captureContext());
      return true;
    }
  }
);

// ── Web3 badge ────────────────────────────────────────────────────────────────
const ctx = captureContext();
if (ctx.isKnownDapp || ctx.hasEthereum || ctx.hasSolana) {
  injectBadge(ctx.hasEthereum ? "EVM" : "SOL");
}

function injectBadge(chain: string): void {
  if (document.getElementById("unykorn-w3-badge")) return;

  const el = document.createElement("div");
  el.id = "unykorn-w3-badge";
  el.innerHTML = `
    <span style="
      position:fixed;bottom:16px;right:16px;z-index:2147483647;
      background:rgba(12,12,20,.92);border:1px solid #7C3AED;
      color:#a78bfa;font:500 11px/1 system-ui,sans-serif;
      padding:5px 10px;border-radius:999px;cursor:pointer;
      backdrop-filter:blur(8px);box-shadow:0 2px 12px rgba(124,58,237,.3);
      display:flex;align-items:center;gap:6px;
    " id="unykorn-badge-inner">
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
        <circle cx="4" cy="4" r="3" stroke="#7C3AED" stroke-width="1.2"/>
        <circle cx="4" cy="4" r="1.5" fill="#7C3AED"/>
      </svg>
      ${chain} · Ask Unykorn
    </span>`;

  (document.getElementById("unykorn-badge-inner") as HTMLElement | null)
    ?.addEventListener("click", () =>
      chrome.runtime.sendMessage({ type: "OPEN_SIDEBAR" })
    );

  document.body.appendChild(el);
}
