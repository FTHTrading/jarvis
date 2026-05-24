"""Speech-to-text and microphone capture."""

from __future__ import annotations

import io
import sys
import tempfile
import wave
from pathlib import Path
from typing import Optional, Protocol

from ..config import Config, config


class _Transcriber(Protocol):
    def transcribe(self, wav_path: str) -> str: ...


# ---------------------------------------------------------------------------
# Microphone capture (voice-activated, stops on silence)
# ---------------------------------------------------------------------------

def record_until_silence(
    max_seconds: float = 15.0,
    silence_seconds: float = 1.2,
    sample_rate: int = 16_000,
    silence_threshold: float = 0.012,
) -> Optional[bytes]:
    """Record from the default mic until the user stops speaking.

    Returns 16-bit PCM mono WAV bytes, or None if no speech was detected.
    """
    try:
        import numpy as np
        import sounddevice as sd
    except Exception as exc:
        print(f"[stt] microphone unavailable ({exc}).", file=sys.stderr)
        return None

    block = int(sample_rate * 0.05)  # 50ms blocks
    frames: list[np.ndarray] = []
    silent_blocks_needed = int(silence_seconds / 0.05)
    max_blocks = int(max_seconds / 0.05)
    silent_run = 0
    spoke = False

    with sd.InputStream(samplerate=sample_rate, channels=1, dtype="float32", blocksize=block) as stream:
        for _ in range(max_blocks):
            data, _overflowed = stream.read(block)
            chunk = data[:, 0]
            frames.append(chunk.copy())
            rms = float(np.sqrt(np.mean(chunk * chunk)))
            if rms > silence_threshold:
                spoke = True
                silent_run = 0
            elif spoke:
                silent_run += 1
                if silent_run >= silent_blocks_needed:
                    break

    if not spoke:
        return None

    import numpy as np  # noqa: E402  (re-import for type checker)

    audio = np.concatenate(frames)
    pcm16 = (np.clip(audio, -1.0, 1.0) * 32767).astype("<i2").tobytes()
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm16)
    return buf.getvalue()


def write_wav_temp(wav_bytes: bytes) -> str:
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    tmp.write(wav_bytes)
    tmp.close()
    return tmp.name


# ---------------------------------------------------------------------------
# Transcribers
# ---------------------------------------------------------------------------

class LocalWhisperTranscriber:
    """Runs faster-whisper locally — no network required after first download."""

    def __init__(self, cfg: Config):
        from faster_whisper import WhisperModel  # type: ignore

        self.model = WhisperModel(cfg.whisper_model, device="auto", compute_type="auto")

    def transcribe(self, wav_path: str) -> str:
        segments, _info = self.model.transcribe(wav_path, vad_filter=True, beam_size=1)
        return " ".join(seg.text.strip() for seg in segments).strip()


class OpenAIWhisperTranscriber:
    def __init__(self, cfg: Config):
        from openai import OpenAI  # type: ignore

        self.client = OpenAI(api_key=cfg.openai_api_key)

    def transcribe(self, wav_path: str) -> str:
        with open(wav_path, "rb") as f:
            result = self.client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
            )
        return (result.text or "").strip()


def build_transcriber(cfg: Optional[Config] = None) -> _Transcriber:
    cfg = cfg or config
    if cfg.stt_engine == "whisper-api":
        if not cfg.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is required for whisper-api STT.")
        return OpenAIWhisperTranscriber(cfg)
    return LocalWhisperTranscriber(cfg)


def transcribe_bytes(transcriber: _Transcriber, wav_bytes: bytes) -> str:
    path = write_wav_temp(wav_bytes)
    try:
        return transcriber.transcribe(path)
    finally:
        try:
            Path(path).unlink()
        except OSError:
            pass
