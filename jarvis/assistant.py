"""Main assistant orchestrator — ties together voice, brain, and skills."""

from __future__ import annotations

import asyncio
import sys
from typing import Any, Optional

from rich.console import Console
from rich.panel import Panel
from rich.text import Text
from rich import box

import config
from jarvis.brain.llm import JarvisBrain
from jarvis.voice.speaker import speak, speak_status
import jarvis.skills as skills

console = Console()


# ── Skill dispatcher ─────────────────────────────────────────────────────────

async def _execute_skill(name: str, args: dict) -> Any:
    """Route a tool call from the LLM to the correct skill function."""
    loop = asyncio.get_event_loop()

    # Mapping of tool names to (function, is_async)
    sync_skills = {
        "open_application": lambda: skills.open_application(args.get("app_name", "")),
        "open_url": lambda: skills.open_url(args.get("url", "")),
        "take_screenshot": lambda: skills.take_screenshot(args.get("save_path")),
        "type_text": lambda: skills.type_text(args.get("text", "")),
        "set_volume": lambda: skills.set_volume(int(args.get("level", 50))),
        "get_system_info": lambda: skills.get_system_info(),
        "read_clipboard": lambda: skills.read_clipboard(),
        "write_clipboard": lambda: skills.write_clipboard(args.get("text", "")),
        "run_shell_command": lambda: skills.run_shell_command(
            args.get("command", ""), args.get("safe", False)
        ),
        "list_directory": lambda: skills.list_directory(args.get("path", "~")),
        "search_web": lambda: skills.search_web(args.get("query", "")),
        "get_weather": lambda: skills.get_weather(args.get("city")),
        "get_datetime": lambda: skills.get_datetime(),
        "play_music": lambda: skills.play_music(args.get("query", "")),
    }

    if name in sync_skills:
        return await loop.run_in_executor(None, sync_skills[name])

    return f"Unknown tool: {name}"


# ── Visual helpers ───────────────────────────────────────────────────────────

def _print_banner() -> None:
    banner = Text()
    banner.append("  J A R V I S\n", style="bold white")
    banner.append("  Just A Rather Very Intelligent System\n", style="dim white")
    banner.append(
        f"\n  Voice: [cyan]{config.VOICE_NAME}[/cyan]  |  "
        f"Model: [cyan]{config.OPENAI_MODEL}[/cyan]  |  "
        f"Mode: [cyan]{config.INPUT_MODE}[/cyan]\n",
        style="white",
    )
    console.print(
        Panel(banner, box=box.DOUBLE_EDGE, border_style="bright_blue", expand=False)
    )


def _print_user(text: str) -> None:
    console.print(f"\n[bold green]You:[/bold green] {text}")


def _print_jarvis(text: str) -> None:
    console.print(f"[bold blue]Jarvis:[/bold blue] {text}\n")


# ── Main assistant class ─────────────────────────────────────────────────────

class JarvisAssistant:
    """Top-level assistant that orchestrates voice, brain, and skills."""

    def __init__(self) -> None:
        self._brain = JarvisBrain(skill_executor=_execute_skill)
        self._mic = None

    async def setup(self) -> None:
        """Initialise components and validate configuration."""
        _print_banner()

        if not config.OPENAI_API_KEY:
            console.print(
                "[red bold]ERROR:[/red bold] OPENAI_API_KEY is not set.\n"
                "Copy .env.example to .env and add your key."
            )
            sys.exit(1)

        if config.INPUT_MODE == "voice":
            try:
                from jarvis.voice.listener import create_microphone
                self._mic = create_microphone()
                console.print("[green]✓ Microphone ready[/green]")
            except Exception as exc:
                console.print(
                    f"[yellow]⚠ Microphone not available ({exc}). "
                    f"Switching to text input mode.[/yellow]"
                )
                # Fall back gracefully
                object.__setattr__(config, "INPUT_MODE", "text")

        console.print("[green]✓ Jarvis is online[/green]\n")

        # Greet the user
        greeting = (
            f"Good day, {config.USER_NAME}. Jarvis online and fully operational. "
            f"All systems nominal. How may I assist you?"
        )
        _print_jarvis(greeting)
        if config.INPUT_MODE != "silent":
            await speak(greeting)

    async def process_input(self, user_text: str) -> str:
        """Process a single user input and return Jarvis's response."""
        _print_user(user_text)

        # Show a brief "thinking" acknowledgment
        thinking_phrases = [
            "Of course.", "Right away.", "On it.", "Let me check that.",
            "One moment.", "Certainly.",
        ]
        import random
        ack = random.choice(thinking_phrases)

        # Only speak the ack for longer requests where processing takes time
        words = len(user_text.split())
        if words > 4 and config.INPUT_MODE != "silent":
            await speak(ack)

        response = await self._brain.think(user_text)
        _print_jarvis(response)

        if config.INPUT_MODE != "silent":
            await speak(response)

        return response

    async def run_voice_loop(self) -> None:
        """Continuous voice interaction loop with wake-word detection."""
        from jarvis.voice.listener import wait_for_wake_word, listen_for_command

        console.print(
            f"[dim]Say '[bold]{config.WAKE_WORD}[/bold]' to activate, "
            f"or type 'quit' to exit.[/dim]\n"
        )

        while True:
            try:
                await wait_for_wake_word(self._mic)

                # Acknowledgment beep / phrase
                await speak_status("Yes?")
                console.print("[cyan]Listening for your command...[/cyan]")

                command = await listen_for_command(self._mic)

                if not command:
                    await speak("I didn't quite catch that. Please try again.")
                    continue

                if command.lower() in ("stop", "goodbye", "quit", "exit", "shut down"):
                    farewell = f"Shutting down. Goodbye, {config.USER_NAME}."
                    _print_jarvis(farewell)
                    await speak(farewell)
                    break

                await self.process_input(command)

            except KeyboardInterrupt:
                farewell = f"Powering down. Goodbye, {config.USER_NAME}."
                console.print(f"\n[dim]{farewell}[/dim]")
                await speak(farewell)
                break
            except Exception as exc:
                console.print(f"[red]Unexpected error: {exc}[/red]")
                await speak("I encountered an unexpected error. Recovering...")
                await asyncio.sleep(1)

    async def run_text_loop(self) -> None:
        """Interactive text-based loop (keyboard input, voice/text output)."""
        console.print(
            "[dim]Type your message and press Enter. Type 'quit' to exit.[/dim]\n"
        )

        while True:
            try:
                user_input = await asyncio.get_event_loop().run_in_executor(
                    None, lambda: input("You: ").strip()
                )

                if not user_input:
                    continue

                if user_input.lower() in ("quit", "exit", "bye", "goodbye", "stop"):
                    farewell = f"Goodbye, {config.USER_NAME}. It's been a pleasure."
                    _print_jarvis(farewell)
                    if config.INPUT_MODE != "silent":
                        await speak(farewell)
                    break

                await self.process_input(user_input)

            except (KeyboardInterrupt, EOFError):
                farewell = f"Shutting down. Goodbye, {config.USER_NAME}."
                console.print(f"\n[dim]{farewell}[/dim]")
                if config.INPUT_MODE != "silent":
                    await speak(farewell)
                break

    async def run(self) -> None:
        """Start the appropriate interaction loop based on INPUT_MODE."""
        await self.setup()

        if config.INPUT_MODE == "voice" and self._mic is not None:
            await self.run_voice_loop()
        else:
            await self.run_text_loop()
