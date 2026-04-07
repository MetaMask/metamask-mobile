# Agentic Scripts

This directory contains the agentic automation toolkit: CDP bridge, recipe runner,
flow validator, and per-team data (flows, recipes, snippets, pre-conditions).

## Scope — perps-first, org-wide intent

The tooling currently lives under `scripts/perps/` and code ownership sits with
`@MetaMask/perps`. This is intentional: the perps team is building and validating
the pattern in a single team context to allow fast iteration without requiring
cross-team code ownership review on every change.

Once the toolkit is proven — stable CLI API, documented conventions, validator
suite passing — the intent is to promote it to a shared location (e.g.
`scripts/agentic/`) owned by the broader MetaMask mobile organisation, with each
product team owning their slice under `teams/<team>/`.

**Do not let the current path mislead you.** The infrastructure in `lib/`,
`validate-flow-schema.js`, `validate-pre-conditions.js`, `cdp-bridge.js`, and the
`teams/` layout is deliberately generic and team-agnostic.

## Directory layout

```
agentic/
  cdp-bridge.js              — CDP client: eval, navigate, eval-ref, press, scroll, …
  validate-recipe.sh         — Run a flow JSON against the live app
  validate-flow-schema.js    — Offline: enforce flow authoring rules
  validate-pre-conditions.js — Offline: verify pre-condition assertion logic
  lib/
    assert.js                — Shared assertion evaluator
    registry.js              — Auto-discovers and merges all team pre-conditions
  teams/
    perps/                   — Perps team flows, evals, pre-conditions
    mobile-platform/         — Mobile platform team pre-conditions (placeholder)
    <team>/                  — Add your team here (see teams/README.md)
  app-state.sh               — Convenience wrapper: status, eval, press, eval-ref, …
  app-navigate.sh            — Navigate to any registered screen
  screenshot.sh              — Capture simulator/device screenshot
  start-metro.sh             — Start Metro bundler for a given platform/slot
```

See `teams/README.md` for how to add a new team.
