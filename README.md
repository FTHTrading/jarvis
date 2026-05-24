# Jarvis

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![Whisper](https://img.shields.io/badge/STT-faster--whisper-412991?style=flat-square)](https://github.com/SYSTRAN/faster-whisper)
[![ElevenLabs](https://img.shields.io/badge/TTS-ElevenLabs-000000?style=flat-square)](https://elevenlabs.io/)
[![Ollama](https://img.shields.io/badge/Brain-Ollama-000000?style=flat-square&logo=ollama&logoColor=white)](https://ollama.com/)
[![OpenClaw](https://img.shields.io/badge/Mesh-OpenClaw-7C3AED?style=flat-square)](https://github.com/FTHTrading/jarvis/blob/main/docs/UNYKORN_INTEGRATION.md)
[![Windows](https://img.shields.io/badge/OS-Windows-0078D4?style=flat-square&logo=windows&logoColor=white)](https://github.com/FTHTrading/jarvis)

A local, voice-controlled AI assistant for your computer — your own J.A.R.V.I.S., wired into the **FTH / UnyKorn** operator mesh on Primary.

- **Talks back in a lifelike voice** (ElevenLabs, OpenAI TTS, or offline pyttsx3)
- **Listens to you** with local Whisper (no audio leaves your machine) or the OpenAI API
- **Wakes on "Hey Jarvis"** via [openWakeWord](https://github.com/dscripka/openWakeWord), or push-to-talk
- **Takes actions on your computer**: open apps, URLs, shell commands, web search
- **Delegates to OpenClaw** (:18789) — DONK + 10-agent roster, x402, deploys
- **LLM brain**: OpenAI, local **Ollama** (gemma4 on RTX 5090), or full **OpenClaw** mesh

> No GPU required for basic use. Runs on macOS, Windows, and Linux. **Samsung phone:** use [mobile one-tap](docs/samsung-one-tap.md) → hail/Nerve, not native Jarvis.

---

## Table of contents

| | Section |
|---|---------|
| 🟦 | [Quick start](#quick-start) |
| 🟩 | [One-click Windows](#one-click-windows) |
| 🟪 | [Configuration](#configuration) |
| 🟥 | [UnyKorn / FTH integration](#unykorn--fth-integration) |
| 🟧 | [Mobile (Samsung S26 Ultra)](#mobile-samsung) |
| 🟨 | [OS prerequisites](#os-prerequisites-for-the-microphone) |
| ⬜ | [Local LLM (Ollama)](#using-a-local-llm-offline-brain-with-ollama) |
| ⬜ | [Wake word](#always-on-wake-word-hey-jarvis) |
| ⬜ | [Built-in tools](#what-it-can-do-out-of-the-box-tools-the-model-can-call) |
| ⬜ | [Add a skill](#add-your-own-skill) |
| ⬜ | [Project layout](#project-layout) |
| 📚 | [Full docs index](docs/00-TABLE-OF-CONTENTS.md) |

---

## Quick start

```bash
git clone https://github.com/FTHTrading/jarvis.git && cd jarvis
python -m venv .venv && source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env        # add OPENAI_API_KEY and/or Ollama / ElevenLabs keys
python -m jarvis
```

By default this launches **push-to-talk**: press `Enter` to speak, or type a message. Say "exit" / "goodbye" / `Ctrl+C` to quit.

**Launch checklist:** [docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md)

---

## One-click Windows

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-jarvis.ps1
```

Creates venv if missing, probes gateway/Nerve/Ollama health, copies `.env.example` → `.env`, starts Jarvis.

---

## Configuration

Everything is configured through `.env` (see [.env.example](.env.example)).

| Variable | What it controls | Default |
| --- | --- | --- |
| `OPENAI_API_KEY` | LLM brain + optional TTS/STT | _required unless Ollama/OpenClaw_ |
| `JARVIS_LLM_MODEL` | OpenAI chat model | `gpt-4o-mini` |
| `JARVIS_OLLAMA_MODEL` | Local Ollama model | `gemma4:latest` (when set) |
| `JARVIS_BRAIN` | `openai` \| `ollama` \| `openclaw` | `openai` (auto → Ollama if model set) |
| `OPENCLAW_GATEWAY_URL` | UnyKorn mesh gateway | `http://127.0.0.1:18789` |
| `ELEVENLABS_API_KEY` | Lifelike voice (DONK Live stack) | _optional_ |
| `JARVIS_TTS` | `auto` \| `elevenlabs` \| `openai` \| `pyttsx3` | `auto` |
| `JARVIS_STT` | `whisper-local` or `whisper-api` | `whisper-local` |
| `JARVIS_WAKE` | `openwakeword` \| `ptt` \| `off` | `ptt` |

### "auto" TTS picks the most lifelike option available

1. ElevenLabs (if `ELEVENLABS_API_KEY` is set)
2. OpenAI TTS (if `OPENAI_API_KEY` is set)
3. pyttsx3 offline voice (always works, but sounds robotic)

**Model guide:** [docs/LLM_UPGRADE_PATH.md](docs/LLM_UPGRADE_PATH.md)

---

## UnyKorn / FTH integration

Jarvis on **Primary** (DIGITALGIANT) connects to the operator stack:

| Service | Port | Role |
|---------|------|------|
| OpenClaw gateway | 18789 | Multi-agent brain, spawn/delegate |
| Nerve cockpit | 3080 | Voice HUD, mic STT, Edge TTS |
| Ollama | 11434 | gemma4, qwen2.5-coder, llama3.2 |
| DONK Live | 3090 | ElevenLabs avatar (`apps/donk-live`) |

**Command surfaces:** [hail.unykorn.org](https://hail.unykorn.org) · [storm.unykorn.org](https://storm.unykorn.org) · [law.unykorn.org](https://law.unykorn.org) — source in OpenClaw `apps/jarvis-command`.

**Skills:**

- `system_health` — probe gateway, Nerve, Ollama
- `delegate_to_openclaw` — send work to `main`, `infra-watchdog`, `x402-ranger`, etc.

**Full guide:** [docs/UNYKORN_INTEGRATION.md](docs/UNYKORN_INTEGRATION.md) · [docs/FTH_SYSTEM_CONTEXT.md](docs/FTH_SYSTEM_CONTEXT.md)

**Sovereign Browser:** [FTHTrading/browser](https://github.com/FTHTrading/browser) — search, delegate, and x402 lanes in one shell. Jarvis is the desktop **voice** companion; Browser is the **navigation** companion. Same OpenClaw gateway.

---

## Mobile (Samsung)

You **cannot** run this Python repo natively on Android. Realistic one-tap path:

1. **Bixby Routine** → open [hail.unykorn.org](https://hail.unykorn.org)
2. **Tailscale** → Nerve at `:3080` for full voice delegate
3. **Telegram** → @NeedAI_Ada_bot for async ops

Details: [docs/MOBILE_SAMSUNG.md](docs/MOBILE_SAMSUNG.md) · [docs/samsung-one-tap.md](docs/samsung-one-tap.md)

---

## OS prerequisites for the microphone

The mic stack uses [`sounddevice`](https://python-sounddevice.readthedocs.io/) (PortAudio).

**macOS:** `brew install portaudio ffmpeg`

**Debian / Ubuntu:** `sudo apt-get install -y portaudio19-dev libsndfile1 ffmpeg`

**Windows:** PortAudio ships with the `sounddevice` wheel. Install [ffmpeg](https://www.gyan.dev/ffmpeg/builds/) for playback.

Set `JARVIS_WAKE=off` for text-only chat.

---

## Using a local LLM (offline brain) with Ollama

```bash
ollama pull gemma4:latest
```

```dotenv
JARVIS_OLLAMA_MODEL=gemma4:latest
OLLAMA_HOST=http://localhost:11434
```

Combined with `JARVIS_STT=whisper-local` and `JARVIS_TTS=pyttsx3` → 100% offline.

---

## Always-on wake word ("Hey Jarvis")

Set `JARVIS_WAKE=openwakeword` in `.env`. First run downloads a small ONNX model (~5 MB).

---

## What it can do out of the box (tools the model can call)

| Tool | Description |
| --- | --- |
| `get_time` | Current local time |
| `open_url` | Opens a URL in your default browser |
| `open_application` | Launches a desktop app |
| `web_search` | DuckDuckGo search |
| `run_shell_command` | Executes a shell command |
| `system_info` | OS / Python / hostname |
| `system_health` | Probe OpenClaw, Nerve, Ollama |
| `delegate_to_openclaw` | Delegate to UnyKorn agent mesh |

> ⚠️ `run_shell_command` is model-controlled. Remove from `jarvis/skills.py:SKILLS` to disable.

**Flowcharts:** [docs/FLOWCHARTS.md](docs/FLOWCHARTS.md)

---

## Add your own skill

Open `jarvis/skills.py` — add a function + JSON schema to `SKILLS`. The brain picks it up on next launch.

---

## Project layout

```
jarvis/
├── docs/                  # Launch guides, UnyKorn integration, flowcharts
├── scripts/
│   └── start-jarvis.ps1   # One-click Windows launcher
├── jarvis/
│   ├── __main__.py        # python -m jarvis
│   ├── assistant.py       # wake → listen → think → speak
│   ├── brain.py           # OpenAI / Ollama / OpenClaw
│   ├── skills.py          # tools + UnyKorn delegation
│   ├── config.py
│   ├── system_context.txt # FTH prompt injection
│   └── audio/             # tts, stt, wake
```

---

## License

MIT — do whatever you want with it.
