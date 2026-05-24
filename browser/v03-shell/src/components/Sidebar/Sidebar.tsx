import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Tab } from "../../App";

interface Props {
  tab:        Tab;
  onSetState: (s: Tab["state"]) => void;
}

type Mode = "summarize" | "explain" | "web3_explain" | "freeform";

export default function Sidebar({ tab, onSetState }: Props) {
  const [mode,    setMode]    = useState<Mode>("summarize");
  const [prompt,  setPrompt]  = useState("");
  const [answer,  setAnswer]  = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // Re-arm when tab changes
  useEffect(() => { onSetState("armed"); setAnswer(""); setError(""); }, [tab.id]);

  const send = async () => {
    if (loading) { abortRef.current?.abort(); return; }

    setLoading(true);
    setError("");
    onSetState("active");

    abortRef.current = new AbortController();

    try {
      // In native Tauri build: invoke("call_agent", payload)
      // In dev/web build: POST directly to daemon
      const res = await fetch("http://127.0.0.1:40201/agent", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          url:      tab.url,
          title:    tab.title,
          fullText: "",
          selection: "",
          hasEthereum: false,
          hasSolana:   false,
          isKnownDapp: false,
          contracts:   [],
          chain:       null,
          mode,
          prompt,
        }),
        signal: abortRef.current.signal,
      });
      const data = await res.json();
      if (data.ok) {
        setAnswer(data.answer ?? "");
        onSetState("armed");
      } else {
        setError(data.error ?? "Unknown error");
        onSetState("armed");
      }
    } catch (e: any) {
      if (e.name !== "AbortError") setError(e.message);
      onSetState("armed");
    } finally {
      setLoading(false);
    }
  };

  const stateLabel = { passive: "Passive", armed: "Armed", active: "Active" }[tab.state];
  const stateClass  = { passive: "passive", armed: "armed", active: "active" }[tab.state];

  return (
    <div className="sidebar">
      <div className="sb-header">
        <div className="sb-logo">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="8" stroke="#7C3AED" strokeWidth="1.3"/>
            <circle cx="9" cy="9" r="4" fill="#7C3AED" opacity=".7"/>
            <circle cx="9" cy="9" r="1.5" fill="#fff"/>
          </svg>
          <span className="sb-name">Unykorn</span>
        </div>
        <span className={`sb-state ${stateClass}`}>{stateLabel}</span>
      </div>

      <div className="sb-context">{tab.title || tab.url}</div>

      <div className="sb-modes">
        {(["summarize","explain","web3_explain","freeform"] as Mode[]).map((m) => (
          <button key={m} className={`sb-mode ${mode === m ? "active" : ""}`} onClick={() => setMode(m)}>
            {{ summarize: "Sum", explain: "Explain", web3_explain: "Web3", freeform: "Ask" }[m]}
          </button>
        ))}
      </div>

      <div className="sb-input-wrap">
        <textarea
          className="sb-input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Command Unykorn…"
          rows={3}
          onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") send(); }}
        />
        <button className={`sb-send ${loading ? "cancel" : ""}`} onClick={send}>
          {loading ? "■" : "▶"}
        </button>
      </div>

      <div className="sb-response">
        {error  && <div className="sb-error">{error}</div>}
        {answer && <div className="sb-answer" dangerouslySetInnerHTML={{ __html: basicMd(answer) }}/>}
        {!answer && !error && (
          <div className="sb-placeholder">
            Pick a mode and send, or type a question.
          </div>
        )}
      </div>

      <style>{`
        .sidebar {
          width: 300px; min-width: 260px;
          background: #0c0c14;
          border-left: 1px solid rgba(124,58,237,.18);
          display: flex; flex-direction: column;
          font-size: 12px; font-family: inherit;
        }
        .sb-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 12px;
          background: #111120;
          border-bottom: 1px solid rgba(124,58,237,.15);
        }
        .sb-logo { display: flex; align-items: center; gap: 7px; }
        .sb-name { font-weight: 700; font-size: 13px; background: linear-gradient(90deg,#a78bfa,#7C3AED); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .sb-state { font-size: 10px; font-weight: 600; text-transform: uppercase; padding: 2px 7px; border-radius: 99px; letter-spacing: .06em; }
        .sb-state.passive { color: #5a5a80; border: 1px solid rgba(124,58,237,.15); }
        .sb-state.armed   { color: #f59e0b; border: 1px solid #f59e0b; }
        .sb-state.active  { color: #22c55e; border: 1px solid #22c55e; }
        .sb-context {
          padding: 7px 12px; font-size: 10px; color: #5a5a80;
          background: #161626; border-bottom: 1px solid rgba(124,58,237,.1);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .sb-modes { display: flex; gap: 5px; padding: 8px 12px; flex-wrap: wrap; }
        .sb-mode {
          padding: 4px 9px; border-radius: 4px; font-size: 11px; font-family: inherit;
          border: 1px solid rgba(124,58,237,.18); background: #161626; color: #9090b8; cursor: pointer;
          transition: all .15s;
        }
        .sb-mode.active, .sb-mode:hover { border-color: #7C3AED; color: #a78bfa; background: rgba(124,58,237,.12); }
        .sb-input-wrap { padding: 0 12px 8px; position: relative; }
        .sb-input {
          width: 100%; background: #161626; border: 1px solid rgba(124,58,237,.2);
          border-radius: 7px; color: #e2e0f0; font-size: 12px; font-family: inherit;
          padding: 8px 36px 8px 10px; resize: none; outline: none; line-height: 1.5;
          transition: border-color .15s;
        }
        .sb-input:focus { border-color: #7C3AED; }
        .sb-input::placeholder { color: #5a5a80; }
        .sb-send {
          position: absolute; right: 18px; bottom: 14px;
          width: 26px; height: 26px; border-radius: 5px;
          background: #7C3AED; border: none; color: #fff; cursor: pointer;
          font-size: 12px; display: flex; align-items: center; justify-content: center;
          transition: background .15s;
        }
        .sb-send.cancel { background: #ef4444; }
        .sb-response { flex: 1; overflow-y: auto; padding: 8px 12px; }
        .sb-placeholder { color: #5a5a80; text-align: center; padding: 24px 0; line-height: 1.6; }
        .sb-error { color: #ef4444; margin-bottom: 6px; }
        .sb-answer { color: #e2e0f0; line-height: 1.7; }
        .sb-answer strong { color: #a78bfa; }
        .sb-answer code { background: #161626; border: 1px solid rgba(124,58,237,.2); border-radius: 3px; padding: 1px 4px; font-size: 10px; color: #a78bfa; }
        .sb-answer h1, .sb-answer h2, .sb-answer h3 { color: #a78bfa; margin: 10px 0 4px; font-size: 12px; }
        .sb-answer p { margin-bottom: 6px; }
        .sb-answer ul, .sb-answer ol { margin: 4px 0 6px 16px; }
      `}</style>
    </div>
  );
}

function basicMd(md: string) {
  return md
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/```[\w]*\n([\s\S]*?)```/g,"<pre><code>$1</code></pre>")
    .replace(/`([^`]+)`/g,"<code>$1</code>")
    .replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,"<em>$1</em>")
    .replace(/^### (.+)$/gm,"<h3>$1</h3>")
    .replace(/^## (.+)$/gm,"<h2>$1</h2>")
    .replace(/^# (.+)$/gm,"<h1>$1</h1>")
    .replace(/^[-*] (.+)$/gm,"<li>$1</li>")
    .replace(/\n\n/g,"</p><p>")
    .replace(/^(.+)/,"<p>$1</p>");
}
