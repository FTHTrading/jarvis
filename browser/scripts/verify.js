#!/usr/bin/env node
/**
 * verify.js — Unykorn Browser pre-flight check.
 * Run before first use to confirm the daemon and all dependencies are wired.
 *
 * Usage: node browser/scripts/verify.js
 */
"use strict";

const CHECK  = "✓";
const FAIL   = "✗";
const WARN   = "⚠";

let allOk = true;

async function check(label, fn) {
  try {
    const msg = await fn();
    console.log(`  ${CHECK}  ${label}${msg ? " — " + msg : ""}`);
  } catch (err) {
    allOk = false;
    console.error(`  ${FAIL}  ${label} — ${err.message}`);
  }
}

function warn(label, msg) {
  console.log(`  ${WARN}  ${label} — ${msg}`);
}

async function probe(url, path = "/health") {
  const res = await fetch(`${url}${path}`, { signal: AbortSignal.timeout(2500) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

(async () => {
  console.log("\nUnykorn Browser — pre-flight check\n");

  // Node version
  await check("Node.js ≥18", () => {
    const [major] = process.versions.node.split(".").map(Number);
    if (major < 18) throw new Error(`Node ${process.versions.node} — upgrade to 18+`);
    return process.versions.node;
  });

  // .env file
  await check("daemon/.env exists", async () => {
    const fs   = await import("fs");
    const path = await import("path");
    const env  = path.join(process.cwd(), "browser/daemon/.env");
    if (!fs.existsSync(env)) throw new Error("Not found — run start-daemon.ps1 or start-daemon.sh");
    return "found";
  });

  // Daemon health
  await check("Daemon :40201 /health", async () => {
    const r    = await probe("http://127.0.0.1:40201");
    const data = await r.json();
    return `v${data.version} · brain=${data.brain}`;
  });

  // OpenClaw
  let openclawBrain = false;
  await check("OpenClaw :18789 /health", async () => {
    await probe("http://127.0.0.1:18789");
    openclawBrain = true;
    return "online";
  });

  // Ollama
  await check("Ollama :11434 /api/tags", async () => {
    const r    = await probe("http://127.0.0.1:11434", "/api/tags");
    const data = await r.json();
    const models = (data.models ?? []).map(m => m.name).slice(0, 3);
    return `online · ${models.join(", ") || "no models pulled"}`;
  });

  // Extension files
  await check("Extension manifest exists", async () => {
    const fs   = await import("fs");
    const path = await import("path");
    const mf   = path.join(process.cwd(), "browser/extension/manifest.json");
    if (!fs.existsSync(mf)) throw new Error("browser/extension/manifest.json not found");
    const mfData = JSON.parse(fs.readFileSync(mf, "utf8"));
    return `v${mfData.version}`;
  });

  // Quick agent round-trip test
  await check("POST /agent (summarize, no page content)", async () => {
    const res = await fetch("http://127.0.0.1:40201/agent", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        url: "https://unykorn.ai", title: "Unykorn", fullText: "",
        selection: "", mode: "summarize",
      }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();
    if (data.ok === false) throw new Error(data.error ?? "no answer");
    return `got ${(data.answer ?? "").slice(0, 50)}…`;
  });

  console.log("\n" + "─".repeat(48));
  if (allOk) {
    console.log("\n  All checks passed — load browser/extension/ in Edge/Chrome:\n");
    console.log("  1. edge://extensions  (or chrome://extensions)");
    console.log("  2. Developer mode ON");
    console.log("  3. Load unpacked → select  browser/extension/");
    console.log("  4. Press Ctrl+Shift+U on any page\n");
  } else {
    console.log("\n  Some checks failed — fix the issues above before loading the extension.\n");
    console.log("  Quickstart: https://github.com/FTHTrading/jarvis/blob/main/browser/QUICKSTART.md\n");
    process.exit(1);
  }
})();
