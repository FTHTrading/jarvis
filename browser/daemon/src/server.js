import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { runAgent } from "./tools.js";
import { pingOpenClaw } from "./openclaw.js";
import { detectDapp, extractOnchainArtifacts, isLikelyWeb3Page } from "./web3.js";

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
    transport: process.env.NODE_ENV === "production"
      ? undefined
      : { target: "pino-pretty", options: { colorize: true } },
  },
});

await fastify.register(cors, {
  origin: config.cors === "*" ? true : config.cors.split(",").map((s) => s.trim()).filter(Boolean),
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["content-type", "x-unykorn-token"],
});

fastify.addHook("onRequest", async (req, reply) => {
  if (req.method === "OPTIONS") return;
  if (req.routeOptions?.url === "/health") return;
  if (!config.token) return;
  const supplied = req.headers["x-unykorn-token"];
  if (supplied !== config.token) {
    reply.code(401).send({ ok: false, error: "invalid daemon token" });
  }
});

fastify.get("/health", async () => {
  const openclaw = await pingOpenClaw();
  return {
    ok: true,
    daemon: "unykorn-browser-daemon",
    version: "0.1.0",
    openclaw: { url: config.openclaw.gatewayUrl, reachable: openclaw },
    fallback: config.fallback.brain,
  };
});

fastify.post("/agent", async (req, reply) => {
  const body = req.body ?? {};
  const mode = body.mode ?? "freeform";
  const prompt = body.prompt ?? "";
  if (typeof mode !== "string") {
    reply.code(400);
    return { ok: false, error: "mode must be a string" };
  }

  const result = await runAgent({ mode, prompt, payload: body });
  if (!result.ok) reply.code(502);
  return result;
});

fastify.post("/web3/detect", async (req) => {
  const body = req.body ?? {};
  const dapp = detectDapp({ url: body.url });
  const onchain = extractOnchainArtifacts(body.fullText || body.selection || "");
  return {
    ok: true,
    dapp,
    onchain,
    isWeb3: isLikelyWeb3Page({
      url: body.url,
      hasEthereumProvider: !!body.hasEthereumProvider,
      hasSolanaProvider: !!body.hasSolanaProvider,
      fullText: body.fullText,
    }),
  };
});

fastify.setErrorHandler((err, _req, reply) => {
  fastify.log.error(err);
  reply.code(err.statusCode ?? 500).send({ ok: false, error: err.message });
});

const start = async () => {
  try {
    await fastify.listen({ host: config.host, port: config.port });
    fastify.log.info(`Unykorn daemon ready → http://${config.host}:${config.port}`);
    fastify.log.info(`OpenClaw gateway → ${config.openclaw.gatewayUrl}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
