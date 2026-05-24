const DAPP_DOMAINS = [
  "uniswap.org",
  "app.uniswap.org",
  "opensea.io",
  "etherscan.io",
  "solscan.io",
  "jup.ag",
  "raydium.io",
  "aave.com",
  "curve.fi",
  "pancakeswap.finance",
  "metamask.io",
  "phantom.app",
  "troptions.com",
  "unykorn.org",
  "unykorn.ai",
];

function matchDappDomain(hostname) {
  const host = (hostname || "").toLowerCase();
  return DAPP_DOMAINS.some(
    (domain) => host === domain || host.endsWith(`.${domain}`),
  );
}

const hasEthereum = typeof window.ethereum !== "undefined";
const hasSolana =
  typeof window.solana !== "undefined" || typeof window.phantom?.solana !== "undefined";

const domainMatch = matchDappDomain(location.hostname);
const web3 = {
  detected: domainMatch || hasEthereum || hasSolana,
  domainMatch,
  hostname: location.hostname,
  hasEthereum,
  hasSolana,
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_PAGE_CONTEXT") {
    const selection = window.getSelection()?.toString?.() || "";
    const pageText = (document.body?.innerText || "").slice(0, 16000);
    sendResponse({
      url: location.href,
      title: document.title,
      selection,
      pageText,
      web3,
    });
    return true;
  }
  return false;
});

if (web3.detected) {
  document.documentElement.dataset.unykornWeb3 = "true";
}
