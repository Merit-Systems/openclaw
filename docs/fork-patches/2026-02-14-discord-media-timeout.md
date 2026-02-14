# Discord media send timeout fix

**Date:** 2026-02-14
**Incident window:** 2026-02-14 18:17–18:58 UTC (~40 min)

## Incident

Craig went unresponsive for 40+ minutes. The agent was mid-task sending image/video files to Discord and got stuck. Logs show the last output was "Now let me send the best image edit and both videos to Discord:" followed by total silence until manual service restart.

## Root cause

Neither the media download (`fetchRemoteMedia`) nor the Discord file upload (`rest.post`) have timeouts. When either operation hangs (network stall, Discord API stall, etc.), the agent's tool execution blocks indefinitely. The gateway's own timeouts (`callGateway` at 10s, `agent.wait` at 60s) only protect the gateway-to-agent connection — they don't abort the hung I/O inside the agent process, leaving it in a zombie state.

## Why diverge from upstream

Upstream OpenClaw has no timeout at these layers. This is a production reliability issue for CraigClaw — a single hung media send takes the entire agent offline. Filed/will file upstream but can't wait for merge.

## What changed

Three layers of timeouts added to the media send pipeline:

| Layer    | File                            | Timeout | Purpose                                                                                                               |
| -------- | ------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------- |
| Download | `src/media/fetch.ts`            | 60s     | `fetchRemoteMedia` now passes `timeoutMs: 60_000` to `fetchWithSsrFGuard` (plumbing already existed, just never used) |
| Upload   | `src/discord/send.shared.ts`    | 120s    | `sendDiscordMedia` wraps the Discord `rest.post()` call in `Promise.race` with a 120s timeout                         |
| Delivery | `src/infra/outbound/deliver.ts` | 180s    | `deliverOutboundPayloads` media loop wraps each `sendMedia()` call with a 180s safety-net timeout                     |

The timeouts are layered so the inner ones fire first under normal conditions, with the outer 180s as a last-resort safety net for any channel that lacks its own timeout.

## Upstream status

TBD — link to upstream issue/PR when filed.
