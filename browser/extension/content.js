/**
 * Content script — injected into every page.
 * Detects Web3 context and exposes a capture helper for the background worker.
 */

(function () {
  "use strict";

  // ── Known dApp domains ────────────────────────────────────────────────────
  const KNOWN_DAPPS = new Set([
    "uniswap.org",
    "app.uniswap.org",
    "opensea.io",
    "aave.com",
    "app.aave.com",
    "compound.finance",
    "app.compound.finance",
    "curve.fi",
    "raydium.io",
    "jup.ag",
    "app.1inch.io",
    "sushi.com",
    "app.sushi.com",
    "dydx.exchange",
    "gmx.io",
    "app.gmx.io",
    "pancakeswap.finance",
    "quickswap.exchange",
    "balancer.fi",
    "yearn.finance",
    "lido.fi",
    "staking.lido.fi",
    "etherscan.io",
    "bscscan.com",
    "polygonscan.com",
    "solscan.io",
    "explorer.solana.com",
    "drift.trade",
    "mango.markets",
    "phantom.app",
    "magic.eden",
    "tensor.trade",
    // UnyKorn ecosystem
    "unykorn.ai",
    "unykorn.org",
    "hail.unykorn.org",
    "law.unykorn.org",
    "paid.unykorn.org",
    "x402.unykorn.org",
    "storm.unykorn.org",
  ]);

  function getHostname() {
    try {
      return new URL(location.href).hostname.replace(/^www\./, "");
    } catch (_) {
      return "";
    }
  }

  function detectWeb3() {
    const hostname = getHostname();
    return {
      isKnownDapp:  KNOWN_DAPPS.has(hostname),
      hostname,
      hasEthereum:  typeof window.ethereum !== "undefined",
      hasSolana:    typeof window.solana !== "undefined",
      chain:        window.ethereum?.chainId ?? null,
    };
  }

  function captureContext() {
    const web3 = detectWeb3();
    const bodyText = document.body?.innerText ?? "";
    const contractMatches = bodyText.match(/0x[a-fA-F0-9]{40}/g) ?? [];
    const contracts = [...new Set(contractMatches)].slice(0, 5);

    return {
      url:       location.href,
      title:     document.title,
      fullText:  bodyText.slice(0, 8000),
      selection: window.getSelection()?.toString() ?? "",
      contracts,
      ...web3,
    };
  }

  // Respond to requests from background / sidebar
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "CAPTURE_CONTEXT") {
      sendResponse(captureContext());
      return true;
    }
    if (msg.type === "GET_WEB3_STATUS") {
      sendResponse(detectWeb3());
      return true;
    }
  });

  // Inject subtle Web3 badge if on a known dApp
  if (detectWeb3().isKnownDapp || detectWeb3().hasEthereum || detectWeb3().hasSolana) {
    injectWeb3Badge(detectWeb3());
  }

  function injectWeb3Badge(info) {
    if (document.getElementById("unykorn-web3-badge")) return;
    const badge = document.createElement("div");
    badge.id = "unykorn-web3-badge";
    badge.innerHTML = `
      <span style="
        position:fixed; bottom:16px; right:16px; z-index:2147483647;
        background:rgba(12,12,20,0.92); border:1px solid #7C3AED;
        color:#a78bfa; font:500 11px/1 system-ui,sans-serif;
        padding:5px 10px; border-radius:999px; cursor:pointer;
        backdrop-filter:blur(8px); box-shadow:0 2px 12px rgba(124,58,237,.3);
        display:flex; align-items:center; gap:6px;
        transition:opacity .2s;
      " id="unykorn-badge-inner">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <circle cx="5" cy="5" r="4" stroke="#7C3AED" stroke-width="1.5"/>
          <circle cx="5" cy="5" r="2" fill="#7C3AED"/>
        </svg>
        ${info.hasEthereum ? "EVM" : info.hasSolana ? "SOL" : ""} · Ask Unykorn
      </span>
    `;
    badge.querySelector("#unykorn-badge-inner").addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "OPEN_SIDEBAR" });
    });
    document.body.appendChild(badge);
  }
})();
