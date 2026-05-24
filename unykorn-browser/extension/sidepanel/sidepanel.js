import { askAgent, checkDaemonHealth } from "../shared/daemon-client.js";

const promptEl = document.getElementById("prompt");
const askBtn = document.getElementById("ask-btn");
const refreshBtn = document.getElementById("refresh-context-btn");
const responseSection = document.getElementById("response");
const responseText = document.getElementById("response-text");
const responseMeta = document.getElementById("response-meta");
const pageTitleEl = document.getElementById("page-title");
const pageUrlEl = document.getElementById("page-url");
const web3Banner = document.getElementById("web3-banner");
const daemonStatus = document.getElementById("daemon-status");

let pageContext = {
  url: "",
  title: "",
  selection: "",
  pageText: "",
  web3: { detected: false },
};

let pendingMode = "freeform";

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

async function refreshContext() {
  const tabId = await getActiveTabId();
  pageContext = await chrome.runtime.sendMessage({ type: "COLLECT_CONTEXT", tabId });
  pageTitleEl.textContent = pageContext.title || "Untitled page";
  pageUrlEl.textContent = pageContext.url || "";
  web3Banner.classList.toggle("hidden", !pageContext.web3?.detected);
}

async function refreshDaemonStatus() {
  const health = await chrome.runtime.sendMessage({ type: "CHECK_DAEMON" });
  daemonStatus.classList.remove("status--ok", "status--error", "status--unknown");
  if (health.reachable && health.ok) {
    daemonStatus.classList.add("status--ok");
    daemonStatus.title = "Daemon online · OpenClaw " + (health.openclaw?.ok ? "up" : "down");
  } else if (health.reachable) {
    daemonStatus.classList.add("status--ok");
    daemonStatus.title = "Daemon reachable";
  } else {
    daemonStatus.classList.add("status--error");
    daemonStatus.title = health.error || "Daemon offline — start unykorn-daemon";
  }
}

function setLoading(isLoading) {
  askBtn.disabled = isLoading;
  askBtn.textContent = isLoading ? "Thinking…" : "Ask";
}

async function runAsk(mode = "freeform") {
  setLoading(true);
  responseSection.classList.remove("hidden");
  responseText.textContent = "Contacting Unykorn daemon…";
  responseMeta.textContent = "";

  try {
    const result = await askAgent({
      mode,
      prompt: promptEl.value.trim(),
      url: pageContext.url,
      title: pageContext.title,
      selection: pageContext.selection,
      pageText: pageContext.pageText,
      web3: pageContext.web3,
    });

    if (result.ok) {
      responseText.textContent = result.answer;
      responseMeta.textContent = `Backend: ${result.backend}${result.agent ? ` · agent ${result.agent}` : ""}${result.model ? ` · ${result.model}` : ""}`;
    } else {
      responseText.textContent = result.error || "Request failed.";
      responseMeta.textContent = "";
    }
  } catch (err) {
    responseText.textContent = `Could not reach daemon at http://127.0.0.1:8787 — ${err.message}`;
  } finally {
    setLoading(false);
  }
}

document.querySelectorAll(".mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    pendingMode = btn.dataset.mode || "freeform";
    runAsk(pendingMode);
  });
});

askBtn.addEventListener("click", () => runAsk(pendingMode));
refreshBtn.addEventListener("click", refreshContext);

promptEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    runAsk("freeform");
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "FOCUS_PROMPT") {
    promptEl.focus();
  }
  if (message.type === "CONTEXT_MENU_ASK") {
    pageContext = message.context || pageContext;
    pageTitleEl.textContent = pageContext.title || "Untitled page";
    pageUrlEl.textContent = pageContext.url || "";
    web3Banner.classList.toggle("hidden", !pageContext.web3?.detected);
    runAsk(message.mode || "summarize");
  }
});

refreshContext();
refreshDaemonStatus();
setInterval(refreshDaemonStatus, 15000);
