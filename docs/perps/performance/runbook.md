# Perps performance validation runbook

The recipe, harness commands and report rules on this page live outside the Mobile repo. They are not verified from Mobile code. The app-side contract they read is in [architecture.md](./architecture.md).

## Single source

Perps loading and lifecycle measurements use one recipe, `perps.performance`, at `recipes/mobile/perps/performance.recipe.json` in the Perps recipe library.

- Do not create Android, iOS, lifecycle, account or source-strategy copies.
- Recipe parameters are the same on every platform. The harness device target is the only platform choice; there is no platform parameter.

## Comparable command

```bash
mm-harness run perps.performance \
  account=dev1 \
  content_variant=trending \
  provider=hyperliquid \
  initial_network=mainnet \
  lifecycle=cold_no_cache \
  sample_id=<arm-and-sample> \
  snapshot_endpoint_mode=deployed \
  --device <android-serial-or-ios-UDID> \
  --heal off
```

Local candidate shortcut:

```bash
mm-harness run perps.performance \
  account=dev1 \
  lifecycle=cold_no_cache \
  --device <android-serial-or-ios-UDID> \
  --hud show
```

For a matched optimized arm, change only `sample_id` and the checkout. Keep every recipe input and the device or simulator the same. If different devices are unavoidable, label the result hardware-unmatched and do not present it as a controlled code-performance comparison.

## What the app emits

| Record                   | Content                                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `[PerpsLoadProof]`       | `perps_bootstrap_start`, bootstrap-relative milestones, connection-generation changes                            |
| `[PerpsPerf]`            | `surface_demand`, `surface_initial_ui_recorded`, `surface_resolved_recorded`, `surface_live_recorded`            |
| `[PerpsDetailLoadProof]` | Market-detail section resolution                                                                                 |
| `[PerpsConnectionProof]` | Context change, reconnect start, health validation, preload commit or rejection, completion. No wallet addresses |

- Recipe surface timing starts at `surface_demand`.
- Homepage section TTC starts at section mount and stays a separate production clock.
- Homepage Ready and Perps bootstrap stay separate traces with no per-event offset between them.
- Never synthesize a missing milestone.

Code: `app/components/UI/Perps/utils/perpsLoadingSession.ts` `startPerpsLoadingSession`, `recordValuesReady`, `prepareFreshSocketGeneration`; `app/components/Views/Homepage/Sections/Perpetuals/hooks/useHomepagePerpsSurfaceMetrics.ts` `logSurfaceStage`; `app/components/UI/Perps/hooks/usePerpsMarketDetailSession.ts` `PROOF_MARKER`; `app/components/UI/Perps/services/PerpsConnectionManager.ts` `logPerpsConnectionProof`

## Recipe rules

- Setup proves the unlocked wallet, selected account, provider, network and content precondition in the same run. No boolean bypasses those proofs.
- Metro compilation and fixture or account setup stay in `trace.json` but are excluded from product durations.
- Unlock readiness is state-driven through `metamask.wallet.ensure_unlocked`, with no fixed post-unlock delay.
- Cold live-stream completion is state-driven and bounded by 90 s, the app's session timeout.
- `--hud show` is the normal mode. Use `--hud hide` only for a labelled matched timing cohort, with the same setting on both arms.
- The recipe uses `require_records=true` and requires all four `surface_*` stages, or the first three for `navigate_return` and `background_short`. A native visibility assertion alone does not validate the timing contract.

## Report lanes

1. Homepage markets, HIP-3 coverage, prices, account resolution, visible content and fresh-visible timing. Cache-to-visible stays excluded until the cache delivery source is attached to frame evidence.
2. Perps CUFs instrumented in the app, covering market list, market detail, open position, limit order, close and cancel.
3. Lifecycle cohorts for cold no-cache, navigation return, health-validated short resume, reconnect, account switch and network switch. A failed resume health check upgrades the sample to reconnect. Disk hydration is a cache source inside a lifecycle, not a lifecycle.
4. DEV proof records from the table above.

`provider_switch` and `network_recovery` are deferred until the recipe has deterministic controls for them. Do not add setup or build time to these measurements. Do not compare Android device timing with an iOS simulator as a code-performance claim.

Code: `app/util/trace.ts` `PerpsEntryToLiveMarketList`, `PerpsMarketDetailLive`, `PerpsPlaceOrderToPositionRendered`, `PerpsPlaceLimitOrderToOrderRendered`, `PerpsClosePositionToConfirmation`, `PerpsCancelOrderToConfirmation`; `app/components/UI/Perps/utils/perpsLoadingSessionModel.ts` `PerpsLoadingLifecycle`

## Status vocabulary

Every report or dashboard value has exactly one status.

| Status            | Meaning                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| `validated`       | Correlated device or recipe evidence exists                             |
| `recipe pending`  | Instrumentation or on-device reproduction remains                       |
| `release pending` | Device proof exists, but no identifiable production release contains it |
| `excluded`        | Invalid, incomparable or outside the claim                              |

Missing events stay missing. No derived value is fabricated. Dashboard 3948326 stays unchanged until its owner approves a proposed diff.
