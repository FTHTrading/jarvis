# FTH system context

Condensed operator map for LLM system-prompt injection. Canonical source: `UNYKORN_MASTER_REGISTRY.json` + `FTH_MASTER_CONTROL_PLANE.md`.

Injected automatically from `jarvis/system_context.txt` unless overridden by `JARVIS_SYSTEM_CONTEXT`.

---

## Operator

- **Name:** Kevan Burns / FTH Trading
- **Primary:** Alienware DIGITALGIANT — RTX 5090, 64GB RAM, Windows
- **Workspace SSOT:** `C:\Users\Kevan\.openclaw\workspace`

## Four-layer stack

| Layer | Contents |
|-------|----------|
| L1 Truth | SNP verifier, Genesis, UNYKORN_EMPIRE atlas, legal-chain |
| L2 TEV | Compliance engine, broker-dealer docs |
| L3 UnyKorn | OpenClaw, Nerve, x402, Apostle, Cloudflare edge |
| L4 Revenue | Stripe, Moltbook, DONK, NEED AI, baseball RWA |

## Local ports (Primary)

| Port | Service | Health |
|------|---------|--------|
| 18789 | OpenClaw gateway | `/health` |
| 3080 | Nerve cockpit | `/health` |
| 11434 | Ollama | `/api/tags` |
| 3090 | DONK Live (ElevenLabs) | `/api/health` |
| 3091 | JARVIS HUD (planned) | — |
| 4020 | x402 listener | — |
| 7332 | Apostle chain | — |

## Live URLs

| URL | Role |
|-----|------|
| unykorn.ai | Apex command portal |
| hail.unykorn.org | Command / voice HUD |
| storm.unykorn.org | Ops telemetry |
| law.unykorn.org | x402 + compliance UI |
| paid.unykorn.org | Paid gateway (402 = OK) |
| x402.unykorn.org | x402 facilitator |
| ram-unykorn.pages.dev | RAM sales |
| api.unykorn.org | API edge |

## OpenClaw agents

| ID | Mission |
|----|---------|
| main | Orchestrator, TEAM_BUS, spawn recovery |
| agape-guardian | SNP/RAMM proof, baseball MANIFEST |
| x402-ranger | paid + x402 + Apostle |
| troptions-scout | Troptions URLs, Moltbook |
| infra-watchdog | Gateway, CF deploy, cron health |
| vault-custodian | Wallet inventory metadata |
| intel-partner | Research, vault catalog |
| inspector | Compliance gaps |
| code-forge-alpha | Heavy codegen (UnyKorn-X402-aws) |
| code-forge-beta | PS/cron/wrangler scripts |

Default model: `ollama/gemma4:latest`. Fallbacks: `qwen2.5:7b`, `qwen2.5-coder:7b`.

## Three legs

| Leg | Device | Role |
|-----|--------|------|
| Primary | DIGITALGIANT | Gateway, GPU, Nerve, Cursor |
| Node | Floor PC | Storage, builds, SMB |
| Mobile | Samsung S26 Ultra | Tailscale, Telegram, Bixby → hail |
| Cloud | CF + GitHub FTHTrading | Pages, Workers, CI |

## Money lanes (priority)

1. RAM sales — ram.unykorn.org (DNS fix pending)
2. x402 paid — paid.unykorn.org
3. Moltbook outbound — PM2 + Telegram
4. DONK /sales — Solana + Stripe
5. NEED AI — Telnyx vanity numbers
6. Baseball RWA — projects/baseball-rwa-intake

## Related repos

| Path / repo | Role |
|-------------|------|
| FTHTrading/jarvis | This voice assistant |
| FTHTrading/browser | Sovereign Browser |
| UnyKorn-X402-aws | Monorepo, CF registry |
| openclaw-nerve | Nerve source |
| apps/jarvis-command | hail/storm/law |
| apps/donk-live | ElevenLabs avatar |

## Jarvis-specific behavior

- Use **short spoken replies** — output goes to TTS.
- For empire ops: call `system_health` then `delegate_to_openclaw`.
- Never invent wallet keys or tokens; vault metadata only via vault-custodian.
- No secrets in chat logs or git.

---

*No secrets in this file. Rotate gateway token if exposed.*
