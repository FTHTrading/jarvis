import React, { useState } from "react";
import type { Tab } from "../../App";

interface Props {
  activeTab:       Tab;
  onNavigate:      (url: string) => void;
  onNewTab:        () => void;
  onToggleSidebar: () => void;
  sidebarOpen:     boolean;
}

export default function BrowserChrome({ activeTab, onNavigate, onNewTab, onToggleSidebar, sidebarOpen }: Props) {
  const [input, setInput] = useState(activeTab.url === "unykorn://newtab" ? "" : activeTab.url);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = input.trim();
    if (!v) return;
    onNavigate(v.startsWith("http") ? v : `https://www.google.com/search?q=${encodeURIComponent(v)}`);
  };

  const stateColor = { passive: "#5a5a80", armed: "#f59e0b", active: "#22c55e" }[activeTab.state];

  return (
    <div className="browser-chrome">
      {/* Traffic-light + nav */}
      <div className="chrome-left">
        <div className="traffic-lights">
          <div className="tl tl-close"  title="Close"/>
          <div className="tl tl-min"    title="Minimize"/>
          <div className="tl tl-max"    title="Maximize"/>
        </div>
        <button className="nav-btn" onClick={() => history.back()}  title="Back">‹</button>
        <button className="nav-btn" onClick={() => history.forward()} title="Forward">›</button>
      </div>

      {/* Address bar */}
      <form className="address-bar" onSubmit={handleSubmit}>
        <div className="state-dot" style={{ background: stateColor }} title={activeTab.state}/>
        <input
          className="address-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={(e) => e.target.select()}
          placeholder="Command Unykorn…"
          spellCheck={false}
        />
      </form>

      {/* Chrome right */}
      <div className="chrome-right">
        <button className="nav-btn" onClick={onNewTab} title="New tab">＋</button>
        <button
          className={`nav-btn agent-btn ${sidebarOpen ? "active" : ""}`}
          onClick={onToggleSidebar}
          title="Toggle Unykorn Agent"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/>
            <circle cx="7" cy="7" r="2.5" fill="currentColor" opacity=".7"/>
          </svg>
        </button>
      </div>

      <style>{`
        .browser-chrome {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 10px;
          background: #0f0f1e;
          border-bottom: 1px solid rgba(124,58,237,.15);
          -webkit-app-region: drag;
          user-select: none;
        }
        .chrome-left, .chrome-right {
          display: flex; align-items: center; gap: 6px;
          -webkit-app-region: no-drag;
        }
        .traffic-lights { display: flex; gap: 5px; margin-right: 4px; }
        .tl { width: 11px; height: 11px; border-radius: 50%; cursor: pointer; transition: opacity .15s; }
        .tl:hover { opacity: .75; }
        .tl-close { background: #ef4444; }
        .tl-min   { background: #f59e0b; }
        .tl-max   { background: #22c55e; }
        .nav-btn {
          background: none; border: none; color: #9090b8;
          font-size: 16px; cursor: pointer; padding: 3px 6px;
          border-radius: 4px; transition: all .15s;
          -webkit-app-region: no-drag;
          display: flex; align-items: center; justify-content: center;
        }
        .nav-btn:hover { background: rgba(124,58,237,.1); color: #a78bfa; }
        .agent-btn.active { color: #7C3AED; }
        .address-bar {
          flex: 1; display: flex; align-items: center; gap: 8px;
          background: #161626; border: 1px solid rgba(124,58,237,.2);
          border-radius: 8px; padding: 5px 12px;
          -webkit-app-region: no-drag;
          transition: border-color .15s;
        }
        .address-bar:focus-within { border-color: #7C3AED; }
        .state-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; transition: background .3s; }
        .address-input {
          flex: 1; background: none; border: none; outline: none;
          color: #e2e0f0; font-size: 13px; font-family: inherit;
        }
        .address-input::placeholder { color: #5a5a80; }
      `}</style>
    </div>
  );
}
