"""Speech-to-text listener with wake-word detection."""

from __future__ import annotations

import asyncio
import queue
import threading
from typing import Optional

import speech_recognition as sr
from rich.console import Console

import config

console = Console()
_recognizer = sr.Recognizer()
_recognizer.energy_threshold = config.MIC_ENERGY_THRESHOLD
_recognizer.pause_threshold = config.MIC_PAUSE_THRESHOLD
_recognizer.dynamic_energy_threshold = True


def _transcribe(audio: sr.AudioData) -> Optional[str]:
    """Convert AudioData to text using Google's free STT API."""
    try:
        return _recognizer.recognize_google(audio).lower().strip()
    except sr.UnknownValueError:
        return None
    except sr.RequestError as exc:
        console.print(f"[red]Speech recognition error: {exc}[/red]")
        return None


def _listen_once(
    mic: sr.Microphone,
    timeout: Optional[float] = None,
    phrase_limit: Optional[float] = None,
) -> Optional[sr.AudioData]:
    """Capture one audio phrase from the microphone."""
    try:
        with mic as source:
            audio = _recognizer.listen(
                source,
                timeout=timeout,
                phrase_time_limit=phrase_limit,
            )
        return audio
    except sr.WaitTimeoutError:
        return None


async def wait_for_wake_word(mic: sr.Microphone) -> bool:
    """
    Block until the wake word is detected in ambient audio.

    Returns True once the user says the wake word. Runs the
    blocking listen call in a thread so the event loop stays
    responsive.
    """
    loop = asyncio.get_event_loop()
    wake_word = config.WAKE_WORD

    console.print(
        f"[dim]Listening for wake word '[bold]{wake_word}[/bold]'...[/dim]"
    )

    while True:
        audio = await loop.run_in_executor(
            None,
            lambda: _listen_once(mic, timeout=None, phrase_limit=4),
        )
        if audio is None:
            continue

        text = await loop.run_in_executor(None, lambda: _transcribe(audio))
        if text and wake_word in text:
            return True


async def listen_for_command(mic: sr.Microphone) -> Optional[str]:
    """
    Listen for a single command after the wake word is triggered.

    Returns the transcribed text, or None if nothing was captured.
    """
    loop = asyncio.get_event_loop()

    console.print("[cyan]Listening...[/cyan]")

    audio = await loop.run_in_executor(
        None,
        lambda: _listen_once(
            mic,
            timeout=config.COMMAND_TIMEOUT,
            phrase_limit=15,
        ),
    )

    if audio is None:
        return None

    text = await loop.run_in_executor(None, lambda: _transcribe(audio))
    return text


def create_microphone() -> sr.Microphone:
    """Create and calibrate a Microphone instance."""
    mic = sr.Microphone()
    console.print("[dim]Calibrating microphone for ambient noise...[/dim]")
    with mic as source:
        _recognizer.adjust_for_ambient_noise(source, duration=1)
    return mic
