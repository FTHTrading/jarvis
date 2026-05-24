# Samsung one-tap: Bixby / Tasker

Goal: **one tap** on Galaxy S26 Ultra to reach the UnyKorn command mesh — not native Windows Jarvis.

## Option A — Bixby Routines (recommended)

1. **Install Tailscale** on phone and Primary; confirm both online on same tailnet.
2. Open **Settings → Advanced features → Bixby Routines**.
3. **Add routine** → trigger: **Manual shortcut** (add to home screen).
4. Actions:
   - **Open URL:** `https://hail.unykorn.org`
   - _(Optional)_ **Open app:** Telegram → chat @NeedAI_Ada_bot
5. Name: **Jarvis Command** (or **UnyKorn Hail**).
6. Add widget/shortcut to home screen — **one tap**.

### Tailscale-only Nerve (full voice)

If hail is slow or you want direct Nerve:

1. Find Primary Tailscale IP or MagicDNS name (e.g. `digitalgiant.tailnet-name.ts.net`).
2. Bixby action URL: `http://<primary-host>:3080`
3. First visit: allow microphone in Chrome/Samsung Internet.

> Exposing :3080 requires Tailscale ACL or `gateway.bind=tailnet` — do not port-forward to public internet without auth.

## Option B — Tasker

1. Install **Tasker** + **Tasker App Factory** (optional).
2. New Task → **Browse URL** → `https://hail.unykorn.org`
3. Optional: **Perform Task** → launch Tailscale first (wait 2s).
4. Create home-screen shortcut.

Example Tasker description:

```text
Task: UnyKorn Hail
A1: Launch App → Tailscale (optional)
A2: Wait 2 seconds
A3: Browse URL → https://hail.unykorn.org
```

## Option C — Telegram widget

1. Pin @NeedAI_Ada_bot chat to home (Telegram widget).
2. Voice message → async delegate to mesh.
3. Not true one-tap voice HUD but zero setup beyond bot link.

## What each tap gives you

| Target | Experience |
|--------|------------|
| hail.unykorn.org | Command portal / jarvis-command HUD |
| Nerve :3080 | Full mic → OpenClaw → TTS loop |
| Telegram Ada | Text/voice async ops |

## Windows one-click (contrast)

On Primary, use:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-jarvis.ps1
```

Pin that to Start menu or Task Scheduler for desktop one-click.

## Related

- [MOBILE_SAMSUNG.md](MOBILE_SAMSUNG.md)
- [UNYKORN_INTEGRATION.md](UNYKORN_INTEGRATION.md)
