# Launch checklist

Pre-flight before first run on **Primary** (Windows).

## 1. Clone & env

- [ ] `git clone https://github.com/FTHTrading/jarvis.git`
- [ ] `copy .env.example .env`
- [ ] Set `OPENAI_API_KEY` **or** `JARVIS_OLLAMA_MODEL=gemma4:latest`
- [ ] Optional: `ELEVENLABS_API_KEY` for lifelike voice (DONK Live uses same key)
- [ ] Optional: `OPENCLAW_GATEWAY_TOKEN` from `~/.openclaw/openclaw.json` (never commit)

## 2. Python & deps

- [ ] Python 3.11+ installed
- [ ] `python -m venv .venv` → `.venv\Scripts\activate`
- [ ] `pip install -r requirements.txt`
- [ ] [ffmpeg](https://www.gyan.dev/ffmpeg/builds/) on PATH (audio playback)

## 3. Mic & wake

- [ ] Windows mic permissions for Python
- [ ] Test: `JARVIS_WAKE=ptt` first (Enter to speak)
- [ ] Later: `JARVIS_WAKE=openwakeword` for "Hey Jarvis"

## 4. Ollama (optional local brain)

- [ ] Ollama installed from https://ollama.com
- [ ] `ollama pull gemma4:latest`
- [ ] `curl.exe -s http://127.0.0.1:11434/api/tags` → 200

## 5. FTH stack (optional mesh)

- [ ] OpenClaw gateway: `curl.exe -s http://127.0.0.1:18789/health` → 200
- [ ] Nerve: `curl.exe -s http://127.0.0.1:3080/health` → 200
- [ ] Global CLI: `openclaw --version`
- [ ] Start stack: `C:\Users\Kevan\.openclaw\workspace\scripts\START_OPERATOR_STACK.ps1`

## 6. ElevenLabs (optional)

- [ ] Key at https://elevenlabs.io/app/settings/api-keys
- [ ] `JARVIS_TTS=auto` picks ElevenLabs when key present
- [ ] Voice ID defaults to Adam; browse library for custom voice

## 7. First run

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-jarvis.ps1
```

Or manually:

```powershell
python -m jarvis
```

- [ ] Hear greeting: *"Good day, Sir. How can I help?"*
- [ ] Press Enter → speak → get spoken reply
- [ ] Try: *"what time is it"* / *"open github.com"*
- [ ] Try: *"run system health"* (if gateway up)
- [ ] Say *"goodbye"* to exit

## 8. Samsung mobile (separate)

- [ ] Tailscale on phone + Primary
- [ ] Bixby routine → https://hail.unykorn.org ([samsung-one-tap.md](samsung-one-tap.md))

## Troubleshooting

| Issue | Fix |
|-------|-----|
| No mic | `JARVIS_WAKE=off` for text-only; check Windows privacy settings |
| TTS silent | Install ffmpeg; try `JARVIS_TTS=pyttsx3` |
| OpenAI error | Set key or switch to Ollama |
| delegate fails | Start gateway; verify `OPENCLAW_GATEWAY_TOKEN` |
| Whisper slow first run | Model download; use `JARVIS_WHISPER_MODEL=tiny` for test |

## Docs

- [UNYKORN_INTEGRATION.md](UNYKORN_INTEGRATION.md)
- [LLM_UPGRADE_PATH.md](LLM_UPGRADE_PATH.md)
- [00-TABLE-OF-CONTENTS.md](00-TABLE-OF-CONTENTS.md)
