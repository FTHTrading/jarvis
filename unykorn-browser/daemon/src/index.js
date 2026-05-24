import Fastify from "fastify";
import { config } from "./config.js";
import { runAgent } from "./agent.js";
import { probeOpenClawHealth } from "./openclaw.js";

const app = Fastify({ logger: true });

app.addHook("onRequest", async (req, reply) => {
  reply.header("Access-Control-Allow-Origin", "*");
  reply.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  reply.header("Access-Control-Allow-Headers", "Content-Type");
});

app.options("*", async (_req, reply) => {
  reply.code(204).send();
});

app.get("/health", async () => {
  const openclaw = await probeOpenClawHealth();
  return {
    ok: true,
    service: "unykorn-daemon",
    port: config.port,
    brain: config.brain,
    openclaw,
  };
});

app.post("/agent", async (req, reply) => {
  const body = req.body ?? {};
  const mode = body.mode || "freeform";

  if (!body.url && !body.pageText && !body.prompt && !body.selection) {
    return reply.code(400).send({
      ok: false,
      error: "Provide at least url, pageText, prompt, or selection.",
    });
  }

  const result = await runAgent({
    mode,
    prompt: body.prompt || "",
    url: body.url || "",
    title: body.title || "",
    selection: body.selection || "",
    pageText: body.pageText || "",
    web3: body.web3 || {},
  });

  const status = result.ok ? 200 : 502;
  return reply.code(status).send(result);
});

app.get("/", async () => ({
  service: "Unykorn Browser Daemon",
  endpoints: {
    health: "GET /health",
    agent: "POST /agent",
  },
}));

try {
  await app.listen({ host: config.host, port: config.port });
  app.log.info(`Unykorn daemon listening on http://${config.host}:${config.port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
