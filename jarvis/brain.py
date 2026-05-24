"""LLM 'brain' — chat history + tool calling. Supports OpenAI and Ollama."""

from __future__ import annotations

import json
import sys
from typing import Any, Callable

import httpx

from .config import Config, config
from .skills import SKILLS, ToolSpec


class Brain:
    """Wraps an LLM with a system prompt, conversation memory, and tools."""

    def __init__(self, cfg: Config | None = None):
        self.cfg = cfg or config
        self.history: list[dict[str, Any]] = [
            {"role": "system", "content": self.cfg.system_prompt()}
        ]
        self.tools: list[ToolSpec] = SKILLS
        self.tool_index: dict[str, Callable[..., str]] = {
            t["function"]["name"]: t["_impl"] for t in self.tools  # type: ignore[index]
        }
        self.use_ollama = bool(self.cfg.ollama_model)

        if self.use_ollama:
            self._client = httpx.Client(base_url=self.cfg.ollama_host, timeout=60.0)
        else:
            from openai import OpenAI  # type: ignore

            if not self.cfg.openai_api_key:
                raise RuntimeError(
                    "OPENAI_API_KEY is not set. Add it to .env or set "
                    "JARVIS_OLLAMA_MODEL to use a local model."
                )
            self._client = OpenAI(api_key=self.cfg.openai_api_key)

    # ------------------------------------------------------------------ public

    def reply(self, user_text: str) -> str:
        """Add a user turn, run the model (with tool calls), return assistant text."""
        self.history.append({"role": "user", "content": user_text})
        if self.use_ollama:
            text = self._ollama_round_trip()
        else:
            text = self._openai_round_trip()
        self.history.append({"role": "assistant", "content": text})
        return text

    def reset(self) -> None:
        self.history = [{"role": "system", "content": self.cfg.system_prompt()}]

    # ----------------------------------------------------------------- OpenAI

    def _public_tools(self) -> list[dict[str, Any]]:
        return [{k: v for k, v in t.items() if not k.startswith("_")} for t in self.tools]

    def _openai_round_trip(self) -> str:
        max_iterations = 5
        for _ in range(max_iterations):
            response = self._client.chat.completions.create(  # type: ignore[union-attr]
                model=self.cfg.llm_model,
                messages=self.history,
                tools=self._public_tools(),
                tool_choice="auto",
            )
            message = response.choices[0].message
            tool_calls = message.tool_calls or []
            self.history.append(message.model_dump(exclude_none=True))

            if not tool_calls:
                return (message.content or "").strip()

            for call in tool_calls:
                name = call.function.name
                try:
                    args = json.loads(call.function.arguments or "{}")
                except json.JSONDecodeError:
                    args = {}
                result = self._run_tool(name, args)
                self.history.append(
                    {
                        "role": "tool",
                        "tool_call_id": call.id,
                        "content": result,
                    }
                )
        return "I got stuck in a tool loop. Try rephrasing."

    # ----------------------------------------------------------------- Ollama

    def _ollama_round_trip(self) -> str:
        max_iterations = 5
        for _ in range(max_iterations):
            r = self._client.post(  # type: ignore[union-attr]
                "/api/chat",
                json={
                    "model": self.cfg.ollama_model,
                    "messages": self.history,
                    "tools": self._public_tools(),
                    "stream": False,
                },
            )
            r.raise_for_status()
            data = r.json()
            message = data.get("message", {})
            tool_calls = message.get("tool_calls") or []
            self.history.append(message)

            if not tool_calls:
                return (message.get("content") or "").strip()

            for call in tool_calls:
                name = call["function"]["name"]
                args = call["function"].get("arguments") or {}
                if isinstance(args, str):
                    try:
                        args = json.loads(args)
                    except json.JSONDecodeError:
                        args = {}
                result = self._run_tool(name, args)
                self.history.append({"role": "tool", "content": result})
        return "I got stuck in a tool loop. Try rephrasing."

    # ----------------------------------------------------------------- shared

    def _run_tool(self, name: str, args: dict[str, Any]) -> str:
        fn = self.tool_index.get(name)
        if not fn:
            return f"ERROR: unknown tool '{name}'."
        try:
            return str(fn(**args))
        except TypeError as exc:
            return f"ERROR: bad arguments for {name}: {exc}"
        except Exception as exc:  # pragma: no cover
            print(f"[brain] tool '{name}' raised: {exc}", file=sys.stderr)
            return f"ERROR: tool '{name}' failed: {exc}"
