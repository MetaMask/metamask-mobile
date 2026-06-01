# Mobile agentic bridge

This directory contains the MetaMask Mobile product-side bridge used by external
Farmslot Recipe v1 runners. It is not the recipe authoring surface.

## Ownership boundary

Mobile owns only the code required to make a development build controllable and
observable:

- `cdp-bridge.js` and `lib/cdp-eval.js` connect to the React Native Hermes CDP
  target.
- `app-state.sh`, `app-navigate.sh`, and `screenshot.sh` provide small local
  diagnostics for humans and runners.
- `setup-wallet.sh` applies deterministic wallet fixtures through the
  `AgenticService` bridge.
- Metro/preflight scripts start, stop, reload, and check a development runtime.

Portable recipes, flow composition, action manifests, and MetaMask domain
actions live outside the Mobile repository in the external recipe runner. The
Mobile repository should not grow task-specific recipes or reusable recipe
actions.

## Local bridge commands

From the repository root:

```bash
yarn a:status
yarn a:navigate <route-name>
yarn a:reload
yarn a:ios      # start/reuse an iOS development runtime
yarn a:android  # start/reuse an Android development runtime
```

Use the recipe-harness skill or the external runner for Recipe v1 execution.
Those tools consume this bridge but own recipe semantics and evidence output.

## Fixture setup

Create a local fixture at `.agent/wallet-fixture.json` when deterministic wallet
state is required. `setup-wallet.sh` validates the file and applies it through
`globalThis.__AGENTIC__` in a development build.

Do not commit real fixture secrets or task-specific validation recipes to this
repository.
