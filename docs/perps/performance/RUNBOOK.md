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
  source_strategy=current_main \
  sample_id=<arm-and-sample> \
  snapshot_endpoint_mode=deployed \
  --device <android-serial-or-ios-UDID> \
  --heal off
```

Local candidate shortcut:

```bash
mm-harness run perps.performance \
  account=dev1 \
  source_strategy=full_bootstrap \
  lifecycle=cold_no_cache \
  --device <android-serial-or-ios-UDID> \
  --hud show
```

For a matched optimized arm, change only `source_strategy=full_bootstrap`, `sample_id`, and checkout. Keep the same physical device or simulator. If different devices are unavoidable, label the result hardware-unmatched and do not present it as a controlled code-performance comparison. Android and iOS use the same recipe parameters.

## Timing boundaries

The vocabulary below is the target recipe contract. This change emits
`perps_bootstrap_start` and its bootstrap-relative milestones. The four
`surface_*` stages remain `recipe pending`; Mobile does not emit them yet. Keep
each milestone `recipe pending` until it has correlated on-device evidence,
then `release pending` until an identifiable Mobile release contains it. Never
synthesize a missing milestone.

The recipe captures both clocks without mixing them:

- Existing app startup traces retain process, UI, authentication, and Homepage Ready timing.
- Perps bootstrap-relative milestones anchor at recipe-proven `perps_bootstrap_start`.
- Existing Homepage section TTC starts at section mount. A recipe-visible
  `surface_demand` anchor remains pending until its Mobile producer lands.

Metro compilation and fixture/account setup remain visible in `trace.json` but are excluded from product durations. Homepage Ready and Perps bootstrap remain independently owned traces; this PR does not synthesize a per-event offset between them.

Unlock readiness is state-driven through `metamask.wallet.ensure_unlocked`; the measured graph contains no fixed post-unlock stabilization delay.

The normal operator mode is `--hud show`. Use `--hud hide` only for an explicitly labeled matched timing cohort, and apply the same HUD setting to both arms.

## Report lanes

The final report combines:

1. Homepage markets, HIP-3 coverage, prices, account resolution, and live-stream readiness. Cached-to-visible and fresh-visible timing remain `recipe pending` until the surface markers land.
2. Critical Perps CUFs already instrumented in the app: market list/detail, open position, limit order, close, and cancel.
3. Executable lifecycle cohorts: cold no-cache, cold disk cache, navigation return, short resume, reconnect, account switch, and network switch.

`provider_switch` and `network_recovery` are deferred until the recipe exposes deterministic controls for them.

Do not combine setup/build duration with these measurements, and do not compare Android device timing directly with an iOS simulator as a code-performance claim.

The current recipe may pass native visibility and bootstrap/live-stream checks
with `require_records=false`. Such a run does not validate the pending
`surface_*` contract. Reports must show those fields as missing or excluded,
never as a successful visible-performance measurement.
