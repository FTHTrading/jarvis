export const DAPP_DOMAINS = [
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

export function matchDappDomain(hostname) {
  const host = (hostname || "").toLowerCase();
  return DAPP_DOMAINS.some(
    (domain) => host === domain || host.endsWith(`.${domain}`),
  );
}

export function detectWeb3Signals(locationHref, hasEthereum, hasSolana) {
  let hostname = "";
  try {
    hostname = new URL(locationHref).hostname;
  } catch {
    hostname = "";
  }
  const domainMatch = matchDappDomain(hostname);
  const detected = domainMatch || hasEthereum || hasSolana;
  return {
    detected,
    domainMatch,
    hostname,
    hasEthereum: Boolean(hasEthereum),
    hasSolana: Boolean(hasSolana),
  };
}
