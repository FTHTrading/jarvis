"""LLM 'brain' — chat history + tool calling. Supports OpenAI and Ollama."""

from __future__ import annotations

import json
import os
import subprocess
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
        self.backend = self.cfg.resolved_brain()
        self.use_ollama = self.backend == "ollama"
        self.use_openclaw = self.backend == "openclaw"

        if self.use_openclaw:
            self._client = None
        elif self.use_ollama:
            self._client = httpx.Client(base_url=self.cfg.ollama_host, timeout=60.0)
        else:
            from openai import OpenAI  # type: ignore

            if not self.cfg.openai_api_key:
                raise RuntimeError(
                    "OPENAI_API_KEY is not set. Add it to .env, set "
                    "JARVIS_OLLAMA_MODEL for Ollama, or JARVIS_BRAIN=openclaw."
                )
            self._client = OpenAI(api_key=self.cfg.openai_api_key)

    # ------------------------------------------------------------------ public

    def reply(self, user_text: str) -> str:
        """Add a user turn, run the model (with tool calls), return assistant text."""
        self.history.append({"role": "user", "content": user_text})
        if self.use_openclaw:
            text = self._openclaw_round_trip(user_text)
        elif self.use_ollama:
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

    # --------------------------------------------------------------- OpenClaw

    def _openclaw_round_trip(self, user_text: str) -> str:
        """Delegate a turn to the OpenClaw gateway via CLI (gemma4 mesh on Primary)."""
        cmd = [
            "openclaw",
            "agent",
            "--agent",
            self.cfg.openclaw_agent_id,
            "--message",
            user_text,
            "--json",
            "--timeout",
            "120",
        ]
        env = os.environ.copy()
        if self.cfg.openclaw_gateway_token:
            env["OPENCLAW_GATEWAY_TOKEN"] = self.cfg.openclaw_gateway_token
        env.setdefault("OPENCLAW_GATEWAY_URL", self.cfg.openclaw_gateway_url)
        try:
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=130,
                env=env,
            )
        except FileNotFoundError:
            return (
                "OpenClaw CLI not found. Install openclaw globally or set "
                "JARVIS_BRAIN=ollama / add OPENAI_API_KEY."
            )
        except subprocess.TimeoutExpired:
            return "OpenClaw delegation timed out after 130 seconds."

        if proc.returncode != 0:
            err = (proc.stderr or proc.stdout or "unknown error").strip()[:500]
            return f"OpenClaw gateway error: {err}"

        raw = (proc.stdout or "").strip()
        try:
            data = json.loads(raw)
            for key in ("text", "message", "content", "reply"):
                val = data.get(key)
                if isinstance(val, str) and val.strip():
                    return val.strip()
            if isinstance(data.get("result"), dict):
                nested = data["result"]
                for key in ("text", "message", "content"):
                    val = nested.get(key)
                    if isinstance(val, str) and val.strip():
                        return val.strip()
        except json.JSONDecodeError:
            pass
        return raw or "OpenClaw returned an empty reply."

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
