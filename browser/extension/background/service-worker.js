// Unykorn Sovereign Browser — background service worker (MV3).
//
// Responsibilities:
//   - Register context menu entries.
//   - Handle command shortcuts (open sidebar).
//   - Proxy `agent.run` calls from sidebar/popup to the local daemon.
//   - Expose lightweight session storage so panes can share state.

import { callDaemon, getSettings } from "./daemon-client.js";

const CONTEXT_MENU_ITEMS = [
  { id: "unykorn-summarize", title: "Unykorn: Summarize page", contexts: ["page"] },
  { id: "unykorn-explain", title: "Unykorn: Explain this site", contexts: ["page"] },
  { id: "unykorn-web3", title: "Unykorn: Explain dApp / contract", contexts: ["page", "link"] },
  { id: "unykorn-selection", title: "Unykorn: Ask about selection", contexts: ["selection"] },
];

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.contextMenus.removeAll();
  for (const item of CONTEXT_MENU_ITEMS) {
    chrome.contextMenus.create(item);
  }
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch {
    // sidePanel not supported in this browser; popup will still work.
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  const mode = ({
    "unykorn-summarize": "summarize",
    "unykorn-explain": "explain",
    "unykorn-web3": "web3_explain",
    "unykorn-selection": "freeform",
  })[info.menuItemId];
  if (!mode) return;

  const payload = await captureFromTab(tab.id, { selection: info.selectionText });
  payload.mode = mode;
  if (mode === "freeform" && info.selectionText) {
    payload.prompt = `Explain this selection in plain English: ${info.selectionText}`;
  }

  await openSidebarFor(tab, payload);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "open-sidebar") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) await openSidebarFor(tab);
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      switch (msg?.type) {
        case "agent.run": {
          const settings = await getSettings();
          const payload = msg.payload ?? {};
          const result = await callDaemon(settings, "/agent", payload);
          sendResponse({ ok: true, result });
          break;
        }
        case "web3.detect": {
          const settings = await getSettings();
          const result = await callDaemon(settings, "/web3/detect", msg.payload ?? {});
          sendResponse({ ok: true, result });
          break;
        }
        case "daemon.health": {
          const settings = await getSettings();
          const result = await callDaemon(settings, "/health", null, "GET");
          sendResponse({ ok: true, result });
          break;
        }
        case "tab.capture": {
          const tabId = msg.tabId ?? sender.tab?.id;
          const payload = await captureFromTab(tabId);
          sendResponse({ ok: true, payload });
          break;
        }
        case "session.set":
          await chrome.storage.session.set({ [msg.key]: msg.value });
          sendResponse({ ok: true });
          break;
        case "session.get": {
          const data = await chrome.storage.session.get(msg.key);
          sendResponse({ ok: true, value: data[msg.key] ?? null });
          break;
        }
        default:
          sendResponse({ ok: false, error: `unknown message: ${msg?.type}` });
      }
    } catch (err) {
      sendResponse({ ok: false, error: err.message });
    }
  })();
  return true;
});

async function captureFromTab(tabId, extra = {}) {
  if (!tabId) return { ...extra };
  try {
    const [{ result } = {}] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => ({
        url: location.href,
        title: document.title,
        selection: window.getSelection?.()?.toString?.() || "",
        fullText: document.body?.innerText?.slice(0, 50_000) || "",
      }),
    });
    const captured = result || {};
    return {
      url: captured.url,
      title: captured.title,
      selection: extra.selection || captured.selection || "",
      fullText: captured.fullText || "",
      ...extra,
    };
  } catch (err) {
    return { error: err.message, ...extra };
  }
}

async function openSidebarFor(tab, prefill) {
  if (prefill) {
    await chrome.storage.session.set({ "unykorn:pending": { tabId: tab.id, payload: prefill } });
  }
  try {
    await chrome.sidePanel.open({ tabId: tab.id });
  } catch {
    await chrome.action.openPopup?.();
  }
}
