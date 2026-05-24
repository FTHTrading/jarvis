// Content script — runs in every page (isolated world).
// Job: detect Web3 surfaces, harvest light page metadata, and respond to
// requests from the sidebar/background. The provider sniff is delegated
// to inject.js which runs in the MAIN world so it can see window.ethereum.

(function bootstrap() {
  const STATE = {
    hasEthereumProvider: false,
    hasSolanaProvider: false,
    chainId: null,
    accounts: [],
  };

  injectMainWorldScript();

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.kind !== "unykorn:web3") return;
    Object.assign(STATE, data.payload || {});
  });

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type !== "page.snapshot") return;
    const snapshot = {
      url: location.href,
      title: document.title,
      selection: window.getSelection?.()?.toString?.() || "",
      fullText: (document.body?.innerText || "").slice(0, 50_000),
      meta: collectMeta(),
      web3: { ...STATE },
    };
    sendResponse({ ok: true, snapshot });
    return true;
  });

  function collectMeta() {
    const out = {};
    document.querySelectorAll('meta[property], meta[name]').forEach((el) => {
      const k = el.getAttribute("property") || el.getAttribute("name");
      const v = el.getAttribute("content");
      if (k && v && k.length < 64 && v.length < 512) out[k] = v;
    });
    return out;
  }

  function injectMainWorldScript() {
    try {
      const s = document.createElement("script");
      s.src = chrome.runtime.getURL("content/inject.js");
      s.async = false;
      s.onload = () => s.remove();
      (document.head || document.documentElement).appendChild(s);
    } catch {
      // Ignore — some pages disallow injection (about:, chrome://, etc.).
    }
  }
})();
