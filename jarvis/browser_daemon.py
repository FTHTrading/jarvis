"""Local HTTP bridge for the UnyKorn Sovereign Browser extension.

The daemon accepts read-only browser context from a Chromium extension and
routes it through the existing Jarvis brain. Any wallet, form submission, or
off-site action should stay behind an explicit approval gate in the browser UI.
"""

from __future__ import annotations

import argparse
import json
import os
from dataclasses import dataclass
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from .brain import Brain

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8765
MAX_CONTEXT_CHARS = 12_000
MAX_PROMPT_CHARS = 2_000

MODES = {
    "summarize": "Summarize the current page for the operator.",
    "explain": "Explain what this site/page is doing and what matters.",
    "web3_explain": "Analyze the dApp, contract, wallet, or transaction context with a risk lens.",
    "freeform": "Answer the operator's question using the captured page context.",
    "log_to_nil33": "Prepare a concise NIL33/Troptions graph log note from this page.",
}

WEB3_HINTS = (
    "wallet",
    "connect wallet",
    "ethereum",
    "solana",
    "contract",
    "token",
    "swap",
    "mint",
    "nft",
    "defi",
    "etherscan",
    "solscan",
)


def resolved_brain_backend() -> str:
    """Return the active brain backend without making helper imports heavy."""

    try:
        from .config import config

        return config.resolved_brain()
    except Exception:
        return os.environ.get("JARVIS_BRAIN", "openai")


@dataclass(frozen=True)
class BrowserAgentRequest:
    """Validated request payload from the browser extension."""

    mode: str
    prompt: str
    url: str
    title: str
    selection: str
    page_text: str
    web3_detected: bool


def _coerce_string(value: Any, max_chars: int) -> str:
    if value is None:
        return ""
    text = str(value).replace("\x00", "").strip()
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "\n...[truncated]"


def parse_browser_request(payload: dict[str, Any]) -> BrowserAgentRequest:
    """Normalize and validate a JSON request body."""

    raw_mode = _coerce_string(payload.get("mode"), 64) or "summarize"
    mode = raw_mode if raw_mode in MODES else "freeform"

    url = _coerce_string(payload.get("url"), 2_000)
    title = _coerce_string(payload.get("title"), 500)
    selection = _coerce_string(payload.get("selection"), MAX_CONTEXT_CHARS)
    page_text = _coerce_string(payload.get("text") or payload.get("pageText"), MAX_CONTEXT_CHARS)
    prompt = _coerce_string(payload.get("prompt"), MAX_PROMPT_CHARS)

    metadata = payload.get("metadata") if isinstance(payload.get("metadata"), dict) else {}
    web3_detected = bool(metadata.get("web3Detected")) or looks_like_web3(url, title, selection, page_text)

    return BrowserAgentRequest(
        mode=mode,
        prompt=prompt,
        url=url,
        title=title,
        selection=selection,
        page_text=page_text,
        web3_detected=web3_detected,
    )


def looks_like_web3(*parts: str) -> bool:
    """Best-effort dApp detection that avoids browser-specific wallet APIs."""

    haystack = " ".join(part.lower() for part in parts if part)
    return any(hint in haystack for hint in WEB3_HINTS)


def build_browser_prompt(request: BrowserAgentRequest) -> str:
    """Create the canonical prompt Jarvis/OpenClaw receives from browser context."""

    instructions = [
        "You are the UnyKorn Sovereign Browser agent inside Jarvis.",
        "Operate in Passive mode: read, summarize, explain, and propose next steps only.",
        "Do not claim to sign transactions, submit forms, move funds, or take off-site actions.",
        "If an action could affect a wallet, identity, payment, or external account, describe the approval gate first.",
        f"Mode: {request.mode} - {MODES[request.mode]}",
    ]
    if request.web3_detected:
        instructions.append(
            "Web3 context was detected. Include wallet/contract risk notes, approvals to inspect, and plain-English impact."
        )

    context = [
        f"URL: {request.url or '(unknown)'}",
        f"Title: {request.title or '(untitled)'}",
    ]
    if request.selection:
        context.append(f"Selected text:\n{request.selection}")
    if request.page_text:
        context.append(f"Page text snapshot:\n{request.page_text}")
    if request.prompt:
        context.append(f"Operator prompt:\n{request.prompt}")

    return "\n".join(instructions) + "\n\n--- Browser context ---\n" + "\n\n".join(context)


