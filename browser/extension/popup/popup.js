const dot = document.getElementById("daemon-dot");
const label = document.getElementById("daemon-label");

document.getElementById("open-sidebar").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    await chrome.sidePanel.open({ tabId: tab.id });
    window.close();
  } catch {
    label.textContent = "side panel unavailable";
  }
});

document.getElementById("open-newtab").addEventListener("click", () => {
  chrome.tabs.create({ url: "chrome://newtab" });
});

document.getElementById("open-options").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

chrome.runtime.sendMessage({ type: "daemon.health" }, (res) => {
  if (!res?.ok) {
    dot.className = "dot dot-red";
    label.textContent = "daemon offline";
    return;
  }
  const reachable = res.result?.openclaw?.reachable;
  dot.className = `dot ${reachable ? "dot-green" : "dot-amber"}`;
  label.textContent = reachable ? "OpenClaw online" : "daemon ok · OpenClaw offline";
});
