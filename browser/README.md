# Unykorn Sovereign Browser

[![Version](https://img.shields.io/badge/version-0.1.0-7C3AED?style=flat-square)](.)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-4c1d95?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/)
[![Node](https://img.shields.io/badge/Node-18+-3776AB?style=flat-square)](https://nodejs.org)
[![OpenClaw](https://img.shields.io/badge/Mesh-OpenClaw-7C3AED?style=flat-square)](../docs/UNYKORN_INTEGRATION.md)

A Chrome/Edge browser extension + local companion daemon that turns your existing browser into the **Unykorn Agent OS layer** — Web3-aware, agentic, wired into the OpenClaw mesh.

> **Jarvis** is the desktop voice companion. **Sovereign Browser** is the navigation + commerce companion. Same gateway (`:18789`), different UX surface.

---

## What it does

| Feature | Detail |
|---------|--------|
| **Agent sidebar** | Open on any page — Summarize, Explain, Web3 analyze, or ask anything |
| **Web3 detection** | Detects EVM wallets, Solana wallets, known dApps; shows chain indicator |
| **Context menu** | Right-click → "Ask Unykorn Agent" or "Explain this dApp/contract" |
| **Branded new tab** | Unykorn dashboard with Command bar, quick links to hail/storm/law/paid |
| **Toolbar popup** | One-click access to sidebar, summarize, Web3 explain |
| **OpenClaw routing** | `DAEMON_BRAIN=openclaw` routes all agent calls through the mesh |
| **Multi-brain** | OpenAI, Anthropic, Ollama (gemma4), or OpenClaw — env-configurable |
| **NIL33 logging** | Auto-logs dApp interactions to your graph when `NIL33_API_URL` is set |

---

## Quick start

### 1. Start the daemon

**Windows (one-click):**
```powershell
powershell -ExecutionPolicy Bypass -File browser\scripts\start-daemon.ps1
```

**macOS / Linux:**
```bash
bash browser/scripts/start-daemon.sh
```

**Manual:**
```bash
cd browser/daemon
cp .env.example .env     # add keys
npm install
npm start
# Daemon → http://127.0.0.1:40201
```

### 2. Load the extension

1. Open **`chrome://extensions`** (or `edge://extensions`)
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the **`browser/extension/`** folder

### 3. Use it

| Action | How |
|--------|-----|
| Toggle sidebar | `Ctrl+Shift+U` (Win/Linux) · `Cmd+Shift+U` (Mac) |
| Open popup | Click the Unykorn icon in the toolbar |
| Context menu | Right-click any page → "Ask Unykorn Agent" |
| New Tab | Any new tab → Unykorn dashboard |

---

## Architecture

```
Chrome/Edge
  │
  ├─ extension/               Manifest V3 extension
  │    ├─ background.js       Service worker — message bus, context menu, side panel
  │    ├─ content.js          Content script — page capture, Web3 detection, badge
  │    ├─ sidebar/            Agent interaction panel (Passive→Armed→Active)
  │    ├─ newtab/             Branded new tab with Command bar + quick links
  │    └─ popup/              Toolbar action popup
  │
  └─ daemon/                  Local Node.js companion (port 40201)
       ├─ server.js           Express server, CORS, logging
       ├─ routes/
       │    ├─ agent.js       POST /agent — main dispatch
       │    └─ health.js      GET /health — liveness + dependency check
       └─ tools/
            ├─ prompts.js     System + user prompt builders per mode
            ├─ llm.js         OpenAI / Anthropic / Ollama routing
            ├─ openclaw.js    OpenClaw mesh gateway client
            └─ graph.js       NIL33 / Troptions event logging
```

---

## Configuration (daemon/.env)

```dotenv
# LLM brain: openai | anthropic | ollama | openclaw
DAEMON_BRAIN=openai

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-haiku-20240307

# Local Ollama (no key needed)
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=gemma4:latest

# OpenClaw mesh (for DAEMON_BRAIN=openclaw)
OPENCLAW_GATEWAY_URL=http://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=                      # from ~/.openclaw/openclaw.json
OPENCLAW_DEFAULT_AGENT=main

# NIL33 graph logging (optional)
NIL33_API_URL=
NIL33_API_KEY=

# Daemon
DAEMON_PORT=40201
```

---

## Agent modes

| Mode | What it does |
|------|-------------|
| **Summarize** | ≤200-word summary of the current page |
| **Explain** | What this site/product does, who it's for, key risks |
| **Web3** | Protocol category, chains, risks, contract analysis |
| **Ask** | Freeform — answer any question with page as context |

---

## State machine

The sidebar follows the **Passive → Armed → Active** model from the Nano Bana spec:

```
Passive   Page not yet read
Armed     Page context captured, ready to act
Active    Response in-flight or displayed
```

---

## Web3 detection

The content script detects:

- `window.ethereum` presence (EVM wallet injected)
- `window.solana` presence (Solana wallet injected)
- Known dApp domains (Uniswap, Aave, OpenSea, Raydium, Drift, jup.ag, Phantom, Tensor, UnyKorn surfaces, and 30+ others)
- Contract addresses (`0x...40`) on the page

When detected: Web3 badge appears bottom-right, Web3 mode auto-highlights in sidebar.

---

## Project layout

```
browser/
├── extension/                Chrome/Edge Manifest V3 extension
│   ├── manifest.json
│   ├── background.js         Service worker
│   ├── content.js            Content script + Web3 detection
│   ├── icons/                icon16/48/128 PNG + SVG sources
│   ├── sidebar/              Agent panel UI
│   │   ├── sidebar.html
│   │   ├── sidebar.css       Dark glass aesthetic, UnyKorn palette
│   │   └── sidebar.js        State machine, LLM routing, markdown render
│   ├── newtab/               New tab override
│   │   ├── newtab.html
│   │   ├── newtab.css
│   │   └── newtab.js
│   └── popup/                Toolbar button popup
│       ├── popup.html
│       └── popup.js
├── daemon/                   Node.js companion daemon (port 40201)
│   ├── server.js
│   ├── .env.example
│   ├── routes/
│   │   ├── agent.js
│   │   └── health.js
│   └── tools/
│       ├── prompts.js
│       ├── llm.js
│       ├── openclaw.js
│       └── graph.js
└── scripts/
    ├── start-daemon.ps1      Windows one-click launcher
    ├── start-daemon.sh       macOS/Linux launcher
    └── gen-icons.js          SVG icon generator
```

---

## Roadmap

### v0.1 (current)
- [x] Extension scaffold — Manifest V3, sidebar, new tab, popup, content script
- [x] Web3 detection — EVM/SOL wallet, known dApp domains, contract address scan
- [x] Local daemon — Express, CORS, OpenAI/Anthropic/Ollama/OpenClaw routing
- [x] Passive/Armed/Active state machine
- [x] NIL33 graph event logging
- [x] Windows + macOS/Linux launcher scripts

### v0.2
- [ ] Streaming responses (SSE from daemon)
- [ ] wallet `window.ethereum` provider shim → Unykorn identity binding
- [ ] Transaction simulation (`eth_call`) with plain-English explanation
- [ ] Approval gate UI (Armed → confirm before Active)

### v0.3
- [ ] Tauri/Electron wrapper → standalone "Unykorn Browser" binary
- [ ] 3D tab carousel (Nano Bana spec)
- [ ] NIL33 athlete/entity profile overlay on known NIL pages

---

## Related

| Resource | Role |
|----------|------|
| [docs/UNYKORN_INTEGRATION.md](../docs/UNYKORN_INTEGRATION.md) | OpenClaw + Nerve integration map |
| [docs/FTH_SYSTEM_CONTEXT.md](../docs/FTH_SYSTEM_CONTEXT.md) | Full operator stack reference |
| [Jarvis voice assistant](../README.md) | Desktop voice companion — same gateway |
| [hail.unykorn.org](https://hail.unykorn.org) | Command / voice HUD |
| [storm.unykorn.org](https://storm.unykorn.org) | Ops telemetry |
| [law.unykorn.org](https://law.unykorn.org) | x402 + compliance UI |

---

## License

MIT
