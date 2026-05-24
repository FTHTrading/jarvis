import "dotenv/config";

const env = (key, fallback = "") => {
  const value = process.env[key];
  return value === undefined || value === "" ? fallback : value;
};

export const config = {
  port: Number.parseInt(env("UNYKORN_DAEMON_PORT", "18790"), 10),
  host: env("UNYKORN_DAEMON_HOST", "127.0.0.1"),
  token: env("UNYKORN_DAEMON_TOKEN", ""),
  cors: env("UNYKORN_DAEMON_CORS", "*"),
  openclaw: {
    gatewayUrl: env("OPENCLAW_GATEWAY_URL", "http://127.0.0.1:18789").replace(/\/+$/, ""),
    timeoutMs: Number.parseInt(env("OPENCLAW_TIMEOUT_MS", "30000"), 10),
  },
  fallback: {
    brain: env("UNYKORN_FALLBACK_BRAIN", "openai"),
    openaiKey: env("OPENAI_API_KEY", ""),
    openaiModel: env("OPENAI_MODEL", "gpt-4o-mini"),
  },
  nil33: {
    url: env("NIL33_API_URL", "").replace(/\/+$/, ""),
    key: env("NIL33_API_KEY", ""),
  },
};
