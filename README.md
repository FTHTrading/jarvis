# Jarvis

A local, voice-controlled AI assistant for your computer — your own J.A.R.V.I.S.

- **Talks back in a lifelike voice** (ElevenLabs, OpenAI TTS, or offline pyttsx3)
- **Listens to you** with local Whisper (no audio leaves your machine) or the OpenAI API
- **Wakes on "Hey Jarvis"** via [openWakeWord](https://github.com/dscripka/openWakeWord), or push-to-talk
- **Takes actions on your computer**: open apps, open URLs, run shell commands, web search
- **LLM brain**: OpenAI (`gpt-4o-mini` by default) or a local model via [Ollama](https://ollama.com)

> No GPU required. Runs on macOS, Windows, and Linux.

---

## Quick start

```bash
git clone <this repo> jarvis && cd jarvis
python -m venv .venv && source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env        # then edit .env to add your API keys
python -m jarvis
```

By default this launches **push-to-talk mode**: press `Enter` to speak, or just type a message and hit `Enter`. Say "exit" / "goodbye" / press `Ctrl+C` to quit.

---

## Configuration

Everything is configured through `.env` (see `.env.example` for the full list). The most important knobs:

| Variable | What it controls | Default |
| --- | --- | --- |
| `OPENAI_API_KEY` | LLM brain + optional TTS/STT | _required unless using Ollama_ |
| `JARVIS_LLM_MODEL` | OpenAI chat model | `gpt-4o-mini` |
| `JARVIS_OLLAMA_MODEL` | Use a local Ollama model instead | _unset_ |
| `ELEVENLABS_API_KEY` | Lifelike voice | _optional_ |
| `ELEVENLABS_VOICE_ID` | Which voice | Adam |
| `JARVIS_TTS` | `auto` \| `elevenlabs` \| `openai` \| `pyttsx3` | `auto` |
| `JARVIS_STT` | `whisper-local` or `whisper-api` | `whisper-local` |
| `JARVIS_WHISPER_MODEL` | Whisper size: `tiny`, `base.en`, `small`, `medium`, `large-v3` | `base.en` |
| `JARVIS_WAKE` | `openwakeword` \| `ptt` \| `off` | `ptt` |
| `JARVIS_USER_NAME` | What Jarvis calls you | `Sir` |

### "auto" TTS picks the most lifelike option available

1. ElevenLabs (if `ELEVENLABS_API_KEY` is set)
2. OpenAI TTS (if `OPENAI_API_KEY` is set)
3. pyttsx3 offline voice (always works, but sounds robotic)

---

## OS prerequisites for the microphone

The mic/audio stack uses [`sounddevice`](https://python-sounddevice.readthedocs.io/), which needs PortAudio installed at the OS level. Pick your platform:

**macOS** (Homebrew):

```bash
brew install portaudio ffmpeg
```

**Debian / Ubuntu**:

```bash
sudo apt-get install -y portaudio19-dev libsndfile1 ffmpeg
```

**Windows**: PortAudio ships with the `sounddevice` wheel — nothing extra to install. Install [ffmpeg](https://www.gyan.dev/ffmpeg/builds/) and add it to `PATH` for audio playback.

If you don't want voice input at all, set `JARVIS_WAKE=off` and skip the mic deps; you'll get a text chat that still speaks back to you.

---

## Using a local LLM (offline brain) with Ollama

1. Install [Ollama](https://ollama.com/download) and pull a tool-capable model:

   ```bash
   ollama pull llama3.1
   ```

2. In `.env`:

   ```dotenv
   JARVIS_OLLAMA_MODEL=llama3.1
   ```

   Jarvis will route all chat through your local model. Combined with `JARVIS_STT=whisper-local` and `JARVIS_TTS=pyttsx3`, the whole assistant runs 100% offline.

---

## Always-on wake word ("Hey Jarvis")

Set `JARVIS_WAKE=openwakeword` in `.env`. The first run downloads a small ONNX wake-word model (~5 MB). After that, Jarvis sits silently in the background; saying **"Hey Jarvis"** out loud starts a recording, ends on silence, transcribes, and replies.

---

## What it can do out of the box (tools the model can call)

| Tool | Description |
| --- | --- |
| `get_time` | Current local time |
| `open_url` | Opens a URL in your default browser |
| `open_application` | Launches a desktop app (`Spotify`, `Calculator`, etc.) |
| `web_search` | DuckDuckGo search |
| `run_shell_command` | Executes a shell command on your machine |
| `system_info` | Reports OS / Python / hostname |

> ⚠️ `run_shell_command` lets the model execute arbitrary commands on your computer. If that makes you nervous, remove the entry from `jarvis/skills.py:SKILLS` to disable it.

### Add your own skill

Open `jarvis/skills.py` and add a Python function plus its JSON-schema entry to `SKILLS`. That's it — the brain picks it up automatically on next launch.

```python
def play_song(title: str) -> str:
    # ... your code ...
    return f"Now playing {title}."

SKILLS.append({
    "type": "function",
    "function": {
        "name": "play_song",
        "description": "Play a song by title in Spotify.",
        "parameters": {
            "type": "object",
            "properties": {"title": {"type": "string"}},
            "required": ["title"],
        },
    },
    "_impl": play_song,
})
```

---

## Project layout

```
jarvis/
├── __main__.py        # `python -m jarvis` entry point
├── assistant.py       # main loop: wake → listen → think → speak
├── brain.py           # LLM client with tool-calling (OpenAI / Ollama)
├── skills.py          # tools the model can call on your machine
├── config.py          # .env loading
└── audio/
    ├── tts.py         # ElevenLabs / OpenAI / pyttsx3
    ├── stt.py         # faster-whisper / OpenAI Whisper API
    └── wake.py        # openWakeWord / push-to-talk
```

---

## License

MIT — do whatever you want with it.
