import React from "react";
import { createRoot } from "react-dom/client";

const DAEMON_URL = "http://127.0.0.1:40201";

function Popup() {
  const [status, setStatus] = React.useState<"checking" | "online" | "offline">("checking");
  const [version, setVersion] = React.useState("");

  React.useEffect(() => {
    fetch(`${DAEMON_URL}/health`, { signal: AbortSignal.timeout(2500) })
      .then((r) => r.json())
      .then((d) => { setStatus("online"); setVersion(d.version ?? "0.1"); })
      .catch(() => setStatus("offline"));
  }, []);

  const openSidebar = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      try { await chrome.sidePanel.open({ tabId: tab.id }); } catch { /* ignore */ }
    }
    window.close();
  };

  const send = async (mode: string) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) chrome.runtime.sendMessage({ type: "AGENT_REQUEST", payload: { url: tab.url, title: tab.title, mode, selection: "" } });
    try { const [t] = await chrome.tabs.query({ active: true, currentWindow: true }); if (t?.id) await chrome.sidePanel.open({ tabId: t.id }); } catch { /* ignore */ }
    window.close();
  };

  return (
    <div style={{ padding: "14px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, borderBottom: "1px solid rgba(124,58,237,.2)", paddingBottom: 10 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="11" stroke="#7C3AED" strokeWidth="1.5"/>
          <circle cx="12" cy="12" r="5" fill="#7C3AED" opacity=".7"/>
          <circle cx="12" cy="12" r="2" fill="#fff"/>
        </svg>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, background: "linear-gradient(90deg,#a78bfa,#7C3AED)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Unykorn</div>
          <div style={{ fontSize: 10, color: "#5a5a80" }}>Sovereign Agent OS</div>
        </div>
      </div>
      {[
        { label: "Open Sidebar",          icon: "⬚", action: openSidebar },
        { label: "Summarize This Page",   icon: "≡", action: () => send("summarize") },
        { label: "Explain This Site",     icon: "ℹ", action: () => send("explain") },
        { label: "Explain dApp/Contract", icon: "◈", action: () => send("web3_explain") },
      ].map(({ label, icon, action }) => (
        <button key={label} onClick={action} style={{
          display: "flex", alignItems: "center", gap: 9, width: "100%",
          background: "none", border: "none", color: "#9090b8", fontSize: 12,
          padding: "9px 4px", cursor: "pointer", borderRadius: 5, fontFamily: "inherit",
          transition: "all .15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "#a78bfa"; e.currentTarget.style.background = "rgba(124,58,237,.08)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "#9090b8"; e.currentTarget.style.background = "none"; }}
        >
          <span style={{ fontSize: 14, opacity: .7 }}>{icon}</span> {label}
        </button>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(124,58,237,.15)", fontSize: 10, color: "#5a5a80" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: status === "online" ? "#22c55e" : status === "offline" ? "#ef4444" : "#5a5a80", display: "inline-block" }} />
        {status === "online" ? `Daemon v${version} · online` : status === "offline" ? "Daemon offline" : "Checking…"}
      </div>
    </div>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<Popup />);
