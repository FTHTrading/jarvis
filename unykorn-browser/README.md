# Unykorn Browser — TypeScript Monorepo

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-4c1d95?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![OpenClaw](https://img.shields.io/badge/Mesh-OpenClaw-7C3AED?style=flat-square)](../docs/UNYKORN_INTEGRATION.md)

TypeScript monorepo for the **Unykorn Sovereign Browser Layer** — a Chrome/Edge extension with a React sidebar, wired to a local Express daemon that routes to OpenClaw or any LLM.

> **This is the TypeScript / React version.** The vanilla JS v0.1 lives in [`../browser/`](../browser/).  
> Both share the same daemon port (40201) and OpenClaw gateway (18789). Use whichever fits your build tooling.

---

## Packages

| Package | Description |
|---------|-------------|
| `unykorn-browser-extension` | Chrome/Edge Manifest V3 extension — React sidebar, content script, background SW |
| `unykorn-browser-daemon`    | Node.js Express daemon — TypeScript, multi-brain LLM routing, OpenClaw client |

---

## Quick start

### 1. Start the daemon

```bash
cd unykorn-browser-daemon
cp .env.example .env     # add your keys
npm install
npm run dev              # ts-node-dev with hot reload
# → http://127.0.0.1:40201
```

Or build + run:
```bash
npm run build && npm start
```

### 2. Configure your brain (`unykorn-browser-daemon/.env`)

```dotenv
# Direct LLM
DAEMON_BRAIN=openai
OPENAI_API_KEY=sk-...

# — or — OpenClaw mesh (your local gateway)
DAEMON_BRAIN=openclaw
OPENCLAW_URL=http://127.0.0.1:18789
OPENCLAW_TOKEN=...

# — or — local Ollama
DAEMON_BRAIN=ollama
OLLAMA_MODEL=gemma4:latest
```

### 3. Build and load the extension

```bash
cd unykorn-browser-extension
npm install
npm run build          # outputs to dist/
```

Then in Chrome/Edge:
1. `chrome://extensions` → **Developer mode ON**
2. **Load unpacked** → select `unykorn-browser-extension/dist/`

### 4. Use it

| Action | How |
|--------|-----|
| Toggle sidebar | `Ctrl+Shift+U` (Win/Linux) · `Cmd+Shift+U` (Mac) |
| Context menu | Right-click → "Send to Unykorn" or "Explain this dApp" |
| Toolbar | Click Unykorn icon |
| New Tab | Opens Unykorn dashboard with Command bar |

---

## Daemon API

**POST** `http://127.0.0.1:40201/agent`

```typescript
// Request
{
  url:          string;          // Required
  title:        string;
  selection:    string;
  fullText:     string;          // document.body.innerText
  mode:         "summarize" | "explain" | "web3_explain" | "freeform";
  prompt?:      string;          // Optional freeform question
  hasEthereum?: boolean;         // window.ethereum detected
  hasSolana?:   boolean;         // window.solana detected
  isKnownDapp?: boolean;         // URL matched dApp domain list
  contracts?:   string[];        // 0x… addresses on page
}

// Response
{
  ok:       boolean;
  answer?:  string;             // Markdown text
  actions?: AgentAction[];
  metadata?: Record<string, unknown>;
  error?:   string;
}
```

**GET** `http://127.0.0.1:40201/health`

```json
{
  "ok": true,
  "version": "0.1.0",
  "brain": "openai",
  "openclawOnline": true,
  "ollamaOnline": false,
  "ts": "2026-05-24T..."
}
```

---

## Agent system prompt

The canonical system prompt lives at [`../browser/agent/system-prompt.md`](../browser/agent/system-prompt.md).

Paste it into the Cursor agent "System prompt" field to configure the `unykorn-browser` OpenClaw agent:

> You are the Unykorn Sovereign Browser Agent.  
> You receive page context from a browser extension and a local daemon.  
> Your job is to analyze and explain pages clearly and concisely.  
> Never execute transactions; only analyze and explain.  
> Respond in structured JSON: `{ "answer": "...", "actions": [], "metadata": {} }`

---

## Project layout

```
unykorn-browser/
├── package.json                        Workspaces root
├── unykorn-browser-daemon/
│   ├── src/
│   │   ├── index.ts                    Express server entry
│   │   ├── openclawClient.ts           OpenClaw gateway client
│   │   ├── llmClient.ts               OpenAI / Anthropic / Ollama routing
│   │   └── types.ts                    Shared payload types
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
└── unykorn-browser-extension/
    ├── src/
    │   ├── background.ts               MV3 service worker
    │   ├── contentScript.ts            Page capture + Web3 detection
    │   ├── Sidebar.tsx                 React sidebar (main UI)
    │   ├── sidebar.css                 Sidebar styles
    │   ├── sidebar.html                Sidebar HTML entry
    │   ├── sidebar-main.tsx            React root
    │   ├── popup.html / popup-main.tsx Toolbar popup
    │   ├── newtab.html / newtab-main.tsx New tab override
    │   └── types.ts                    Shared extension types
    ├── manifest.json
    ├── vite.config.ts
    ├── tsconfig.json
    └── package.json
```

---

## OpenClaw agent registration

```bash
openclaw agent add \
  --id unykorn-browser \
  --name "Unykorn Browser Agent" \
  --model ollama/gemma4:latest \
  --system-prompt ../browser/agent/system-prompt.md \
  --tools ../browser/agent/tool-registry.json
```

---

## Related

| Path | Role |
|------|------|
| [`../browser/`](../browser/) | Vanilla JS v0.1 — same daemon port, no build step |
| [`../browser/agent/system-prompt.md`](../browser/agent/system-prompt.md) | Canonical agent system prompt |
| [`../browser/agent/tool-registry.json`](../browser/agent/tool-registry.json) | OpenClaw tool schemas |
| [`../browser/docs/openclaw-contract.md`](../browser/docs/openclaw-contract.md) | Daemon ↔ OpenClaw API contract |
| [`../browser/docs/payload-spec.md`](../browser/docs/payload-spec.md) | Full payload specification |
| [`../docs/UNYKORN_INTEGRATION.md`](../docs/UNYKORN_INTEGRATION.md) | OpenClaw + Nerve stack map |

---

## License

MIT
