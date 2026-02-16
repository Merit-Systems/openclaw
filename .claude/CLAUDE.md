# OpenClaw – Merit-Systems Fork

## About This Fork

This is Merit-Systems' fork of [openclaw/openclaw](https://github.com/openclaw/openclaw). We maintain patches here that are specific to our deployment (Craig) or that we intend to upstream.

## Active Patches

### `feat: resolve currentMessageId for react/reactions tool calls` (894e9efb2)

**Problem:** When the agent calls `message(action=react, emoji=fatbiden)` without a `messageId`, the tool throws `messageId required`. The agent doesn't always have the triggering message ID in its tool call params.

**Fix:** Thread `currentMessageId` (the Discord message ID that triggered the agent turn) from `sessionCtx.MessageSidFull ?? MessageSid` all the way through the execution pipeline:

```
agent-runner-execution.ts → RunEmbeddedPiAgentParams → EmbeddedRunAttemptParams
  → pi-tools (createOpenClawCodingTools) → openclaw-tools (createOpenClawTools)
  → message-tool (createMessageTool)
```

In `message-tool.ts`, for `react` and `reactions` actions: if no `messageId` is provided and `currentMessageId` is available, auto-fill it. Explicit `messageId` still takes precedence.

**Files changed (9):**

- `src/auto-reply/reply/agent-runner-execution.ts` – extract messageId from sessionCtx
- `src/auto-reply/reply/agent-runner-memory.ts` – same for memory flush runs
- `src/agents/pi-embedded-runner/run.ts` – pass through to attempt
- `src/agents/pi-embedded-runner/run/params.ts` – add to RunEmbeddedPiAgentParams type
- `src/agents/pi-embedded-runner/run/types.ts` – add to EmbeddedRunAttemptParams type
- `src/agents/pi-embedded-runner/run/attempt.ts` – pass through to tools
- `src/agents/pi-tools.ts` – pass through createOpenClawCodingTools → createOpenClawTools
- `src/agents/openclaw-tools.ts` – pass through to createMessageTool
- `src/agents/tools/message-tool.ts` – fallback logic (8 lines)

### `fix: add timeouts to Discord media send pipeline` (c445be637)

Upstream commit. Adds timeouts to media sends to prevent hangs.

### `feat: send Discord notification before memory compaction` (4e0e1a2dc)

Upstream commit. Notifies the agent before memory compaction starts.

## Development

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck  # must pass before pushing
```

## Deploy

Deployed version is pinned by commit hash in `Merit-Systems/CraigClaw/deploy/openclaw-pin`. After merging here, update that pin and merge the CraigClaw PR to trigger deploy.
