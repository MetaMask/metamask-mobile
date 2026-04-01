# Perps WebSocket Investigation

**Updated**: 2026-04-01
**Original trigger**: 7.70 Sentry spike
**Scope now**: websocket init failures and error amplification across always-on Perps lifecycle

## Status

The previous version of this report was too confident about the wrong thing. We did
**not** prove that the spike is simply "iOS background WebSocket death" or "just
noise". What we did prove is narrower and more useful:

- the real exception `WebSocketRequestError: Failed to establish WebSocket connection`
  occurs without the RCA harness
- the same app-level failure path exists on both iOS and Android
- Perps always-on moved HyperLiquid init into wallet lifecycle
- foreground lifecycle is amplifying attempts by forcing reconnects too aggressively
- when init fails at the wrong time, full-screen Perps can show a blocking error view
- the rate-limit issue fixed by `#28176` is separate from this websocket lifecycle issue

## Verified Findings

### 1. The RCA harness did not create the real error

`app/controllers/perps/utils/perpsRca.ts` only adds:

- deterministic fault injection
- structured local RCA markers
- helper methods for recipe-driven repro

It did **not** invent the underlying exception. We saw the real production-style error
in the live app log without forcing it:

- `WebSocketRequestError: Failed to establish WebSocket connection`
- `PerpsConnectionManager: Connection failed`

### 2. Always-on changed the population of connection attempts

`PerpsAlwaysOnProvider` starts Perps connection work from wallet-root. That means
HyperLiquid init is no longer limited to "user explicitly opened Perps". It now happens
for eligible wallet sessions during app lifecycle.

### 3. Foreground handling is a major amplifier

The later foreground lifecycle change made `AppState -> active` call
`ensureConnected()`, and that path forces a teardown + reconnect. So the error volume is
not explained by one cold start. It is multiplied by:

- app launch
- foreground return
- reconnect after lifecycle/network transitions

This is a much better explanation for the large error volume than a tiny startup delay.

### 4. This is not proven to be iOS-only

The app-level mechanism is cross-platform. We also saw the exact error locally on iOS,
and the same exception exists in Sentry across both platforms. Platform-specific
frequency may differ, but the lifecycle bug is not iOS-only.

### 5. User impact is real, but intermittent

We proved the UI consequence with a deterministic repro:

- if HyperLiquid init fails
- and the user is on a full Perps surface
- `PerpsConnectionProvider` can render the blocking connection error view
- retry can recover successfully

We did **not** prove that spontaneous launch-time blocking is common. Normal simulator
launches often succeed or recover before the user notices. So the honest conclusion is:

- not every event is user-visible
- not every event is harmless noise either

### 6. `#28176` is not the websocket fix

`#28176` reduces rate-limit exhaustion during rapid market switching. That work is valid,
but it addresses a different path from the websocket lifecycle flood.

## Root Cause Statement

The app-level root cause is:

1. always-on moved HyperLiquid websocket init from explicit Perps entry to wallet
   lifecycle
2. foreground lifecycle later forced a full reconnect on every `active`
3. those non-interactive attempts are much more frequent than explicit Perps entry
4. failures in those attempts were then logged and sometimes surfaced like hard Perps
   connection failures

What we **have not** proven yet is the lower-level transport reason that
`wsTransport.ready()` sometimes fails in production. The lifecycle amplification is the
confirmed root cause for the flood; the transport-level cause remains open.

## Deterministic Reproduction

### Files

- RCA bridge: `app/controllers/perps/utils/perpsRca.ts`
- Recipe: `scripts/perps/agentic/teams/perps/recipes/reproduce-ws-init-failure.json`

### What the recipe proves

The recipe arms a one-shot HyperLiquid init failure, triggers the same connection manager
path used by always-on Perps, verifies the error becomes visible on a full Perps screen,
then retries and verifies recovery plus market loading.

### Run it

```bash
cd /Users/deeeed/dev/metamask/metamask-mobile-4-ws
yarn a:status
bash scripts/perps/agentic/validate-recipe.sh \
  scripts/perps/agentic/teams/perps/recipes/reproduce-ws-init-failure.json \
  --skip-manual
```

### Expected RCA markers

The happy-path repro sequence is:

- `connect_requested`
- `hl_init_start`
- `hl_init_forced_failure`
- `hl_init_fail`
- `connection_error_visible`
- `retry_requested`
- `hl_init_success`
- `retry_success`

## Recording a Reviewable Video

The recipe runner already supports the HUD overlay documented in
`docs/perps/perps-agentic-feedback-loop.md`, so reviewers can see the active step while
the flow runs.

To record the iOS simulator while the recipe runs:

```bash
cd /Users/deeeed/dev/metamask/metamask-mobile-4-ws
mkdir -p .agent/videos
xcrun simctl io booted recordVideo .agent/videos/reproduce-ws-init-failure.mp4
```

Then, in another shell, run:

```bash
cd /Users/deeeed/dev/metamask/metamask-mobile-4-ws
bash scripts/perps/agentic/validate-recipe.sh \
  scripts/perps/agentic/teams/perps/recipes/reproduce-ws-init-failure.json \
  --skip-manual
```

Stop the recording with `Ctrl+C` in the `recordVideo` shell.

## Fix Direction

This should stay separate from `#28176`.

The minimal correct websocket fix direction is:

- keep Perps always-on
- stop forcing a full reconnect on every foreground when the socket is still healthy
- make wallet-root/tutorial preload failures best-effort instead of hard user-facing
  failures
- keep interactive Perps-entry failures visible

That is the basis of the follow-up websocket branch / PR.
