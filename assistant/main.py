#!/usr/bin/env python3
"""Minimal local Jarvis loop: record → transcribe → agent → speak."""

import argparse
import sys
from pathlib import Path

# Allow running as `python main.py` from assistant/
sys.path.insert(0, str(Path(__file__).resolve().parent))

from agent import chat
from config import LLM_PROVIDER, OPENAI_API_KEY, ANTHROPIC_API_KEY
from voice import record_audio, speak, transcribe


def _check_keys() -> None:
    if LLM_PROVIDER == "anthropic" and not ANTHROPIC_API_KEY:
        print("Error: set ANTHROPIC_API_KEY in .env")
        sys.exit(1)
    if LLM_PROVIDER != "anthropic" and not OPENAI_API_KEY:
        print("Error: set OPENAI_API_KEY in .env")
        sys.exit(1)
    if not OPENAI_API_KEY:
        print("Error: OPENAI_API_KEY required for Whisper STT")
        sys.exit(1)


def run_once(duration: int | None) -> None:
    wav = record_audio(duration)
    try:
        text = transcribe(wav)
    finally:
        wav.unlink(missing_ok=True)

    if not text:
        print("Heard nothing — try again.")
        return

    print(f"You: {text}")
    history: list = []
    reply = chat(text, history)
    print(f"Jarvis: {reply}")
    speak(reply)


def main() -> None:
    parser = argparse.ArgumentParser(description="Local Jarvis voice assistant")
    parser.add_argument(
        "--loop",
        action="store_true",
        help="Run continuously until Ctrl+C",
    )
    parser.add_argument(
        "--duration",
        type=int,
        default=None,
        help="Recording length in seconds",
    )
    args = parser.parse_args()
    _check_keys()

    print("Jarvis local assistant")
    print("Provider:", LLM_PROVIDER)
    if args.loop:
        print("Loop mode — Ctrl+C to quit\n")
        while True:
            try:
                input("Press Enter to talk...")
                run_once(args.duration)
                print()
            except KeyboardInterrupt:
                print("\nGoodbye.")
                break
    else:
        input("Press Enter to start recording...")
        run_once(args.duration)


if __name__ == "__main__":
    main()
