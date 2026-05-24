const PANEL_ID = "unykorn-agent-panel";

let sessionId = null;
let panelOpen = false;
let elements = null;

function detectDappSignals() {
  const hostname = window.location.hostname.toLowerCase();
  const knownDappDomains = [
    "uniswap.org",
    "app.uniswap.org",
    "opensea.io",
    "jup.ag",
    "raydium.io",
    "magiceden.io"
  ];
  const knownDappDomain = knownDappDomains.some((domain) => hostname.includes(domain));
  return {
    knownDappDomain,
    hasEthereumProvider: Boolean(window.ethereum),
    hasSolanaProvider: Boolean(window.solana),
    protocol: window.location.protocol,
    hostname
  };
}

function gatherContext() {
  const selectedText = window.getSelection ? String(window.getSelection()) : "";
  const pageText = (document.body?.innerText || "").slice(0, 12000);
  return {
    url: window.location.href,
    title: document.title || "",
    selection: selectedText.slice(0, 2000),
    pageText,
    dappSignals: detectDappSignals()
  };
}

function ensurePanel() {
  if (elements) {
    return elements;
  }

  const root = document.createElement("aside");
  root.id = PANEL_ID;
  root.style.cssText = [
    "position: fixed",
    "top: 0",
    "right: 0",
    "width: min(420px, 94vw)",
    "height: 100vh",
    "z-index: 2147483647",
    "background: #0c1226",
    "color: #e6eeff",
    "font-family: Inter, Segoe UI, Helvetica, Arial, sans-serif",
    "box-shadow: -12px 0 28px rgba(0, 0, 0, 0.35)",
    "transform: translateX(100%)",
    "transition: transform 180ms ease",
    "display: flex",
    "flex-direction: column"
  ].join(";");

  const header = document.createElement("div");
  header.style.cssText =
    "padding: 14px 16px;border-bottom: 1px solid rgba(140,170,255,0.22);display:flex;justify-content:space-between;align-items:center;";
  header.innerHTML =
    '<div style="font-weight:700">UnyKorn Agent</div><button id="unykorn-close" style="background:#1f2a4d;color:#e6eeff;border:1px solid #3a4b84;border-radius:6px;padding:6px 10px;cursor:pointer">Close</button>';

  const body = document.createElement("div");
  body.style.cssText = "padding: 12px 14px;display:flex;flex-direction:column;gap:10px;height:100%;";
  body.innerHTML = `
    <label style="font-size:12px;color:#9db1e9">Mode</label>
    <select id="unykorn-mode" style="background:#141d3c;color:#e6eeff;border:1px solid #32457f;padding:8px;border-radius:8px">
      <option value="summarize">Summarize page</option>
      <option value="explain">Explain page</option>
      <option value="web3_explain">Web3 explain</option>
      <option value="freeform">Freeform</option>
    </select>

    <label style="font-size:12px;color:#9db1e9">Prompt</label>
    <textarea id="unykorn-prompt" rows="4" placeholder="Ask about this page..." style="resize:vertical;background:#141d3c;color:#e6eeff;border:1px solid #32457f;padding:10px;border-radius:8px"></textarea>

    <div style="display:flex;gap:8px">
      <button id="unykorn-run" style="flex:1;background:#3e64ff;color:#fff;border:none;border-radius:8px;padding:10px;cursor:pointer;font-weight:600">Run</button>
      <button id="unykorn-clear" style="background:#1f2a4d;color:#e6eeff;border:1px solid #3a4b84;border-radius:8px;padding:10px;cursor:pointer">Clear</button>
    </div>

    <div id="unykorn-status" style="font-size:12px;color:#9db1e9"></div>
    <pre id="unykorn-answer" style="margin:0;white-space:pre-wrap;overflow:auto;background:#090f20;border:1px solid #24345e;border-radius:8px;padding:10px;flex:1"></pre>
  `;

  root.appendChild(header);
  root.appendChild(body);
  document.documentElement.appendChild(root);

  const closeButton = root.querySelector("#unykorn-close");
  const runButton = root.querySelector("#unykorn-run");
  const clearButton = root.querySelector("#unykorn-clear");
  const mode = root.querySelector("#unykorn-mode");
  const prompt = root.querySelector("#unykorn-prompt");
  const answer = root.querySelector("#unykorn-answer");
  const status = root.querySelector("#unykorn-status");

  closeButton.addEventListener("click", () => setPanelOpen(false));
  clearButton.addEventListener("click", () => {
    prompt.value = "";
    answer.textContent = "";
    status.textContent = "";
  });
  runButton.addEventListener("click", async () => {
    const payload = {
      sessionId,
      mode: mode.value,
      prompt: prompt.value.trim(),
      context: gatherContext()
    };
    status.textContent = "Sending context to local daemon...";
    answer.textContent = "";
    runButton.disabled = true;
    try {
      const result = await chrome.runtime.sendMessage({
        type: "AGENT_REQUEST",
        payload
      });
      if (!result?.ok) {
        throw new Error(result?.error || "request_failed");
      }
      sessionId = result.data.sessionId || sessionId;
      answer.textContent = result.data.answer || "(empty response)";
      status.textContent = `mode=${result.data.metadata?.mode || mode.value} backend=${result.data.metadata?.backend || "unknown"}`;
    } catch (error) {
      answer.textContent = String(error);
      status.textContent = "Could not reach daemon. Is python -m jarvis.browser_daemon running?";
    } finally {
      runButton.disabled = false;
    }
  });

  elements = { root, mode, prompt, answer, status };
  return elements;
}

function setPanelOpen(open) {
  const panel = ensurePanel();
  panelOpen = open;
  panel.root.style.transform = open ? "translateX(0)" : "translateX(100%)";
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "TOGGLE_SIDEBAR") {
    setPanelOpen(!panelOpen);
  }
  if (message?.type === "SEED_SELECTION") {
    const panel = ensurePanel();
    if (message.selection) {
      panel.prompt.value = message.selection;
    }
    setPanelOpen(true);
  }
});
