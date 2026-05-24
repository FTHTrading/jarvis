"""Main assistant loop. Ties together wake → STT → brain → TTS."""

from __future__ import annotations

import sys
from typing import Optional

from rich.console import Console
from rich.panel import Panel

from .audio.stt import build_transcriber, record_until_silence, transcribe_bytes
from .audio.tts import build_speaker
from .audio.wake import wait_for_push_to_talk, wait_for_wake_word
from .brain import Brain
from .config import config

console = Console()


def _banner() -> None:
    console.print(
        Panel.fit(
            f"[bold cyan]{config.name}[/] online.\n"
            f"LLM: [yellow]{config.resolved_brain()} ({config.ollama_model or config.llm_model})[/]   "
            f"TTS: [yellow]{config.resolved_tts()}[/]   "
            f"STT: [yellow]{config.stt_engine}[/]   "
            f"Wake: [yellow]{config.wake_mode}[/]",
            border_style="cyan",
        )
    )


def _listen_once_voice(transcriber) -> Optional[str]:
    console.print("[dim]listening…[/]")
    wav = record_until_silence()
    if not wav:
        console.print("[dim](silence — never mind)[/]")
        return None
    text = transcribe_bytes(transcriber, wav).strip()
    if not text:
        return None
    return text


def run() -> int:
    _banner()
    brain = Brain()
    speaker = build_speaker()

    transcriber = None
    if config.wake_mode != "off":
        try:
            transcriber = build_transcriber()
        except Exception as exc:
            console.print(f"[red][stt unavailable: {exc}][/]")
            transcriber = None

    greeting = f"Good day, {config.user_name}. How can I help?"
    console.print(f"[bold cyan]{config.name}>[/] {greeting}")
    try:
        speaker.speak(greeting)
    except Exception as exc:
        console.print(f"[red][tts failed: {exc}][/]")

    try:
        while True:
            user_text: Optional[str] = None

            if config.wake_mode == "openwakeword" and transcriber:
                console.print(f"[dim]Say 'Hey {config.name}' to wake me…[/]")
                if not wait_for_wake_word():
                    console.print("[red]wake word listener exited; switching to PTT.[/]")
                    config.wake_mode = "ptt"  # type: ignore[assignment]
                    continue
                user_text = _listen_once_voice(transcriber)
            elif config.wake_mode == "ptt" and transcriber:
                typed = wait_for_push_to_talk()
                if typed is not None:
                    user_text = typed
                else:
                    user_text = _listen_once_voice(transcriber)
            else:
                try:
                    user_text = input("you> ").strip() or None
                except EOFError:
                    break

            if not user_text:
                continue

            if user_text.lower().strip(" .!?") in {"exit", "quit", "goodbye", "shut down", "stop"}:
                farewell = f"Goodbye, {config.user_name}."
                console.print(f"[bold cyan]{config.name}>[/] {farewell}")
                try:
                    speaker.speak(farewell)
                except Exception:
                    pass
                break

            console.print(f"[bold green]you>[/] {user_text}")
            try:
                reply = brain.reply(user_text)
            except Exception as exc:
                reply = f"Something went wrong talking to the model: {exc}"

            reply = reply.strip() or "(no reply)"
            console.print(f"[bold cyan]{config.name}>[/] {reply}")
            try:
                speaker.speak(reply)
            except Exception as exc:
                console.print(f"[red][tts failed: {exc}][/]")
    except KeyboardInterrupt:
        console.print("\n[dim](interrupted)[/]")
    finally:
        try:
            speaker.close()
        except Exception:
            pass
    return 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(run())
