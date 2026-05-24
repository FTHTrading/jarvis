#!/usr/bin/env python3
"""
Jarvis — AI Personal Assistant
Entry point. Run with:  python main.py
"""

import asyncio
import argparse
import sys
import os


def parse_args():
    parser = argparse.ArgumentParser(
        description="Jarvis — AI Personal Assistant",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py                      # Voice mode (default)
  python main.py --mode text          # Text input, voice output
  python main.py --mode silent        # Text input + output, no audio
  python main.py --voice en-US-GuyNeural --mode text
  python main.py --list-voices        # Print available TTS voices
        """,
    )
    parser.add_argument(
        "--mode",
        choices=["voice", "text", "silent"],
        default=None,
        help="Interaction mode (overrides INPUT_MODE in .env)",
    )
    parser.add_argument(
        "--voice",
        default=None,
        help="TTS voice name (overrides VOICE_NAME in .env)",
    )
    parser.add_argument(
        "--model",
        default=None,
        help="OpenAI model (overrides OPENAI_MODEL in .env)",
    )
    parser.add_argument(
        "--user",
        default=None,
        help="Your name (how Jarvis addresses you)",
    )
    parser.add_argument(
        "--list-voices",
        action="store_true",
        help="List all available TTS voices and exit",
    )
    return parser.parse_args()


async def list_voices():
    """Print all available edge-tts voices."""
    from jarvis.voice.speaker import list_voices as _list
    from rich.console import Console
    from rich.table import Table

    console = Console()
    voices = await _list()

    table = Table(title="Available TTS Voices", show_lines=True)
    table.add_column("Name", style="cyan")
    table.add_column("Gender", style="magenta")
    table.add_column("Locale", style="green")

    # Filter to English voices for readability
    en_voices = [v for v in voices if v["Locale"].startswith("en-")]
    for v in sorted(en_voices, key=lambda x: x["ShortName"]):
        table.add_row(v["ShortName"], v["Gender"], v["Locale"])

    console.print(table)
    console.print(f"\n[dim]Total English voices: {len(en_voices)} | Total all voices: {len(voices)}[/dim]")
    console.print("\n[bold]Recommended voices:[/bold]")
    console.print("  [cyan]en-GB-RyanNeural[/cyan]   — British male (classic Jarvis)")
    console.print("  [cyan]en-GB-ThomasNeural[/cyan] — British male (warm)")
    console.print("  [cyan]en-US-GuyNeural[/cyan]    — American male (professional)")
    console.print("  [cyan]en-US-AriaNeural[/cyan]   — American female (clear)")


async def main():
    args = parse_args()

    if args.list_voices:
        await list_voices()
        return

    # Apply CLI overrides to config module
    import config
    if args.mode:
        config.INPUT_MODE = args.mode
    if args.voice:
        config.VOICE_NAME = args.voice
    if args.model:
        config.OPENAI_MODEL = args.model
    if args.user:
        config.USER_NAME = args.user

    from jarvis.assistant import JarvisAssistant
    assistant = JarvisAssistant()
    await assistant.run()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nJarvis offline.")
        sys.exit(0)
