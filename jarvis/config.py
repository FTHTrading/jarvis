"""Runtime configuration loaded from environment variables / .env file."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env", override=False)


def _get(name: str, default: str = "") -> str:
    value = os.environ.get(name, default)
    return value.strip() if isinstance(value, str) else value


TTSEngine = Literal["auto", "elevenlabs", "openai", "pyttsx3"]
STTEngine = Literal["whisper-local", "whisper-api"]
WakeMode = Literal["openwakeword", "ptt", "off"]


@dataclass
class Config:
    # LLM
    openai_api_key: str = field(default_factory=lambda: _get("OPENAI_API_KEY"))
    llm_model: str = field(default_factory=lambda: _get("JARVIS_LLM_MODEL", "gpt-4o-mini"))
    ollama_model: str = field(default_factory=lambda: _get("JARVIS_OLLAMA_MODEL"))
    ollama_host: str = field(
        default_factory=lambda: _get("JARVIS_OLLAMA_HOST", "http://localhost:11434")
    )

    # TTS
    tts_engine: TTSEngine = field(default_factory=lambda: _get("JARVIS_TTS", "auto"))  # type: ignore[assignment]
    elevenlabs_api_key: str = field(default_factory=lambda: _get("ELEVENLABS_API_KEY"))
    elevenlabs_voice_id: str = field(
        default_factory=lambda: _get("ELEVENLABS_VOICE_ID", "pNInz6obpgDQGcFmaJgB")
    )
    elevenlabs_model: str = field(
        default_factory=lambda: _get("ELEVENLABS_MODEL", "eleven_turbo_v2_5")
    )
    openai_tts_voice: str = field(
        default_factory=lambda: _get("JARVIS_OPENAI_TTS_VOICE", "onyx")
    )
    openai_tts_model: str = field(
        default_factory=lambda: _get("JARVIS_OPENAI_TTS_MODEL", "gpt-4o-mini-tts")
    )

    # STT
    stt_engine: STTEngine = field(default_factory=lambda: _get("JARVIS_STT", "whisper-local"))  # type: ignore[assignment]
    whisper_model: str = field(
        default_factory=lambda: _get("JARVIS_WHISPER_MODEL", "base.en")
    )

    # Wake
    wake_mode: WakeMode = field(default_factory=lambda: _get("JARVIS_WAKE", "ptt"))  # type: ignore[assignment]

    # Personality
    name: str = field(default_factory=lambda: _get("JARVIS_NAME", "Jarvis"))
    user_name: str = field(default_factory=lambda: _get("JARVIS_USER_NAME", "Sir"))

    def resolved_tts(self) -> TTSEngine:
        """Pick a concrete TTS engine when set to 'auto'."""
        if self.tts_engine != "auto":
            return self.tts_engine
        if self.elevenlabs_api_key:
            return "elevenlabs"
        if self.openai_api_key:
            return "openai"
        return "pyttsx3"

    def system_prompt(self) -> str:
        return (
            f"You are {self.name}, a witty, concise voice-controlled assistant "
            f"styled after Tony Stark's J.A.R.V.I.S. You address the user as "
            f"'{self.user_name}'. You run locally on the user's computer and "
            "can answer questions, control the machine through provided tools, "
            "search the web, and hold a natural spoken conversation. "
            "Replies are short and spoken aloud, so avoid Markdown, code "
            "fences, bullet lists, or long preambles unless explicitly asked. "
            "If you call a tool, briefly narrate what you're doing in one line."
        )


config = Config()
