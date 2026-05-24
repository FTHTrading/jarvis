"""Text-to-speech using Microsoft Edge neural voices (edge-tts)."""

from __future__ import annotations

import asyncio
import os
import tempfile
import platform
import subprocess
from typing import Optional

import edge_tts
from rich.console import Console

import config

console = Console()

# Suppress pygame display requirement
os.environ.setdefault("SDL_VIDEODRIVER", "dummy")
os.environ.setdefault("SDL_AUDIODRIVER", "pulseaudio")

_pygame_ready = False

def _init_pygame() -> bool:
    """Lazily initialise pygame mixer; returns True on success."""
    global _pygame_ready
    if _pygame_ready:
        return True
    try:
        import pygame
        pygame.mixer.pre_init(frequency=44100, size=-16, channels=2, buffer=2048)
        pygame.mixer.init()
        _pygame_ready = True
        return True
    except Exception:
        return False


def _play_mp3_system(path: str) -> None:
    """Fallback: play MP3 using a system command."""
    system = platform.system()
    try:
        if system == "Linux":
            # Try multiple players in order of preference
            for player in ["mpg123", "mpg321", "ffplay", "cvlc"]:
                if subprocess.run(
                    ["which", player], capture_output=True
                ).returncode == 0:
                    args = [player, "-q", path] if player in ("mpg123", "mpg321") else [
                        "ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", path
                    ] if player == "ffplay" else [
                        "cvlc", "--play-and-exit", "--quiet", path
                    ]
                    subprocess.run(args, capture_output=True, check=False)
                    return
            console.print(
                "[yellow]No audio player found. Install mpg123: sudo apt install mpg123[/yellow]"
            )
        elif system == "Darwin":
            subprocess.run(["afplay", path], check=False, capture_output=True)
        elif system == "Windows":
            subprocess.run(
                ["powershell", "-c",
                 f"(New-Object Media.SoundPlayer '{path}').PlaySync()"],
                check=False,
                capture_output=True,
            )
    except Exception as exc:
        console.print(f"[red]Audio playback error: {exc}[/red]")


async def _play_with_pygame(path: str) -> None:
    """Play audio file using pygame mixer."""
    try:
        import pygame
        pygame.mixer.music.load(path)
        pygame.mixer.music.play()
        while pygame.mixer.music.get_busy():
            await asyncio.sleep(0.05)
        pygame.mixer.music.unload()
    except Exception as exc:
        console.print(f"[yellow]pygame playback issue, using fallback: {exc}[/yellow]")
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _play_mp3_system, path)


async def speak(
    text: str,
    voice: Optional[str] = None,
    rate: Optional[str] = None,
) -> None:
    """
    Convert *text* to speech and play it immediately.

    Uses Microsoft Edge TTS neural voices — completely free, no API key
    needed. Voice quality is on par with paid services like ElevenLabs.
    """
    if not text or not text.strip():
        return

    voice = voice or config.VOICE_NAME
    rate = rate or config.VOICE_RATE

    # Generate audio to a temp file
    tmp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
    tmp_path = tmp.name
    tmp.close()

    try:
        communicate = edge_tts.Communicate(text, voice, rate=rate)
        await communicate.save(tmp_path)
    except Exception as exc:
        console.print(f"[red]TTS generation failed: {exc}[/red]")
        os.unlink(tmp_path)
        return

    # Play audio
    try:
        if _init_pygame():
            await _play_with_pygame(tmp_path)
        else:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, _play_mp3_system, tmp_path)
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


async def list_voices() -> list[dict]:
    """Return all available edge-tts voices."""
    return await edge_tts.list_voices()


async def speak_status(text: str) -> None:
    """Speak a brief status/acknowledgment phrase."""
    await speak(text)
