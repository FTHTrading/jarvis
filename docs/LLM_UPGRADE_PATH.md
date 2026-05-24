# LLM upgrade path

Model selection for **Primary** (RTX 5090, 64GB RAM) and fallback to cloud.

## Backend matrix

| Backend | When to use | Config |
|---------|-------------|--------|
| **OpenClaw** | Full agent mesh, spawn, x402, TEAM_BUS | `JARVIS_BRAIN=openclaw` |
| **Ollama** | Offline / low-latency local, tool calling | `JARVIS_OLLAMA_MODEL=gemma4:latest` |
| **OpenAI** | Best quality when online, no local GPU load | `OPENAI_API_KEY` + `JARVIS_LLM_MODEL=gpt-4o-mini` |

Auto-resolution: if `JARVIS_OLLAMA_MODEL` is set and `JARVIS_BRAIN=openai`, Ollama wins (backward compatible with PR #1).

## Ollama models (RTX 5090)

| Model | Alias | Best for | VRAM (approx) | Tool calling |
|-------|-------|----------|---------------|--------------|
| `gemma4:latest` | gemma4 | **Default OpenClaw primary** — orchestration, voice replies | ~8–12GB | Good |
| `qwen2.5-coder:14b` | coder14 | Heavy codegen, refactors | ~10–14GB | Excellent |
| `qwen2.5-coder:7b` | coder | Fast scripts, cron, wrangler | ~5GB | Excellent |
| `qwen2.5:7b` | qwen7 | General chat fallback | ~5GB | Good |
| `llama3.2:3b` | fast | Wake-word ack, health probes | ~2GB | Limited |
| `llama3.1` | — | Jarvis README default (generic) | ~5–8GB | Good |

### Recommendations

- **Jarvis voice assistant (local tools):** `gemma4:latest` or `llama3.1`
- **Coding tasks in Jarvis:** `qwen2.5-coder:7b` (fast) or `:14b` (deep)
- **OpenClaw mesh default:** already `ollama/gemma4:latest` in `~/.openclaw/openclaw.json`
- **Ultra-low latency wake ack:** `llama3.2:3b`

```powershell
ollama pull gemma4:latest
ollama pull qwen2.5-coder:7b
ollama pull llama3.2:3b
```

```dotenv
JARVIS_OLLAMA_MODEL=gemma4:latest
OLLAMA_HOST=http://localhost:11434
```

## OpenAI fallback

Use when Ollama is down or you need stronger reasoning:

```dotenv
JARVIS_BRAIN=openai
OPENAI_API_KEY=sk-...
JARVIS_LLM_MODEL=gpt-4o-mini    # daily driver
# JARVIS_LLM_MODEL=gpt-4o       # hard problems
```

TTS can stay on ElevenLabs independently of brain backend.

## Voice stack pairing (Finn / DONK patterns)

| Layer | Jarvis repo | Finn / Nerve / DONK |
|-------|-------------|---------------------|
| STT | faster-whisper `base.en` | Whisper `base.en` / Nerve hybrid |
| TTS priority | ElevenLabs → OpenAI → pyttsx3 | Piper (Finn) / Edge (Nerve) / ElevenLabs (DONK Live) |
| Offline | whisper-local + pyttsx3 + Ollama | Piper + Whisper (Finn sovereign) |

For **lifelike** on Primary: set `ELEVENLABS_API_KEY` (same key as `apps/donk-live`).

## Upgrade ladder

1. **Day 0:** `gpt-4o-mini` + ElevenLabs + whisper-local (easiest)
2. **Day 1:** `gemma4:latest` Ollama — drop OpenAI brain cost
3. **Day 2:** `JARVIS_BRAIN=openclaw` — join the 10-agent mesh
4. **Day 3:** Nerve + DONK Live for operator voice HUD; Jarvis for quick Windows tasks

## Health before swap

```powershell
curl.exe -s http://127.0.0.1:11434/api/tags
curl.exe -s http://127.0.0.1:18789/health
```

Or ask Jarvis: *"run system health"*.
