/**
 * LLM routing — OpenAI, Anthropic, or Ollama (local).
 * Determined by DAEMON_BRAIN env var.
 */
"use strict";

const BRAIN = () => process.env.DAEMON_BRAIN ?? "openai";

// ── OpenAI ────────────────────────────────────────────────────────────────────
async function callOpenAI(system, user) {
  const key   = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  if (!key) throw new Error("OPENAI_API_KEY not set");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system",  content: system },
        { role: "user",    content: user   },
      ],
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ── Anthropic ─────────────────────────────────────────────────────────────────
async function callAnthropic(system, user) {
  const key   = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL ?? "claude-3-haiku-20240307";
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type":      "application/json",
      "x-api-key":         key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

// ── Ollama ────────────────────────────────────────────────────────────────────
async function callOllama(system, user) {
  const host  = process.env.OLLAMA_HOST  ?? "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_MODEL ?? "gemma4:latest";

  const res = await fetch(`${host}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user",   content: user   },
      ],
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.message?.content ?? "";
}

// ── Router ────────────────────────────────────────────────────────────────────
export async function callLLM(system, user) {
  switch (BRAIN()) {
    case "anthropic": return callAnthropic(system, user);
    case "ollama":    return callOllama(system, user);
    case "openai":    return callOpenAI(system, user);
    default: {
      // Unknown brain — return a helpful setup message instead of crashing
      const brain = BRAIN();
      return [
        `**Unykorn Daemon — configuration needed**`,
        ``,
        `DAEMON_BRAIN is set to \`${brain}\` but no handler exists for it.`,
        ``,
        `**To activate, set one of these in \`daemon/.env\`:**`,
        ``,
        `\`\`\``,
        `DAEMON_BRAIN=openclaw   # routes through OpenClaw :18789 (recommended)`,
        `DAEMON_BRAIN=openai     # needs OPENAI_API_KEY`,
        `DAEMON_BRAIN=ollama     # needs Ollama running locally`,
        `DAEMON_BRAIN=anthropic  # needs ANTHROPIC_API_KEY`,
        `\`\`\``,
      ].join("\n");
    }
  }
}
