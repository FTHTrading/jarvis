/**
 * Unykorn Wallet Provider Shim — v0.2
 *
 * Inject as a content script (runs at document_start) to wrap / replace
 * window.ethereum with a Unykorn-aware EIP-1193 provider.
 *
 * Capabilities in v0.2:
 *  - Pass-through to existing MetaMask / Coinbase / Rabby if present
 *  - Intercept eth_requestAccounts → bind to NIL33 identity
 *  - Intercept eth_sendTransaction → route through approval gate
 *  - Expose window.unykorn for UnyKorn-native dApps
 *
 * In v0.3 this shim will talk to a local signing daemon instead of
 * passing through to a third-party wallet.
 */

(function injectUnykornProvider() {
  "use strict";

  // ── Guard: only inject once ───────────────────────────────────────────────
  if (window.__unykornInjected) return;
  window.__unykornInjected = true;

  const DAEMON_URL = "http://127.0.0.1:40201";

  // ── Capture the upstream provider (MetaMask / etc.) ───────────────────────
  const upstream = window.ethereum ?? null;

  // ── Unykorn identity state ─────────────────────────────────────────────────
  let resolvedIdentity = null;

  // ── EIP-1193 Provider ─────────────────────────────────────────────────────
  const UnykornProvider = {
    isUnykorn:      true,
    isMetaMask:     upstream?.isMetaMask ?? false,   // maintain dApp compat
    selectedAddress: upstream?.selectedAddress ?? null,
    chainId:         upstream?.chainId ?? null,
    networkVersion:  upstream?.networkVersion ?? null,

    // ── Core request handler ─────────────────────────────────────────────────
    async request({ method, params = [] }) {
      // Intercept: account connection → bind NIL33
      if (method === "eth_requestAccounts" || method === "eth_accounts") {
        const accounts = await passThrough(method, params);
        if (accounts?.length) {
          UnykornProvider.selectedAddress = accounts[0];
          await bindNil33Identity(accounts[0], UnykornProvider.chainId);
        }
        return accounts;
      }

      // Intercept: transaction sending → approval gate
      if (method === "eth_sendTransaction" || method === "eth_sendRawTransaction") {
        const approved = await requestApproval(method, params);
        if (!approved) throw new Error("Unykorn: transaction rejected by operator approval gate");
        return passThrough(method, params);
      }

      // Intercept: chain change
      if (method === "wallet_switchEthereumChain" || method === "wallet_addEthereumChain") {
        const result = await passThrough(method, params);
        UnykornProvider.chainId = upstream?.chainId ?? null;
        return result;
      }

      // Default pass-through
      return passThrough(method, params);
    },

    // ── EIP-1193 event bus (delegates to upstream) ─────────────────────────
    on(event, handler) {
      upstream?.on?.(event, handler);
      return this;
    },
    removeListener(event, handler) {
      upstream?.removeListener?.(event, handler);
      return this;
    },
    once(event, handler) {
      upstream?.once?.(event, handler);
      return this;
    },

    // ── Legacy send / sendAsync (web3.js 1.x compat) ──────────────────────
    send(method, params) {
      return this.request({ method, params });
    },
    sendAsync(payload, cb) {
      this.request(payload)
        .then((result) => cb(null, { id: payload.id, jsonrpc: "2.0", result }))
        .catch((err)  => cb(err));
    },

    // ── UnyKorn extensions ─────────────────────────────────────────────────
    unykorn: {
      getIdentity()   { return resolvedIdentity; },
      getVersion()    { return "0.2.0"; },
      async askAgent(prompt) {
        return daemonCall({ mode: "freeform", prompt, url: location.href, title: document.title });
      },
    },
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  async function passThrough(method, params) {
    if (!upstream) throw new Error("Unykorn: no upstream wallet provider found");
    return upstream.request({ method, params });
  }

  async function bindNil33Identity(address, chain) {
    try {
      const res = await daemonCall({
        mode:          "_nil33_resolve",
        walletAddress: address,
        chain:         chain ?? "0x1",
        url:           location.href,
        title:         document.title,
      });
      if (res?.identity?.found) {
        resolvedIdentity = res.identity;
        dispatchIdentityEvent(resolvedIdentity);
      }
    } catch (_) { /* non-fatal */ }
  }

  async function requestApproval(method, params) {
    // In v0.2: approval is granted by the operator via the sidebar.
    // The sidebar shows an "Armed" state and waits for explicit confirmation.
    // Until the full approval UI is built, pass-through with a console notice.
    console.warn(
      `[Unykorn] Transaction intercept: ${method}. Approval gate (v0.2) — passing through. ` +
      `Full Armed→Active flow coming in v0.2.1.`
    );
    return true; // TODO: replace with sidebar approval gate in v0.2.1
  }

  async function daemonCall(payload) {
    const res = await fetch(`${DAEMON_URL}/agent`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Daemon ${res.status}`);
    return res.json();
  }

  function dispatchIdentityEvent(identity) {
    window.dispatchEvent(new CustomEvent("unykorn:identity", { detail: identity }));
  }

  // ── Replace window.ethereum ───────────────────────────────────────────────
  try {
    Object.defineProperty(window, "ethereum", {
      value:        UnykornProvider,
      writable:     false,
      configurable: true,
    });
  } catch (_) {
    window.ethereum = UnykornProvider;
  }

  // ── Expose window.unykorn for native apps ─────────────────────────────────
  window.unykorn = UnykornProvider.unykorn;

  console.debug("[Unykorn] Provider shim injected v0.2");
})();
