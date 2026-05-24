"""Local skills the LLM can call as tools."""

from __future__ import annotations

import datetime as _dt
import json
import os
import platform
import shutil
import subprocess
import sys
import webbrowser
from typing import Any, Callable, TypedDict

import httpx

from .config import config


class ToolSpec(TypedDict):
    type: str
    function: dict[str, Any]
    _impl: Callable[..., str]


# ---------------------------------------------------------------------------
# Implementations
# ---------------------------------------------------------------------------

def get_time(timezone: str | None = None) -> str:
    now = _dt.datetime.now().astimezone()
    return now.strftime("It is %A, %B %d, %Y at %I:%M %p %Z").replace("  ", " ")


def open_url(url: str) -> str:
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    webbrowser.open(url, new=2)
    return f"Opened {url} in the default browser."


def open_application(name: str) -> str:
    """Best-effort cross-platform app launcher."""
    system = platform.system()
    try:
        if system == "Darwin":
            subprocess.Popen(["open", "-a", name])
        elif system == "Windows":
            subprocess.Popen(["cmd", "/c", "start", "", name], shell=False)
        else:  # Linux / other
            exe = shutil.which(name)
            if not exe:
                return f"Could not find an application named '{name}'."
            subprocess.Popen([exe])
        return f"Launching {name}."
    except Exception as exc:
        return f"Failed to launch {name}: {exc}"


def web_search(query: str, max_results: int = 5) -> str:
    try:
        from duckduckgo_search import DDGS  # type: ignore
    except ImportError:
        return "Web search unavailable (duckduckgo-search not installed)."
    try:
        with DDGS() as ddgs:
            hits = list(ddgs.text(query, max_results=max_results))
    except Exception as exc:
        return f"Search failed: {exc}"
    if not hits:
        return "No results."
    lines = []
    for i, hit in enumerate(hits, start=1):
        title = hit.get("title", "")
        body = (hit.get("body") or "").replace("\n", " ")
        href = hit.get("href", "")
        lines.append(f"{i}. {title} — {body} ({href})")
    return "\n".join(lines)


def run_shell_command(command: str, timeout_seconds: int = 20) -> str:
    """Run a shell command on the local machine. Use sparingly — model-controlled."""
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
        )
    except subprocess.TimeoutExpired:
        return f"Command timed out after {timeout_seconds}s."
    out = (result.stdout or "").strip()
    err = (result.stderr or "").strip()
    parts = []
    if out:
        parts.append(f"stdout:\n{out[:1500]}")
    if err:
        parts.append(f"stderr:\n{err[:500]}")
    parts.append(f"exit={result.returncode}")
    return "\n".join(parts)


def system_info() -> str:
    return (
        f"OS: {platform.system()} {platform.release()} ({platform.machine()})\n"
        f"Python: {sys.version.split()[0]}\n"
        f"Host: {platform.node()}"
    )


def _curl_status(url: str, timeout: float = 5.0) -> str:
    """Probe a health URL; prefer curl.exe on Windows for reliability."""
    if platform.system() == "Windows":
        try:
            proc = subprocess.run(
                ["curl.exe", "-s", "-o", "NUL", "-w", "%{http_code}", "--connect-timeout", "3", url],
                capture_output=True,
                text=True,
                timeout=timeout,
            )
            code = (proc.stdout or "").strip() or "err"
            return f"{url} → HTTP {code}"
        except (FileNotFoundError, subprocess.TimeoutExpired) as exc:
            return f"{url} → curl failed ({exc})"
    try:
        r = httpx.get(url, timeout=timeout)
        return f"{url} → HTTP {r.status_code}"
    except Exception as exc:
        return f"{url} → error ({exc})"


def system_health() -> str:
    """Check OpenClaw gateway, Nerve, and Ollama on the Primary machine."""
    gateway = config.openclaw_gateway_url.rstrip("/")
    ollama = config.ollama_host.rstrip("/")
    lines = [
        _curl_status(f"{gateway}/health"),
        _curl_status("http://127.0.0.1:3080/health"),
        _curl_status(f"{ollama}/api/tags"),
    ]
    return "\n".join(lines)