class BrowserAgent:
    """Thin facade around the existing Jarvis brain."""

    def __init__(self) -> None:
        self._brain: Brain | None = None

    @property
    def brain(self) -> Brain:
        if self._brain is None:
            from .brain import Brain

            self._brain = Brain()
        return self._brain

    def handle(self, payload: dict[str, Any]) -> dict[str, Any]:
        request = parse_browser_request(payload)
        prompt = build_browser_prompt(request)
        answer = self.brain.reply(prompt).strip() or "(no reply)"
        return {
            "answer": answer,
            "actions": [],
            "metadata": {
                "mode": request.mode,
                "agentState": "passive",
                "backend": resolved_brain_backend(),
                "web3Detected": request.web3_detected,
            },
        }


class BrowserDaemonHandler(BaseHTTPRequestHandler):
    """HTTP endpoints consumed by the browser extension."""

    agent = BrowserAgent()

    def do_OPTIONS(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
        self._send_json({}, HTTPStatus.NO_CONTENT)

    def do_GET(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
        if self.path.rstrip("/") == "/health":
            self._send_json(
                {
                    "ok": True,
                    "service": "jarvis-browser-daemon",
                    "brain": resolved_brain_backend(),
                    "agentState": "passive",
                }
            )
            return
        self._send_json({"error": "not_found"}, HTTPStatus.NOT_FOUND)

    def do_POST(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
        if self.path.rstrip("/") != "/agent":
            self._send_json({"error": "not_found"}, HTTPStatus.NOT_FOUND)
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._send_json({"error": "bad_content_length"}, HTTPStatus.BAD_REQUEST)
            return

        if length <= 0:
            self._send_json({"error": "empty_body"}, HTTPStatus.BAD_REQUEST)
            return
        if length > 256_000:
            self._send_json({"error": "body_too_large"}, HTTPStatus.REQUEST_ENTITY_TOO_LARGE)
            return

        try:
            raw = self.rfile.read(length).decode("utf-8")
            payload = json.loads(raw)
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._send_json({"error": "invalid_json"}, HTTPStatus.BAD_REQUEST)
            return

        if not isinstance(payload, dict):
            self._send_json({"error": "body_must_be_object"}, HTTPStatus.BAD_REQUEST)
            return

        try:
            response = self.agent.handle(payload)
        except Exception as exc:
            self._send_json({"error": "agent_failed", "detail": str(exc)}, HTTPStatus.BAD_GATEWAY)
            return

        self._send_json(response)

    def log_message(self, fmt: str, *args: Any) -> None:
        if os.environ.get("JARVIS_BROWSER_DAEMON_LOGS", "1") != "0":
            super().log_message(fmt, *args)

    def _send_json(self, payload: dict[str, Any], status: HTTPStatus = HTTPStatus.OK) -> None:
        body = b"" if status == HTTPStatus.NO_CONTENT else json.dumps(payload).encode("utf-8")
        self.send_response(int(status))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if body:
            self.wfile.write(body)


def run_server(host: str = DEFAULT_HOST, port: int = DEFAULT_PORT) -> None:
    server = ThreadingHTTPServer((host, port), BrowserDaemonHandler)
    print(f"Jarvis browser daemon listening on http://{host}:{port}")
    print("Endpoints: GET /health, POST /agent")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping browser daemon.")
    finally:
        server.server_close()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run the Jarvis browser daemon.")
    parser.add_argument("--host", default=os.environ.get("JARVIS_BROWSER_DAEMON_HOST", DEFAULT_HOST))
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("JARVIS_BROWSER_DAEMON_PORT", str(DEFAULT_PORT))),
    )
    args = parser.parse_args(argv)
    run_server(args.host, args.port)
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
