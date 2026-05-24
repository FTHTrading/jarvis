"""Wake-word listener. Uses openWakeWord for 'Hey Jarvis'; falls back to PTT."""

from __future__ import annotations

import sys
from typing import Optional


def wait_for_wake_word(model_name: str = "hey_jarvis") -> bool:
    """Block until the wake word is detected. Returns True when triggered."""
    try:
        import numpy as np
        import sounddevice as sd
        from openwakeword.model import Model  # type: ignore
    except Exception as exc:
        print(
            f"[wake] openwakeword/sounddevice unavailable ({exc}). "
            "Use JARVIS_WAKE=ptt for push-to-talk.",
            file=sys.stderr,
        )
        return False

    try:
        model = Model(wakeword_models=[model_name])
    except Exception as exc:
        print(f"[wake] Could not load wake model '{model_name}': {exc}", file=sys.stderr)
        return False

    sample_rate = 16_000
    chunk = 1280  # 80ms — what openwakeword expects
    threshold = 0.5

    with sd.InputStream(samplerate=sample_rate, channels=1, dtype="int16", blocksize=chunk) as stream:
        while True:
            data, _ = stream.read(chunk)
            preds = model.predict(np.array(data[:, 0], dtype=np.int16))
            for score in preds.values():
                if score >= threshold:
                    return True


def wait_for_push_to_talk(prompt: str = "Press Enter to talk (or type a message): ") -> Optional[str]:
    """PTT fallback. Returns the typed message, or None if user wants to speak."""
    try:
        line = input(prompt)
    except (EOFError, KeyboardInterrupt):
        raise
    return line if line.strip() else None
