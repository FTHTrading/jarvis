"""Computer control skills — open apps, type text, screenshots, clipboard, etc."""

from __future__ import annotations

import os
import platform
import shutil
import subprocess
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

import psutil
import pyperclip
from rich.console import Console

console = Console()

SYSTEM = platform.system()


# ── Application launcher ────────────────────────────────────────────────────

# Common app name aliases → executable/command
_APP_MAP_LINUX = {
    "chrome": ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"],
    "firefox": ["firefox"],
    "terminal": ["gnome-terminal", "xterm", "konsole", "xfce4-terminal", "alacritty", "bash"],
    "files": ["nautilus", "dolphin", "thunar", "nemo"],
    "text editor": ["gedit", "kate", "mousepad", "xed", "nano"],
    "calculator": ["gnome-calculator", "kcalc", "galculator"],
    "music": ["rhythmbox", "clementine", "vlc"],
    "spotify": ["spotify"],
    "vlc": ["vlc"],
    "code": ["code"],
    "vscode": ["code"],
    "notepad": ["gedit", "kate", "mousepad"],
    "discord": ["discord"],
    "slack": ["slack"],
    "zoom": ["zoom"],
}

_APP_MAP_MACOS = {
    "chrome": ["open -a 'Google Chrome'"],
    "firefox": ["open -a Firefox"],
    "terminal": ["open -a Terminal"],
    "files": ["open ~"],
    "finder": ["open ~"],
    "text editor": ["open -a TextEdit"],
    "notepad": ["open -a TextEdit"],
    "calculator": ["open -a Calculator"],
    "music": ["open -a Music"],
    "spotify": ["open -a Spotify"],
    "vlc": ["open -a VLC"],
    "code": ["open -a 'Visual Studio Code'"],
    "vscode": ["open -a 'Visual Studio Code'"],
    "safari": ["open -a Safari"],
    "discord": ["open -a Discord"],
    "slack": ["open -a Slack"],
    "zoom": ["open -a zoom.us"],
}

_APP_MAP_WINDOWS = {
    "chrome": ["start chrome"],
    "firefox": ["start firefox"],
    "terminal": ["start cmd"],
    "powershell": ["start powershell"],
    "notepad": ["notepad"],
    "calculator": ["calc"],
    "paint": ["mspaint"],
    "explorer": ["explorer"],
    "files": ["explorer"],
    "code": ["code"],
    "vscode": ["code"],
    "spotify": ["start spotify"],
    "discord": ["start discord"],
    "slack": ["start slack"],
    "zoom": ["start zoom"],
    "word": ["start winword"],
    "excel": ["start excel"],
}


