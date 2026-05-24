const DEFAULT_DAEMON_URL = "http://127.0.0.1:8787";
const MENU_ID = "send-to-unykorn-agent";

async function getDaemonUrl() {
  const { daemonUrl } = await chrome.storage.local.get("daemonUrl");
  return daemonUrl || DEFAULT_DAEMON_URL;
}

async function postAgentRequest(payload) {
  const baseUrl = await getDaemonUrl();
  const response = await fetch(`${baseUrl}/agent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Unykorn-Client": "browser-extension-v1"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`daemon_error_${response.status}: ${text}`);
  }
  return response.json();
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Send to UnyKorn Agent",
    contexts: ["selection", "page"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab?.id) {
    return;
  }
  chrome.tabs.sendMessage(tab.id, {
    type: "SEED_SELECTION",
    selection: info.selectionText || ""
  });
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-sidebar") {
    return;
  }
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab?.id) {
    return;
  }
  chrome.tabs.sendMessage(activeTab.id, { type: "TOGGLE_SIDEBAR" });
});

chrome.action.onClicked.addListener((tab) => {
  if (!tab?.id) {
    return;
  }
  chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_SIDEBAR" });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "AGENT_REQUEST") {
    postAgentRequest(message.payload)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message?.type === "SET_DAEMON_URL") {
    const daemonUrl = String(message.daemonUrl || "").trim();
    if (!daemonUrl) {
      sendResponse({ ok: false, error: "daemon_url_required" });
      return false;
    }
    chrome.storage.local.set({ daemonUrl }).then(() => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message?.type === "GET_DAEMON_URL") {
    getDaemonUrl()
      .then((daemonUrl) => sendResponse({ ok: true, daemonUrl }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  return false;
});
