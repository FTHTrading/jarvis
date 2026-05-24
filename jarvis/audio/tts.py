"""Text-to-speech. Supports ElevenLabs, OpenAI TTS, and offline pyttsx3."""

from __future__ import annotations

import io
import os
import shutil
import subprocess
import sys
import tempfile
from typing import Optional, Protocol

from ..config import Config, config


class _Speaker(Protocol):
    def speak(self, text: str) -> None: ...
    def close(self) -> None: ...


# ---------------------------------------------------------------------------
# Playback helpers
# ---------------------------------------------------------------------------

def _play_audio_bytes(data: bytes, suffix: str = ".mp3") -> None:
    """Play raw audio bytes through the best available player."""
    # 1) Try pydub (uses ffmpeg/simpleaudio under the hood). Works cross-platform.
    try:
        from pydub import AudioSegment
        from pydub.playback import play

        audio = AudioSegment.from_file(io.BytesIO(data))
        play(audio)
        return
    except Exception:
        pass

    # 2) Fall back to the platform's built-in media CLI.
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(data)
        tmp_path = tmp.name
    try:
        if sys.platform == "darwin":
            subprocess.run(["afplay", tmp_path], check=False)
        elif sys.platform.startswith("linux"):
            for player in ("mpv", "ffplay", "mpg123", "aplay", "paplay"):
                if shutil.which(player):
                    args = [player, "-nodisp", "-autoexit", tmp_path] if player == "ffplay" else [player, tmp_path]
                    subprocess.run(args, check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    break
        elif sys.platform == "win32":
            # PowerShell can play media files without extra deps.
            ps = (
                f"Add-Type -AssemblyName presentationCore; "
                f"$p=New-Object System.Windows.Media.MediaPlayer; "
                f"$p.Open([Uri]::new('{tmp_path}')); $p.Play(); "
                "Start-Sleep -Seconds 1; while($p.NaturalDuration.HasTimeSpan -eq $false){Start-Sleep -Milliseconds 50}; "
                "Start-Sleep -Seconds ([int]$p.NaturalDuration.TimeSpan.TotalSeconds)"
            )
            subprocess.run(["powershell", "-NoProfile", "-Command", ps], check=False)
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass


# ---------------------------------------------------------------------------
# Engines
# ---------------------------------------------------------------------------

class ElevenLabsSpeaker:
    def __init__(self, cfg: Config):
        from elevenlabs.client import ElevenLabs  # type: ignore

        self.cfg = cfg
        self.client = ElevenLabs(api_key=cfg.elevenlabs_api_key)

    def speak(self, text: str) -> None:
        audio_stream = self.client.text_to_speech.convert(
            voice_id=self.cfg.elevenlabs_voice_id,
            model_id=self.cfg.elevenlabs_model,
            text=text,
            output_format="mp3_44100_128",
        )
        data = b"".join(chunk for chunk in audio_stream if chunk)
        _play_audio_bytes(data, suffix=".mp3")

    def close(self) -> None: ...


class OpenAITTSSpeaker:
    def __init__(self, cfg: Config):
        from openai import OpenAI  # type: ignore

        self.cfg = cfg
        self.client = OpenAI(api_key=cfg.openai_api_key)

    def speak(self, text: str) -> None:
        with self.client.audio.speech.with_streaming_response.create(
            model=self.cfg.openai_tts_model,
            voice=self.cfg.openai_tts_voice,
            input=text,
            response_format="mp3",
        ) as response:
            data = b"".join(response.iter_bytes())
        _play_audio_bytes(data, suffix=".mp3")

    def close(self) -> None: ...


class Pyttsx3Speaker:
    def __init__(self, cfg: Config):
        import pyttsx3  # type: ignore

        self.engine = pyttsx3.init()
        # Pick a deeper male voice if available — feels more Jarvis-y.
        for voice in self.engine.getProperty("voices"):
            name = (voice.name or "").lower()
            if any(tag in name for tag in ("male", "david", "daniel", "alex", "fred")):
                self.engine.setProperty("voice", voice.id)
                break
        self.engine.setProperty("rate", 185)

    def speak(self, text: str) -> None:
        self.engine.say(text)
        self.engine.runAndWait()

    def close(self) -> None:
        try:
            self.engine.stop()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def build_speaker(cfg: Optional[Config] = None) -> _Speaker:
    cfg = cfg or config
    engine = cfg.resolved_tts()

    if engine == "elevenlabs":
        if not cfg.elevenlabs_api_key:
            print("[tts] ELEVENLABS_API_KEY missing — falling back to pyttsx3.", file=sys.stderr)
            return Pyttsx3Speaker(cfg)
        try:
            return ElevenLabsSpeaker(cfg)
        except Exception as exc:  # pragma: no cover
            print(f"[tts] ElevenLabs unavailable ({exc}); falling back to pyttsx3.", file=sys.stderr)
            return Pyttsx3Speaker(cfg)

    if engine == "openai":
        if not cfg.openai_api_key:
            print("[tts] OPENAI_API_KEY missing — falling back to pyttsx3.", file=sys.stderr)
            return Pyttsx3Speaker(cfg)
        try:
            return OpenAITTSSpeaker(cfg)
        except Exception as exc:  # pragma: no cover
            print(f"[tts] OpenAI TTS unavailable ({exc}); falling back to pyttsx3.", file=sys.stderr)
            return Pyttsx3Speaker(cfg)

    return Pyttsx3Speaker(cfg)
