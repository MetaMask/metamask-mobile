# Perps performance validation runbook

## Single source

Perps loading and lifecycle measurements use exactly one recipe:

`perps.performance`

Source:

`<metamask-harness>/library/recipes/mobile/perps/performance.recipe.json`

Do not create Android, iOS, lifecycle, account, or source-strategy copies. The recipe parameters are identical across platforms. The only platform selection is the harness device target.

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

For a matched optimized arm, change only `sample_id` and checkout. Keep every recipe input and the physical device or simulator identical. If different devices are unavoidable, label the result hardware-unmatched and do not present it as a controlled code-performance comparison. Android and iOS use the same recipe parameters.

## Timing boundaries

The vocabulary below is the recipe contract. This change emits
`perps_bootstrap_start`, its bootstrap-relative milestones, and the four
Homepage `surface_*` stages. Keep each milestone `recipe pending` until it has
correlated on-device evidence, then `release pending` until an identifiable
Mobile release contains it. Never synthesize a missing milestone.

The recipe captures both clocks without mixing them:

- Existing app startup traces retain process, UI, authentication, and Homepage Ready timing.
- Perps bootstrap-relative milestones anchor at recipe-proven `perps_bootstrap_start`.
- Recipe-visible surface timing starts at `surface_demand`. Existing Homepage
  section TTC still starts at section mount and remains a separate production
  clock.

Metro compilation and fixture/account setup remain visible in `trace.json` but are excluded from product durations. Homepage Ready and Perps bootstrap remain independently owned traces; this PR does not synthesize a per-event offset between them.

Unlock readiness is state-driven through `metamask.wallet.ensure_unlocked`; the measured graph contains no fixed post-unlock stabilization delay.

The normal operator mode is `--hud show`. Use `--hud hide` only for an explicitly labeled matched timing cohort, and apply the same HUD setting to both arms.

## Report lanes

The final report combines:

1. Homepage markets, HIP-3 coverage, prices, account resolution, visible content, and fresh-visible timing. Cache-to-visible remains excluded until the cache delivery source is attached to the frame evidence.
2. Critical Perps CUFs already instrumented in the app: market list/detail, open position, limit order, close, and cancel.
3. Executable lifecycle cohorts: cold no-cache, navigation return, short resume, reconnect, account switch, and network switch. Disk hydration is recorded as a cache source within a lifecycle, not as its own lifecycle.

`provider_switch` and `network_recovery` are deferred until the recipe exposes deterministic controls for them.

Do not combine setup/build duration with these measurements, and do not compare Android device timing directly with an iOS simulator as a code-performance claim.

The canonical recipe must use `require_records=true` and require
`surface_demand`, `surface_initial_ui_recorded`,
`surface_resolved_recorded`, and `surface_live_recorded`. A native visibility
assertion alone does not validate this timing contract.
