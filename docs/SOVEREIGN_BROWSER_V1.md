# Sovereign Browser v1 (Extension + Daemon)

This repo now includes a shippable v1 path for a UnyKorn-branded browser layer without forking Chromium:

- `browser-extension-v1/` (Manifest V3)
- `jarvis/browser_daemon.py` (local API gateway into Jarvis/OpenClaw)

## Architecture

```text
Browser Tab (DOM + Selection)
   │
   │ content-script.js
   ▼
UnyKorn Sidebar / New Tab UI
   │
   │ chrome.runtime.sendMessage
   ▼
service-worker.js
   │
   │ POST /agent (localhost)
   ▼
jarvis.browser_daemon
   │
   │ Brain.reply(...) with safe tool subset
   ▼
Jarvis brain backend (OpenAI | Ollama | OpenClaw)
```

## API Contract (`POST /agent`)

Request payload:

```json
{
  "sessionId": "optional-session-id",
  "mode": "summarize | explain | web3_explain | freeform",
  "prompt": "optional operator text",
  "context": {
    "url": "https://...",
    "title": "...",
    "selection": "...",
    "pageText": "...",
    "dappSignals": {
      "knownDappDomain": true,
      "hasEthereumProvider": true,
      "hasSolanaProvider": false
    }
  }
}
```

Response payload:

```json
{
  "ok": true,
  "sessionId": "session-id",
  "answer": "model output",
  "metadata": {
    "mode": "summarize",
    "backend": "openclaw"
  }
}
```

## Safety Defaults

The daemon constrains model tool access to analysis-safe tools:

- `get_time`
- `web_search`
- `system_health`
- `delegate_to_openclaw`

This blocks direct desktop mutation tools from browser-driven prompts in v1.

## Runbook

1. Configure `.env` for your preferred brain backend.
2. Start daemon:

   ```bash
   python -m jarvis.browser_daemon
   ```

3. Load `browser-extension-v1/` as unpacked extension.
4. Use sidebar/new-tab command surface to drive context-aware agent analysis.

## Phase 2 Suggestions

- Wallet provider shim (`window.ethereum`) with approval gates
- Tx simulation endpoint (`/simulate`) with risk scoring
- Signed command logging to NIL33 / Troptions graph endpoints
- Desktop wrapper (Tauri/Electron) for fully branded browser binary
