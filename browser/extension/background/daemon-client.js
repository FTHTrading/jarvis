const DEFAULTS = {
  daemonUrl: "http://127.0.0.1:18790",
  daemonToken: "",
};

export async function getSettings() {
  const stored = await chrome.storage.local.get(["unykorn:settings"]);
  return { ...DEFAULTS, ...(stored["unykorn:settings"] || {}) };
}

export async function setSettings(partial) {
  const next = { ...(await getSettings()), ...partial };
  await chrome.storage.local.set({ "unykorn:settings": next });
  return next;
}

export async function callDaemon(settings, path, body, method = "POST") {
  const url = `${settings.daemonUrl.replace(/\/+$/, "")}${path}`;
  const init = {
    method,
    headers: { "content-type": "application/json" },
  };
  if (settings.daemonToken) init.headers["x-unykorn-token"] = settings.daemonToken;
  if (method !== "GET" && body !== null && body !== undefined) {
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { ok: false, raw: text };
  }
  if (!res.ok) {
    const err = new Error(parsed?.error || `daemon ${res.status}`);
    err.statusCode = res.status;
    err.body = parsed;
    throw err;
  }
  return parsed;
}
