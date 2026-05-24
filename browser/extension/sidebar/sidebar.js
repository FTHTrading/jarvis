const els = {
  daemonDot: document.getElementById("daemon-dot"),
  daemonLabel: document.getElementById("daemon-label"),
  ctxUrl: document.getElementById("ctx-url"),
  ctxWeb3: document.getElementById("ctx-web3"),
  prompt: document.getElementById("prompt"),
  run: document.getElementById("run"),
  answerWrap: document.getElementById("answer-wrap"),
  answerVia: document.getElementById("answer-via"),
  answerMode: document.getElementById("answer-mode"),
  answer: document.getElementById("answer"),
  options: document.getElementById("open-options"),
  modeButtons: Array.from(document.querySelectorAll(".mode-btn")),
};

let activeMode = "summarize";
let lastPayload = null;

function setMode(mode) {
  activeMode = mode;
  for (const btn of els.modeButtons) {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  }
}

els.modeButtons.forEach((btn) => btn.addEventListener("click", () => setMode(btn.dataset.mode)));
setMode("summarize");

els.options.addEventListener("click", () => chrome.runtime.openOptionsPage());
els.run.addEventListener("click", run);
els.prompt.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run();
});

async function init() {
  await refreshHealth();
  await loadActiveTabContext();

  const pending = await sendMessage({ type: "session.get", key: "unykorn:pending" });
  if (pending?.value?.payload) {
    const { payload } = pending.value;
    if (payload.mode) setMode(payload.mode);
    if (payload.prompt) els.prompt.value = payload.prompt;
    await sendMessage({ type: "session.set", key: "unykorn:pending", value: null });
    await loadActiveTabContext();
    await run();
  }
}

async function refreshHealth() {
  els.daemonLabel.textContent = "connecting…";
  els.daemonDot.className = "dot dot-amber";
  try {
    const res = await sendMessage({ type: "daemon.health" });
    if (!res?.ok) throw new Error(res?.error || "daemon unreachable");
    const reachable = res.result?.openclaw?.reachable;
    els.daemonDot.className = `dot ${reachable ? "dot-green" : "dot-amber"}`;
    els.daemonLabel.textContent = reachable ? "OpenClaw online" : "daemon ok · OpenClaw offline";
  } catch (err) {
    els.daemonDot.className = "dot dot-red";
    els.daemonLabel.textContent = "daemon offline";
  }
}

async function loadActiveTabContext() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  const res = await sendMessage({ type: "tab.capture", tabId: tab.id });
  if (!res?.ok) return;
  lastPayload = res.payload;
  els.ctxUrl.textContent = lastPayload.url || "(none)";
  const w3 = await sendMessage({ type: "web3.detect", payload: lastPayload });
  if (w3?.ok && w3.result) {
    const r = w3.result;
    if (r.isWeb3) {
      const parts = [];
      if (r.dapp) parts.push(`${r.dapp.name} (${r.dapp.chain})`);
      if (r.onchain?.evmAddresses?.length) parts.push(`${r.onchain.evmAddresses.length} EVM addr`);
      if (r.onchain?.txHashes?.length) parts.push(`${r.onchain.txHashes.length} tx`);
      els.ctxWeb3.textContent = parts.join(" · ") || "Web3 page";
      els.ctxWeb3.classList.add("pill");
    } else {
      els.ctxWeb3.textContent = "—";
    }
  }
}

async function run() {
  if (els.run.disabled) return;
  await loadActiveTabContext();
  if (!lastPayload) {
    showAnswer({ via: "none", mode: activeMode, answer: "No active tab to capture." });
    return;
  }
  els.run.disabled = true;
  els.run.textContent = "Running…";
  try {
    const payload = { ...lastPayload, mode: activeMode, prompt: els.prompt.value || "" };
    const res = await sendMessage({ type: "agent.run", payload });
    if (!res?.ok) throw new Error(res?.error || "agent error");
    const result = res.result || {};
    if (!result.ok) {
      showAnswer({ via: result.via || "none", mode: activeMode, answer: result.error || "agent failed" });
    } else {
      showAnswer({
        via: result.via || "openclaw",
        mode: result.mode || activeMode,
        answer: result.answer || "(empty answer)",
        warning: result.warning,
      });
    }
  } catch (err) {
    showAnswer({ via: "error", mode: activeMode, answer: err.message });
  } finally {
    els.run.disabled = false;
    els.run.textContent = "Run";
  }
}

function showAnswer({ via, mode, answer, warning }) {
  els.answerWrap.hidden = false;
  els.answerVia.textContent = via;
  els.answerMode.textContent = mode;
  els.answer.textContent = warning ? `⚠ ${warning}\n\n${answer}` : answer;
}

function sendMessage(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (res) => resolve(res));
  });
}

init();
