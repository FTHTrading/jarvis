# UnyKorn Sovereign Browser Layer (v1)

Minimal Manifest V3 extension that connects browser context to the local Jarvis/OpenClaw daemon.

## What this MVP includes

- In-page **UnyKorn sidebar** (toggle with toolbar icon or `Ctrl+Space`)
- Context menu action: **Send to UnyKorn Agent**
- Mode-based page analysis: summarize, explain, web3_explain, freeform
- UnyKorn-branded **new tab command surface**
- Local daemon routing via `http://127.0.0.1:8787/agent`

## Start the daemon

From this repo root:

```bash
python -m jarvis.browser_daemon
```

Optional environment overrides:

- `JARVIS_BROWSER_DAEMON_HOST` (default `127.0.0.1`)
- `JARVIS_BROWSER_DAEMON_PORT` (default `8787`)

## Load extension unpacked (Chrome/Edge)

1. Open `chrome://extensions` or `edge://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder: `browser-extension-v1/`

## Local flow

1. Open any page.
2. Click extension icon (or hit `Ctrl+Space`) to open sidebar.
3. Choose mode and run.
4. Extension sends context to daemon; daemon forwards to Jarvis/OpenClaw brain.

## Notes

- This is intentionally **no-build** and lightweight for rapid iteration.
- Wallet injection and transaction simulation are phase-2 additions.
