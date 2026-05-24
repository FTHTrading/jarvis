// Runs in the page's MAIN world so it can read window.ethereum / window.solana.
// Sends a single snapshot up to the content script via window.postMessage.
// Read-only: never proxies signing requests in v1.

(function () {
  const payload = {
    hasEthereumProvider: !!window.ethereum,
    hasSolanaProvider: !!window.solana,
    chainId: window.ethereum?.chainId || null,
    isMetaMask: !!window.ethereum?.isMetaMask,
    isPhantom: !!(window.solana?.isPhantom || window.phantom?.solana?.isPhantom),
    accounts: [],
  };

  function publish() {
    window.postMessage({ kind: "unykorn:web3", payload }, window.location.origin);
  }

  publish();

  if (window.ethereum?.on) {
    try {
      window.ethereum.on("chainChanged", (id) => {
        payload.chainId = id;
        publish();
      });
      window.ethereum.on("accountsChanged", (accs) => {
        payload.accounts = Array.isArray(accs) ? accs : [];
        publish();
      });
    } catch {
      // Provider may be locked down — that's fine, we already sent v1 payload.
    }
  }
})();
