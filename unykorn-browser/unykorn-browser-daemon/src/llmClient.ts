/**
 * Direct LLM fallback when DAEMON_BRAIN != "openclaw".
 * Supports: openai | anthropic | ollama
 */
import type { AgentRequest } from "./types";

const BRAIN = () => process.env.DAEMON_BRAIN ?? "openai";

// ── Prompt builders ────────────────────────────────────────────────────────────
function systemPrompt(mode: string, isWeb3: boolean): string {
  const base = `You are the Unykorn Sovereign Browser Agent.
You receive page context from a browser extension and a local daemon.
Your job is to analyze and explain pages clearly and concisely.
Never execute transactions; only analyze and explain.
Respond in structured JSON: { "answer": "...", "actions": [], "metadata": {} }`;

  const task: Record<string, string> = {
    summarize:    "Summarize the page in ≤200 words.",
    explain:      "Explain what this site does, who it's for, and any notable risks (≤300 words).",
    web3_explain: "Analyze this Web3 page: protocol category, chains, risks, contract addresses, safety verdict.",
    freeform:     "Answer the operator's question using the page as context.",
  };

  let prompt = `${base}\n\nTask: ${task[mode] ?? task.freeform}`;
  if (isWeb3) prompt += "\n\nWeb3 context is active — elevate risk awareness.";
  return prompt;
}

function userPrompt(p: AgentRequest): string {
  const parts = [
    `**Page:** ${p.title || p.url}`,
    `**URL:** ${p.url}`,
  ];
  if (p.selection)        parts.push(`**Selected text:**\n${p.selection.slice(0, 1000)}`);
  if (p.contracts?.length) parts.push(`**Contracts:** ${p.contracts.join(", ")}`);
  if (p.fullText)         parts.push(`**Page content:**\n${p.fullText.slice(0, 4000)}`);
  if (p.prompt)           parts.push(`**Operator question:** ${p.prompt}`);
  return parts.join("\n\n");
}

// ── LLM calls ──────────────────────────────────────────────────────────────────
async function callOpenAI(sys: string, user: string): Promise<string> {
  const key   = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  if (!key) throw new Error("OPENAI_API_KEY not set");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method:  "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body:    JSON.stringify({
      model,
      messages:   [{ role: "system", content: sys }, { role: "user", content: user }],
      max_tokens: 1024,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json() as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content ?? "";
}

async function callAnthropic(sys: string, user: string): Promise<string> {
  const key   = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL ?? "claude-3-haiku-20240307";
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:  "POST",
    headers: {
      "Content-Type":      "application/json",
      "x-api-key":         key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, max_tokens: 1024, system: sys, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json() as { content: { text: string }[] };
  return data.content[0]?.text ?? "";
}

async function callOllama(sys: string, user: string): Promise<string> {
  const host  = process.env.OLLAMA_HOST  ?? "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_MODEL ?? "gemma4:latest";

  const res = await fetch(`${host}/api/chat`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      model, stream: false,
      messages: [{ role: "system", content: sys }, { role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  const data = await res.json() as { message: { content: string } };
  return data.message?.content ?? "";
}

// ── Router ─────────────────────────────────────────────────────────────────────
export async function callLLM(payload: AgentRequest): Promise<string> {
  const isWeb3 = !!(payload.isKnownDapp || payload.hasEthereum || payload.hasSolana);
  const sys    = systemPrompt(payload.mode, isWeb3);
  const user   = userPrompt(payload);

  switch (BRAIN()) {
    case "anthropic": return callAnthropic(sys, user);
    case "ollama":    return callOllama(sys, user);
    case "openai":
    default:          return callOpenAI(sys, user);
  }
}
