"""Media skills — music playback control via web browser or local apps."""

from __future__ import annotations

import subprocess
import shutil
import webbrowser
import platform
from urllib.parse import quote_plus

from rich.console import Console

console = Console()

SYSTEM = platform.system()


def play_music(query: str) -> str:
    """
    Play music by opening a search on YouTube Music.

    For a more integrated experience, if Spotify is installed it will
    attempt to use that instead.
    """
    # Try Spotify CLI control first (spotify_cli or spotifyd)
    if SYSTEM == "Linux" and shutil.which("spotify"):
        try:
            subprocess.Popen(
                ["spotify"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        except Exception:
            pass

    # Open YouTube Music in browser as the universal fallback
    search_url = f"https://music.youtube.com/search?q={quote_plus(query)}"
    webbrowser.open(search_url)
    return f"Opening YouTube Music search for '{query}'."


def get_media_controls_info() -> str:
    """Return available media control shortcuts."""
    return (
        "Media keys: use your keyboard's media keys to play/pause, "
        "skip tracks, and adjust volume. On Linux, playerctl provides "
        "command-line media control."
    )
