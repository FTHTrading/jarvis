import { spawn } from "node:child_process";
import { config } from "./config.js";

function extractReply(raw) {
  const text = raw.trim();
  if (!text) return "";

  try {
    const data = JSON.parse(text);
    for (const key of ["text", "message", "content", "reply"]) {
      const val = data[key];
      if (typeof val === "string" && val.trim()) return val.trim();
    }
  } catch {
    // plain text fallback
  }
  return text;
}

export async function delegateToOpenClaw(message, agentId) {
  const target = agentId || config.openclawAgentId;
  const args = [
    "agent",
    "--agent",
    target,
    "--message",
    message,
    "--json",
    "--timeout",
    "180",
  ];

  const env = { ...process.env };
  if (config.openclawGatewayToken) {
    env.OPENCLAW_GATEWAY_TOKEN = config.openclawGatewayToken;
  }
  env.OPENCLAW_GATEWAY_URL = config.openclawGatewayUrl;

  return new Promise((resolve) => {
    const proc = spawn("openclaw", args, { env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      resolve({
        ok: false,
        backend: "openclaw",
        error: `OpenClaw delegation to ${target} timed out after 190s.`,
      });
    }, 190_000);

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        resolve({
          ok: false,
          backend: "openclaw",
          error: (stderr || stdout || "OpenClaw delegation failed").slice(0, 800),
        });
        return;
      }
      const answer = extractReply(stdout);
      resolve({
        ok: Boolean(answer),
        backend: "openclaw",
        agent: target,
        answer: answer || "OpenClaw returned an empty reply.",
      });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        ok: false,
        backend: "openclaw",
        error:
          err.code === "ENOENT"
            ? "OpenClaw CLI not installed. Run: npm i -g openclaw"
            : err.message,
      });
    });
  });
}

export async function probeOpenClawHealth() {
  try {
    const res = await fetch(`${config.openclawGatewayUrl.replace(/\/$/, "")}/health`, {
      signal: AbortSignal.timeout(4000),
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
