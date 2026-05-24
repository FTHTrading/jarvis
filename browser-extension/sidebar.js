const DAEMON_URL = "http://127.0.0.1:8765";

const statusEl = document.getElementById("status");
const modeEl = document.getElementById("mode");
const promptEl = document.getElementById("prompt");
const resultEl = document.getElementById("result");
const sendButton = document.getElementById("send");
const lastButton = document.getElementById("last");

function setStatus(message, kind = "") {
  statusEl.textContent = message;
  statusEl.dataset.kind = kind;
}

function renderResult(result) {
  if (!result) {
    resultEl.textContent = "No result yet.";
    return;
  }
  const metadata = result.metadata || {};
  resultEl.innerHTML = "";

  const state = document.createElement("p");
  state.className = "meta";
  state.textContent = `State: ${metadata.agentState || "passive"} | Mode: ${metadata.mode || "unknown"} | Brain: ${
    metadata.backend || "unknown"
  }`;
  resultEl.appendChild(state);

  const answer = document.createElement("pre");
  answer.textContent = result.answer || JSON.stringify(result, null, 2);
  resultEl.appendChild(answer);
}

async function sendRuntimeMessage(message) {
  return chrome.runtime.sendMessage(message);
}

async function checkHealth() {
  try {
    const response = await fetch(`${DAEMON_URL}/health`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    setStatus(`Connected to Jarvis (${data.brain}, ${data.agentState})`, "ok");
  } catch (error) {
    setStatus(`Start daemon: python -m jarvis.browser_daemon (${error})`, "error");
  }
}

async function collectContext() {
  const response = await sendRuntimeMessage({ type: "UNYKORN_COLLECT_ACTIVE_TAB" });
  if (!response?.ok) {
    throw new Error(response?.error || "Could not capture active tab.");
  }
  return response.context;
}

async function sendToDaemon() {
  sendButton.disabled = true;
  sendButton.textContent = "Sending...";
  resultEl.textContent = "";
  try {
    const context = await collectContext();
    const payload = {
      ...context,
      mode: modeEl.value,
      prompt: promptEl.value
    };
    const response = await sendRuntimeMessage({ type: "UNYKORN_CALL_DAEMON", payload });
    if (!response?.ok) {
      throw new Error(response?.error || "Daemon call failed.");
    }
    await chrome.storage.local.set({ lastUnykornResult: response.result, lastUnykornPayload: payload });
    renderResult(response.result);
    setStatus("Response received from Jarvis.", "ok");
  } catch (error) {
    setStatus(String(error), "error");
  } finally {
    sendButton.disabled = false;
    sendButton.textContent = "Send to Jarvis";
  }
}

async function showLastResult() {
  const data = await chrome.storage.local.get(["lastUnykornResult", "lastUnykornError"]);
  if (data.lastUnykornResult) {
    renderResult(data.lastUnykornResult);
  } else if (data.lastUnykornError) {
    setStatus(data.lastUnykornError, "error");
  } else {
    renderResult(null);
  }
}

sendButton.addEventListener("click", sendToDaemon);
lastButton.addEventListener("click", showLastResult);
checkHealth();
showLastResult();
