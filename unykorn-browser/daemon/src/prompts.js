const MODE_INSTRUCTIONS = {
  summarize:
    "Summarize this page in clear, concise bullets. Highlight the main purpose, key facts, and any calls to action.",
  explain:
    "Explain what this site or page is for, who runs it, and what a user should verify before trusting it.",
  web3_explain:
    "This is a Web3 / dApp page. Explain what the dApp does, what wallet permissions may be requested, common risks (approvals, phishing, contract upgrades), and what the user should check before signing anything. Do not encourage signing.",
  freeform: "Answer the user's question using the page context below.",
};

export function buildAgentMessage(payload) {
  const {
    mode = "freeform",
    prompt = "",
    url = "",
    title = "",
    selection = "",
    pageText = "",
    web3 = {},
  } = payload;

  const instruction = MODE_INSTRUCTIONS[mode] || MODE_INSTRUCTIONS.freeform;
  const web3Block = web3?.detected
    ? `\nWeb3 signals: domain=${web3.domainMatch ? "yes" : "no"}, ethereum=${web3.hasEthereum ? "yes" : "no"}, solana=${web3.hasSolana ? "yes" : "no"}`
    : "";

  const userQuestion =
    mode === "freeform" && prompt.trim()
      ? `\nUser question:\n${prompt.trim()}`
      : mode !== "freeform" && prompt.trim()
        ? `\nExtra instructions:\n${prompt.trim()}`
        : "";

  const selectionBlock = selection.trim()
    ? `\nSelected text:\n${selection.trim()}`
    : "";

  const textBlock = pageText.trim()
    ? `\nPage text (truncated):\n${pageText.trim().slice(0, 12000)}`
    : "";

  return [
    "You are Unykorn Browser Agent — a sovereign, privacy-forward assistant embedded in the user's browser.",
    "You analyze page context only. Never invent URLs, balances, or contract addresses not present in the context.",
    "For wallet or signing actions: explain risks; never tell the user to approve without understanding.",
    "",
    `Task: ${instruction}`,
    userQuestion,
    "",
    `URL: ${url || "(none)"}`,
    `Title: ${title || "(none)"}`,
    web3Block,
    selectionBlock,
    textBlock,
  ]
    .filter(Boolean)
    .join("\n");
}
