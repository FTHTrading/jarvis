import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadDotEnv() {
  const candidates = [
    join(__dirname, "..", ".env"),
    join(__dirname, "..", "..", "..", ".env"),
  ];
  for (const path of candidates) {
    if (existsSync(path)) {
      loadEnv({ path });
      return;
    }
  }
  loadEnv();
}

loadDotEnv();

function env(key, fallback = "") {
  return process.env[key]?.trim() || fallback;
}

export const config = {
  host: env("UNYKORN_DAEMON_HOST", "127.0.0.1"),
  port: Number(env("UNYKORN_DAEMON_PORT", "8787")),
  openclawGatewayUrl: env("OPENCLAW_GATEWAY_URL", "http://127.0.0.1:18789"),
  openclawGatewayToken: env("OPENCLAW_GATEWAY_TOKEN"),
  openclawAgentId: env("UNYKORN_OPENCLAW_AGENT") || env("JARVIS_OPENCLAW_AGENT", "main"),
  openaiApiKey: env("OPENAI_API_KEY"),
  llmModel: env("UNYKORN_LLM_MODEL", env("JARVIS_LLM_MODEL", "gpt-4o-mini")),
  brain: env("UNYKORN_BRAIN", "auto"),
};
