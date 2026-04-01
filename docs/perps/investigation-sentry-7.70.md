# Perps WebSocket Lifecycle Investigation

**Updated**: 2026-04-01  
**Original trigger**: Sentry spike starting in 7.70  
**Current scope**: `WebSocketRequestError: Failed to establish WebSocket connection`

## Summary

This issue is not explained by the rate-limit bug fixed in `#28176`, and it is not
accurate to describe it as only "iOS background noise".

The confirmed app-level root cause is websocket lifecycle amplification:

- `#27103` moved HyperLiquid init into wallet-root always-on lifecycle
- foreground handling was later changed to force reconnects aggressively on `active`
- that greatly increased non-interactive websocket init attempts
- failures in those attempts were logged like hard Perps connection failures

This explains why error volume jumped after always-on was introduced without requiring
all users to see a blocking error screen.

## What Is Confirmed

### 1. The real exception happens without the RCA harness

The RCA helper at `app/util/perpsRca.ts` only adds:

- deterministic fault injection
- structured local RCA markers
- helper methods for recipe-driven reproduction

It did not invent the real exception. We observed the production-style failure locally
without forcing it:

- `WebSocketRequestError: Failed to establish WebSocket connection`
- `PerpsConnectionManager: Connection failed`

### 2. Always-on changed when websocket init happens

`PerpsAlwaysOnProvider` starts Perps connection work from wallet-root, so HyperLiquid
init is no longer limited to explicit Perps entry. It now runs as part of normal wallet
lifecycle for eligible sessions.

### 3. Foreground reconnect behavior is a major amplifier

Foreground return now calls `ensureConnected()`, and that path forces teardown +
reconnect behavior too aggressively. The error count is therefore multiplied by:

- app launch
- foreground return
- reconnect after lifecycle or network transitions

This is the strongest app-level explanation for the large event count.

### 4. The app-level issue is cross-platform

The lifecycle path exists on both iOS and Android. We also saw the exact websocket error
locally on iOS. Platform frequency may differ, but the app-level bug is not limited to
one platform.

### 5. User impact is real but intermittent

We proved the user-visible path with deterministic reproduction:

- if HyperLiquid init fails
- and the user is on a full Perps surface
- `PerpsConnectionProvider` can render the blocking connection error view
- retry can recover and markets load again

We did **not** prove that normal launch commonly lands users on that screen. Many
sessions will likely recover before the user notices. So the right conclusion is:

- not every event is user-visible
- not every event is harmless noise

### 6. This is separate from `#28176`

`#28176` addresses rapid market-switching rate-limit exhaustion. That fix is valid, but
it does not address the websocket lifecycle flood described here.

## Root Cause Statement

The confirmed app-level root cause is:

1. always-on moved HyperLiquid websocket init from explicit Perps entry to wallet
   lifecycle
2. foreground lifecycle then multiplied attempts by reconnecting too aggressively
3. those non-interactive attempts happen much more often than explicit Perps entry
4. failures in those attempts were reported like hard Perps failures

## What Is Still Not Proven

We have **not** yet proven the lower-level transport reason that
`wsTransport.ready()` fails in production. The lifecycle amplification explains the
flood. The transport-level failure cause is still open.

## Deterministic Reproduction

**Exact reproduction snapshot**: `4614bd6023`

To reproduce against the preserved RCA harness state:

```bash
git checkout 4614bd6023
```

### Artifacts

- RCA bridge: `app/util/perpsRca.ts`
- Recipe: `scripts/perps/agentic/teams/perps/recipes/reproduce-ws-init-failure.json`

### What the recipe proves

The recipe arms a one-shot HyperLiquid init failure, triggers the same connection
manager path used by always-on Perps, verifies the blocking Perps connection error view,
then retries and verifies recovery plus market loading.

### Run

```bash
cd /Users/deeeed/dev/metamask/metamask-mobile-4
yarn a:status
bash scripts/perps/agentic/validate-recipe.sh \
  scripts/perps/agentic/teams/perps/recipes/reproduce-ws-init-failure.json \
  --skip-manual
```

### Expected RCA markers

- `connect_requested`
- `hl_init_start`
- `hl_init_forced_failure`
- `hl_init_fail`
- `connection_error_visible`
- `retry_requested`
- `hl_init_success`
- `retry_success`

## Optional Video Capture

To record the iOS simulator while running the recipe:

```bash
cd /Users/deeeed/dev/metamask/metamask-mobile-4
mkdir -p .agent/videos
xcrun simctl io booted recordVideo .agent/videos/reproduce-ws-init-failure.mp4
```

Then run the recipe in another shell and stop recording with `Ctrl+C`.

## Recommended Fix Direction

This should remain separate from `#28176`.

Minimal correct fix direction:

- keep Perps always-on
- do not force full reconnect on every foreground if the socket is still healthy
- treat wallet-root and tutorial preload failures as best-effort
- keep interactive Perps-entry failures user-visible

This reduces lifecycle churn without removing always-on behavior.
