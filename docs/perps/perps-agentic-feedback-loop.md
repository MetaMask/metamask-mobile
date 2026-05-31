# Perps agentic feedback loop

MetaMask Mobile exposes a development-only agentic bridge so external Farmslot
Recipe v1 runners can control the app, seed deterministic fixtures, show a small
HUD, and capture proof from the real UI path.

## Repository boundary

The Mobile repository owns the product integration only:

- `app/core/AgenticService/` installs `globalThis.__AGENTIC__` in `__DEV__`.
- `scripts/perps/agentic/cdp-bridge.js` connects external tools to the React
  Native CDP target.
- `scripts/perps/agentic/setup-wallet.sh` applies wallet fixtures through the
  bridge.
- `scripts/perps/agentic/app-state.sh`, `app-navigate.sh`, and `screenshot.sh`
  are small diagnostics used by humans and external runners.

Recipe definitions, flow composition, action manifests, trace/summary output,
and MetaMask domain actions are maintained by the external Recipe v1 runner.
Do not add task-specific recipes or reusable runner actions to Mobile.

## Human workflow

Use Mobile scripts to start and inspect a controllable runtime:

```bash
yarn a:ios
yarn a:status
yarn a:navigate WalletView
yarn a:reload
```

Use the recipe-harness skill or external runner to execute Recipe v1 scenarios.
The runner consumes Mobile's bridge and writes its own evidence artifacts.

## HUD intent

The HUD is a human-facing proof aid. It should display one concise current
intent, optionally one subflow/context line, and failure details when useful. It
must not duplicate internal action names or task-specific debug text.

## Fixture workflow

Local fixture files belong under `.agent/` and must not be committed. The bridge
supports fixture setup so recipes can start from a deterministic wallet state,
while still validating behavior through the real app runtime.
