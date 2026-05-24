# Jarvis — AI Personal Assistant

A fully local, voice-activated AI assistant inspired by Iron Man's J.A.R.V.I.S. — powered by GPT-4o and Microsoft's free neural text-to-speech voices.

> "Just A Rather Very Intelligent System"

---

## What It Does

- **Wake-word activation** — say "Jarvis" and it wakes up, listens, and responds
- **Lifelike voice** — uses Microsoft's Edge TTS neural voices (same engine as Windows 11, completely free, no API key needed)
- **GPT-4o brain** — intelligent, context-aware responses with a polished British personality
- **Computer control** — open apps, type text, take screenshots, control volume, run shell commands
- **Web skills** — search the web, get weather, check the time
- **Music** — play music via YouTube Music or Spotify
- **Clipboard** — read and write system clipboard
- **System monitoring** — CPU, RAM, battery, disk usage

---

## Quick Setup

### 1. Install System Dependencies

**macOS:**
```bash
brew install portaudio
```

**Ubuntu / Debian:**
```bash
sudo apt update
sudo apt install portaudio19-dev python3-pyaudio mpg123
```

**Windows:**
- Install Python 3.10+ from [python.org](https://python.org)
- `pip install pipwin && pipwin install pyaudio`

---

### 2. Clone and Install Python Packages

```bash
git clone <repo-url>
cd jarvis
pip install -r requirements.txt
```

---

### 3. Configure Your API Key

```bash
cp .env.example .env
```

Open `.env` and fill in:

```
OPENAI_API_KEY=sk-...        ← Required (get one at platform.openai.com)
USER_NAME=sir                ← How Jarvis addresses you (optional)
DEFAULT_CITY=New York        ← For weather lookups (optional)
```

---

### 4. Run Jarvis

```bash
# Full voice mode (microphone + speaker)
python main.py

# Text input, voice output (great for testing)
python main.py --mode text

# Completely silent (text only, no audio)
python main.py --mode silent
```

---

## Usage

### Voice Mode (default)

1. Run `python main.py`
2. Wait for "Jarvis is online" — it will speak a greeting
3. Say **"Jarvis"** — the wake word
4. Speak your command
5. Jarvis responds with voice and text

**Example commands:**
- "Jarvis, open Chrome"
- "Jarvis, what's the weather in London?"
- "Jarvis, take a screenshot"
- "Jarvis, set the volume to 50"
- "Jarvis, search for the latest AI news"
- "Jarvis, play some jazz music"
- "Jarvis, what's my CPU usage?"
- "Jarvis, type 'Hello World'"
- "Jarvis, what time is it?"
- "Jarvis, open YouTube"
- "Jarvis, copy this to clipboard: my email is test@example.com"

Say **"goodbye"** or **"shut down"** to exit.

---

### Text Mode

```bash
python main.py --mode text
```

Type commands at the `You:` prompt. Jarvis still speaks its responses.

### Silent Mode

```bash
python main.py --mode silent
```

Fully text-based — no microphone or speakers needed. Great for environments where audio isn't available.

---

## Voice Customization

List all available neural voices:
```bash
python main.py --list-voices
```

**Recommended voices:**

| Voice | Style |
|-------|-------|
| `en-GB-RyanNeural` | British male — classic Jarvis (default) |
| `en-GB-ThomasNeural` | British male — warm and natural |
| `en-US-GuyNeural` | American male — professional |
| `en-US-AriaNeural` | American female — clear and articulate |
| `en-GB-SoniaNeural` | British female — elegant |

Set a custom voice:
```bash
python main.py --voice en-US-GuyNeural
```

Or set it permanently in `.env`:
```
VOICE_NAME=en-GB-ThomasNeural
```

---

## Configuration Reference

All settings live in `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | — | **Required.** Your OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o` | AI model (`gpt-4o`, `gpt-4o-mini`) |
| `VOICE_NAME` | `en-GB-RyanNeural` | TTS voice |
| `VOICE_RATE` | `+5%` | Speech speed (`-20%` to `+50%`) |
| `WAKE_WORD` | `jarvis` | Word(s) to activate voice listening |
| `USER_NAME` | `sir` | How Jarvis addresses you |
| `DEFAULT_CITY` | `New York` | Default city for weather |
| `INPUT_MODE` | `voice` | `voice`, `text`, or `silent` |
| `MAX_HISTORY_TURNS` | `20` | Conversation memory length |
| `MIC_ENERGY_THRESHOLD` | `300` | Mic sensitivity (lower = more sensitive) |
| `COMMAND_TIMEOUT` | `8` | Seconds to wait for a voice command |

---

## Architecture

```
jarvis/
├── main.py                  ← Entry point & CLI
├── config.py                ← Loads .env settings
├── requirements.txt
│
└── jarvis/
    ├── assistant.py         ← Main orchestrator
    │
    ├── brain/
    │   ├── llm.py           ← GPT-4o + function calling (14 tools)
    │   └── memory.py        ← Sliding-window conversation history
    │
    ├── voice/
    │   ├── listener.py      ← Speech-to-text (Google STT)
    │   └── speaker.py       ← Text-to-speech (edge-tts neural voices)
    │
    └── skills/
        ├── system_control.py  ← Open apps, type, screenshot, clipboard
        ├── web_skills.py      ← Search, weather, time
        └── media_skills.py    ← Music playback
```

### How It Works

```
Wake word detected
       ↓
Listen for command (speech → text)
       ↓
Send to GPT-4o with Jarvis personality
       ↓
GPT-4o decides to use tools or respond directly
       ↓
Tools executed (computer control, web, etc.)
       ↓
Final response generated
       ↓
Text-to-speech via edge-tts neural voice
       ↓
Audio played → back to wake word detection
```

---

## Troubleshooting

**No microphone / PyAudio errors:**
```bash
# Linux
sudo apt install portaudio19-dev
pip install pyaudio

# macOS
brew install portaudio && pip install pyaudio
```

**No audio output:**
```bash
# Linux — install mpg123
sudo apt install mpg123

# Test edge-tts directly
python -c "import asyncio; import edge_tts; asyncio.run(edge_tts.Communicate('Hello sir.', 'en-GB-RyanNeural').save('/tmp/test.mp3'))"
mpg123 /tmp/test.mp3
```

**Speech not recognized:**
- Make sure you're connected to the internet (Google STT requires it)
- Adjust microphone sensitivity: set `MIC_ENERGY_THRESHOLD=200` in `.env`
- Try text mode first: `python main.py --mode text`

**OpenAI errors:**
- Verify your API key at https://platform.openai.com
- Check you have GPT-4o access (or switch to `OPENAI_MODEL=gpt-4o-mini`)

---

## Privacy Notes

- **Voice input** is transcribed using Google's free STT API — audio is sent to Google's servers
- **TTS** uses Microsoft's Edge service — text is sent to Microsoft servers
- **AI responses** use OpenAI's API — conversation is sent to OpenAI's servers
- For fully local/private operation: replace Google STT with `faster-whisper` and the cloud TTS with `piper-tts`

---

## Extending Jarvis

To add a new skill:

1. Write the function in `jarvis/skills/`
2. Add it to `jarvis/skills/__init__.py`
3. Define its OpenAI tool schema in `jarvis/brain/llm.py` (`TOOLS` list)
4. Add the dispatch case in `jarvis/assistant.py` (`_execute_skill`)

---

## Requirements

- Python 3.10+
- OpenAI API key
- Internet connection (for STT, TTS, LLM, and web search)
- Microphone (for voice mode)
- Speakers/headphones (for voice output)
