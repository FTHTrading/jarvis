const DAEMON_URL = "http://127.0.0.1:40201";

// ── Daemon health check ───────────────────────────────────────────────────────
const statusDot  = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const ocText     = document.getElementById("openclaw-text");

async function checkHealth() {
  try {
    const res  = await fetch(`${DAEMON_URL}/health`, { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    if (res.ok) {
      statusDot.className = "status-dot online";
      statusText.textContent = `Daemon v${data.version ?? "0.1"} · online`;
      if (data.openclawOnline) {
        ocText.textContent = "OpenClaw :18789 · online";
      }
    } else {
      throw new Error("not ok");
    }
  } catch (_) {
    statusDot.className = "status-dot offline";
    statusText.textContent = "Daemon offline";
  }
}

checkHealth();

// ── Command form ──────────────────────────────────────────────────────────────
const form  = document.getElementById("command-form");
const input = document.getElementById("command-input");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  // Get current tab context from the extension background
  try {
    const ctx = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "GET_PAGE_CONTEXT" }, (r) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        resolve(r ?? {});
      });
    });

    const payload = {
      mode: "freeform",
      prompt: text,
      url:      ctx.url      ?? "",
      title:    ctx.title    ?? "",
      fullText: ctx.fullText ?? "",
    };

    const res = await fetch(`${DAEMON_URL}/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    showResult(data.answer ?? data.text ?? "No response from agent.");
  } catch (err) {
    showResult(`Error: ${err.message}`);
  }
});

// ── Inline result display ─────────────────────────────────────────────────────
function showResult(text) {
  let el = document.getElementById("newtab-result");
  if (!el) {
    el = document.createElement("div");
    el.id = "newtab-result";
    Object.assign(el.style, {
      position: "fixed",
      bottom: "70px",
      left: "50%",
      transform: "translateX(-50%)",
      maxWidth: "620px",
      width: "calc(100% - 40px)",
      background: "rgba(15,15,30,0.97)",
      border: "1px solid rgba(124,58,237,.35)",
      borderRadius: "12px",
      padding: "16px 18px",
      fontSize: "13px",
      lineHeight: "1.7",
      color: "#e2e0f0",
      zIndex: "100",
      backdropFilter: "blur(12px)",
      boxShadow: "0 8px 40px rgba(0,0,0,.5)",
      maxHeight: "280px",
      overflowY: "auto",
    });
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "×";
    Object.assign(closeBtn.style, {
      position: "absolute", top: "10px", right: "14px",
      background: "none", border: "none", color: "#9090b8",
      fontSize: "18px", cursor: "pointer",
    });
    closeBtn.onclick = () => el.remove();
    el.appendChild(closeBtn);
    document.body.appendChild(el);
  }
  const content = document.createElement("div");
  content.style.paddingRight = "20px";
  content.textContent = text;
  el.querySelector("div")?.remove();
  el.appendChild(content);
}
