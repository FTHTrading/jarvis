import React, { useState } from "react";
import { createRoot } from "react-dom/client";

const DAEMON_URL = "http://127.0.0.1:40201";

const QUICK_LINKS = [
  { label: "Hail",  sub: "Command HUD",    url: "https://hail.unykorn.org"  },
  { label: "Storm", sub: "Ops Telemetry",  url: "https://storm.unykorn.org" },
  { label: "Law",   sub: "x402 · Comp.",   url: "https://law.unykorn.org"   },
  { label: "Paid",  sub: "x402 Revenue",   url: "https://paid.unykorn.org"  },
  { label: "Apex",  sub: "unykorn.ai",     url: "https://unykorn.ai"        },
  { label: "x402",  sub: "Facilitator",    url: "https://x402.unykorn.org"  },
];

function NewTab() {
  const [q,       setQ]       = useState("");
  const [result,  setResult]  = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = q.trim();
    if (!text) return;
    setLoading(true);
    setResult("");
    try {
      const res  = await fetch(`${DAEMON_URL}/agent`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ url: location.href, title: "New Tab", fullText: "", selection: "", mode: "freeform", prompt: text }),
      });
      const data = await res.json();
      setResult(data.answer ?? data.error ?? "No response.");
    } catch (err) {
      setResult(`Error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#08080f", color: "#e2e0f0", fontFamily: "system-ui,sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32, padding: 40 }}>
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
          <circle cx="26" cy="26" r="24" stroke="url(#ng)" strokeWidth="2"/>
          <circle cx="26" cy="26" r="11" fill="#7C3AED" opacity=".7"/>
          <circle cx="26" cy="26" r="4.5" fill="#fff"/>
          <defs>
            <linearGradient id="ng" x1="0" y1="0" x2="52" y2="52">
              <stop offset="0%" stopColor="#a78bfa"/>
              <stop offset="100%" stopColor="#7C3AED"/>
            </linearGradient>
          </defs>
        </svg>
        <div>
          <div style={{ fontSize: 38, fontWeight: 800, background: "linear-gradient(90deg,#c4b5fd,#7C3AED)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1 }}>Unykorn</div>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: ".12em", textTransform: "uppercase", color: "#4a4a70", marginTop: 3 }}>Sovereign Agent OS</div>
        </div>
      </div>

      {/* Command bar */}
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 600 }}>
        <div style={{ display: "flex", alignItems: "center", background: "#161626", border: "1px solid rgba(124,58,237,.3)", borderRadius: 14, padding: "6px 6px 6px 18px", gap: 8, boxShadow: "0 0 40px rgba(124,58,237,.1)" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Command Unykorn…"
            autoFocus
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#e2e0f0", fontSize: 16, fontFamily: "inherit" }}
          />
          <button type="submit" style={{ width: 40, height: 40, background: "#7C3AED", border: "none", borderRadius: 10, color: "#fff", fontSize: 16, cursor: "pointer" }}>
            {loading ? "…" : "▶"}
          </button>
        </div>
      </form>

      {/* Quick links */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10, maxWidth: 640, width: "100%" }}>
        {QUICK_LINKS.map((l) => (
          <a key={l.url} href={l.url} target="_blank" rel="noreferrer" style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            padding: "14px 8px", background: "#0f0f1e", border: "1px solid rgba(124,58,237,.15)",
            borderRadius: 12, textDecoration: "none", color: "#9090b8", transition: "all .15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#7C3AED"; e.currentTarget.style.color = "#a78bfa"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,.15)"; e.currentTarget.style.color = "#9090b8"; }}
          >
            <span style={{ fontWeight: 600, fontSize: 12 }}>{l.label}</span>
            <span style={{ fontSize: 10, color: "#4a4a70", textAlign: "center" }}>{l.sub}</span>
          </a>
        ))}
      </div>

      {/* Inline result */}
      {result && (
        <div style={{ maxWidth: 600, width: "100%", background: "rgba(15,15,30,.97)", border: "1px solid rgba(124,58,237,.3)", borderRadius: 12, padding: "16px 20px", fontSize: 13, lineHeight: 1.7, color: "#e2e0f0", backdropFilter: "blur(12px)" }}>
          {result}
        </div>
      )}
    </div>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<NewTab />);
