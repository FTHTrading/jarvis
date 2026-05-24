import { buildAgentMessage } from "./prompts.js";
import { config } from "./config.js";
import { delegateToOpenClaw, probeOpenClawHealth } from "./openclaw.js";
import { askOpenAI } from "./openai.js";

const SYSTEM_PROMPT =
  "You are the Unykorn Sovereign Browser agent — concise, accurate, and security-conscious.";

export async function runAgent(payload) {
  const message = buildAgentMessage(payload);
  const brain = config.brain;

  const tryOpenClaw =
    brain === "openclaw" || brain === "auto";
  const tryOpenAI =
    brain === "openai" || brain === "auto";

  let openclawHealth = null;
  if (tryOpenClaw) {
    openclawHealth = await probeOpenClawHealth();
    if (openclawHealth.ok) {
      const result = await delegateToOpenClaw(message);
      if (result.ok) {
        return { ...result, mode: payload.mode, openclawHealth };
      }
      if (brain === "openclaw") {
        return { ...result, mode: payload.mode, openclawHealth };
      }
    }
  }

  if (tryOpenAI) {
    const result = await askOpenAI(SYSTEM_PROMPT, message);
    return { ...result, mode: payload.mode, openclawHealth };
  }

  return {
    ok: false,
    error: "No brain backend available. Start OpenClaw gateway or set OPENAI_API_KEY.",
    mode: payload.mode,
    openclawHealth,
  };
}
