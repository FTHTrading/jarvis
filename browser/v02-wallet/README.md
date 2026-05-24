# v0.2 Wallet Provider Shim — Integration Guide

## What it does

`provider-shim.js` is a content script that wraps `window.ethereum` with a Unykorn-aware EIP-1193 provider. It:

1. **Passes through** all standard Ethereum calls to the existing wallet (MetaMask, Rabby, Coinbase, etc.)
2. **Intercepts `eth_requestAccounts`** → triggers NIL33 identity resolution via the daemon
3. **Intercepts `eth_sendTransaction`** → routes through an approval gate (Armed → Active flow)
4. **Exposes `window.unykorn`** for UnyKorn-native dApps

## Manifest changes required (v0.2)

Add to `extension/manifest.json`:

```json
"content_scripts": [
  {
    "matches": ["<all_urls>"],
    "js": ["v02-wallet/provider-shim.js"],
    "run_at": "document_start",
    "world": "MAIN"
  },
  {
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }
]
```

> **`"world": "MAIN"`** is required — the shim must run in the page's main world to intercept `window.ethereum` before dApp scripts execute.

## Daemon endpoint: `_nil33_resolve`

The shim calls `POST /agent` with `mode: "_nil33_resolve"` when a wallet connects. Add this route to `daemon/routes/agent.js`:

```js
if (mode === "_nil33_resolve") {
  const { walletAddress, chain } = req.body;
  const identity = await resolveIdentity(walletAddress, resolveChainName(chain, false));
  return res.json({ ok: true, identity, mode });
}
```

## `window.unykorn` API

dApps built for the UnyKorn ecosystem can use:

```js
// Get resolved NIL33 identity for connected wallet
const identity = window.unykorn.getIdentity();
// { found, entityId, entityName, entityType, nilProfile, troptions }

// Ask the browser agent a question
const answer = await window.unykorn.askAgent("Summarize this contract's risk");

// Get shim version
window.unykorn.getVersion(); // "0.2.0"

// Listen for identity resolution
window.addEventListener("unykorn:identity", (e) => {
  console.log(e.detail); // NIL33 identity object
});
```

## Approval gate (v0.2.1 roadmap)

The current shim passes transactions through with a console warning. In v0.2.1:

1. Transaction payload sent to sidebar via `chrome.runtime.sendMessage`
2. Sidebar enters **Armed** state — shows transaction diff / risk analysis
3. Operator clicks **Approve** or **Reject**
4. Sidebar sends `TRANSACTION_APPROVED` / `TRANSACTION_REJECTED` back
5. Shim resolves/rejects the original `eth_sendTransaction` promise
