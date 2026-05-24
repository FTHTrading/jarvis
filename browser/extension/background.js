/**
 * Background service worker — message router between content scripts,
 * sidebar, popup, and the local Unykorn daemon.
 */

const DAEMON_URL = "http://127.0.0.1:40201";

// ── Context menu ──────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "unykorn-ask",
    title: "Ask Unykorn Agent",
    contexts: ["selection", "page"],
  });
  chrome.contextMenus.create({
    id: "unykorn-web3",
    title: "Explain this dApp / contract",
    contexts: ["page"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const mode = info.menuItemId === "unykorn-web3" ? "web3_explain" : "freeform";
  const payload = {
    url: tab.url,
    title: tab.title,
    selection: info.selectionText || "",
    mode,
  };
  await openSidePanel(tab);
  chrome.runtime.sendMessage({ type: "AGENT_REQUEST", payload });
});

// ── Side panel opener ─────────────────────────────────────────────────────────
async function openSidePanel(tab) {
  try {
    await chrome.sidePanel.open({ tabId: tab.id });
  } catch (_) {
    // sidePanel API may not be available in all contexts
  }
}

// ── Keyboard shortcut (Ctrl+Shift+U / Cmd+Shift+U) ───────────────────────────
chrome.commands?.onCommand?.addListener(async (command) => {
  if (command === "toggle-sidebar") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) await openSidePanel(tab);
  }
});

// ── Message bus ───────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "AGENT_REQUEST") {
    callDaemon(msg.payload)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true; // keep channel open for async response
  }

  if (msg.type === "GET_PAGE_CONTEXT") {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab) return sendResponse({});
      chrome.scripting
        .executeScript({ target: { tabId: tab.id }, func: capturePageContext })
        .then(([frame]) => sendResponse(frame?.result ?? {}))
        .catch(() => sendResponse({}));
    });
    return true;
  }

  if (msg.type === "OPEN_SIDEBAR") {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab) openSidePanel(tab).then(() => sendResponse({ ok: true }));
      else sendResponse({ ok: false });
    });
    return true;
  }

  if (msg.type === "DAEMON_HEALTH") {
    fetch(`${DAEMON_URL}/health`)
      .then((r) => r.json())
      .then((d) => sendResponse({ ok: true, data: d }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
});

// ── Daemon HTTP call ──────────────────────────────────────────────────────────
async function callDaemon(payload) {
  const res = await fetch(`${DAEMON_URL}/agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Daemon ${res.status}: ${txt}`);
  }
  return res.json();
}

// ── Page context helper (runs inside page) ────────────────────────────────────
function capturePageContext() {
  const hasEthereum = typeof window.ethereum !== "undefined";
  const hasSolana   = typeof window.solana !== "undefined";

  // Detect contract addresses on the page
  const bodyText = document.body?.innerText ?? "";
  const contractMatches = bodyText.match(/0x[a-fA-F0-9]{40}/g) ?? [];
  const contracts = [...new Set(contractMatches)].slice(0, 5);

  return {
    url:          location.href,
    title:        document.title,
    fullText:     bodyText.slice(0, 8000),
    hasEthereum,
    hasSolana,
    contracts,
    selection:    window.getSelection()?.toString() ?? "",
  };
}
