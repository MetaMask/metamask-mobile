---
repo: metamask-extension
parent: fs-cook
---

# MetaMask Extension FS-Cook

## Discovery

Start with:

```bash
rg --files | rg 'validate-recipe\\.js|validate-flow-schema\\.js|domains/.+/(flows|recipes)/.*\\.json$|evals\\.json$|agentic-toolkit\\.md'
```

## Existing Flow Refs

- `extension-core/unlock-wallet`
- `extension-core/navigate-settings`
- `extension-core/select-account`
- `extension-core/send-eth`
- `perps/navigate-perps-tab`
- `perps/navigate-to-market-detail`
- `perps/open-long-position`
- `perps/close-position`
- `perps/prime-perps-state`
- `perps/ensure-perps-network`

## Existing Eval Refs

- `extension-core/wallet-state`
- `extension-core/accounts`
- `extension-core/network`
- `perps/perps-state`
- `perps/perps-positions`
- `perps/perps-balance`
- `perps/perps-orders`
- `perps/perps-provider`
- `perps/perps-connection-state`
- `perps/perps-markets`

## Validation

Use:

```bash
node <validate-flow-schema.js> <recipe.json>
node <validate-recipe.js> --recipe <recipe.json> --dry-run
```

Live run only after the recipe shape is sound:

```bash
node <validate-recipe.js> --recipe <recipe.json> --cdp-port <port> --skip-manual
```

Record all validation commands and outputs in `## Validation Evidence` inside the harness.

If discovery finds no repo-local validator or runner:

- write `validation unavailable: no repo-local validator/runner discovered`
- do not claim that validation passed
