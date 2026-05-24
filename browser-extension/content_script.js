const MAX_TEXT_CHARS = 12000;

function clampText(value, maxChars = MAX_TEXT_CHARS) {
  const text = String(value || "").replace(/\u0000/g, "").trim();
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars)}\n...[truncated]`;
}

function detectWeb3Context(url, title, selection, pageText) {
  const haystack = [url, title, selection, pageText].join(" ").toLowerCase();
  return [
    "wallet",
    "connect wallet",
    "ethereum",
    "solana",
    "contract",
    "token",
    "swap",
    "mint",
    "nft",
    "defi",
    "etherscan",
    "solscan"
  ].some((hint) => haystack.includes(hint));
}

function collectPageContext() {
  const selection = clampText(window.getSelection()?.toString() || "");
  const pageText = clampText(document.body?.innerText || "");
  return {
    url: window.location.href,
    title: document.title,
    selection,
    text: pageText,
    metadata: {
      capturedAt: new Date().toISOString(),
      web3Detected: detectWeb3Context(window.location.href, document.title, selection, pageText)
    }
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "UNYKORN_COLLECT_CONTEXT") {
    return false;
  }

  try {
    sendResponse({ ok: true, context: collectPageContext() });
  } catch (error) {
    sendResponse({ ok: false, error: String(error) });
  }
  return true;
});
