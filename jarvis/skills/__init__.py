from .system_control import (
    open_application,
    open_url,
    take_screenshot,
    type_text,
    get_system_info,
    set_volume,
    read_clipboard,
    write_clipboard,
    run_shell_command,
    list_directory,
)
from .web_skills import search_web, get_weather, get_datetime
from .media_skills import play_music

__all__ = [
    "open_application",
    "open_url",
    "take_screenshot",
    "type_text",
    "get_system_info",
    "set_volume",
    "read_clipboard",
    "write_clipboard",
    "run_shell_command",
    "list_directory",
    "search_web",
    "get_weather",
    "get_datetime",
    "play_music",
]
