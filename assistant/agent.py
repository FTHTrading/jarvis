import json
from typing import Any

from config import (
    ANTHROPIC_API_KEY,
    ANTHROPIC_MODEL,
    LLM_PROVIDER,
    OPENAI_API_KEY,
    OPENAI_MODEL,
)
from tools import TOOL_SCHEMAS, dispatch

SYSTEM_PROMPT = """You are Jarvis, a helpful voice assistant on the user's computer.
You speak aloud — keep answers short (1-3 sentences) unless they ask for detail.
No markdown, bullets, or code blocks in replies meant to be spoken.
Use tools when needed. Before destructive shell commands, ask for confirmation.
Be warm and capable, like a competent human assistant."""


def _tool_calls_openai(message: Any) -> list[tuple[str, str, dict]]:
    calls = []
    for tc in message.tool_calls or []:
        calls.append(
            (
                tc.id,
                tc.function.name,
                json.loads(tc.function.arguments or "{}"),
            )
        )
    return calls


def chat(user_text: str, history: list[dict[str, Any]]) -> str:
    history.append({"role": "user", "content": user_text})

    if LLM_PROVIDER == "anthropic":
        return _chat_anthropic(history)
    return _chat_openai(history)


def _chat_openai(history: list[dict[str, Any]]) -> str:
    if not OPENAI_API_KEY:
        raise RuntimeError("Set OPENAI_API_KEY in .env")

    from openai import OpenAI

    client = OpenAI(api_key=OPENAI_API_KEY)
    messages = [{"role": "system", "content": SYSTEM_PROMPT}, *history]

    while True:
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=messages,
            tools=TOOL_SCHEMAS,
            tool_choice="auto",
        )
        message = response.choices[0].message
        if message.tool_calls:
            messages.append(message.model_dump())
            for tool_id, name, args in _tool_calls_openai(message):
                result = dispatch(name, args)
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tool_id,
                        "content": result,
                    }
                )
            continue

        reply = (message.content or "").strip()
        history.append({"role": "assistant", "content": reply})
        return reply


def _chat_anthropic(history: list[dict[str, Any]]) -> str:
    if not ANTHROPIC_API_KEY:
        raise RuntimeError("Set ANTHROPIC_API_KEY in .env")

    from anthropic import Anthropic

    client = Anthropic(api_key=ANTHROPIC_API_KEY)
    tools = [
        {
            "name": s["function"]["name"],
            "description": s["function"]["description"],
            "input_schema": s["function"]["parameters"],
        }
        for s in TOOL_SCHEMAS
    ]

    while True:
        response = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=history,
            tools=tools,
        )
        if response.stop_reason == "tool_use":
            history.append({"role": "assistant", "content": response.content})
            tool_results = []
            for block in response.content:
                if block.type != "tool_use":
                    continue
                output = dispatch(block.name, block.input)
                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": output,
                    }
                )
            history.append({"role": "user", "content": tool_results})
            continue

        parts = [b.text for b in response.content if hasattr(b, "text")]
        reply = "\n".join(parts).strip()
        history.append({"role": "assistant", "content": reply})
        return reply
