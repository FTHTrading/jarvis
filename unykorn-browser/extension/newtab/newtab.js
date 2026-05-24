import { askAgent, checkDaemonHealth } from "../shared/daemon-client.js";

const form = document.getElementById("command-form");
const input = document.getElementById("command-input");
const responseEl = document.getElementById("command-response");
const daemonPill = document.getElementById("daemon-pill");

async function refreshDaemonPill() {
  const health = await checkDaemonHealth();
  daemonPill.textContent = health.reachable
    ? health.openclaw?.ok
      ? "Daemon online · OpenClaw up"
      : "Daemon online · OpenClaw down"
    : "Start daemon: npm start in unykorn-browser/daemon";
  daemonPill.classList.toggle("pill--ok", Boolean(health.reachable));
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const prompt = input.value.trim();
  if (!prompt) return;

  responseEl.classList.remove("hidden");
  responseEl.textContent = "Thinking…";

  const result = await askAgent({
    mode: "freeform",
    prompt,
    url: "chrome://newtab",
    title: "Unykorn New Tab",
    pageText: "",
  });

  responseEl.textContent = result.ok
    ? result.answer
    : result.error || "Request failed. Is the daemon running?";
});

refreshDaemonPill();
input.focus();
