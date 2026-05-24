import { checkDaemonHealth } from "../shared/daemon-client.js";

const MENU_ID = "unykorn-send-page";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Send to Unykorn Agent",
    contexts: ["page", "selection"],
  });
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab?.id) return;

  await chrome.sidePanel.open({ tabId: tab.id });
  const context = await collectPageContext(tab.id);
  if (info.selectionText) {
    context.selection = info.selectionText;
  }
  chrome.runtime.sendMessage({
    type: "CONTEXT_MENU_ASK",
    mode: info.selectionText ? "freeform" : "summarize",
    context,
  });
});

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  if (command === "_execute_action" || command === "ask-unykorn") {
    await chrome.sidePanel.open({ tabId: tab.id });
    chrome.runtime.sendMessage({ type: "FOCUS_PROMPT" });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "COLLECT_CONTEXT") {
    collectPageContext(message.tabId ?? sender.tab?.id)
      .then((context) => sendResponse(context))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  if (message.type === "CHECK_DAEMON") {
    checkDaemonHealth()
      .then((health) => sendResponse(health))
      .catch((err) => sendResponse({ reachable: false, error: err.message }));
    return true;
  }

  return false;
});

async function collectPageContext(tabId) {
  if (!tabId) {
    return { url: "", title: "", selection: "", pageText: "", web3: { detected: false } };
  }

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const hasEthereum = typeof window.ethereum !== "undefined";
      const hasSolana =
        typeof window.solana !== "undefined" ||
        typeof window.phantom?.solana !== "undefined";
      return {
        url: location.href,
        title: document.title,
        selection: window.getSelection()?.toString?.() || "",
        pageText: (document.body?.innerText || "").slice(0, 16000),
        web3: {
          detected: hasEthereum || hasSolana,
          hasEthereum,
          hasSolana,
          hostname: location.hostname,
        },
      };
    },
  });

  return result ?? {};
}
