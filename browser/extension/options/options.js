const url = document.getElementById("daemon-url");
const token = document.getElementById("daemon-token");
const status = document.getElementById("status");

async function load() {
  const stored = await chrome.storage.local.get(["unykorn:settings"]);
  const settings = stored["unykorn:settings"] || {};
  url.value = settings.daemonUrl || "http://127.0.0.1:18790";
  token.value = settings.daemonToken || "";
}

async function save() {
  const settings = {
    daemonUrl: url.value.trim() || "http://127.0.0.1:18790",
    daemonToken: token.value.trim(),
  };
  await chrome.storage.local.set({ "unykorn:settings": settings });
  status.textContent = "Saved.";
  status.style.color = "var(--unk-green)";
}

async function test() {
  status.textContent = "Testing…";
  status.style.color = "var(--unk-fg-dim)";
  const res = await new Promise((resolve) =>
    chrome.runtime.sendMessage({ type: "daemon.health" }, resolve)
  );
  if (!res?.ok) {
    status.textContent = `Failed: ${res?.error || "no response"}`;
    status.style.color = "var(--unk-red)";
    return;
  }
  const reachable = res.result?.openclaw?.reachable;
  status.textContent = reachable
    ? `Daemon ok · OpenClaw reachable at ${res.result.openclaw.url}`
    : `Daemon ok · OpenClaw NOT reachable at ${res.result.openclaw.url}`;
  status.style.color = reachable ? "var(--unk-green)" : "var(--unk-amber)";
}

document.getElementById("save").addEventListener("click", save);
document.getElementById("test").addEventListener("click", test);
load();
