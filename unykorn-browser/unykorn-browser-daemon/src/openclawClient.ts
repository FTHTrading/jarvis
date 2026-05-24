import axios from "axios";
import type { AgentRequest, AgentResponse } from "./types";

const OPENCLAW_URL   = process.env.OPENCLAW_URL   || "http://127.0.0.1:18789";
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN  || "";
const OPENCLAW_AGENT = "unykorn-browser";

const MODE_TO_TOOL: Record<string, string> = {
  summarize:    "summarize_page",
  explain:      "explain_site",
  web3_explain: "web3_explain",
  freeform:     "freeform_query",
};

/**
 * Route a browser agent request through the OpenClaw gateway.
 * Target endpoint: POST {OPENCLAW_URL}/v1/chat
 */
export async function callUnykornAgent(payload: AgentRequest): Promise<AgentResponse> {
  const tool    = MODE_TO_TOOL[payload.mode] ?? "freeform_query";
  const message = buildMessage(tool, payload);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (OPENCLAW_TOKEN) headers["Authorization"] = `Bearer ${OPENCLAW_TOKEN}`;

  const res = await axios.post(
    `${OPENCLAW_URL}/v1/chat`,
    {
      agent:   OPENCLAW_AGENT,
      message,
      context: {
        url:       payload.url,
        title:     payload.title,
        contracts: payload.contracts ?? [],
        isWeb3:    payload.isKnownDapp || payload.hasEthereum || payload.hasSolana,
      },
    },
    { headers, timeout: 30_000 }
  );

  return normalizeResponse(res.data, payload.mode);
}

function buildMessage(tool: string, p: AgentRequest): string {
  const parts = [`[${tool}]`, `URL: ${p.url}`, `Title: ${p.title}`];
  if (p.selection)          parts.push(`Selection: ${p.selection.slice(0, 500)}`);
  if (p.contracts?.length)  parts.push(`Contracts: ${p.contracts.join(", ")}`);
  if (p.prompt)             parts.push(`Prompt: ${p.prompt}`);
  if (p.fullText)           parts.push(`\nPage content:\n${p.fullText.slice(0, 3000)}`);
  return parts.join("\n");
}

function normalizeResponse(data: unknown, mode: string): AgentResponse {
  let answer = "";
  if (typeof data === "string") {
    answer = data;
  } else if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    answer = String(d.message ?? d.answer ?? d.content ?? JSON.stringify(data));
  }
  return { answer, actions: [], metadata: { mode }, mode: mode as AgentResponse["mode"] };
}
