# Unykorn Sovereign Browser (MVP)

Chromium extension + local daemon that routes page context to **OpenClaw** — your sovereign, agentic browser layer on top of Edge/Chrome.

Jarvis is the **voice** shell; this is the **navigation** shell. Same OpenClaw gateway (`:18789`).

## Architecture

```text
┌─────────────────────┐     POST /agent      ┌──────────────────────┐
│  Browser extension  │ ───────────────────► │  unykorn-daemon      │
│  sidebar · new tab  │ ◄─────────────────── │  localhost:8787      │
└─────────────────────┘                      └──────────┬───────────┘
                                                         │
                                                         ▼
                                              ┌──────────────────────┐
                                              │ OpenClaw CLI → :18789│
                                              │ (fallback: OpenAI)   │
                                              └──────────────────────┘
```

## Quick start

### 1. Start the daemon

```bash
cd unykorn-browser/daemon
cp .env.example .env    # optional — inherits repo root .env too
npm install
npm start
```

Or from repo root:

```bash
bash unykorn-browser/scripts/start-daemon.sh
```

Verify: `curl http://127.0.0.1:8787/health`

### 2. Load the extension (Edge or Chrome)

1. Open `edge://extensions` or `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select `unykorn-browser/extension`
4. Pin **Unykorn Sovereign Browser** to the toolbar

### 3. Use it

| Action | Result |
|--------|--------|
| Click extension icon | Opens agent **side panel** |
| `Ctrl+Shift+U` | Open side panel |
| `Ctrl+Space` | Focus command input |
| Right-click page → **Send to Unykorn Agent** | Summarize page |
| New tab | Unykorn command hub + quick links |

## Agent modes

| Mode | Purpose |
|------|---------|
| `summarize` | Bullet summary of current page |
| `explain` | What the site is and what to verify |
| `web3_explain` | dApp / contract risk-aware explanation |
| `freeform` | Custom prompt with page context |

## Extension ↔ daemon API

**POST** `http://127.0.0.1:8787/agent`

```json
{
  "mode": "summarize",
  "prompt": "optional extra instructions",
  "url": "https://example.com",
  "title": "Example",
  "selection": "highlighted text",
  "pageText": "truncated body text",
  "web3": { "detected": true, "hasEthereum": true }
}
```

**Response**

```json
{
  "ok": true,
  "backend": "openclaw",
  "agent": "main",
  "answer": "…"
}
```

## Configuration

Daemon reads env from `unykorn-browser/daemon/.env` or repo root `.env`:

| Variable | Default | Purpose |
|----------|---------|---------|
| `UNYKORN_DAEMON_PORT` | `8787` | Local HTTP port |
| `OPENCLAW_GATEWAY_URL` | `http://127.0.0.1:18789` | OpenClaw gateway |
| `OPENCLAW_GATEWAY_TOKEN` | _(unset)_ | Gateway auth token |
| `UNYKORN_OPENCLAW_AGENT` | `main` | Default agent |
| `UNYKORN_BRAIN` | `auto` | `openclaw` \| `openai` \| `auto` |
| `OPENAI_API_KEY` | _(unset)_ | Fallback when OpenClaw unavailable |

Requires global OpenClaw CLI for mesh routing: `npm i -g openclaw`

See also: [docs/UNYKORN_INTEGRATION.md](../docs/UNYKORN_INTEGRATION.md)

## v1 scope (shipped in this MVP)

- Manifest V3 extension with side panel, new tab, context menu
- Page context capture (URL, title, selection, body text)
- Web3 detection (known dApp domains + `window.ethereum` / Solana)
- Local daemon with OpenClaw delegation + OpenAI fallback
- Unykorn-branded UI (passive / read-only mode)

## Next phases

- Wallet injection shim (`window.ethereum` proxy)
- NIL33 identity binding on connect
- Tracker blocking lists
- Tauri/Electron standalone browser binary
- Nano Bana 3D tab shell

## Project layout

```text
unykorn-browser/
├── extension/          # Load unpacked in Edge/Chrome
│   ├── manifest.json
│   ├── background/
│   ├── content/
│   ├── sidepanel/
│   ├── newtab/
│   └── shared/
├── daemon/             # Node local companion
│   └── src/
└── scripts/
    └── start-daemon.sh
```
