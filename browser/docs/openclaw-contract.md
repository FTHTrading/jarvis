# Daemon ↔ OpenClaw API Contract

Version: 0.1.0  
Gateway: `http://127.0.0.1:18789`  
Daemon: `http://127.0.0.1:40201`

---

## Overview

When `DAEMON_BRAIN=openclaw`, the daemon routes every `/agent` call through the OpenClaw gateway instead of directly to an LLM. The browser agent (`unykorn-browser`) receives the message, runs the appropriate tool, and returns a structured response.

```
Extension
  │  POST { url, title, fullText, selection, mode, … }
  ▼
Daemon :40201
  │  POST /v1/chat  { agent, message, context }
  ▼
OpenClaw :18789  →  unykorn-browser agent
  │  Tool call  (summarize_page / web3_explain / …)
  ▼
Daemon  →  Extension
  { ok, answer, mode }
```

---

## Daemon → OpenClaw request

**Endpoint:** `POST {OPENCLAW_GATEWAY_URL}/v1/chat`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {OPENCLAW_GATEWAY_TOKEN}   # if token set
```

**Body:**
```jsonc
{
  "agent": "unykorn-browser",           // or OPENCLAW_DEFAULT_AGENT
  "message": "[web3_explain]\nURL: https://uniswap.org\nTitle: Uniswap\n\nPage content:\n…",
  "context": {
    "url":       "https://uniswap.org",
    "title":     "Uniswap",
    "contracts": ["0xabc…"],
    "isWeb3":    true
  },
  "stream": false                       // streaming not yet supported by daemon v0.1
}
```

**Message format** (plain text, tool-tagged):
```
[{tool_name}]
URL: {url}
Title: {title}
Selection: {selection}           (optional)
Contracts: {addr1}, {addr2}      (optional)
Prompt: {user_prompt}            (optional)

Page content:
{fullText[:3000]}
```

---

## OpenClaw → daemon response

OpenClaw returns one of these shapes (daemon accepts all):

```jsonc
// Shape A — standard chat response
{ "message": "Uniswap is a decentralized exchange…" }

// Shape B — structured answer
{ "answer": "Uniswap is a decentralized exchange…" }

// Shape C — content array (Anthropic-style)
{ "content": "Uniswap is a decentralized exchange…" }

// Shape D — raw string (fallback)
"Uniswap is a decentralized exchange…"
```

Daemon normalizes to `{ ok: true, answer: string, mode: string }` before forwarding to extension.

---

## Daemon → extension response

```jsonc
// Success
{
  "ok":     true,
  "answer": "Uniswap is a **decentralized exchange** (DEX)…",
  "mode":   "web3_explain"
}

// Error
{
  "ok":    false,
  "error": "OpenClaw 503: gateway not reachable"
}
```

---

## OpenClaw agent registration

To register `unykorn-browser` in your OpenClaw workspace, add to your agent roster config:

```jsonc
{
  "id":          "unykorn-browser",
  "name":        "Unykorn Browser Agent",
  "model":       "ollama/gemma4:latest",
  "systemPrompt": "@file:browser/agent/system-prompt.md",
  "tools":       "@file:browser/agent/tool-registry.json",
  "gateway":     "http://127.0.0.1:18789",
  "description": "Browser page analysis, Web3 intelligence, NIL33 identity binding"
}
```

Or via the `openclaw` CLI:
```bash
openclaw agent add \
  --id unykorn-browser \
  --name "Unykorn Browser Agent" \
  --model ollama/gemma4:latest \
  --system-prompt browser/agent/system-prompt.md \
  --tools browser/agent/tool-registry.json
```

---

## Health check flow

Before routing a call, daemon probes:

```
GET http://127.0.0.1:18789/health
→ 200 OK  { status: "ok" }   — route to OpenClaw
→ timeout / error             — fall back to OPENAI or OLLAMA brain
```

Fallback order: `openclaw → openai → anthropic → ollama`.  
Configure fallback in `.env`:
```dotenv
DAEMON_BRAIN=openclaw
DAEMON_FALLBACK_BRAIN=ollama
```

---

## Token auth

The gateway token lives at `~/.openclaw/openclaw.json`:
```jsonc
{
  "gateway": {
    "url":   "http://127.0.0.1:18789",
    "auth":  { "token": "YOUR_TOKEN_HERE" }
  }
}
```

**Never commit the token.** The daemon reads it from `OPENCLAW_GATEWAY_TOKEN` env var.
