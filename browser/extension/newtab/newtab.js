const dot = document.getElementById("daemon-dot");
const label = document.getElementById("daemon-label");
const cmd = document.getElementById("cmd");
const form = document.getElementById("cmd-form");
const answerWrap = document.getElementById("answer-wrap");
const answerVia = document.getElementById("answer-via");
const answerEl = document.getElementById("answer");

chrome.runtime.sendMessage({ type: "daemon.health" }, (res) => {
  if (!res?.ok) {
    dot.className = "dot dot-red";
    label.textContent = "daemon offline";
    return;
  }
  const reachable = res.result?.openclaw?.reachable;
  dot.className = `dot ${reachable ? "dot-green" : "dot-amber"}`;
  label.textContent = reachable ? "OpenClaw online" : "daemon ok · OpenClaw offline";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const prompt = cmd.value.trim();
  if (!prompt) return;
  answerWrap.hidden = false;
  answerVia.textContent = "thinking…";
  answerEl.textContent = "";

  const payload = {
    url: "chrome://newtab",
    title: "Unykorn new tab",
    fullText: "",
    selection: "",
    mode: "freeform",
    prompt,
  };

  const res = await new Promise((resolve) =>
    chrome.runtime.sendMessage({ type: "agent.run", payload }, resolve)
  );

  if (!res?.ok) {
    answerVia.textContent = "error";
    answerEl.textContent = res?.error || "agent error";
    return;
  }
  const r = res.result || {};
  if (!r.ok) {
    answerVia.textContent = r.via || "error";
    answerEl.textContent = r.error || "agent failed";
    return;
  }
  answerVia.textContent = r.via || "openclaw";
  answerEl.textContent = r.warning ? `⚠ ${r.warning}\n\n${r.answer}` : r.answer;
});

cmd.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.shiftKey) {
    e.preventDefault();
    const q = cmd.value.trim();
    if (q) {
      window.location.href = `https://duckduckgo.com/?q=${encodeURIComponent(q)}`;
    }
  }
});
