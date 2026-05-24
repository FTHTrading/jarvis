# UnyKorn Sovereign Browser Layer

This is the fast v1 path for a UnyKorn-branded, agentic browser experience without forking Chromium yet.

```text
Edge / Chrome tab
  └─ browser-extension/ captures URL, title, selection, page text, Web3 hints
       └─ http://127.0.0.1:8765/agent
            └─ jarvis.browser_daemon
                 └─ Jarvis Brain → OpenAI | Ollama | OpenClaw
```

## What v1 does

- Branded popup: "Ask UnyKorn" on any tab.
- Branded new tab: "Command UnyKorn" prompt and quick links.
- Context menu: "Send page to UnyKorn Agent".
- Page context capture: URL, title, selected text, and a capped text snapshot.
- Web3 awareness: detects common wallet, dApp, contract, token, NFT, DeFi, Etherscan, and Solscan hints.
- Passive agent guardrail: reads, summarizes, explains, drafts, and risk-checks only.

## What v1 deliberately does not do

- No wallet injection.
- No transaction signing.
- No form submission.
- No off-site POST actions.
- No NIL33 writes without an approval step.

Those belong behind the Nano Bana Passive → Armed → Active state machine. This scaffold only implements Passive mode.

## Run the local daemon

From the repo root:

```bash
python -m jarvis.browser_daemon
```

Default endpoint:

```text
GET  http://127.0.0.1:8765/health
POST http://127.0.0.1:8765/agent
```

Optional environment variables:

```dotenv
JARVIS_BROWSER_DAEMON_HOST=127.0.0.1
JARVIS_BROWSER_DAEMON_PORT=8765
JARVIS_BROWSER_DAEMON_LOGS=1
```

The daemon uses the existing Jarvis brain settings:

```dotenv
JARVIS_BRAIN=openclaw
OPENCLAW_GATEWAY_URL=http://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=
JARVIS_OPENCLAW_AGENT=main
```

Use `JARVIS_BRAIN=ollama` or `JARVIS_BRAIN=openai` if you want the browser layer to route somewhere else.

## Load the extension

1. Open Edge or Chrome.
2. Go to `edge://extensions` or `chrome://extensions`.
3. Enable Developer Mode.
4. Choose "Load unpacked".
5. Select this repo's `browser-extension/` directory.
6. Start the daemon with `python -m jarvis.browser_daemon`.
7. Open any page and click the UnyKorn extension action.

## Agent request contract

Request:

```json
{
  "mode": "summarize",
  "prompt": "What should I know before acting?",
  "url": "https://example.com",
  "title": "Example",
  "selection": "selected text",
  "text": "page text snapshot",
  "metadata": {
    "capturedAt": "2026-05-24T17:37:00.000Z",
    "web3Detected": false
  }
}
```

Supported `mode` values:

- `summarize`
- `explain`
- `web3_explain`
- `freeform`
- `log_to_nil33`

Response:

```json
{
  "answer": "Plain-English result from Jarvis/OpenClaw.",
  "actions": [],
  "metadata": {
    "mode": "summarize",
    "agentState": "passive",
    "backend": "openclaw",
    "web3Detected": false
  }
}
```

`actions` is intentionally empty in v1. Future Armed/Active work can add proposed actions only after the UI has explicit approval gates.

## Next implementation lanes

1. Replace heuristic Web3 detection with page-world provider detection and known dApp domain registry.
2. Add transaction paste/Etherscan/Solscan parsing tools.
3. Add an approval-gated `actions[]` schema for Armed mode.
4. Bind wallet addresses to NIL33 / Troptions identities.
5. Wrap the extension + daemon into a Tauri or Electron desktop shell when the v1 loop is stable.
