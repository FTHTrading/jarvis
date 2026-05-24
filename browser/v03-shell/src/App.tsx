import React, { useState, useCallback } from "react";
import { invoke }   from "@tauri-apps/api/core";
import BrowserChrome from "./components/BrowserChrome/BrowserChrome";
import TabCarousel   from "./components/TabCarousel/TabCarousel";
import Sidebar       from "./components/Sidebar/Sidebar";
import "./App.css";

export interface Tab {
  id:      string;
  url:     string;
  title:   string;
  favicon?: string;
  state:   "passive" | "armed" | "active";
}

let nextTabId = 1;
function makeTab(url = "unykorn://newtab"): Tab {
  return { id: String(nextTabId++), url, title: "New Tab", state: "passive" };
}

export default function App() {
  const [tabs,      setTabs]      = useState<Tab[]>([makeTab()]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [sidebarOpen, setSidebar] = useState(false);

  const activeTab = tabs[activeIdx] ?? tabs[0];

  const navigate = useCallback((url: string) => {
    setTabs((prev) =>
      prev.map((t, i) => (i === activeIdx ? { ...t, url, title: url, state: "passive" } : t))
    );
  }, [activeIdx]);

  const newTab = useCallback((url?: string) => {
    const tab = makeTab(url);
    setTabs((prev) => [...prev, tab]);
    setActiveIdx(tabs.length);
  }, [tabs.length]);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      return next.length ? next : [makeTab()];
    });
    setActiveIdx((i) => Math.max(0, i - 1));
  }, []);

  const setTabState = useCallback((id: string, state: Tab["state"]) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, state } : t)));
  }, []);

  return (
    <div className={`app-shell ${sidebarOpen ? "sidebar-open" : ""}`}>
      <BrowserChrome
        activeTab={activeTab}
        onNavigate={navigate}
        onNewTab={() => newTab()}
        onToggleSidebar={() => setSidebar((v) => !v)}
        sidebarOpen={sidebarOpen}
      />

      <div className="content-row">
        <div className="webview-area">
          <TabCarousel
            tabs={tabs}
            activeIdx={activeIdx}
            onSelect={setActiveIdx}
            onClose={closeTab}
          />
          {/* Tauri WebviewWindow renders here in native build */}
          <div className="webview-placeholder">
            {activeTab.url === "unykorn://newtab"
              ? <NewTabView onNavigate={navigate} />
              : <div className="url-display">{activeTab.url}</div>
            }
          </div>
        </div>

        {sidebarOpen && (
          <Sidebar
            tab={activeTab}
            onSetState={(s) => setTabState(activeTab.id, s)}
          />
        )}
      </div>
    </div>
  );
}

function NewTabView({ onNavigate }: { onNavigate: (url: string) => void }) {
  const [q, setQ] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) onNavigate(q.startsWith("http") ? q : `https://www.google.com/search?q=${encodeURIComponent(q)}`);
  };
  return (
    <div className="newtab-view">
      <div className="nt-brand">
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
          <circle cx="26" cy="26" r="24" stroke="url(#g)" strokeWidth="2"/>
          <circle cx="26" cy="26" r="12" fill="#7C3AED" opacity=".7"/>
          <circle cx="26" cy="26" r="5"  fill="#fff"/>
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="52" y2="52">
              <stop offset="0%"   stopColor="#a78bfa"/>
              <stop offset="100%" stopColor="#7C3AED"/>
            </linearGradient>
          </defs>
        </svg>
        <span className="nt-name">Unykorn</span>
      </div>
      <form className="nt-form" onSubmit={submit}>
        <input
          className="nt-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Command Unykorn…"
          autoFocus
        />
      </form>
      <div className="nt-links">
        {[
          { label: "Hail",  url: "https://hail.unykorn.org" },
          { label: "Storm", url: "https://storm.unykorn.org" },
          { label: "Law",   url: "https://law.unykorn.org"  },
          { label: "Paid",  url: "https://paid.unykorn.org" },
          { label: "x402",  url: "https://x402.unykorn.org" },
        ].map((l) => (
          <button key={l.url} className="nt-link" onClick={() => onNavigate(l.url)}>
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
