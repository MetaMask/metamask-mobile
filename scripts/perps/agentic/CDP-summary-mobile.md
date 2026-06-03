# Mobile CDP bridge summary

The Mobile CDP bridge exposes development-only app control for external Recipe
v1 runners and local diagnostics. It does not own recipe definitions or flow
composition.

Core entry points:

- `cdp-bridge.js` — Hermes CDP command bridge.
- `app-state.sh` — route/account status snapshot.
- `app-navigate.sh` — local navigation diagnostic.
- `setup-wallet.sh` — deterministic wallet fixture setup through
  `AgenticService`.
- `screenshot.sh` — visible proof capture.

Portable recipes and action manifests are maintained in the external MetaMask
recipe runner.
