"""OpenAI GPT-4o brain with Jarvis personality and tool/function calling."""

from __future__ import annotations

import json
import asyncio
from typing import Any, Optional

from openai import AsyncOpenAI
from rich.console import Console

import config
from jarvis.brain.memory import ConversationMemory

console = Console()

# ── Jarvis system prompt ────────────────────────────────────────────────────

SYSTEM_PROMPT = f"""You are Jarvis, a highly advanced AI personal assistant. You were built to serve as a powerful, intelligent companion — able to control computers, gather information, and help with any task.

Your personality:
- Polished, professional, and efficient — with a dry British wit
- Occasionally charming and lightly humorous, but never at the expense of usefulness
- You address the user as "{config.USER_NAME}" (or by name if they tell you)
- You are proactive — when you detect what the user needs, you act on it
- Concise and clear: this is a voice interface, so keep responses conversational and brief (1-3 sentences unless detail is truly needed)
- Never say "As an AI" or similar disclaimers — you are Jarvis, and you are fully capable

When using tools:
- Briefly narrate what you're doing ("Opening Chrome now, {config.USER_NAME}...")
- After tool results, summarize in natural language — don't just recite raw data
- Chain multiple tools when needed without asking for permission each time

Capabilities you have via tools:
- Open any application or website
- Search the web and summarize results
- Get current weather and forecasts
- Control system volume
- Take screenshots
- Type text or run commands
- Get system performance info (CPU, RAM, battery)
- Read/write the clipboard
- Manage files and directories

Tone examples:
- "Right away." / "Consider it done." / "On it."
- "Interesting — here's what I found."
- "Your system is running smoothly, {config.USER_NAME}. CPU at 12%, memory comfortable."
"""

# ── Tool definitions (OpenAI function calling) ──────────────────────────────

TOOLS: list[dict] = [
    {
        "type": "function",
        "function": {
            "name": "open_application",
            "description": "Open an application or program on the computer.",
            "parameters": {
                "type": "object",
                "properties": {
                    "app_name": {
                        "type": "string",
                        "description": "Name of the application (e.g. 'chrome', 'firefox', 'terminal', 'notepad', 'calculator', 'spotify')",
                    }
                },
                "required": ["app_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "open_url",
            "description": "Open a URL in the default web browser.",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "Full URL to open (must start with http:// or https://)"}
                },
                "required": ["url"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_web",
            "description": "Search the web and return a summary of the top results.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"}
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get the current weather and forecast for a city.",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "City name (e.g. 'London', 'New York', 'Tokyo')"}
                },
                "required": ["city"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_datetime",
            "description": "Get the current date and time.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "take_screenshot",
            "description": "Take a screenshot of the current screen.",
            "parameters": {
                "type": "object",
                "properties": {
                    "save_path": {
                        "type": "string",
                        "description": "Optional file path to save the screenshot. Defaults to the Desktop.",
                    }
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "type_text",
            "description": "Type text at the current cursor position, as if the user typed it.",
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "Text to type"}
                },
                "required": ["text"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_volume",
            "description": "Set the system audio volume.",
            "parameters": {
                "type": "object",
                "properties": {
                    "level": {
                        "type": "integer",
                        "description": "Volume level from 0 (silent) to 100 (maximum)",
                    }
                },
                "required": ["level"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_system_info",
            "description": "Get current system performance stats: CPU, RAM, battery, disk usage.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_clipboard",
            "description": "Read the current text content of the system clipboard.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "write_clipboard",
            "description": "Write text to the system clipboard.",
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "Text to copy to clipboard"}
                },
                "required": ["text"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_shell_command",
            "description": "Run a shell command and return the output. Use for file operations, system administration, or anything requiring a terminal.",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {"type": "string", "description": "Shell command to execute"},
                    "safe": {
                        "type": "boolean",
                        "description": "Set to true only for read-only commands (ls, cat, ps, etc.). Set to false for commands that modify the system.",
                    },
                },
                "required": ["command", "safe"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "play_music",
            "description": "Play music by opening a search on YouTube Music, Spotify, or the default music app.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Song, artist, or playlist name to search for"}
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_directory",
            "description": "List files and folders in a directory.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Directory path to list. Use '~' for home directory.",
                    }
                },
                "required": ["path"],
            },
        },
    },
]


# ── Brain class ──────────────────────────────────────────────────────────────

class JarvisBrain:
    """Manages conversation with GPT-4o and dispatches tool calls."""

    def __init__(self, skill_executor) -> None:
        self._client = AsyncOpenAI(api_key=config.OPENAI_API_KEY)
        self._memory = ConversationMemory()
        self._skill_executor = skill_executor

    async def think(self, user_text: str) -> str:
        """
        Send *user_text* to GPT-4o, handle any tool calls, and return
        the final assistant response as a plain string.
        """
        self._memory.add_user(user_text)

        messages = [{"role": "system", "content": SYSTEM_PROMPT}] + self._memory.get_messages()

        max_tool_rounds = 5
        for _ in range(max_tool_rounds):
            response = await self._client.chat.completions.create(
                model=config.OPENAI_MODEL,
                messages=messages,
                tools=TOOLS,
                tool_choice="auto",
                temperature=0.7,
            )

            choice = response.choices[0]
            msg = choice.message

            # Add raw assistant message to memory
            raw_msg = {"role": "assistant", "content": msg.content or ""}
            if msg.tool_calls:
                raw_msg["tool_calls"] = [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                    }
                    for tc in msg.tool_calls
                ]
            self._memory.add_raw(raw_msg)
            messages.append(raw_msg)

            # No tool calls → we have the final answer
            if not msg.tool_calls:
                answer = msg.content or ""
                return answer

            # Execute each tool call
            for tool_call in msg.tool_calls:
                fn_name = tool_call.function.name
                try:
                    fn_args = json.loads(tool_call.function.arguments)
                except json.JSONDecodeError:
                    fn_args = {}

                console.print(f"[dim]  ↳ calling tool [bold]{fn_name}[/bold]({fn_args})[/dim]")

                try:
                    result = await self._skill_executor(fn_name, fn_args)
                except Exception as exc:
                    result = f"Error executing {fn_name}: {exc}"

                tool_result_msg = {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": str(result),
                }
                self._memory.add_tool_result(tool_call.id, str(result))
                messages.append(tool_result_msg)

        return "I encountered an issue processing that request, sir. Please try again."

    def clear_memory(self) -> None:
        self._memory.clear()
