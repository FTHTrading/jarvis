# Flowcharts

## Voice loop (Jarvis repo)

```mermaid
flowchart LR
  subgraph input [Input]
    W[Wake word / PTT / text]
    MIC[Microphone]
  end
  subgraph audio [Audio]
    STT[faster-whisper / Whisper API]
  end
  subgraph brain [Brain]
    LLM[OpenAI / Ollama / OpenClaw]
    TOOLS[Skills tool loop]
  end
  subgraph output [Output]
    TTS[ElevenLabs / OpenAI / pyttsx3]
    SPK[Speaker]
  end
  W --> MIC --> STT --> LLM
  LLM --> TOOLS
  TOOLS --> LLM
  LLM --> TTS --> SPK
```

## Skill routing

```mermaid
flowchart TB
  U[User utterance] --> B[Brain]
  B --> D{Tool call?}
  D -->|no| R[Spoken reply]
  D -->|yes| S[skills.py]
  S --> L[Local: open_url, shell, search]
  S --> H[system_health]
  S --> OC[delegate_to_openclaw]
  L --> B
  H --> B
  OC --> GW[OpenClaw CLI → :18789]
  GW --> AG[Agent: main / infra-watchdog / …]
  AG --> B
  B --> R
```

## OpenClaw mesh delegation

```mermaid
flowchart TB
  subgraph primary [Primary DIGITALGIANT]
    J[Jarvis Python]
    GW[OpenClaw Gateway :18789]
    OL[Ollama :11434 gemma4]
    NV[Nerve :3080]
    DK[DONK Live :3090]
  end
  subgraph agents [10-agent roster]
    M[main]
    IW[infra-watchdog]
    X4[x402-ranger]
    CF[code-forge-alpha/beta]
  end
  subgraph edge [Cloudflare]
    H[hail.unykorn.org]
    P[paid.unykorn.org]
  end
  subgraph mobile [Samsung S26 Ultra]
    BX[Bixby one-tap]
    TG[Telegram Ada bot]
  end
  J -->|delegate_to_openclaw| GW
  NV -->|WebSocket| GW
  GW --> OL
  GW --> M
  M --> IW & X4 & CF
  NV --> DK
  H --> NV
  BX --> H
  TG --> GW
  X4 --> P
```

## Brain backend selection

```mermaid
flowchart TD
  START[JARVIS_BRAIN env] --> Q1{openclaw?}
  Q1 -->|yes| OC[openclaw agent CLI]
  Q1 -->|no| Q2{JARVIS_OLLAMA_MODEL set?}
  Q2 -->|yes| OL[Ollama /api/chat + tools]
  Q2 -->|no| OAI[OpenAI chat + tools]
  OC --> R[Reply]
  OL --> R
  OAI --> R
```

## FTH four-layer stack (context)

```mermaid
flowchart TB
  L1[L1 Truth — SNP, Genesis, empire atlas]
  L2[L2 TEV / compliance]
  L3[L3 UnyKorn — OpenClaw Nerve x402 Apostle]
  L4[L4 Revenue — RAM DONK NEED AI Stripe]
  L1 --> L3
  L2 --> L3
  L3 --> L4
```

See [FTH_SYSTEM_CONTEXT.md](FTH_SYSTEM_CONTEXT.md) for ports and agents.
