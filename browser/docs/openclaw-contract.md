# OpenClaw ↔ Browser Daemon Contract

The Unykorn browser daemon expects OpenClaw to expose a single JSON
endpoint. This is intentionally minimal — the goal is to make the
browser portable across mesh upgrades.

## Endpoint

```
POST {OPENCLAW_GATEWAY_URL}/v1/agent/invoke
content-type: application/json
x-unykorn-source: browser-daemon
```

## Request body

```jsonc
{
  "tool": "browser.summarize_page",
  "input": {
    "mode": "summarize",
    "prompt": "",
    "url": "https://example.com",
    "title": "Example",
    "selection": "",
    "fullText": "…",
    "hasEthereumProvider": false,
    "hasSolanaProvider": false
  },
  "context": {
    "url": "https://example.com",
    "title": "Example",
    "selection": "",
    "pageText": "…(truncated)…",
    "dapp": null,
    "onchain": {
      "evmAddresses": ["0x…"],
      "txHashes": [],
      "solanaAddresses": []
    },
    "isWeb3": false
  },
  "source": "unykorn-browser-daemon"
}
```

## Response body

Any JSON shape works. The daemon looks for, in order:

1. `answer`
2. `output`
3. `text`

If none are present, the daemon stringifies the whole response.

```jsonc
{ "answer": "Bottom line: this page is …" }
```

## Tool names used by the browser

| Tool                       | When called                              |
|---------------------------|-------------------------------------------|
| `browser.summarize_page`  | Sidebar or context menu "Summarize"       |
| `browser.analyze_site`    | Sidebar or context menu "Explain site"    |
| `browser.web3_explain`    | Web3 mode (dApp / contract / tx)          |
| `browser.log_to_graph`    | NIL33 / Troptions / Digital Giant logging |
| `browser.freeform`        | Freeform prompt from sidebar / new tab    |

Implement these as OpenClaw tools and the browser is wired into the
full mesh. Each tool receives the same `{ input, context }` payload.

## Failure handling

- HTTP 4xx/5xx → daemon falls back to OpenAI (if configured) or returns
  a structured error to the extension.
- 30 second timeout per call (override with `OPENCLAW_TIMEOUT_MS`).
- The extension surfaces a yellow daemon dot when OpenClaw is
  unreachable but the daemon itself is alive.

## Health probe

The daemon periodically calls `GET {OPENCLAW_GATEWAY_URL}/health` for
the status indicator. Return any 2xx/3xx/4xx response — the daemon
treats anything <500 as "reachable".
