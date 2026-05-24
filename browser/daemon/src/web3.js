/**
 * Lightweight Web3 awareness helpers.
 *
 * v1 keeps this list-driven and heuristic. It does not RPC any chain.
 * The agent layer (OpenClaw) is responsible for deeper analysis when
 * the user asks for it.
 */

const KNOWN_DAPPS = [
  { match: /(^|\.)uniswap\.org$/i, name: "Uniswap", chain: "ethereum", category: "dex" },
  { match: /(^|\.)app\.uniswap\.org$/i, name: "Uniswap App", chain: "ethereum", category: "dex" },
  { match: /(^|\.)opensea\.io$/i, name: "OpenSea", chain: "multi", category: "nft-marketplace" },
  { match: /(^|\.)blur\.io$/i, name: "Blur", chain: "ethereum", category: "nft-marketplace" },
  { match: /(^|\.)magiceden\.io$/i, name: "Magic Eden", chain: "solana", category: "nft-marketplace" },
  { match: /(^|\.)jup\.ag$/i, name: "Jupiter", chain: "solana", category: "dex-aggregator" },
  { match: /(^|\.)raydium\.io$/i, name: "Raydium", chain: "solana", category: "dex" },
  { match: /(^|\.)aave\.com$/i, name: "Aave", chain: "ethereum", category: "lending" },
  { match: /(^|\.)curve\.fi$/i, name: "Curve", chain: "ethereum", category: "stableswap" },
  { match: /(^|\.)lido\.fi$/i, name: "Lido", chain: "ethereum", category: "staking" },
  { match: /(^|\.)etherscan\.io$/i, name: "Etherscan", chain: "ethereum", category: "explorer" },
  { match: /(^|\.)solscan\.io$/i, name: "Solscan", chain: "solana", category: "explorer" },
  { match: /(^|\.)basescan\.org$/i, name: "Basescan", chain: "base", category: "explorer" },
  { match: /(^|\.)phantom\.app$/i, name: "Phantom", chain: "multi", category: "wallet" },
];

export function detectDapp({ url }) {
  if (!url) return null;
  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    return null;
  }
  for (const entry of KNOWN_DAPPS) {
    if (entry.match.test(host)) {
      const { match: _omit, ...rest } = entry;
      return { ...rest, host };
    }
  }
  return null;
}

const ETHEREUM_ADDRESS_RE = /\b0x[a-fA-F0-9]{40}\b/g;
const TX_HASH_RE = /\b0x[a-fA-F0-9]{64}\b/g;
const SOLANA_ADDRESS_RE = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;

export function extractOnchainArtifacts(text) {
  if (!text) return { evmAddresses: [], txHashes: [], solanaAddresses: [] };
  const evmAddresses = uniq(text.match(ETHEREUM_ADDRESS_RE) ?? []);
  const txHashes = uniq(text.match(TX_HASH_RE) ?? []);
  const evmSet = new Set([...evmAddresses, ...txHashes]);
  const solanaCandidates = uniq(text.match(SOLANA_ADDRESS_RE) ?? []).filter(
    (s) => !evmSet.has(s) && s.length >= 32 && s.length <= 44
  );
  return { evmAddresses, txHashes, solanaAddresses: solanaCandidates.slice(0, 20) };
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

export function isLikelyWeb3Page({ url, hasEthereumProvider, hasSolanaProvider, fullText }) {
  if (hasEthereumProvider || hasSolanaProvider) return true;
  if (detectDapp({ url })) return true;
  if (!fullText) return false;
  const { evmAddresses, txHashes, solanaAddresses } = extractOnchainArtifacts(fullText);
  return evmAddresses.length + txHashes.length + solanaAddresses.length > 0;
}
