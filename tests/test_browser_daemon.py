import unittest

from jarvis.browser_daemon import (
    MAX_CONTEXT_CHARS,
    build_browser_prompt,
    looks_like_web3,
    parse_browser_request,
)


class BrowserDaemonTests(unittest.TestCase):
    def test_parse_browser_request_defaults_unknown_mode_to_freeform(self) -> None:
        request = parse_browser_request({"mode": "invented", "url": "https://example.com"})

        self.assertEqual(request.mode, "freeform")
        self.assertEqual(request.url, "https://example.com")

    def test_parse_browser_request_truncates_large_page_text(self) -> None:
        request = parse_browser_request({"text": "x" * (MAX_CONTEXT_CHARS + 50)})

        self.assertLess(len(request.page_text), MAX_CONTEXT_CHARS + 20)
        self.assertTrue(request.page_text.endswith("...[truncated]"))

    def test_looks_like_web3_detects_wallet_context(self) -> None:
        self.assertTrue(looks_like_web3("https://app.uniswap.org", "Connect Wallet", "", ""))

    def test_build_browser_prompt_includes_passive_approval_guardrail(self) -> None:
        request = parse_browser_request(
            {
                "mode": "web3_explain",
                "url": "https://etherscan.io/tx/0x123",
                "title": "Transaction",
                "prompt": "Explain this before I sign.",
                "metadata": {"web3Detected": True},
            }
        )

        prompt = build_browser_prompt(request)

        self.assertIn("Operate in Passive mode", prompt)
        self.assertIn("approval gate", prompt)
        self.assertIn("Web3 context was detected", prompt)
        self.assertIn("https://etherscan.io/tx/0x123", prompt)


if __name__ == "__main__":
    unittest.main()
