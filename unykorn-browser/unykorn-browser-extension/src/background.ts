/**
 * background.ts — Manifest V3 service worker.
 * Handles context menu, keyboard shortcut, and message routing.
 */

import type { AgentRequest } from "./types";

const DAEMON_URL = "http://127.0.0.1:40201";

// ── Install: context menu ──────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id:       "unykorn-send",
    title:    "Send to Unykorn",
    contexts: ["page", "selection"],
  });
  chrome.contextMenus.create({
    id:       "unykorn-web3",
    title:    "Explain this dApp / contract",
    contexts: ["page"],
  });
});

// ── Context menu click ────────────────────────────────────────────────────────
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  const mode = info.menuItemId === "unykorn-web3" ? "web3_explain" : "summarize";
  const payload: Partial<AgentRequest> = {
    url:       tab.url  ?? "",
    title:     tab.title ?? "",
    selection: info.selectionText ?? "",
    mode,
  };

  await openSidePanel(tab.id);
  chrome.runtime.sendMessage({ type: "AGENT_REQUEST", payload });
});

// ── Keyboard shortcut ─────────────────────────────────────────────────────────
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-sidebar") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) await openSidePanel(tab.id);
});

// ── Message bus ───────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener(
  (msg: { type: string; payload?: unknown }, sender, sendResponse) => {
    if (msg.type === "AGENT_REQUEST") {
      callDaemon(msg.payload as AgentRequest)
        .then((r) => sendResponse({ ok: true,  result: r }))
        .catch((e) => sendResponse({ ok: false, error: (e as Error).message }));
      return true;
    }

    if (msg.type === "GET_PAGE_CONTEXT") {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (!tab?.id) return sendResponse({});
        chrome.tabs.sendMessage(tab.id, { type: "CAPTURE_CONTEXT" }, sendResponse);
      });
      return true;
    }

    if (msg.type === "OPEN_SIDEBAR") {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (tab?.id) openSidePanel(tab.id).then(() => sendResponse({ ok: true }));
      });
      return true;
    }

    if (msg.type === "OPEN_SIDEBAR") {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (tab?.id) openSidePanel(tab.id).then(() => sendResponse({ ok: true }));
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
  }
);

// ── Helpers ───────────────────────────────────────────────────────────────────
async function openSidePanel(tabId: number): Promise<void> {
  try {
    await chrome.sidePanel.open({ tabId });
  } catch { /* sidePanel may not exist in all environments */ }
}

async function callDaemon(payload: AgentRequest): Promise<unknown> {
  const res = await fetch(`${DAEMON_URL}/agent`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Daemon ${res.status}: ${await res.text()}`);
  return res.json();
}
