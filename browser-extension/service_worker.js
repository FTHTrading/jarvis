const DAEMON_URL = "http://127.0.0.1:8765";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "send-to-unykorn",
    title: "Send page to UnyKorn Agent",
    contexts: ["page", "selection", "link"]
  });
});

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function collectContext(tab) {
  if (!tab?.id) {
    throw new Error("No active tab available.");
  }

  const fallback = {
    url: tab.url || "",
    title: tab.title || "",
    selection: "",
    text: "",
    metadata: { capturedAt: new Date().toISOString(), web3Detected: false }
  };

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: "UNYKORN_COLLECT_CONTEXT" });
    if (response?.ok && response.context) {
      return response.context;
    }
  } catch (_error) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content_script.js"]
      });
      const response = await chrome.tabs.sendMessage(tab.id, { type: "UNYKORN_COLLECT_CONTEXT" });
      if (response?.ok && response.context) {
        return response.context;
      }
    } catch (_injectError) {
      return fallback;
    }
  }

  return fallback;
}

async function callDaemon(payload) {
  const response = await fetch(`${DAEMON_URL}/agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || data.error || `Daemon returned HTTP ${response.status}`);
  }
  return data;
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const activeTab = tab || (await getActiveTab());
  try {
    const context = await collectContext(activeTab);
    const payload = {
      ...context,
      mode: context.metadata?.web3Detected ? "web3_explain" : "summarize",
      prompt: info.selectionText ? `Focus on this selected text: ${info.selectionText}` : ""
    };
    await chrome.action.setBadgeText({ text: "...", tabId: activeTab.id });
    const result = await callDaemon(payload);
    await chrome.storage.local.set({ lastUnykornResult: result, lastUnykornPayload: payload });
    await chrome.action.setBadgeBackgroundColor({ color: "#10B981", tabId: activeTab.id });
    await chrome.action.setBadgeText({ text: "OK", tabId: activeTab.id });
  } catch (error) {
    await chrome.storage.local.set({ lastUnykornError: String(error) });
    if (activeTab?.id) {
      await chrome.action.setBadgeBackgroundColor({ color: "#EF4444", tabId: activeTab.id });
      await chrome.action.setBadgeText({ text: "!", tabId: activeTab.id });
    }
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "UNYKORN_COLLECT_ACTIVE_TAB") {
    getActiveTab()
      .then(collectContext)
      .then((context) => sendResponse({ ok: true, context }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message?.type === "UNYKORN_CALL_DAEMON") {
    callDaemon(message.payload)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  return false;
});
