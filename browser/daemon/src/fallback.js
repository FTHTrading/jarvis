import { request } from "undici";
import { config } from "./config.js";

/**
 * OpenAI fallback used only when OpenClaw is unreachable. Keeps v1
 * useful in air-gapped or pre-mesh environments.
 */
export async function callOpenAI({ system, user }) {
  if (config.fallback.brain !== "openai" || !config.fallback.openaiKey) {
    throw new Error("Fallback brain not configured (set UNYKORN_FALLBACK_BRAIN and OPENAI_API_KEY)");
  }

  const res = await request("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.fallback.openaiKey}`,
    },
    body: JSON.stringify({
      model: config.fallback.openaiModel,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
    }),
  });

  if (res.statusCode >= 400) {
    const text = await res.body.text();
    throw new Error(`OpenAI ${res.statusCode}: ${text.slice(0, 400)}`);
  }

  const json = await res.body.json();
  return json.choices?.[0]?.message?.content ?? "";
}
