/**
 * Graph logging — logs significant page visits / agent interactions
 * to NIL33 or Troptions graph for the UnyKorn ecosystem.
 * Fire-and-forget; errors are suppressed.
 */
"use strict";

const NIL33_URL = () => process.env.NIL33_API_URL ?? "";
const NIL33_KEY = () => process.env.NIL33_API_KEY ?? "";

export async function logToGraph({ url, title, mode, answer }) {
  const apiUrl = NIL33_URL();
  if (!apiUrl) return; // NIL33 not configured — skip silently

  const payload = {
    event:     "browser_agent_interaction",
    url,
    title,
    mode,
    answerSnippet: (answer ?? "").slice(0, 200),
    ts: new Date().toISOString(),
  };

  const headers = { "Content-Type": "application/json" };
  if (NIL33_KEY()) headers["Authorization"] = `Bearer ${NIL33_KEY()}`;

  await fetch(`${apiUrl}/events`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5000),
  });
}
