# Local setup (Path B — this repo)

## Requirements

- **Python 3.10+**
- Microphone and speakers (or headset)
- **Linux**, **macOS**, or **Windows**
- At least one LLM API key (OpenAI or Anthropic) in `.env`

Optional:

- `ffmpeg` — helps some audio backends
- PulseAudio / PipeWire (Linux) or normal macOS/Windows audio drivers

## Install

From the repository root:

```bash
cd assistant
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Copy environment template:

```bash
cp .env.example .env
```

Edit `.env`:

```env
OPENAI_API_KEY=sk-...
# or
ANTHROPIC_API_KEY=sk-ant-...

# Optional: better voice
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

TTS_PROVIDER=edge   # edge | openai | elevenlabs
LLM_PROVIDER=openai # openai | anthropic
```

## Run

**Push-to-talk (default, safest):**

```bash
python main.py
```

Press Enter when prompted, speak, press Enter again to finish recording.

**Continuous loop** (one utterance per cycle):

```bash
python main.py --loop
```

## What it can do today

The sample agent exposes tools the model may call:

| Tool | Example use |
|------|-------------|
| `run_shell` | “List files in Downloads” |
| `open_url` | “Open GitHub” |
| `get_time` | “What time is it?” |

Extend `assistant/tools.py` for: launch apps, read clipboard, Home Assistant, etc.

## Upgrade to a full Jarvis

When you outgrow the sample:

1. Install [isair/jarvis](https://github.com/isair/jarvis) or [OpenJarvis](https://github.com/open-jarvis/OpenJarvis).
2. Keep this repo for **Cursor-specific** notes in `docs/CURSOR.md`.
3. Point your local Jarvis MCP servers at the same tools you add here.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `No module named 'sounddevice'` | `pip install -r requirements.txt` inside venv |
| Mic not detected | Check OS privacy settings → allow terminal/Python microphone |
| Empty transcription | Speak louder; reduce background noise; try `--duration 8` |
| Robotic voice | Set `TTS_PROVIDER=openai` or `elevenlabs` in `.env` |
