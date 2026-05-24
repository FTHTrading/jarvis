import subprocess
import webbrowser
from datetime import datetime
from typing import Any

TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "run_shell",
            "description": "Run a shell command on the user's computer. Use for listing files, opening apps via CLI, etc. Avoid destructive commands unless the user explicitly asked.",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {
                        "type": "string",
                        "description": "Shell command to execute",
                    }
                },
                "required": ["command"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "open_url",
            "description": "Open a URL in the default web browser",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "Full URL including https://"}
                },
                "required": ["url"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_time",
            "description": "Get the current local date and time",
            "parameters": {"type": "object", "properties": {}},
        },
    },
]


def run_shell(command: str) -> str:
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=30,
        )
        out = (result.stdout or "") + (result.stderr or "")
        out = out.strip() or "(no output)"
        return f"exit={result.returncode}\n{out[:4000]}"
    except subprocess.TimeoutExpired:
        return "error: command timed out after 30s"
    except Exception as exc:
        return f"error: {exc}"


def open_url(url: str) -> str:
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    webbrowser.open(url)
    return f"opened {url}"


def get_time() -> str:
    return datetime.now().strftime("%A, %B %d %Y, %I:%M %p")


def dispatch(name: str, arguments: dict[str, Any]) -> str:
    if name == "run_shell":
        return run_shell(arguments.get("command", ""))
    if name == "open_url":
        return open_url(arguments.get("url", ""))
    if name == "get_time":
        return get_time()
    return f"unknown tool: {name}"
