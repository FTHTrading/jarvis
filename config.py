"""Central configuration — loaded once at startup."""

import os
from dotenv import load_dotenv

load_dotenv()

# ── AI ─────────────────────────────────────────────────────────────────────
OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o")

# ── Voice output ────────────────────────────────────────────────────────────
VOICE_NAME: str = os.getenv("VOICE_NAME", "en-GB-RyanNeural")
VOICE_RATE: str = os.getenv("VOICE_RATE", "+5%")

# ── Wake word ───────────────────────────────────────────────────────────────
WAKE_WORD: str = os.getenv("WAKE_WORD", "jarvis").lower()

# ── User preferences ────────────────────────────────────────────────────────
USER_NAME: str = os.getenv("USER_NAME", "sir")
DEFAULT_CITY: str = os.getenv("DEFAULT_CITY", "New York")

# ── Input mode ──────────────────────────────────────────────────────────────
# "voice" | "text" | "silent"
INPUT_MODE: str = os.getenv("INPUT_MODE", "voice").lower()

# ── Optional API keys ───────────────────────────────────────────────────────
OPENWEATHERMAP_API_KEY: str = os.getenv("OPENWEATHERMAP_API_KEY", "")

# ── Conversation memory ─────────────────────────────────────────────────────
MAX_HISTORY_TURNS: int = int(os.getenv("MAX_HISTORY_TURNS", "20"))

# ── Microphone ──────────────────────────────────────────────────────────────
MIC_ENERGY_THRESHOLD: int = int(os.getenv("MIC_ENERGY_THRESHOLD", "300"))
MIC_PAUSE_THRESHOLD: float = float(os.getenv("MIC_PAUSE_THRESHOLD", "0.8"))
COMMAND_TIMEOUT: int = int(os.getenv("COMMAND_TIMEOUT", "8"))
