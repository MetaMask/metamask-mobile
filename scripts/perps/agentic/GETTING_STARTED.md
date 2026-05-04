# Getting Started — Agentic Recipes

Run your first recipe on a side simulator without touching the iPhone-16-Pro + Metro you already use to develop.

## Prereqs

You already have the repo cloned, Pods installed, an iOS simulator booted, and Metro on `8081` for daily work. Keep it running. This doc spins up a *second* simulator on a *different* Metro port. `node`, `jq`, `xcrun`, and your wallet seed phrase are the only extras.

## Setup

**1. Create a dedicated simulator + pick a port.** Recommended: a fresh simulator used only for recipes — keeps your dev sim's wallet, history, and notifications untouched and makes it obvious which window is the recipe runner.

```bash
xcrun simctl create "mm-agentic" "iPhone 15"   # one-time; reuse the same name forever
```

(Or skip this and pick any non-dev simulator from `xcrun simctl list devices available | grep iPhone`.)

Append to `.js.env` (preflight reads these; they override defaults):

```bash
IOS_SIMULATOR=mm-agentic           # the dedicated sim, NOT your dev sim
WATCHER_PORT=8062                  # any free port other than 8081
```

**2. Create the wallet fixture.** The recipe needs an unlocked wallet at boot:

```bash
mkdir -p .agent
cp scripts/perps/agentic/wallet-fixture.example.json .agent/wallet-fixture.json
# Edit .agent/wallet-fixture.json — fill in `password` and at least one account
# (type `mnemonic` with a 12-word seed, or `privateKey` with `0x...`).
```

`.agent/wallet-fixture.json` is gitignored. Use a throwaway seed for testnet work.

**3. Run preflight.** Boots the chosen simulator, builds + installs the app on `$WATCHER_PORT`, starts Metro, connects CDP, imports the fixture wallet:

```bash
yarn a:setup:ios
```

Expected tail: `=== Preflight complete ===` with all steps green. Your dev simulator + Metro on `8081` keep running untouched.

**4. Verify the toolkit is wired up.** Do not skip — recipes require all three (Metro, CDP, route) to be live:

```bash
yarn a:status
```

Expected: JSON with a `route` field (e.g. `"Wallet"`) and a selected account address. Empty/error output ⇒ stop and re-check step 3 before running a recipe.

## Run a recipe

```bash
bash scripts/perps/agentic/validate-recipe.sh \
  scripts/perps/agentic/teams/perps/recipes/provider-smoke.json
```

What to look for: a Mermaid graph prints, then per-node `pass` lines (`check-testnet → decide-testnet → … → done`), then `summary: pass`. Artifacts (`trace.json`, `summary.json`, `workflow.mmd`) land in the recipe's output dir.

## What to try next

| Recipe | What it does | Notes |
|---|---|---|
| `teams/perps/recipes/app-lifecycle.json` | App launch + route smoke | No funded account needed |
| `teams/perps/recipes/full-trade-lifecycle.json` | Open → TPSL → close on testnet | Needs a funded testnet account in fixture |
| `teams/perps/recipes/reference-decimal-key-screens.json` | Visual decimal/format audit | Produces screenshots |

## Troubleshooting

Re-run `yarn a:status` first when anything looks off — it pinpoints which leg (Metro / CDP / route) is down.

- **`Neither IOS_SIMULATOR nor SIM_UDID is set`** — `.js.env` change wasn't picked up. New shell, or check the var name.
- **Preflight booted/built on your dev simulator** — `IOS_SIMULATOR` matches the dev sim's name. Pick a different one.
- **CDP timeout, "targets found on 8081 but none on $PORT"** — `WATCHER_PORT` collided or wasn't exported. Confirm `.js.env` has a non-8081 port and re-run.
- **`Wallet fixture not found`** — step 2 was skipped or `.agent/wallet-fixture.json` is in the wrong directory (must be repo root).

After a successful run, `xcrun simctl list devices | grep Booted` shows both simulators (dev + recipe) booted.

## The `a:*` script family

`a` is for *agentic* — thin yarn aliases over the same scripts in `scripts/perps/agentic/` that validate-recipe.sh uses. Same plumbing the toolkit uses to drive the app, exposed for humans. Goal is for these to become the default way to launch the app for daily dev once they've fully replaced the legacy `yarn start` / `yarn ios` flow.

| Script | What it does |
|---|---|
| `yarn a:setup:ios` / `:android` | Full clean: deps + build + install + Metro + CDP + wallet (this doc, step 3) |
| `yarn a:ios` / `:android` | Same as `a:setup:*` but skips clean — fast re-launch when build artifacts are warm |
| `yarn a:start` / `a:stop` | Metro lifecycle on `$WATCHER_PORT` |
| `yarn a:reload` | Reload the JS bundle without restarting Metro |
| `yarn a:status` | Health probe (Metro + CDP + route) |
| `yarn a:navigate` | Drive the app to a route from the CLI |
| `yarn a:watch` | Interactive Metro with live log filtering |

## Further reading

- [docs/perps/perps-agentic-system-design.md](../../../docs/perps/perps-agentic-system-design.md) — architecture: CDP bridge, recipe runner, eval refs/flows
- [docs/perps/perps-agentic-feedback-loop.md](../../../docs/perps/perps-agentic-feedback-loop.md) — how recipes plug into the dev/PR loop
- [docs/perps/perps-agentic-scripts-quickref.md](../../../docs/perps/perps-agentic-scripts-quickref.md) — full command reference for everything under `scripts/perps/agentic/`
- [README.md](./README.md) — directory map for this folder
- ADR — [decisions/core/0058-recipe-based-verification-system.md](https://github.com/MetaMask/decisions/blob/main/decisions/core/0058-recipe-based-verification-system.md) — why recipes exist
