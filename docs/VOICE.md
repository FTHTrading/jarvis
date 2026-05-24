# Lifelike voice (STT + TTS)

Videos that feel “like Jarvis” usually combine:

1. **Low-latency speech-to-text (STT)** — you talk naturally  
2. **Expressive text-to-speech (TTS)** — short, conversational replies  
3. **Barge-in** (optional) — you can interrupt while it speaks  

This sample uses **OpenAI Whisper API** for STT (reliable, easy setup). For fully offline STT, swap in `faster-whisper` or use **isair/jarvis** / **OpenJarvis** voice extras.

## Text-to-speech providers

Configure in `.env` with `TTS_PROVIDER`.

### `edge` (default, free)

Uses `edge-tts` (Microsoft neural voices). Good balance for testing.

```env
TTS_PROVIDER=edge
EDGE_VOICE=en-GB-RyanNeural
```

### `openai` (natural, paid)

```env
TTS_PROVIDER=openai
OPENAI_TTS_VOICE=onyx
OPENAI_TTS_MODEL=tts-1-hd
```

### `elevenlabs` (most “movie Jarvis”, paid)

Sign up at [elevenlabs.io](https://elevenlabs.io), pick a voice, copy the voice ID.

```env
TTS_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...
```

The sample plays MP3 via `ffplay` / `afplay` / Windows `start` — install `ffmpeg` on Linux for `ffplay`.

## Making replies feel conversational

In `assistant/agent.py`, the system prompt already asks for:

- Short spoken answers (1–3 sentences unless you ask for detail)  
- No markdown or bullet lists when speaking  
- Confirm destructive actions before running shell commands  

Tune personality by editing `SYSTEM_PROMPT` in `agent.py`.

## STT alternatives (offline / local)

| Library | Pros | Cons |
|---------|------|------|
| `faster-whisper` | Offline, free | GPU helps; more code |
| `openai-whisper` (API) | Simple | Sends audio to OpenAI |
| OS dictation | Zero setup | Not wired to your agent loop |

For wake-word (“Hey Jarvis”), use **openWakeWord** or **Porcupine** — see [OpenJarvis voice extras](https://github.com/open-jarvis/OpenJarvis) and [isair/jarvis](https://github.com/isair/jarvis) (built-in).

## Latency tips

- Keep TTS replies short.  
- Stream TTS if your provider supports it (ElevenLabs streaming).  
- Use a local LLM (Ollama) for the brain if network RTT hurts; keep cloud TTS only for voice quality.
