const DAEMON_URL = "http://127.0.0.1:8765";

const form = document.getElementById("command-form");
const input = document.getElementById("command-input");
const result = document.getElementById("newtab-result");

function setResult(text) {
  result.textContent = text;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const prompt = input.value.trim();
  if (!prompt) {
    return;
  }

  setResult("Routing through Jarvis...");
  try {
    const response = await fetch(`${DAEMON_URL}/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "freeform",
        prompt,
        url: "chrome://newtab",
        title: "UnyKorn Command",
        selection: "",
        text: "",
        metadata: { web3Detected: false, capturedAt: new Date().toISOString() }
      })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || data.error || `HTTP ${response.status}`);
    }
    setResult(data.answer || "(no reply)");
  } catch (error) {
    setResult(`Start python -m jarvis.browser_daemon, then retry. ${error}`);
  }
});
