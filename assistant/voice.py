import asyncio
import json
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import sounddevice as sd
from scipy.io import wavfile

from config import (
    EDGE_VOICE,
    ELEVENLABS_API_KEY,
    ELEVENLABS_VOICE_ID,
    OPENAI_API_KEY,
    OPENAI_TTS_MODEL,
    OPENAI_TTS_VOICE,
    RECORD_SECONDS,
    SAMPLE_RATE,
    TTS_PROVIDER,
)


def record_audio(seconds: int | None = None) -> Path:
    duration = seconds or RECORD_SECONDS
    print(f"Recording {duration}s — speak now...")
    audio = sd.rec(
        int(duration * SAMPLE_RATE),
        samplerate=SAMPLE_RATE,
        channels=1,
        dtype="float32",
    )
    sd.wait()
    path = Path(tempfile.mktemp(suffix=".wav"))
    wavfile.write(path, SAMPLE_RATE, (audio * 32767).astype(np.int16))
    return path


def transcribe(wav_path: Path) -> str:
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY required for Whisper transcription")
    from openai import OpenAI

    client = OpenAI(api_key=OPENAI_API_KEY)
    with wav_path.open("rb") as audio_file:
        result = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
        )
    return (result.text or "").strip()


def speak(text: str) -> None:
    if not text:
        return
    provider = TTS_PROVIDER
    if provider == "openai":
        _speak_openai(text)
    elif provider == "elevenlabs":
        _speak_elevenlabs(text)
    else:
        _speak_edge(text)


def _play_file(path: Path) -> None:
    import platform
    import shutil

    system = platform.system()
    if system == "Darwin":
        subprocess.run(["afplay", str(path)], check=False)
    elif system == "Windows":
        subprocess.run(
            ["powershell", "-c", f"(New-Object Media.SoundPlayer '{path}').PlaySync();"],
            check=False,
        )
    elif shutil.which("ffplay"):
        subprocess.run(
            ["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", str(path)],
            check=False,
        )
    else:
        subprocess.run(["xdg-open", str(path)], check=False)


def _speak_edge(text: str) -> None:
    import edge_tts

    async def _run() -> None:
        path = Path(tempfile.mktemp(suffix=".mp3"))
        communicate = edge_tts.Communicate(text, EDGE_VOICE)
        await communicate.save(str(path))
        _play_file(path)

    asyncio.run(_run())


def _speak_openai(text: str) -> None:
    from openai import OpenAI

    client = OpenAI(api_key=OPENAI_API_KEY)
    path = Path(tempfile.mktemp(suffix=".mp3"))
    with client.audio.speech.with_streaming_response.create(
        model=OPENAI_TTS_MODEL,
        voice=OPENAI_TTS_VOICE,
        input=text,
    ) as response:
        response.stream_to_file(path)
    _play_file(path)


def _speak_elevenlabs(text: str) -> None:
    import httpx

    if not ELEVENLABS_API_KEY or not ELEVENLABS_VOICE_ID:
        raise RuntimeError("ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID required")
    path = Path(tempfile.mktemp(suffix=".mp3"))
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
    }
    with httpx.Client(timeout=60.0) as client:
        response = client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        path.write_bytes(response.content)
    _play_file(path)
