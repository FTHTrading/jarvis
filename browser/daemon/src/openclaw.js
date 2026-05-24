import { request } from "undici";
import { config } from "./config.js";

/**
 * Bridge to the OpenClaw / Unykorn agent gateway (same one Jarvis talks to).
 *
 * The gateway is expected to expose a JSON endpoint that accepts an
 * agent invocation and returns a structured answer. We keep the schema
 * minimal so the daemon stays compatible with multiple backend shapes.
 */
export async function callOpenClaw({ tool, input, context, signal }) {
  const url = `${config.openclaw.gatewayUrl}/v1/agent/invoke`;
  const body = JSON.stringify({
    tool,
    input,
    context,
    source: "unykorn-browser-daemon",
  });

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), config.openclaw.timeoutMs);
  const composedSignal = anySignal([signal, ac.signal]);

  try {
    const res = await request(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-unykorn-source": "browser-daemon",
      },
      body,
      signal: composedSignal,
    });

    const text = await res.body.text();
    if (res.statusCode >= 400) {
      const err = new Error(`OpenClaw ${res.statusCode}: ${text.slice(0, 400)}`);
      err.statusCode = res.statusCode;
      throw err;
    }

    try {
      return JSON.parse(text);
    } catch {
      return { answer: text };
    }
  } finally {
    clearTimeout(timer);
  }
}

export async function pingOpenClaw() {
  try {
    const res = await request(`${config.openclaw.gatewayUrl}/health`, {
      method: "GET",
      headersTimeout: 1500,
      bodyTimeout: 1500,
    });
    return res.statusCode < 500;
  } catch {
    return false;
  }
}

function anySignal(signals) {
  const ac = new AbortController();
  for (const s of signals) {
    if (!s) continue;
    if (s.aborted) {
      ac.abort(s.reason);
      return ac.signal;
    }
    s.addEventListener("abort", () => ac.abort(s.reason), { once: true });
  }
  return ac.signal;
}
