# Unykorn Sovereign Browser (MVP)

A sovereign, agent-augmented Web3 browser layer that rides on top of any
Chromium-based browser (Chrome / Edge / Brave / Arc) and bridges into the
**OpenClaw / Unykorn agent mesh** — the same gateway that powers
[Jarvis](../README.md).

This is the v1 you can have running locally today: a **Manifest V3
extension** + a **local Node daemon**. The Tauri/Electron desktop wrap
comes later, after the agent loop is solid.

---

## Architecture

```
                ┌────────────────────────────────────────┐
                │   Chrome / Edge / Brave (host browser) │
                │                                        │
                │   ┌──────────────────────────────┐     │
                │   │ Unykorn extension (MV3)      │     │
                │   │  • side panel / popup        │     │
                │   │  • new tab override          │     │
                │   │  • content + inject scripts  │     │
                │   │  • context menu              │     │
                │   └──────────────┬───────────────┘     │
                └──────────────────┼─────────────────────┘
                                   │ POST /agent
                                   ▼
              ┌───────────────────────────────────────┐
              │ unykorn-browser-daemon (this repo)    │
              │  http://127.0.0.1:18790               │
              │  • routes to OpenClaw                 │
              │  • web3 detection (dApp, addresses)   │
              │  • fallback brain (OpenAI)            │
              └──────────────┬────────────────────────┘
                             │ POST /v1/agent/invoke
                             ▼
              ┌───────────────────────────────────────┐
              │ OpenClaw gateway (already running for │
              │ Jarvis at 127.0.0.1:18789)            │
              │  • DONK + 10-agent roster, x402, etc. │
              └───────────────────────────────────────┘
```

The extension never talks to OpenClaw directly — the daemon is the only
trust boundary, which keeps tokens, RPCs, and tool registries off the
browser surface.

---

## Quick start

### 1. Daemon

```bash
cd browser/daemon
cp .env.example .env       # tweak ports / token if needed
npm install
npm start
```

The daemon listens on `http://127.0.0.1:18790` by default. It expects
OpenClaw to be reachable at `http://127.0.0.1:18789` (override with
`OPENCLAW_GATEWAY_URL`). If OpenClaw is offline, the daemon transparently
falls back to OpenAI when `OPENAI_API_KEY` is set.

Health check:

```bash
curl http://127.0.0.1:18790/health
```

### 2. Extension

1. Open `chrome://extensions` (or `edge://extensions`).
2. Toggle **Developer mode** on.
3. Click **Load unpacked** → select `browser/extension/`.
4. Pin the Unykorn icon to the toolbar.
5. (Optional) `chrome://extensions/shortcuts` → set `Ctrl+Space` to open
   the agent sidebar.

The new-tab page becomes the Unykorn command surface, the context menu
gains four Unykorn entries, and the side panel hosts the agent.

### 3. Settings

Open the extension's options page (toolbar icon → "Settings"). Configure:

- **Daemon URL** — defaults to `http://127.0.0.1:18790`
- **Daemon token** — only required if you set `UNYKORN_DAEMON_TOKEN` in
  the daemon's `.env`

Click **Test connection** to verify the OpenClaw bridge.

---

## Daemon API

| Method | Path            | Purpose                                              |
|--------|-----------------|------------------------------------------------------|
| GET    | `/health`       | Daemon + OpenClaw reachability                       |
| POST   | `/agent`        | Run an agent task (sidebar / context menu / new tab) |
| POST   | `/web3/detect`  | Lightweight Web3 awareness (dApp, addresses, hashes) |

### `POST /agent`

```jsonc
// Request
{
  "mode": "summarize",        // summarize | explain | web3_explain | freeform | log
  "prompt": "(optional)",
  "url": "https://app.uniswap.org/swap",
  "title": "Uniswap",
  "selection": "",
  "fullText": "(page innerText, truncated client-side to ~50KB)",
  "hasEthereumProvider": true,
  "hasSolanaProvider": false
}
```

```jsonc
// Response
{
  "ok": true,
  "via": "openclaw",          // openclaw | openai-fallback | none
  "mode": "summarize",
  "context": { "...": "..." },
  "answer": "…"
}
```

### Mode → tool mapping (sent to OpenClaw)

| Browser mode    | OpenClaw tool name        |
|-----------------|---------------------------|
| `summarize`     | `browser.summarize_page`  |
| `explain`       | `browser.analyze_site`    |
| `web3_explain`  | `browser.web3_explain`    |
| `log`           | `browser.log_to_graph`    |
| `freeform`      | `browser.freeform`        |

These match the Unykorn agent tool registry — register matching handlers
in OpenClaw and the browser is wired straight into the mesh.

---

## Web3 awareness (v1)

The content script + `inject.js` capture, **read-only**:

- `window.ethereum` / `window.solana` presence
- Current `chainId`
- Provider hints (MetaMask, Phantom, etc.)

The daemon adds list-driven dApp detection (Uniswap, OpenSea, Magic Eden,
Etherscan, etc.) plus regex extraction for EVM addresses, tx hashes, and
Solana base58 addresses. **No signing flows are proxied in v1** — the
agent layer can recommend, but the user signs in their own wallet
extension.

---

## Roadmap

- **v0.2** — wallet provider shim (`window.ethereum` proxy), eth_call
  simulation tool, NIL33 identity binding via `NIL33_API_URL`.
- **v0.3** — Tauri desktop wrap → standalone "Unykorn Browser" binary
  with custom chrome (matches the Nano Bana 3D shell spec).
- **v0.4** — Passive → Armed → Active state machine for transaction
  approval, integrated with the agent answer panel.
- **v0.5** — Privacy posture (tracker blocking via EasyPrivacy lists,
  default settings doc).

---

## Related repos / surfaces

- `jarvis` (this repo) — local sovereign voice agent, same OpenClaw bridge
- `FTHTrading/browser` — sibling repo for the broader Sovereign Browser
- `hail.unykorn.org`, `storm.unykorn.org`, `law.unykorn.org` — command
  surfaces

License: MIT.
