/**
 * System + user prompt builders for each agent mode.
 */
"use strict";

const SYSTEM_BASE = `You are the Unykorn Sovereign Agent — the AI layer of the Unykorn OS browser.
You are wired into the FTH / OpenClaw operator mesh.
Be concise, precise, and truthful. Use markdown for structure.
Never invent wallet keys, token balances, or on-chain data.
If you cannot verify a fact, say so clearly.`;

const MODE_INSTRUCTIONS = {
  summarize: `Summarize the current page for the operator. Cover: purpose, key content, action items. Keep it under 200 words.`,

  explain: `Explain what this website or product does. Cover: what it is, who it's for, key features, any risks. Keep it under 250 words.`,

  web3_explain: `Analyze this Web3 page or dApp. Cover:
- What the protocol does and its category (DEX, lending, NFT, etc.)
- Chains supported
- Key risks (smart contract risk, rug risk, audit status if visible)
- What the user might be doing here
- Any contract addresses visible on the page
Be direct and safety-conscious.`,

  freeform: `Answer the operator's question about this page or in general. Be helpful, direct, and concise.`,
};

export function buildSystemPrompt(mode, context) {
  const modeInstr = MODE_INSTRUCTIONS[mode] ?? MODE_INSTRUCTIONS.freeform;

  let systemPrompt = `${SYSTEM_BASE}\n\nTask: ${modeInstr}`;

  if (context.isKnownDapp || context.hasEthereum || context.hasSolana) {
    systemPrompt += `\n\nWeb3 context detected:`;
    if (context.hasEthereum) systemPrompt += ` EVM wallet present.`;
    if (context.hasSolana)   systemPrompt += ` Solana wallet present.`;
    if (context.isKnownDapp) systemPrompt += ` Known dApp domain.`;
  }

  return systemPrompt;
}

export function buildUserPrompt(mode, context, userPrompt) {
  const parts = [];

  parts.push(`**Page:** ${context.title || context.url}`);
  parts.push(`**URL:** ${context.url}`);

  if (context.selection) {
    parts.push(`**Selected text:**\n${context.selection.slice(0, 1000)}`);
  }

  if (context.contracts?.length) {
    parts.push(`**Contract addresses on page:** ${context.contracts.join(", ")}`);
  }

  if (context.fullText) {
    parts.push(`**Page content (first 4000 chars):**\n${context.fullText.slice(0, 4000)}`);
  }

  if (userPrompt) {
    parts.push(`**Operator's question:** ${userPrompt}`);
  }

  return parts.join("\n\n");
}
