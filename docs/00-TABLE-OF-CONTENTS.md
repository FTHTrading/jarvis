# Documentation index

Color-coded map of everything in this repo. Start with [Quick start](../README.md#quick-start) or [Launch checklist](LAUNCH_CHECKLIST.md).

| Color | Section | Doc |
|-------|---------|-----|
| 🟦 **Core** | Run Jarvis locally | [README](../README.md) · [Launch checklist](LAUNCH_CHECKLIST.md) |
| 🟩 **Voice** | STT / TTS / wake word | [README § Configuration](../README.md#configuration) |
| 🟪 **Brain** | LLM backends & models | [LLM upgrade path](LLM_UPGRADE_PATH.md) |
| 🟥 **FTH mesh** | UnyKorn / OpenClaw integration | [UnyKorn integration](UNYKORN_INTEGRATION.md) · [FTH system context](FTH_SYSTEM_CONTEXT.md) |
| 🟫 **Browser v1** | Extension + local daemon scaffold | [Sovereign Browser v1](SOVEREIGN_BROWSER_V1.md) |
| 🟧 **Mobile** | Samsung S26 Ultra one-tap | [Mobile Samsung](MOBILE_SAMSUNG.md) · [Samsung one-tap](samsung-one-tap.md) |
| 🟨 **Architecture** | Flowcharts & routing | [Flowcharts](FLOWCHARTS.md) |
| ⬜ **Code** | Python package layout | [README § Project layout](../README.md#project-layout) |

## Quick links

- **One-click Windows:** `powershell -ExecutionPolicy Bypass -File scripts\start-jarvis.ps1`
- **OpenClaw gateway:** http://127.0.0.1:18789/health
- **Nerve voice HUD:** http://127.0.0.1:3080
- **Command portal:** https://hail.unykorn.org
- **Sovereign Browser:** https://github.com/FTHTrading/browser

## Related repos (FTHTrading)

| Repo | Role |
|------|------|
| [FTHTrading/jarvis](https://github.com/FTHTrading/jarvis) | This repo — local Windows voice assistant |
| [FTHTrading/browser](https://github.com/FTHTrading/browser) | Sovereign Browser — search, delegate, x402 |
| `apps/jarvis-command` (OpenClaw workspace) | hail / storm / law command surfaces |
| `apps/donk-live` (OpenClaw workspace) | ElevenLabs avatar + Follow Nerve TTS |

## Canonical operator docs (outside repo)

- `C:\Users\Kevan\.openclaw\workspace\docs\FTH_MASTER_CONTROL_PLANE.md`
- `C:\Users\Kevan\.openclaw\workspace\vault\intel\UNYKORN_MASTER_REGISTRY.json`
