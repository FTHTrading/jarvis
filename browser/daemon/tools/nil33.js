/**
 * NIL33 identity binding — resolves wallet addresses to NIL33 entities
 * (athletes, operators, institutions) and logs browser agent interactions.
 *
 * Configure:
 *   NIL33_API_URL=https://api.nil33.com    (or your self-hosted endpoint)
 *   NIL33_API_KEY=...
 */
"use strict";

const API_URL  = () => process.env.NIL33_API_URL ?? "";
const API_KEY  = () => process.env.NIL33_API_KEY  ?? "";
const TIMEOUT  = 5000;

// ── In-process cache (process lifetime) ───────────────────────────────────────
const identityCache = new Map();
const CACHE_TTL_MS  = 5 * 60 * 1000; // 5 min

function cacheGet(key) {
  const entry = identityCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { identityCache.delete(key); return null; }
  return entry.value;
}
function cacheSet(key, value) {
  identityCache.set(key, { value, ts: Date.now() });
}

// ── Base fetch helper ─────────────────────────────────────────────────────────
async function nil33Fetch(path, options = {}) {
  const base = API_URL();
  if (!base) throw new Error("NIL33_API_URL not configured");

  const headers = { "Content-Type": "application/json" };
  if (API_KEY()) headers["Authorization"] = `Bearer ${API_KEY()}`;

  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers ?? {}) },
    signal:  AbortSignal.timeout(TIMEOUT),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`NIL33 ${res.status} ${path}: ${txt}`);
  }
  return res.json();
}

// ── Identity resolution ───────────────────────────────────────────────────────

/**
 * Resolve a wallet address to a NIL33 entity profile.
 *
 * @param {string} walletAddress  - EVM (0x…) or Solana (base58) address
 * @param {string} chain          - "ethereum" | "solana" | "polygon" | "base"
 * @returns {NIL33Identity}
 */
export async function resolveIdentity(walletAddress, chain = "ethereum") {
  if (!walletAddress) return notFound();

  const cacheKey = `identity:${chain}:${walletAddress.toLowerCase()}`;
  const cached   = cacheGet(cacheKey);
  if (cached) return cached;

  if (!API_URL()) return notFound(); // NIL33 not configured

  try {
    const data = await nil33Fetch(
      `/v1/identity/resolve?address=${encodeURIComponent(walletAddress)}&chain=${chain}`
    );
    const identity = normalizeIdentity(data, walletAddress);
    cacheSet(cacheKey, identity);
    return identity;
  } catch (err) {
    console.warn(`[nil33] resolveIdentity failed: ${err.message}`);
    return notFound();
  }
}

function normalizeIdentity(data, walletAddress) {
  return {
    found:       true,
    walletAddress,
    entityId:    data.id          ?? data.entity_id    ?? null,
    entityName:  data.name        ?? data.display_name ?? null,
    entityType:  data.type        ?? data.entity_type  ?? "unknown",
    nilProfile:  data.nil_profile ?? data.profile       ?? null,
    troptions:   data.troptions   ?? null,
    verifiedAt:  data.verified_at ?? null,
  };
}

function notFound() {
  return { found: false, walletAddress: null, entityId: null, entityName: null, entityType: "unknown", nilProfile: null };
}

// ── Event logging ──────────────────────────────────────────────────────────────

/**
 * Log a browser agent interaction to the NIL33 event stream.
 * Fire-and-forget — never throws (errors are swallowed).
 *
 * @param {object} opts
 */
export async function logToGraph(opts) {
  const {
    url,
    title        = "",
    mode         = "freeform",
    answer       = "",
    walletAddress = null,
    entityId      = null,
    contracts    = [],
  } = opts;

  if (!API_URL()) return; // NIL33 not configured — skip

  const payload = {
    event:         "browser_agent_interaction",
    url,
    title,
    mode,
    answerSnippet: answer.slice(0, 200),
    walletAddress,
    entityId,
    contracts:     contracts.slice(0, 5),
    ts:            new Date().toISOString(),
    source:        "unykorn-browser-daemon",
    version:       "0.1.0",
  };

  nil33Fetch("/v1/events", {
    method: "POST",
    body:   JSON.stringify(payload),
  }).catch((err) => {
    console.warn(`[nil33] logToGraph failed: ${err.message}`);
  });
}

// ── NIL33 identity overlay (for sidebar use) ───────────────────────────────────

/**
 * Enrich an agent response with NIL33 identity context.
 * Appends a "Verified NIL profile" block if the wallet resolves.
 *
 * @param {string}  answer        - Agent's text response
 * @param {string}  walletAddress - Connected wallet (from window.ethereum.selectedAddress)
 * @param {string}  chain
 * @returns {string} - Enriched answer
 */
export async function enrichWithIdentity(answer, walletAddress, chain = "ethereum") {
  if (!walletAddress) return answer;

  try {
    const identity = await resolveIdentity(walletAddress, chain);
    if (!identity.found) return answer;

    const block = [
      "",
      "---",
      `**Unykorn Identity:** ${identity.entityName ?? identity.entityId}`,
      `**Type:** ${identity.entityType}`,
      identity.nilProfile?.sport ? `**Sport:** ${identity.nilProfile.sport}` : null,
      identity.troptions          ? `**Troptions:** ${identity.troptions}` : null,
    ].filter(Boolean).join("  \n");

    return `${answer}\n${block}`;
  } catch (_) {
    return answer;
  }
}
