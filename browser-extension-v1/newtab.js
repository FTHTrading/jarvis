let sessionId = null;

const daemonUrlInput = document.querySelector("#daemon-url");
const promptInput = document.querySelector("#prompt");
const runButton = document.querySelector("#run");
const saveButton = document.querySelector("#save-url");
const statusEl = document.querySelector("#status");
const answerEl = document.querySelector("#answer");

function setStatus(text) {
  statusEl.textContent = text;
}

function setAnswer(text) {
  answerEl.textContent = text;
}

async function loadDaemonUrl() {
  const response = await chrome.runtime.sendMessage({ type: "GET_DAEMON_URL" });
  if (response?.ok) {
    daemonUrlInput.value = response.daemonUrl;
  }
}

saveButton.addEventListener("click", async () => {
  const daemonUrl = daemonUrlInput.value.trim();
  if (!daemonUrl) {
    setStatus("Enter a daemon URL first.");
    return;
  }
  const response = await chrome.runtime.sendMessage({
    type: "SET_DAEMON_URL",
    daemonUrl
  });
  setStatus(response?.ok ? "Daemon URL saved." : String(response?.error || "save_failed"));
});

runButton.addEventListener("click", async () => {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    setStatus("Enter a command first.");
    return;
  }
  setStatus("Sending command to daemon...");
  setAnswer("");
  runButton.disabled = true;
  try {
    const result = await chrome.runtime.sendMessage({
      type: "AGENT_REQUEST",
      payload: {
        sessionId,
        mode: "freeform",
        prompt,
        context: {
          url: "chrome://newtab",
          title: "UnyKorn Command Surface",
          selection: "",
          pageText: ""
        }
      }
    });
    if (!result?.ok) {
      throw new Error(result?.error || "request_failed");
    }
    sessionId = result.data.sessionId || sessionId;
    setAnswer(result.data.answer || "(empty response)");
    setStatus(`backend=${result.data.metadata?.backend || "unknown"}`);
  } catch (error) {
    setAnswer(String(error));
    setStatus("Could not reach daemon. Start: python -m jarvis.browser_daemon");
  } finally {
    runButton.disabled = false;
  }
});

loadDaemonUrl().catch(() => {
  setStatus("Using default daemon URL.");
});
