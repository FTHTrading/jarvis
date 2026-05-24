# Integrating with Cursor (this AI coding agent)

Cursor does **not** ship a full desktop Jarvis. It is optimized for **reading and editing your repository**. You still want a **local** layer for voice + OS control.

## Option 1 — Voice inside Cursor (coding only)

Best when your main goal is “talk to the AI while coding,” not “control my whole PC.”

### Spokenly (recommended for agent ↔ voice dialog)

1. Install [Spokenly](https://spokenly.app/download) on your Mac (Windows beta available).  
2. In Cursor: **Settings → MCP → Add server**  
   - Type: HTTP  
   - URL: `http://localhost:51089/mcp`  
3. Restart Cursor.  
4. Optional user rule: ask the agent to use `ask_user_dictation` for questions so you answer by voice.

Docs: [spokenly.app/speech-to-text-cursor](https://spokenly.app/speech-to-text-cursor)

### Dictator / Yap (mic → text in chat)

- [tahaabbas/dictator](https://github.com/tahaabbas/dictator) — Whisper in-editor  
- [avarayr/yap-for-cursor](https://github.com/avarayr/yap-for-cursor) — local WebGPU Whisper  

These do **not** give the agent a speaking voice; they only transcribe **your** speech into the chat box.

### Codecall (lifelike **agent** voice while coding)

[TN0123/codecall](https://github.com/TN0123/codecall) — Discord-style “call” with multiple Cursor agents and **ElevenLabs** TTS/STT. Closest to “Jarvis in the IDE” for developers.

## Option 2 — Local Jarvis + Cursor side by side

| Task | Use |
|------|-----|
| “Open Slack, what’s on my calendar?” | Local Jarvis ([isair/jarvis](https://github.com/isair/jarvis) or `assistant/main.py`) |
| “Refactor auth and add tests” | Cursor Agent |
| “Deploy and fix CI” | Cursor Agent |

### Handoff patterns

1. **Manual** — Jarvis summarizes a task; you paste into Cursor chat.  
2. **File drop** — Local agent writes `TASK.md` in the project; you tell Cursor “execute TASK.md”.  
3. **MCP** — Advanced: run an MCP server locally that both Jarvis and Cursor can call (filesystem, git, shell). [isair/jarvis](https://github.com/isair/jarvis) supports unlimited MCPs.  
4. **Cursor CLI** — Codecall uses the `agent` CLI for headless Cursor; same idea for scripts.

## Option 3 — Cloud Agent (what you’re using now)

The **Cloud Agent** runs in a remote environment. It can:

- Push code and docs to **this** GitHub repo  
- Explain architecture and configure integrations  

It **cannot**:

- Install software on your laptop  
- Access your microphone or speakers  
- Run persistently in your system tray  

After this PR merges, **clone the repo on your machine** and follow [SETUP.md](SETUP.md) or install isair/jarvis from releases.

## MCP in Cursor (shared tools)

If you use Phantom, Supabase, Stripe, etc. in Cursor, the same MCP servers can often be used by a local Jarvis that speaks MCP — so one “tool layer” serves both UIs.

Example `~/.cursor/mcp.json` (illustrative):

```json
{
  "mcpServers": {
    "spokenly": {
      "url": "http://localhost:51089/mcp"
    }
  }
}
```

Project-level: `.cursor/mcp.json` in your repo.

## Practical recommendation

1. **This week:** Install [isair/jarvis](https://github.com/isair/jarvis) *or* run `assistant/main.py` for voice + PC.  
2. **For coding:** Add Spokenly or Dictator to Cursor.  
3. **For movie-quality voice in IDE:** Try Codecall + ElevenLabs.  
4. **Iterate:** Add MCP tools once the basic loop feels good.
