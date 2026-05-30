# Mobile Perps Agentic Toolkit

This directory contains the low-level Mobile transport used by the MetaMask
Recipe v1 runner. It is not the authoring surface for new portable recipes. New
recipes should target the runner action manifest and use `ui.*`, `wait`,
`watch_logs`, `metamask.wallet.*`, and `metamask.perps.*` actions declared by the
runner.

## Directory map

```text
scripts/perps/agentic/
  cdp-bridge.js              CDP client for status, route, raw eval, press, scroll, and input helpers
  app-state.sh               Shell wrapper for common debug/status commands
  app-navigate.sh            Route navigation helper for local debugging
  setup-wallet.sh            Fixture-based wallet setup used by the runner
  teams/perps/flows/         Existing domain flows used as migration/reference material
  teams/perps/pre-conditions.js
```

## Recommended workflow

```bash
# Confirm Metro/CDP/device wiring
yarn a:status

# Debug current route/account state
bash scripts/perps/agentic/app-state.sh status

# Validate the fixture wallet setup path used by Recipe v1
bash scripts/perps/agentic/setup-wallet.sh --fixture .agent/wallet-fixture.json
```

## Recipe v1 authoring rules

- Treat `action-manifest.json` as the source of truth for allowed actions.
- Prefer semantic domain actions over exposing controller/eval details in recipes.
- Keep setup and teardown explicit so repeated proof runs start from a stable state.
- Use UI actions when the human proof must show the interaction; use typed domain
  reads/assertions when direct controller state is the clearer proof.
- Keep low-level CDP helpers inside runner adapters unless the runner declares a
  reviewed, typed action for them.

## Useful debug commands

```bash
bash scripts/perps/agentic/app-state.sh status
bash scripts/perps/agentic/app-state.sh route
bash scripts/perps/agentic/app-state.sh accounts
bash scripts/perps/agentic/app-state.sh press <testId>
bash scripts/perps/agentic/app-state.sh scroll --test-id <testId> --offset 300
bash scripts/perps/agentic/app-state.sh set-input <testId> "0.5"
bash scripts/perps/agentic/app-navigate.sh PerpsMarketDetails '{"market":{"symbol":"BTC"}}'
```

Raw eval remains available through `cdp-bridge.js` for investigation and runner
implementation work. Do not use raw eval to fabricate a passing proof state.

## Existing flow reference

The files under `teams/perps/flows/` document prior perps UI paths and can be
used as reference while migrating to Recipe v1. New reusable behavior should be
implemented as a small number of parameterized `metamask.perps.*` actions or
composable Recipe v1 flows rather than duplicating one file per scenario.

## Error recovery

| Symptom | Fix |
| --- | --- |
| Metro crash / no output | `bash scripts/perps/agentic/start-metro.sh --platform <ios|android>` |
| CDP target missing | Confirm the app was launched through the harness and run `yarn a:status` |
| Hot reload resets app | Navigate back to the expected route before continuing validation |
| App crash / white screen | Re-run the preflight/harness launch path for the target device |
| Raw eval syntax error | Use Hermes-compatible ES5 syntax in ad-hoc debug expressions |
