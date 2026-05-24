import os
from pathlib import Path

from dotenv import load_dotenv

_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(_ROOT / ".env")


def _get(key: str, default: str = "") -> str:
    return os.getenv(key, default).strip()


OPENAI_API_KEY = _get("OPENAI_API_KEY")
ANTHROPIC_API_KEY = _get("ANTHROPIC_API_KEY")
LLM_PROVIDER = _get("LLM_PROVIDER", "openai").lower()
OPENAI_MODEL = _get("OPENAI_MODEL", "gpt-4o-mini")
ANTHROPIC_MODEL = _get("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")

TTS_PROVIDER = _get("TTS_PROVIDER", "edge").lower()
EDGE_VOICE = _get("EDGE_VOICE", "en-GB-RyanNeural")
OPENAI_TTS_VOICE = _get("OPENAI_TTS_VOICE", "onyx")
OPENAI_TTS_MODEL = _get("OPENAI_TTS_MODEL", "tts-1-hd")
ELEVENLABS_API_KEY = _get("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = _get("ELEVENLABS_VOICE_ID")

SAMPLE_RATE = int(_get("SAMPLE_RATE", "16000"))
RECORD_SECONDS = int(_get("RECORD_SECONDS", "6"))
