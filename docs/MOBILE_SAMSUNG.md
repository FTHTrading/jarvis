# Mobile: Samsung Galaxy S26 Ultra

**Honest answer:** You cannot run this Python Jarvis repo natively on Android. It targets **Windows/macOS/Linux** with PortAudio, Ollama, and OpenClaw CLI on Primary.

Your phone is the **mobile leg** — pulses, approvals, and one-tap access to the mesh on DIGITALGIANT.

## Realistic options (best → good)

### 1. Bixby Routine → hail.unykorn.org (one-tap command)

Fastest "Hey Jarvis on my phone" feel:

1. Install **Tailscale** on phone + Primary (same tailnet).
2. Create Bixby Routine: **One tap** → Open URL `https://hail.unykorn.org` (or Tailscale IP to Nerve if exposed).
3. Optional second action: open **Telegram** → @NeedAI_Ada_bot.

See [samsung-one-tap.md](samsung-one-tap.md) for Tasker/Bixby steps.

### 2. Nerve PWA via Tailscale

1. Tailscale on S26 Ultra.
2. Browser → `http://<primary-tailscale-ip>:3080` (or MagicDNS hostname).
3. Allow mic → use Nerve voice chat → delegates to OpenClaw **main**.

This is the **full voice delegate** path — same as desktop Nerve, not the Jarvis Python loop.

### 3. Telegram bot (@NeedAI_Ada_bot)

Text/voice messages to the mesh when away from desk. Good for approvals and paste kickoffs; not sub-100ms local latency.

### 4. Termux + SSH to Primary

Power-user path:

```bash
# Termux (Android)
pkg install openssh
ssh kevan@<primary-tailscale-ip>
cd jarvis && python -m jarvis
```

Mic/STT over SSH is poor — use for **text** delegation only.

### 5. What NOT to expect

| Approach | Works? |
|----------|--------|
| Install Python Jarvis APK | ❌ No native build |
| Run Ollama on phone | ❌ Wrong hardware for gemma4 |
| Bixby deep integration with Jarvis wake word | ❌ No public API |
| Same experience as Iron Man Jarvis offline on phone alone | ❌ Needs Primary GPU + gateway |

## Recommended mobile stack

```text
Samsung S26 Ultra
  ├─ Bixby one-tap → hail.unykorn.org
  ├─ Tailscale → Nerve :3080 (voice delegate)
  └─ Telegram → @NeedAI_Ada_bot (async ops)
         │
         ▼
   Primary DIGITALGIANT
   OpenClaw :18789 + Ollama + Jarvis repo
```

## Comparison to Jarvis on Windows

| Feature | Jarvis (Windows) | Nerve (mobile browser) |
|---------|------------------|------------------------|
| Local shell tools | ✅ | ❌ |
| OpenClaw delegate | ✅ via skill/CLI | ✅ native |
| ElevenLabs | ✅ | ✅ via DONK Live Follow |
| Offline STT | ✅ whisper-local | ⚠️ needs Primary Whisper |
| One-click start | `scripts/start-jarvis.ps1` | Bixby → URL |

## Related

- [samsung-one-tap.md](samsung-one-tap.md) — step-by-step routine
- [UNYKORN_INTEGRATION.md](UNYKORN_INTEGRATION.md) — gateway ports
- OpenClaw: `docs/DEVICE_SETUP_PLAYBOOK.md`
