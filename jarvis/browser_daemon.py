"""Local daemon for the UnyKorn sovereign browser extension.

This service receives browser context from a local extension and routes it
through Jarvis/OpenClaw for page-aware answers.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import uuid
from dataclasses import dataclass
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from .brain import Brain

LOG = logging.getLogger("jarvis.browser-daemon")


ALLOWED_TOOL_NAMES = {
    "get_time",
    "web_search",
    "system_health",
    "delegate_to_openclaw",
}


def _configure_browser_brain() -> Brain:
    """Create a Brain instance constrained to read/analysis-safe tools."""
    brain = Brain()
    safe_tools = [
        tool
        for tool in brain.tools
        if tool["function"]["name"] in ALLOWED_TOOL_NAMES
    ]
    brain.tools = safe_tools
    brain.tool_index = {t["function"]["name"]: t["_impl"] for t in safe_tools}
    return brain


def _safe_text(value: Any, limit: int = 6000) -> str:
    if not value:
        return ""
    return str(value).strip()[:limit]


def build_browser_prompt(payload: dict[str, Any]) -> str:
    """Construct a deterministic browser-agent prompt from extension payloads."""
    mode = _safe_text(payload.get("mode"), 64) or "freeform"
    prompt = _safe_text(payload.get("prompt"), 2500)
    context = payload.get("context") or {}
    if not isinstance(context, dict):
        context = {}

    url = _safe_text(context.get("url"), 2048)
    title = _safe_text(context.get("title"), 512)
    selection = _safe_text(context.get("selection"), 2000)
    page_text = _safe_text(context.get("pageText"), 12000)
    dapp_signals = context.get("dappSignals") or {}
    if not isinstance(dapp_signals, dict):
        dapp_signals = {}

    mode_directive = {
        "summarize": "Summarize the page into key points and immediate next actions.",
        "explain": "Explain this page clearly for an operator making decisions quickly.",
        "web3_explain": (
            "Analyze as a Web3 surface. Identify likely chain/app intent, wallet "
            "interaction points, contract/approval risk clues, and what to verify."
        ),
        "freeform": "Answer the operator's request using available page context.",
    }.get(mode, "Answer the operator's request using available page context.")

    signal_lines = "\n".join(
        f"- {key}: {value}" for key, value in dapp_signals.items() if value is not None
    )
    if not signal_lines:
        signal_lines = "- none"

    return (
        "You are the UnyKorn Sovereign Browser agent. "
        "Operate in read/analyze mode unless explicitly asked otherwise.\n\n"
        f"Mode: {mode}\n"
        f"Directive: {mode_directive}\n"
        f"Operator Prompt: {prompt or '(none)'}\n\n"
        "Page Context:\n"
        f"- URL: {url or '(unknown)'}\n"
        f"- Title: {title or '(unknown)'}\n"
        f"- Selected Text: {selection or '(none)'}\n"
        "- dApp Signals:\n"
        f"{signal_lines}\n\n"
        "Page Text Snapshot:\n"
        f"{page_text or '(empty)'}"
    )


@dataclass
class DaemonState:
    sessions: dict[str, Brain]

    def get_brain(self, session_id: str) -> Brain:
        brain = self.sessions.get(session_id)
        if brain is None:
            brain = _configure_browser_brain()
            self.sessions[session_id] = brain
        return brain


def make_handler(state: DaemonState) -> type[BaseHTTPRequestHandler]:
    class BrowserDaemonHandler(BaseHTTPRequestHandler):
        server_version = "JarvisBrowserDaemon/0.1"

        def _send_json(self, status: int, body: dict[str, Any]) -> None:
            encoded = json.dumps(body).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(encoded)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header(
                "Access-Control-Allow-Headers", "Content-Type, X-Unykorn-Client"
            )
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.end_headers()
            self.wfile.write(encoded)

        def do_OPTIONS(self) -> None:  # noqa: N802
            self._send_json(HTTPStatus.NO_CONTENT, {})

        def do_GET(self) -> None:  # noqa: N802
            if self.path.rstrip("/") == "/health":
                self._send_json(
                    HTTPStatus.OK,
                    {
                        "ok": True,
                        "service": "jarvis-browser-daemon",
                        "version": "0.1",
                    },
                )
                return
            self._send_json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "not_found"})

        def do_POST(self) -> None:  # noqa: N802
            if self.path.rstrip("/") != "/agent":
                self._send_json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "not_found"})
                return
            raw_length = self.headers.get("Content-Length", "0")
            try:
                content_length = int(raw_length)
            except ValueError:
                content_length = 0
            raw_body = self.rfile.read(max(content_length, 0))
            try:
                payload = json.loads(raw_body.decode("utf-8") or "{}")
            except json.JSONDecodeError:
                self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "invalid_json"})
                return
            if not isinstance(payload, dict):
                self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "invalid_payload"})
                return

            session_id = _safe_text(payload.get("sessionId"), 128) or str(uuid.uuid4())
            brain = state.get_brain(session_id)
            request_text = build_browser_prompt(payload)
            try:
                answer = brain.reply(request_text)
            except Exception as exc:  # pragma: no cover - external API/runtime failure
                LOG.exception("Agent request failed")
                self._send_json(
                    HTTPStatus.INTERNAL_SERVER_ERROR,
                    {"ok": False, "error": "agent_failure", "detail": str(exc)},
                )
                return
            self._send_json(
                HTTPStatus.OK,
                {
                    "ok": True,
                    "sessionId": session_id,
                    "answer": answer,
                    "metadata": {
                        "mode": _safe_text(payload.get("mode"), 64) or "freeform",
                        "backend": brain.backend,
                    },
                },
            )

        def log_message(self, fmt: str, *args: Any) -> None:
            LOG.debug("%s - %s", self.address_string(), fmt % args)

    return BrowserDaemonHandler


def main() -> int:
    env_host = os.environ.get("JARVIS_BROWSER_DAEMON_HOST", "127.0.0.1")
    try:
        env_port = int(os.environ.get("JARVIS_BROWSER_DAEMON_PORT", "8787"))
    except ValueError:
        env_port = 8787
    parser = argparse.ArgumentParser(
        description="Run the local daemon for the UnyKorn browser extension."
    )
    parser.add_argument("--host", default=env_host, help="Bind host.")
    parser.add_argument("--port", type=int, default=env_port, help="Bind port.")
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Logging level.",
    )
    args = parser.parse_args()
    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    state = DaemonState(sessions={})
    handler_cls = make_handler(state)
    server = ThreadingHTTPServer((args.host, args.port), handler_cls)
    LOG.info("Starting browser daemon on http://%s:%s", args.host, args.port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        LOG.info("Stopping browser daemon.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
