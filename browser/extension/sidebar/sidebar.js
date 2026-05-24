/**
 * Sidebar — agent interaction panel.
 * Connects to: background.js → daemon → OpenClaw.
 *
 * State machine: Passive → Armed (context loaded) → Active (response shown)
 */

const DAEMON_URL = "http://127.0.0.1:40201";

// ── State ─────────────────────────────────────────────────────────────────────
let currentMode    = "summarize";
let pageContext    = null;
let abortController = null;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const statePill       = document.getElementById("state-pill");
const web3Indicator   = document.getElementById("web3-indicator");
const web3Label       = document.getElementById("web3-label");
const contextTitle    = document.getElementById("context-title");
const promptInput     = document.getElementById("prompt-input");
const sendBtn         = document.getElementById("send-btn");
const responseArea    = document.getElementById("response-area");
const responsePlaceholder = document.getElementById("response-placeholder");
const responseContent = document.getElementById("response-content");
const loadingRow      = document.getElementById("loading-row");
const loadingLabel    = document.getElementById("loading-label");
const statusDot       = document.getElementById("status-dot");
const statusLabel     = document.getElementById("status-label");

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  setupModeButtons();
  setupSendButton();
  setupKeyboard();
  await Promise.all([loadPageContext(), checkDaemonHealth()]);
});

// ── Mode buttons ──────────────────────────────────────────────────────────────
function setupModeButtons() {
  document.querySelectorAll(".mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".mode-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentMode = btn.dataset.mode;
      promptInput.placeholder = modePromptHint(currentMode);
    });
  });
}

function modePromptHint(mode) {
  const hints = {
    summarize:   "Summarize this page for me…",
    explain:     "What does this site / product do?",
    web3_explain:"Explain this dApp, contract, or transaction…",
    freeform:    "Ask anything about this page…",
  };
  return hints[mode] ?? "Command Unykorn…";
}

// ── Page context ──────────────────────────────────────────────────────────────
async function loadPageContext() {
  try {
    const ctx = await sendToBackground({ type: "GET_PAGE_CONTEXT" });
    if (!ctx) return;
    pageContext = ctx;

    contextTitle.textContent = ctx.title || ctx.url || "—";
    setState("armed");

    // Web3 detection
    if (ctx.hasEthereum || ctx.hasSolana || ctx.isKnownDapp) {
      const chain = ctx.hasEthereum ? "EVM" : "SOL";
      web3Label.textContent = ctx.isKnownDapp
        ? `dApp · ${chain}`
        : chain;
      web3Indicator.style.display = "flex";

      // Auto-activate Web3 mode button
      if (ctx.isKnownDapp || ctx.hasEthereum || ctx.hasSolana) {
        document.querySelector('[data-mode="web3_explain"]')?.classList.add("ready");
      }
    }
  } catch (e) {
    contextTitle.textContent = "Could not read page";
  }
}

// ── Send ──────────────────────────────────────────────────────────────────────
function setupSendButton() {
  sendBtn.addEventListener("click", handleSend);
}

function setupKeyboard() {
  promptInput.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  });
}

async function handleSend() {
  const text = promptInput.value.trim();

  if (abortController) {
    abortController.abort();
    abortController = null;
    setLoading(false);
    return;
  }

  setState("active");
  setLoading(true, "Routing to OpenClaw…");
  showResponse(false);

  try {
    const payload = buildPayload(text);
    const result  = await callDaemon(payload);
    showResponse(true, result.answer ?? result.text ?? JSON.stringify(result));
  } catch (err) {
    if (err.name === "AbortError") {
      showResponse(true, "_Request cancelled._");
    } else {
      showResponse(true, `**Error:** ${err.message}`);
    }
  } finally {
    setLoading(false);
    setState("armed");
    abortController = null;
  }
}

function buildPayload(promptText) {
  return {
    url:       pageContext?.url       ?? "",
    title:     pageContext?.title     ?? "",
    fullText:  pageContext?.fullText  ?? "",
    selection: pageContext?.selection ?? "",
    contracts: pageContext?.contracts ?? [],
    isKnownDapp:  pageContext?.isKnownDapp  ?? false,
    hasEthereum:  pageContext?.hasEthereum  ?? false,
    hasSolana:    pageContext?.hasSolana    ?? false,
    mode:      currentMode,
    prompt:    promptText,
  };
}

// ── Daemon call ───────────────────────────────────────────────────────────────
async function callDaemon(payload) {
  abortController = new AbortController();
  const res = await fetch(`${DAEMON_URL}/agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: abortController.signal,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Daemon ${res.status}: ${txt}`);
  }
  return res.json();
}

// ── Daemon health check ───────────────────────────────────────────────────────
async function checkDaemonHealth() {
  try {
    const res = await fetch(`${DAEMON_URL}/health`, { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    if (res.ok) {
      statusDot.className = "status-dot online";
      statusLabel.textContent = `Daemon v${data.version ?? "0.1"} · online`;
    } else {
      throw new Error("not ok");
    }
  } catch (_) {
    statusDot.className = "status-dot offline";
    statusLabel.textContent = "Daemon offline · start daemon";
  }
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function setState(state) {
  statePill.dataset.state = state;
  const labels = { passive: "Passive", armed: "Armed", active: "Active" };
  statePill.textContent = labels[state] ?? state;
}

function setLoading(show, label = "") {
  loadingRow.style.display  = show ? "flex" : "none";
  sendBtn.title = show ? "Cancel" : "Send (Ctrl+Enter)";
  sendBtn.style.background = show ? "#ef4444" : "";
  if (label) loadingLabel.textContent = label;
}

function showResponse(show, md = "") {
  responsePlaceholder.style.display = show ? "none" : "";
  responseContent.style.display     = show ? "block" : "none";
  if (show && md) responseContent.innerHTML = renderMarkdown(md);
}

/** Lightweight markdown → HTML renderer (no external deps). */
function renderMarkdown(md) {
  return md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // code blocks
    .replace(/```[\w]*\n([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
    // inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // headings
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm,  "<h2>$1</h2>")
    .replace(/^# (.+)$/gm,   "<h1>$1</h1>")
    // bullet lists
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>")
    // numbered lists
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    // links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    // line breaks
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^(.+)/, "<p>$1</p>");
}

// ── Message from background ───────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "AGENT_REQUEST" && msg.payload) {
    // Pre-fill prompt from context menu trigger
    if (msg.payload.selection) {
      promptInput.value = msg.payload.selection;
    }
    if (msg.payload.mode) {
      const btn = document.querySelector(`[data-mode="${msg.payload.mode}"]`);
      if (btn) {
        document.querySelectorAll(".mode-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentMode = msg.payload.mode;
      }
    }
    handleSend();
  }
});

// ── Background messaging helper ───────────────────────────────────────────────
function sendToBackground(msg) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(msg, (response) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        resolve(response);
      });
    } catch (e) {
      reject(e);
    }
  });
}
