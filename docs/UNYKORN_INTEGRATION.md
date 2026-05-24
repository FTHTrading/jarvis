# UnyKorn / FTH integration

Jarvis on **Primary** (Windows + RTX 5090) is the local voice shell. The **UnyKorn runtime** (OpenClaw + Nerve + x402) is the multi-agent brain and operator mesh.

## Three-layer model

```text
┌─────────────────┐     voice/tools      ┌──────────────────┐
│  Jarvis (repo)  │ ───────────────────► │  Your Windows PC │
│  mic → STT → TTS│                      │  apps, shell, URL│
└────────┬────────┘                      └──────────────────┘
         │ delegate_to_openclaw / JARVIS_BRAIN=openclaw
         ▼
┌─────────────────┐     spawn / cron     ┌──────────────────┐
│ OpenClaw :18789 │ ◄──────────────────► │ 10-agent roster  │
│ gemma4 default  │                      │ main, infra-…    │
└────────┬────────┘                      └──────────────────┘
         │ WebSocket / CLI
         ▼
┌─────────────────┐     voice HUD        ┌──────────────────┐
│  Nerve :3080    │ ◄── hail.unykorn.org │ DONK Live :3090  │
│  mic, Edge TTS  │     (CF Pages)       │ ElevenLabs avatar│
└─────────────────┘                      └──────────────────┘
```

## Connection modes

### 1. Skill: `delegate_to_openclaw` (recommended)

Jarvis stays lightweight; heavy work goes to the mesh:

```text
"Jarvis, spawn infra-watchdog and probe gateway, nerve, and ollama"
→ delegate_to_openclaw(message="spawn infra-watchdog …", agent_id="infra-watchdog")
→ openclaw agent --agent infra-watchdog --message "…" --json
```

Specialist agent IDs: `main`, `infra-watchdog`, `x402-ranger`, `agape-guardian`, `troptions-scout`, `vault-custodian`, `intel-partner`, `inspector`, `code-forge-alpha`, `code-forge-beta`.

### 2. Brain backend: `JARVIS_BRAIN=openclaw`

Every user turn routes through OpenClaw (no local OpenAI/Ollama tool loop in Jarvis). Good when Primary gateway is always up and you want gemma4 + full agent tools.

```dotenv
JARVIS_BRAIN=openclaw
OPENCLAW_GATEWAY_URL=http://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=        # from ~/.openclaw/openclaw.json gateway.auth.token
JARVIS_OPENCLAW_AGENT=main
```

Requires global `openclaw` CLI (`npm i -g openclaw`).

### 3. Skill: `system_health`

Probes before delegating:

- `http://127.0.0.1:18789/health` — OpenClaw gateway
- `http://127.0.0.1:3080/health` — Nerve
- `http://127.0.0.1:11434/api/tags` — Ollama

### 4. Nerve voice HUD (parallel path)

For the richest operator voice loop today, use Nerve directly:

1. `powershell -File C:\Users\Kevan\.openclaw\workspace\scripts\start-nerve-voice.ps1`
2. Open http://127.0.0.1:3080 — select **main** session
3. Mic → `[voice]` prefix → OpenClaw → Edge TTS (or DONK Live ElevenLabs on :3090)

Jarvis repo complements Nerve: simpler local assistant, Windows one-click, optional delegation.

## Command surfaces (jarvis-command)

| URL | Role |
|-----|------|
| https://hail.unykorn.org | Command / voice HUD entry |
| https://storm.unykorn.org | Ops / build telemetry |
| https://law.unykorn.org | x402 + compliance UI |
| https://command.unykorn.ai | CNAME → jarvis-hail |

Source lives under OpenClaw workspace `apps/jarvis-command`.

## x402 & revenue lanes

| Surface | Purpose |
|---------|---------|
| https://paid.unykorn.org | Paid gateway (HTTP 402 on probe = healthy) |
| https://x402.unykorn.org | x402 facilitator |
| https://ram-unykorn.pages.dev | RAM sales |

Use `x402-ranger` agent for paid/x402/Apostle work.

## Sovereign Browser

[FTHTrading/browser](https://github.com/FTHTrading/browser) — search + delegate + x402 in one chrome. Jarvis is the **desktop voice shell**; Browser is the **navigation + commerce shell**. Same gateway (:18789), different UX.

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `OPENCLAW_GATEWAY_URL` | `http://127.0.0.1:18789` | Gateway HTTP base |
| `OPENCLAW_GATEWAY_TOKEN` | _(unset)_ | Auth token (never commit) |
| `JARVIS_OPENCLAW_AGENT` | `main` | Default delegate target |
| `JARVIS_BRAIN` | `openai` | `openclaw` for full mesh brain |
| `JARVIS_SYSTEM_CONTEXT` | `jarvis/system_context.txt` | FTH prompt injection |

## System context injection

`jarvis/system_context.txt` is appended to the system prompt (ports, agents, URLs). See [FTH_SYSTEM_CONTEXT.md](FTH_SYSTEM_CONTEXT.md) for the full condensed map.

## Related docs

- [LLM_UPGRADE_PATH.md](LLM_UPGRADE_PATH.md) — Ollama model matrix
- [MOBILE_SAMSUNG.md](MOBILE_SAMSUNG.md) — phone one-tap (not native Jarvis)
- [FLOWCHARTS.md](FLOWCHARTS.md) — wake → listen → think → act
- OpenClaw: `docs/NERVE_VOICE_DELEGATION.md`, `docs/FTH_MASTER_CONTROL_PLANE.md`
