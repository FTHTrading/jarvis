export const DAEMON_BASE = "http://127.0.0.1:8787";

export async function daemonFetch(path, options = {}) {
  const res = await fetch(`${DAEMON_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !data.error) {
    data.error = `Daemon HTTP ${res.status}`;
  }
  return { ok: res.ok, status: res.status, data };
}

export async function askAgent(payload) {
  const { data } = await daemonFetch("/agent", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function checkDaemonHealth() {
  try {
    const { ok, data } = await daemonFetch("/health");
    return { reachable: ok, ...data };
  } catch (err) {
    return { reachable: false, error: err.message };
  }
}
