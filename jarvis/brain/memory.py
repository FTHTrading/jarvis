"""Conversation memory — keeps the last N turns in context."""

from __future__ import annotations

from collections import deque
from typing import Literal

import config

MessageRole = Literal["user", "assistant", "system", "tool"]


class ConversationMemory:
    """Sliding-window conversation history."""

    def __init__(self, max_turns: int = config.MAX_HISTORY_TURNS) -> None:
        self._max_turns = max_turns
        # Each "turn" = one user message + one assistant message
        self._history: deque[dict] = deque()

    def add_user(self, content: str) -> None:
        self._history.append({"role": "user", "content": content})
        self._trim()

    def add_assistant(self, content: str) -> None:
        self._history.append({"role": "assistant", "content": content})
        self._trim()

    def add_tool_result(self, tool_call_id: str, content: str) -> None:
        self._history.append(
            {"role": "tool", "tool_call_id": tool_call_id, "content": content}
        )

    def add_raw(self, message: dict) -> None:
        """Add a raw OpenAI message dict (e.g. assistant with tool_calls)."""
        self._history.append(message)
        self._trim()

    def get_messages(self) -> list[dict]:
        return list(self._history)

    def clear(self) -> None:
        self._history.clear()

    def _trim(self) -> None:
        # Keep at most max_turns * 2 messages (user + assistant per turn)
        limit = self._max_turns * 2
        while len(self._history) > limit:
            self._history.popleft()

    def __len__(self) -> int:
        return len(self._history)