def open_application(app_name: str) -> str:
    """Open an application by name. Returns a status string."""
    name_lower = app_name.lower().strip()

    if SYSTEM == "Linux":
        candidates = _APP_MAP_LINUX.get(name_lower, [name_lower])
        for cmd in candidates:
            if shutil.which(cmd):
                subprocess.Popen(
                    [cmd],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
                return f"Opened {app_name}."
        # Last resort: try the name directly
        try:
            subprocess.Popen(
                [name_lower],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            return f"Launched {app_name}."
        except FileNotFoundError:
            return f"Could not find '{app_name}' on this system."

    elif SYSTEM == "Darwin":
        candidates = _APP_MAP_MACOS.get(name_lower, [f"open -a '{app_name}'"])
        cmd = candidates[0]
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            return f"Opened {app_name}."
        return f"Could not open '{app_name}': {result.stderr.strip()}"

    elif SYSTEM == "Windows":
        candidates = _APP_MAP_WINDOWS.get(name_lower, [f"start {app_name}"])
        cmd = candidates[0]
        subprocess.Popen(cmd, shell=True)
        return f"Opening {app_name}."

    return "Unsupported platform."


def open_url(url: str) -> str:
    """Open a URL in the default web browser."""
    import webbrowser
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    webbrowser.open(url)
    return f"Opened {url} in your browser."


# ── Screenshot ──────────────────────────────────────────────────────────────

def take_screenshot(save_path: Optional[str] = None) -> str:
    """Take a screenshot and save it. Returns the file path."""
    try:
        import pyautogui
        from PIL import Image

        if save_path is None:
            desktop = Path.home() / "Desktop"
            desktop.mkdir(exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            save_path = str(desktop / f"screenshot_{timestamp}.png")

        screenshot = pyautogui.screenshot()
        screenshot.save(save_path)
        return f"Screenshot saved to {save_path}"
    except Exception as exc:
        return f"Screenshot failed: {exc}"


# ── Typing ──────────────────────────────────────────────────────────────────

def type_text(text: str) -> str:
    """Type text at the current cursor position."""
    try:
        import pyautogui
        time.sleep(0.3)
        pyautogui.typewrite(text, interval=0.04)
        return f"Typed: {text[:60]}{'...' if len(text) > 60 else ''}"
    except Exception as exc:
        return f"Could not type text: {exc}"


# ── System info ─────────────────────────────────────────────────────────────

def get_system_info() -> str:
    """Return a summary of current system resource usage."""
    lines = []

    cpu = psutil.cpu_percent(interval=0.5)
    lines.append(f"CPU: {cpu}%")

    mem = psutil.virtual_memory()
    lines.append(
        f"Memory: {mem.percent}% used ({mem.used // 1024 // 1024} MB / {mem.total // 1024 // 1024} MB)"
    )

    disk = psutil.disk_usage("/")
    lines.append(
        f"Disk: {disk.percent}% used ({disk.used // 1024 // 1024 // 1024} GB / {disk.total // 1024 // 1024 // 1024} GB)"
    )

    try:
        battery = psutil.sensors_battery()
        if battery:
            status = "charging" if battery.power_plugged else "on battery"
            lines.append(f"Battery: {battery.percent:.0f}% ({status})")
    except Exception:
        pass

    uptime_secs = time.time() - psutil.boot_time()
    hours, remainder = divmod(int(uptime_secs), 3600)
    minutes = remainder // 60
    lines.append(f"Uptime: {hours}h {minutes}m")

    return " | ".join(lines)


# ── Volume control ──────────────────────────────────────────────────────────

def set_volume(level: int) -> str:
    """Set system volume to *level* (0–100)."""
    level = max(0, min(100, level))

    try:
        if SYSTEM == "Linux":
            subprocess.run(
                ["amixer", "-q", "-D", "pulse", "sset", "Master", f"{level}%"],
                check=False,
                capture_output=True,
            )
            # Fallback for systems without PulseAudio
            if subprocess.run(
                ["amixer", "-q", "-D", "pulse", "sset", "Master", f"{level}%"],
                capture_output=True,
            ).returncode != 0:
                subprocess.run(
                    ["amixer", "-q", "sset", "Master", f"{level}%"],
                    check=False,
                    capture_output=True,
                )

        elif SYSTEM == "Darwin":
            subprocess.run(
                ["osascript", "-e", f"set volume output volume {level}"],
                check=False,
                capture_output=True,
            )

        elif SYSTEM == "Windows":
            # Uses nircmd if available, else PowerShell
            nircmd = shutil.which("nircmd")
            if nircmd:
                subprocess.run([nircmd, "setsysvolume", str(int(level / 100 * 65535))], check=False)
            else:
                ps_script = f"(New-Object -ComObject WScript.Shell).SendKeys([char]0xAD)" if level == 0 else \
                    f"$vol = New-Object -ComObject WScript.Shell; $vol.SendKeys([char]0xAE)"
                subprocess.run(["powershell", "-c", ps_script], check=False, capture_output=True)

        return f"Volume set to {level}%."
    except Exception as exc:
        return f"Could not change volume: {exc}"


# ── Clipboard ───────────────────────────────────────────────────────────────

def read_clipboard() -> str:
    """Return the current clipboard text."""
    try:
        content = pyperclip.paste()
        if content:
            preview = content[:200] + ("..." if len(content) > 200 else "")
            return f"Clipboard contains: {preview}"
        return "Clipboard is empty."
    except Exception as exc:
        return f"Could not read clipboard: {exc}"


def write_clipboard(text: str) -> str:
    """Write *text* to the clipboard."""
    try:
        pyperclip.copy(text)
        return "Text copied to clipboard."
    except Exception as exc:
        return f"Could not write clipboard: {exc}"


# ── Shell commands ──────────────────────────────────────────────────────────

_BLOCKED_PATTERNS = [
    "rm -rf /", "mkfs", "dd if=", ":(){:|:&};:", "chmod -R 777 /",
    "sudo rm -rf", "> /dev/sda",
]


def run_shell_command(command: str, safe: bool = False) -> str:
    """
    Run a shell command and return output.

    *safe* must be True for read-only commands; destructive commands
    require safe=False and will be executed with extra care.
    """
    # Basic safety check
    for pattern in _BLOCKED_PATTERNS:
        if pattern in command:
            return f"Blocked: that command contains a dangerous pattern ('{pattern}')."

    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=30,
        )
        output = result.stdout.strip() or result.stderr.strip()
        return output[:2000] if output else "(no output)"
    except subprocess.TimeoutExpired:
        return "Command timed out after 30 seconds."
    except Exception as exc:
        return f"Command failed: {exc}"


# ── Directory listing ───────────────────────────────────────────────────────

def list_directory(path: str = "~") -> str:
    """Return a formatted directory listing."""
    expanded = Path(path).expanduser()
    if not expanded.exists():
        return f"Path '{path}' does not exist."
    if not expanded.is_dir():
        return f"'{path}' is not a directory."

    items = sorted(expanded.iterdir(), key=lambda p: (p.is_file(), p.name.lower()))
    lines = [f"Contents of {expanded}:"]
    for item in items[:50]:
        prefix = "📁 " if item.is_dir() else "📄 "
        lines.append(f"  {prefix}{item.name}")
    if len(items) > 50:
        lines.append(f"  ... and {len(items) - 50} more items")
    return "\n".join(lines)
