const DAEMON_URL = "http://127.0.0.1:40201";

const statusDot   = document.getElementById("status-dot");
const statusLabel = document.getElementById("status-label");

// Daemon health check
(async () => {
  try {
    const res = await fetch(`${DAEMON_URL}/health`, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      statusDot.className = "status-dot online";
      statusLabel.textContent = "Daemon online";
    } else throw new Error();
  } catch (_) {
    statusDot.className = "status-dot offline";
    statusLabel.textContent = "Daemon offline";
  }
})();

// Open sidebar
document.getElementById("open-sidebar").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch (_) {}
  }
  window.close();
});

// Summarize this page
document.getElementById("summarize-page").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.runtime.sendMessage({
      type: "AGENT_REQUEST",
      payload: { url: tab.url, title: tab.title, mode: "summarize", selection: "" },
    });
    try { await chrome.sidePanel.open({ tabId: tab.id }); } catch (_) {}
  }
  window.close();
});

// Explain dApp
document.getElementById("explain-web3").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.runtime.sendMessage({
      type: "AGENT_REQUEST",
      payload: { url: tab.url, title: tab.title, mode: "web3_explain", selection: "" },
    });
    try { await chrome.sidePanel.open({ tabId: tab.id }); } catch (_) {}
  }
  window.close();
});

// Open new tab
document.getElementById("open-newtab").addEventListener("click", () => {
  chrome.tabs.create({ url: "chrome://newtab" });
  window.close();
});
