# v0.3 Unykorn Desktop Shell — Tauri Architecture

## Overview

In v0.3 the extension + daemon evolve into a **standalone desktop application** using [Tauri](https://tauri.app) — a Rust + WebView framework that ships a ~10 MB binary instead of Electron's ~150 MB.

The result: `UnykornBrowser.exe` / `UnykornBrowser.app` — your own browser binary, shipped under the Unykorn / Digital Giant brand.

---

## Why Tauri over Electron

| | Tauri | Electron |
|--|-------|---------|
| Bundle size | ~10 MB | ~150 MB |
| Memory | ~50 MB idle | ~200 MB idle |
| Rendering | OS WebView (Edge/WebKit) | Chromium embedded |
| Rust backend | ✅ native | ❌ |
| Auto-update | ✅ built-in | Manual |
| Code signing | ✅ native | Manual |
| Multi-window | ✅ | ✅ |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Tauri App Window  (OS WebView — Edge on Win, WebKit on Mac)  │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  WebView  (renders React/Svelte front-end)           │     │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │     │
│  │  │  Browser    │  │  Agent       │  │  New Tab   │  │     │
│  │  │  Chrome UI  │  │  Sidebar     │  │  Dashboard │  │     │
│  │  │  (Nano Bana)│  │  (v0.1 port) │  │            │  │     │
│  │  └─────────────┘  └──────────────┘  └────────────┘  │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  Tauri Rust Core                                     │     │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │     │
│  │  │  Tab Manager│  │  Daemon      │  │  Wallet    │  │     │
│  │  │  (multi-tab)│  │  (embedded)  │  │  Keystore  │  │     │
│  │  └─────────────┘  └──────────────┘  └────────────┘  │     │
│  └─────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
         │                    │                   │
    OpenClaw :18789      Ollama :11434       NIL33 API
```

---

## Scaffold commands

```bash
# Prerequisites
cargo install tauri-cli    # Rust must be installed
npm install -g @tauri-apps/cli

# Scaffold
npm create tauri-app@latest unykorn-desktop -- \
  --template react-ts \
  --manager npm

cd unykorn-desktop
npm install
```

---

## Directory layout (v0.3 target)

```
browser/v03-shell/
├── src/                    React/TS front-end
│   ├── App.tsx             Main layout: chrome + webview + sidebar
│   ├── components/
│   │   ├── BrowserChrome/  Tab bar, address bar, nav buttons
│   │   ├── Sidebar/        Port of extension/sidebar (React)
│   │   ├── NewTab/         Port of extension/newtab (React)
│   │   ├── TabCarousel/    Nano Bana 3D tab carousel
│   │   └── Web3Badge/      EVM/SOL indicator
│   └── hooks/
│       ├── useAgent.ts     Calls Tauri commands → daemon
│       └── useWeb3.ts      Reads injected window.ethereum
├── src-tauri/              Rust backend
│   ├── src/
│   │   ├── main.rs         Tauri app entry
│   │   ├── daemon.rs       Embeds Node daemon as sidecar
│   │   ├── tabs.rs         Multi-tab state manager
│   │   ├── wallet.rs       Local keystore (v0.3.1)
│   │   └── commands.rs     Tauri invoke() commands
│   └── tauri.conf.json     App config, bundle, icons
└── package.json
```

---

## Key Tauri commands (Rust → JS bridge)

```rust
// src-tauri/src/commands.rs

#[tauri::command]
async fn call_agent(payload: AgentPayload) -> Result<AgentResponse, String> {
    // Forward to embedded daemon or direct LLM call
    daemon::route(payload).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn open_new_tab(url: String) -> Result<(), String> {
    tabs::open(url).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_web3_status() -> Web3Status {
    Web3Status { has_ethereum: false, has_solana: false, chain: None }
}
```

---

## Nano Bana 3D Tab Carousel (React)

The 3D tab system from the design spec, built with CSS transforms:

```tsx
// Passive → Armed → Active maps to:
// - Tab opacity: 0.4 → 0.7 → 1.0
// - Scale: 0.9 → 0.95 → 1.0
// - Z: -100px → -50px → 0px (3D carousel depth)

const TabCarousel: React.FC = () => {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [active, setActive] = useState(0);

  return (
    <div className="tab-carousel" style={{ perspective: "1000px" }}>
      {tabs.map((tab, i) => (
        <div
          key={tab.id}
          className={`tab-card ${i === active ? "active" : ""}`}
          style={{
            transform: `
              rotateY(${(i - active) * 15}deg)
              translateX(${(i - active) * 220}px)
              translateZ(${Math.abs(i - active) * -80}px)
            `,
            opacity: i === active ? 1 : 0.5,
          }}
          onClick={() => setActive(i)}
        >
          <TabCard tab={tab} />
        </div>
      ))}
    </div>
  );
};
```

---

## Embedded daemon (Tauri sidecar)

Instead of a separate `npm start`, Tauri bundles the daemon as a **sidecar binary**:

```json
// src-tauri/tauri.conf.json
{
  "tauri": {
    "bundle": {
      "externalBin": ["../daemon/dist/unykorn-daemon"]
    }
  }
}
```

Build daemon as standalone binary with `pkg` or `esbuild + caxa`:

```bash
cd browser/daemon
npx esbuild server.js --bundle --platform=node --outfile=dist/unykorn-daemon.js
npx caxa --input dist/unykorn-daemon.js --output dist/unykorn-daemon
```

---

## Build + ship

```bash
# Development
npm run tauri dev

# Production build
npm run tauri build
# Output: src-tauri/target/release/bundle/
#   Windows: UnykornBrowser_0.3.0_x64-setup.exe
#   macOS:   UnykornBrowser_0.3.0_x64.dmg
#   Linux:   unykorn-browser_0.3.0_amd64.deb
```

---

## v0.3 milestones

| Milestone | What ships |
|-----------|-----------|
| v0.3.0 | Tauri shell with embedded WebView, sidebar + newtab ported to React, daemon sidecar |
| v0.3.1 | Nano Bana 3D tab carousel, address bar, navigation |
| v0.3.2 | Local keystore (secp256k1), transaction signing without external wallet |
| v0.3.3 | NIL33 identity overlay on dApp pages |
| v0.4.0 | Auto-updater, code signing, Windows/Mac installer |
