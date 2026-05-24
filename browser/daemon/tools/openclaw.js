/**
 * OpenClaw gateway integration.
 * Used when DAEMON_BRAIN=openclaw — routes full context to the mesh.
 */
"use strict";

const GATEWAY      = () => process.env.OPENCLAW_GATEWAY_URL     ?? "http://127.0.0.1:18789";
const AGENT        = () => process.env.OPENCLAW_DEFAULT_AGENT   ?? "main";
const TOKEN        = () => process.env.OPENCLAW_GATEWAY_TOKEN   ?? "";

const MODE_TO_TOOL = {
  summarize:    "summarize_page",
  explain:      "explain_site",
  web3_explain: "explain_dapp",
  freeform:     "freeform_query",
};

export async function callOpenClaw({ context, mode, prompt }) {
  const tool    = MODE_TO_TOOL[mode] ?? "freeform_query";
  const message = buildOpenClawMessage(tool, context, prompt);

  const headers = { "Content-Type": "application/json" };
  if (TOKEN()) headers["Authorization"] = `Bearer ${TOKEN()}`;

  const res = await fetch(`${GATEWAY()}/v1/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      agent:   AGENT(),
      message,
      context: {
        url:       context.url,
        title:     context.title,
        contracts: context.contracts,
        isWeb3:    context.isKnownDapp || context.hasEthereum || context.hasSolana,
      },
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenClaw ${res.status}: ${txt}`);
  }

  const data = await res.json();
  return data.message ?? data.answer ?? data.content ?? JSON.stringify(data);
}

function buildOpenClawMessage(tool, context, prompt) {
  const parts = [`[${tool}]`];
  parts.push(`URL: ${context.url}`);
  if (context.title)     parts.push(`Title: ${context.title}`);
  if (context.selection) parts.push(`Selection: ${context.selection.slice(0, 500)}`);
  if (context.contracts?.length) parts.push(`Contracts: ${context.contracts.join(", ")}`);
  if (prompt)            parts.push(`Prompt: ${prompt}`);
  if (context.fullText)  parts.push(`\nPage content:\n${context.fullText.slice(0, 3000)}`);
  return parts.join("\n");
}