def delegate_to_openclaw(message: str, agent_id: str | None = None) -> str:
    """Send a task to the OpenClaw agent mesh (DONK / specialists on :18789)."""
    target = agent_id or config.openclaw_agent_id
    cmd = [
        "openclaw",
        "agent",
        "--agent",
        target,
        "--message",
        message,
        "--json",
        "--timeout",
        "180",
    ]
    env = os.environ.copy()
    if config.openclaw_gateway_token:
        env["OPENCLAW_GATEWAY_TOKEN"] = config.openclaw_gateway_token
    env.setdefault("OPENCLAW_GATEWAY_URL", config.openclaw_gateway_url)
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=190, env=env)
    except FileNotFoundError:
        return "OpenClaw CLI not installed. Run: npm i -g openclaw"
    except subprocess.TimeoutExpired:
        return f"Delegation to {target} timed out."
    if proc.returncode != 0:
        return (proc.stderr or proc.stdout or "delegation failed")[:800]
    raw = (proc.stdout or "").strip()
    try:
        data = json.loads(raw)
        for key in ("text", "message", "content", "reply"):
            val = data.get(key)
            if isinstance(val, str) and val.strip():
                return val.strip()
    except json.JSONDecodeError:
        pass
    return raw or f"Delegated to {target}; empty reply."


# ---------------------------------------------------------------------------
# Tool specs (OpenAI tool-calling format; Ollama uses the same shape)
# ---------------------------------------------------------------------------

SKILLS: list[ToolSpec] = [
    {
        "type": "function",
        "function": {
            "name": "get_time",
            "description": "Return the current local date and time.",
            "parameters": {
                "type": "object",
                "properties": {
                    "timezone": {
                        "type": "string",
                        "description": "Optional IANA timezone name. Ignored if omitted.",
                    }
                },
                "required": [],
            },
        },
        "_impl": get_time,
    },
    {
        "type": "function",
        "function": {
            "name": "open_url",
            "description": "Open a URL in the user's default browser.",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "Full or bare URL to open."}
                },
                "required": ["url"],
            },
        },
        "_impl": open_url,
    },
    {
        "type": "function",
        "function": {
            "name": "open_application",
            "description": "Launch an application installed on the user's computer.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Application name, e.g. 'Spotify', 'Calculator', 'firefox'.",
                    }
                },
                "required": ["name"],
            },
        },
        "_impl": open_application,
    },
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the web with DuckDuckGo and return top results.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "max_results": {"type": "integer", "minimum": 1, "maximum": 10},
                },
                "required": ["query"],
            },
        },
        "_impl": web_search,
    },
    {
        "type": "function",
        "function": {
            "name": "run_shell_command",
            "description": (
                "Execute a shell command on the user's machine. Use ONLY when the "
                "user explicitly asks you to run something. Returns stdout/stderr."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {"type": "string"},
                    "timeout_seconds": {"type": "integer", "minimum": 1, "maximum": 120},
                },
                "required": ["command"],
            },
        },
        "_impl": run_shell_command,
    },
    {
        "type": "function",
        "function": {
            "name": "system_info",
            "description": "Get basic info about the host computer (OS, Python, hostname).",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
        "_impl": system_info,
    },
    {
        "type": "function",
        "function": {
            "name": "system_health",
            "description": (
                "Probe local FTH stack health: OpenClaw gateway (:18789), "
                "Nerve cockpit (:3080), and Ollama (:11434)."
            ),
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
        "_impl": system_health,
    },
    {
        "type": "function",
        "function": {
            "name": "delegate_to_openclaw",
            "description": (
                "Delegate a complex task to the OpenClaw agent mesh on the Primary "
                "PC (DONK main or a specialist: infra-watchdog, x402-ranger, etc.). "
                "Use for multi-step ops, x402, deploys, or TEAM_BUS work."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "message": {
                        "type": "string",
                        "description": "Clear delegation instruction for the agent.",
                    },
                    "agent_id": {
                        "type": "string",
                        "description": (
                            "Optional agent id (main, infra-watchdog, x402-ranger, "
                            "code-forge-alpha, intel-partner, …). Defaults to main."
                        ),
                    },
                },
                "required": ["message"],
            },
        },
        "_impl": delegate_to_openclaw,
    },
]
