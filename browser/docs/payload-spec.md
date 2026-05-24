# Extension ↔ Daemon Payload Specification

Version: 0.1.0

---

## Extension → Daemon

**Endpoint:** `POST http://127.0.0.1:40201/agent`  
**Content-Type:** `application/json`

### Full payload schema

```typescript
interface AgentRequest {
  // ── Page identity ───────────────────────────────────────────────────────
  url:       string;          // Required. Full page URL.
  title:     string;          // Page <title>. Empty string if unavailable.

  // ── Page content ────────────────────────────────────────────────────────
  fullText:  string;          // document.body.innerText, first 8000 chars.
  selection: string;          // window.getSelection().toString(). Empty if none.

  // ── Web3 signals ────────────────────────────────────────────────────────
  hasEthereum:  boolean;      // typeof window.ethereum !== 'undefined'
  hasSolana:    boolean;      // typeof window.solana !== 'undefined'
  isKnownDapp:  boolean;      // URL matched KNOWN_DAPPS set in content.js
  contracts:    string[];     // 0x… addresses found in page text. Max 5.
  chain:        string|null;  // window.ethereum?.chainId (hex string) or null

  // ── Agent routing ───────────────────────────────────────────────────────
  mode:   'summarize' | 'explain' | 'web3_explain' | 'freeform';
  prompt: string;             // Operator's typed question. Empty for auto modes.
}
```

### Minimal payload (freeform, no Web3)

```json
{
  "url":      "https://example.com/article",
  "title":    "Some Article",
  "fullText": "Article text here…",
  "selection": "",
  "hasEthereum": false,
  "hasSolana":   false,
  "isKnownDapp": false,
  "contracts":   [],
  "chain":       null,
  "mode":   "freeform",
  "prompt": "What is the main argument of this article?"
}
```

### Web3 payload (dApp page)

```json
{
  "url":      "https://app.uniswap.org/swap",
  "title":    "Uniswap — Swap",
  "fullText": "Swap tokens. Connect wallet…",
  "selection": "",
  "hasEthereum": true,
  "hasSolana":   false,
  "isKnownDapp": true,
  "contracts":   ["0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"],
  "chain":       "0x1",
  "mode":   "web3_explain",
  "prompt": ""
}
```

### Auto-summarize (no user prompt)

```json
{
  "url":         "https://techcrunch.com/2026/05/24/...",
  "title":       "Article Title",
  "fullText":    "Full article text…",
  "selection":   "",
  "hasEthereum": false,
  "hasSolana":   false,
  "isKnownDapp": false,
  "contracts":   [],
  "chain":       null,
  "mode":        "summarize",
  "prompt":      ""
}
```

---

## Daemon → Extension response

```typescript
interface AgentResponse {
  ok:     boolean;
  answer: string;      // Markdown string. Render with sidebar's renderMarkdown().
  mode:   string;      // Echoes request mode.

  // Error case (ok: false)
  error?: string;
}
```

### Success

```json
{
  "ok":     true,
  "answer": "**Uniswap** is a decentralized exchange (DEX) running on Ethereum…",
  "mode":   "web3_explain"
}
```

### Error

```json
{
  "ok":    false,
  "error": "OpenAI 429: rate limit exceeded"
}
```

---

## Health endpoint

**Request:** `GET http://127.0.0.1:40201/health`

**Response:**
```json
{
  "ok":             true,
  "version":        "0.1.0",
  "brain":          "openclaw",
  "openclawOnline": true,
  "ollamaOnline":   false,
  "ts":             "2026-05-24T17:00:00.000Z"
}
```

---

## Background worker messages (extension-internal)

Messages between extension components (content.js / sidebar / popup / background.js):

| `type` | Direction | Payload | Response |
|--------|-----------|---------|----------|
| `CAPTURE_CONTEXT` | sidebar → content | — | `AgentRequest` fields |
| `GET_PAGE_CONTEXT` | sidebar/newtab → background | — | `AgentRequest` fields |
| `GET_WEB3_STATUS` | sidebar → content | — | `{ isKnownDapp, hasEthereum, hasSolana, chain }` |
| `AGENT_REQUEST` | background → sidebar | `{ payload: AgentRequest }` | — |
| `OPEN_SIDEBAR` | content badge → background | — | opens side panel |
| `DAEMON_HEALTH` | any → background | — | `{ ok, data }` |

---

## Size limits

| Field | Max |
|-------|-----|
| `fullText` | 8,000 chars (content.js truncates) |
| `selection` | 1,000 chars (prompts.js truncates) |
| `contracts` | 5 addresses (content.js deduplicates + slices) |
| Total JSON body | 512 KB (Express limit in server.js) |
| Prompt response | 1,024 tokens (LLM `max_tokens`) |

---

## Versioning

Bump `version` in `browser/daemon/package.json` and `browser/extension/manifest.json` together. The `/health` endpoint returns `version` so the extension can warn on mismatch (planned for v0.2).
