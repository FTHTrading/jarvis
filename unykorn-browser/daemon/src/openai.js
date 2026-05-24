import { config } from "./config.js";

export async function askOpenAI(systemPrompt, userMessage) {
  if (!config.openaiApiKey) {
    return {
      ok: false,
      backend: "openai",
      error: "OPENAI_API_KEY not set. Install OpenClaw CLI or add an API key.",
    };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.llmModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) {
      const body = await res.text();
      return {
        ok: false,
        backend: "openai",
        error: `OpenAI error ${res.status}: ${body.slice(0, 400)}`,
      };
    }

    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content?.trim();
    return {
      ok: Boolean(answer),
      backend: "openai",
      model: config.llmModel,
      answer: answer || "OpenAI returned an empty reply.",
    };
  } catch (err) {
    return { ok: false, backend: "openai", error: err.message };
  }
}
