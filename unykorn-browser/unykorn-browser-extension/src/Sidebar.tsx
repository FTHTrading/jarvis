import React, { useState, useEffect, useRef, useCallback } from "react";
import type {
  AgentMode, AgentRequest, AgentResponse, AgentState, DaemonHealth,
} from "./types";

const DAEMON_URL = "http://127.0.0.1:40201";

const MODE_LABELS: Record<AgentMode, string> = {
  summarize:    "Summarize",
  explain:      "Explain",
  web3_explain: "Web3",
  freeform:     "Ask",
};

const MODE_HINTS: Record<AgentMode, string> = {
  summarize:    "Summarize this page…",
  explain:      "What does this site do?",
  web3_explain: "Explain this dApp or contract…",
  freeform:     "Ask anything about this page…",
};

// ── Hook: page context ─────────────────────────────────────────────────────────
function usePageContext() {
  const [ctx, setCtx] = useState<Partial<AgentRequest>>({});

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "GET_PAGE_CONTEXT" }, (res) => {
      if (chrome.runtime.lastError) return;
      setCtx(res ?? {});
    });
  }, []);

  return ctx;
}

// ── Hook: daemon health ────────────────────────────────────────────────────────
function useDaemonHealth() {
  const [health, setHealth] = useState<DaemonHealth | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`${DAEMON_URL}/health`, { signal: AbortSignal.timeout(3000) })
      .then((r) => r.json())
      .then((d: DaemonHealth) => { setHealth(d); setOnline(d.ok); })
      .catch(() => setOnline(false));
  }, []);

  return { health, online };
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Sidebar() {
  const [mode,     setMode]     = useState<AgentMode>("summarize");
  const [prompt,   setPrompt]   = useState("");
  const [response, setResponse] = useState<AgentResponse | null>(null);
  const [state,    setState]    = useState<AgentState>("passive");
  const [loading,  setLoading]  = useState(false);

  const ctx    = usePageContext();
  const { health, online } = useDaemonHealth();
  const abortRef = useRef<AbortController | null>(null);

  // Arm when context loads
  useEffect(() => { if (ctx.url) setState("armed"); }, [ctx.url]);

  // Listen for agent requests triggered from background (context menu, etc.)
  useEffect(() => {
    const listener = (msg: { type: string; payload?: Partial<AgentRequest> }) => {
      if (msg.type !== "AGENT_REQUEST") return;
      if (msg.payload?.mode) setMode(msg.payload.mode as AgentMode);
      if (msg.payload?.selection) setPrompt(msg.payload.selection);
      void handleSend(msg.payload?.mode as AgentMode ?? mode);
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [ctx, mode]);

  const handleSend = useCallback(async (overrideMode?: AgentMode) => {
    if (loading) { abortRef.current?.abort(); return; }

    setState("active");
    setLoading(true);
    setResponse(null);
    abortRef.current = new AbortController();

    const payload: AgentRequest = {
      url:         ctx.url      ?? location.href,
      title:       ctx.title    ?? document.title,
      fullText:    ctx.fullText ?? "",
      selection:   ctx.selection ?? prompt,
      mode:        overrideMode ?? mode,
      prompt:      prompt,
      hasEthereum: ctx.hasEthereum,
      hasSolana:   ctx.hasSolana,
      isKnownDapp: ctx.isKnownDapp,
      contracts:   ctx.contracts,
      chain:       ctx.chain,
    };

    try {
      const res = await fetch(`${DAEMON_URL}/agent`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
        signal:  abortRef.current.signal,
      });
      const data: AgentResponse = await res.json();
      setResponse(data);
      setState("armed");
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        setResponse({ ok: false, error: "Cancelled." });
      } else {
        setResponse({ ok: false, error: (e as Error).message });
      }
      setState("armed");
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [ctx, mode, prompt, loading]);

  const isWeb3 = ctx.isKnownDapp || ctx.hasEthereum || ctx.hasSolana;

  return (
    <div className="sidebar">
      {/* Header */}
      <header className="sb-header">
        <div className="sb-logo">
          <UnykornIcon />
          <span className="sb-logo-name">Unykorn</span>
        </div>
        <span className={`sb-state sb-state--${state}`}>{capitalize(state)}</span>
      </header>

      {/* Web3 indicator */}
      {isWeb3 && (
        <div className="sb-web3-bar">
          <span className="sb-web3-dot" />
          <span>{ctx.hasEthereum ? "EVM" : "SOL"} · {ctx.isKnownDapp ? "Known dApp" : "Wallet detected"}</span>
        </div>
      )}

      {/* Page context */}
      <div className="sb-context">{ctx.title || ctx.url || "Loading page…"}</div>

      {/* Mode tabs */}
      <div className="sb-modes">
        {(Object.keys(MODE_LABELS) as AgentMode[]).map((m) => (
          <button
            key={m}
            className={`sb-mode-btn ${mode === m ? "active" : ""}`}
            onClick={() => { setMode(m); setPrompt(""); }}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="sb-input-area">
        <textarea
          className="sb-textarea"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={MODE_HINTS[mode]}
          rows={3}
          onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") void handleSend(); }}
        />
        <button
          className={`sb-send-btn ${loading ? "cancel" : ""}`}
          onClick={() => void handleSend()}
          title={loading ? "Cancel" : "Send (Ctrl+Enter)"}
        >
          {loading ? "■" : "▶"}
        </button>
      </div>

      {/* Response */}
      <div className="sb-response">
        {!response && !loading && (
          <p className="sb-placeholder">Pick a mode and send, or type a question.</p>
        )}
        {loading && (
          <div className="sb-loading">
            <div className="sb-spinner" />
            <span>Routing to {health?.brain ?? "agent"}…</span>
          </div>
        )}
        {response?.ok === false && (
          <p className="sb-error">{response.error}</p>
        )}
        {response?.ok && response.answer && (
          <div
            className="sb-answer markdown"
            dangerouslySetInnerHTML={{ __html: renderMd(response.answer) }}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="sb-footer">
        <span className="sb-daemon-status">
          <span className={`sb-status-dot ${online === true ? "online" : online === false ? "offline" : ""}`} />
          <span>
            {online === true  ? `Daemon v${health?.version ?? "0.1"} · online` :
             online === false ? "Daemon offline" : "Checking…"}
          </span>
        </span>
        <span className="sb-links">
          <a href="https://hail.unykorn.org"  target="_blank" rel="noreferrer">hail</a>
          <a href="https://storm.unykorn.org" target="_blank" rel="noreferrer">storm</a>
        </span>
      </footer>
    </div>
  );
}

function UnykornIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="9" stroke="#7C3AED" strokeWidth="1.3" />
      <circle cx="10" cy="10" r="4.5" fill="#7C3AED" opacity=".7" />
      <circle cx="10" cy="10" r="1.8" fill="#fff" />
    </svg>
  );
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function renderMd(md: string): string {
  return md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/```[\w]*\n([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(.+)/, "<p>$1</p>");
}
