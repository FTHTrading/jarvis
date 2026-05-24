# Unykorn Browser — QUICKSTART

**You are one terminal command away from running this.**

---

## Step 1 — Start the daemon

**Windows (one command):**
```powershell
powershell -ExecutionPolicy Bypass -File browser\scripts\start-daemon.ps1
```

**macOS / Linux:**
```bash
bash browser/scripts/start-daemon.sh
```

Expected output:
```
[daemon] Unykorn daemon v0.1.0 → http://127.0.0.1:40201
[daemon] brain=openclaw  openclaw=http://127.0.0.1:18789
```

**If OpenClaw is offline** the daemon falls back to Ollama (gemma4) automatically.  
If Ollama is also offline, add your key to `browser/daemon/.env`:
```dotenv
DAEMON_BRAIN=openai
OPENAI_API_KEY=sk-...
```

---

## Step 2 — Verify everything is wired

```bash
node browser/scripts/verify.js
```

All six checks should show ✓.

---

## Step 3 — Load the extension

1. Open **`edge://extensions`** (or `chrome://extensions`)
2. Toggle **Developer mode** ON (top-right)
3. Click **Load unpacked**
4. Select the `browser/extension/` folder from this repo

The Unykorn icon appears in your toolbar.

---

## Step 4 — Open any page and press

```
Ctrl + Shift + U
```

The **Unykorn sidebar** opens. Pick **Summarize**, **Explain**, **Web3**, or **Ask**.

On a dApp (Uniswap, Aave, Raydium, etc.) the **Web3 badge auto-appears** bottom-right.

---

## Step 5 — Try it on a dApp

1. Go to [app.uniswap.org](https://app.uniswap.org)
2. The **Web3 badge** appears bottom-right: `EVM · Ask Unykorn`
3. Press `Ctrl+Shift+U` → sidebar opens in **Armed** state
4. Click **Web3** → hit **Send**
5. Get a plain-English risk analysis routed through OpenClaw

---

## That's it.

You now have your own Brave/Comet on top of Edge, wired into your agent mesh.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Daemon won't start | Check Node ≥18: `node --version` |
| "EADDRINUSE :40201" | Another daemon is running: `browser\scripts\start-daemon.ps1 -Stop` |
| Sidebar shows "Daemon offline" | Run `node browser/scripts/verify.js` |
| OpenClaw offline | Set `DAEMON_FALLBACK_BRAIN=ollama` in `browser/daemon/.env` |
| Extension not loading | Make sure you selected `browser/extension/` not `browser/` |
| No API key | Set `DAEMON_BRAIN=openai` + `OPENAI_API_KEY=sk-...` in `.env` |

**Full docs:** [browser/README.md](README.md)  
**System prompt:** [browser/agent/system-prompt.md](agent/system-prompt.md)  
**OpenClaw contract:** [browser/docs/openclaw-contract.md](docs/openclaw-contract.md)
