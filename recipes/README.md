# Lighter mobile validation recipes (temporary — do not merge)

Composable `mm-harness` Recipe v1 definitions that prove the Lighter perps
integration on a real device/simulator through the actual UI. They live here
temporarily so the work survives the POC branch; they graduate into the
harness perps recipe library (or an owned recipe package) before this PR can
merge. **The PR carrying this folder stays DO-NOT-MERGE.**

## Library: `lighter-lib/`

Short, parameterizable units composed via `call` nodes:

| Recipe                     | Params                                     | Proves (through the real UI)                                                                                                               |
| -------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `lighter.setup`            | `network`, `market`                        | idempotent venue convergence — one `start_state` ensure node; switches provider/network only when they differ (`changed:false` on a no-op) |
| `lighter.open-position`    | `market`, `direction`                      | Long/Short → order form seeded at the venue minimum → place → venue-verified position                                                      |
| `lighter.close-position`   | `market`                                   | Close button → close-position screen → confirm → venue-verified flat                                                                       |
| `lighter.limit-order`      | `market`, `preset`                         | order-type sheet → limit → price preset → venue-verified resting order                                                                     |
| `lighter.cancel-orders`    | `market`                                   | book cleaned, venue-verified (controller cancel path; UI cancel button is a follow-up)                                                     |
| `lighter.capability-suite` | `network`, `positionMarket`, `orderMarket` | composed end-to-end run of all of the above; the same suite is the mainnet validation runner (`-p network=mainnet`)                        |

```bash
mm-harness run lighter.capability-suite --library lighter=recipes/lighter-lib \
  --record-video=full-run
```

First live run: 54/54 nodes green on Lighter testnet, video recorded, venue
verified flat afterwards.

## Standalone recipes

- `lighter-vs-hl-order-matrix.json` — $150 market + limit orders on ETH/BTC
  through the real UI with per-venue max-leverage screenshot proof and
  cleanup (94/95 nodes + manual final capture; transition patched since).
- `lighter-one-click-trade.recipe.json` — the one-click Long press path:
  originally the repro for the deposit-route dead end, now the success-path
  regression (order form seeded at the venue minimum).

```bash
mm-harness run recipes/lighter-vs-hl-order-matrix.json --record-video=full-run
```
