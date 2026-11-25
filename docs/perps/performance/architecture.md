# Perps performance measurement architecture

This is the source of truth for Mobile measurement semantics. It holds no measured values. Core trace and measurement names are in the [Core traces contract](https://github.com/MetaMask/core/blob/main/packages/perps-controller/docs/contracts/traces.md). The harness procedure is in [runbook.md](./runbook.md).

## Two clocks

App startup and Perps bootstrap are separate clocks with no assumed order.

- The mounted Homepage Perps surface starts `perps_bootstrap_start` when it begins a measurable loading generation. It owns that session until completion, context change, backgrounding or unmount, so wallet-root and off-homepage activity cannot cause false timeouts.
- Session start is not controller construction, login completion, wallet readiness or Homepage readiness. The controller, global market preload and connection may already be running, because global data has no account dependency.
- Startup and Perps traces are compared only as release and platform cohorts, never joined per event.

Code: `app/components/Views/Homepage/Sections/Perpetuals/hooks/usePerpsHomepageLoadingSession.ts` `usePerpsHomepageLoadingSession`; `app/components/UI/Perps/utils/perpsLoadingSession.ts` `startPerpsLoadingSession`

### Homepage Ready anchors

| `app_start_type` | `start_source` | Homepage Ready start           | Valid reading                    |
| ---------------- | -------------- | ------------------------------ | -------------------------------- |
| `cold`           | `app_open`     | Native app launch              | Process to usable Homepage       |
| `cold` or `warm` | `unlock`       | Unlock submission              | Unlock submit to usable Homepage |
| `warm`           | `app_open`     | AppState foreground transition | Resume to usable Homepage        |

Only the cold cohort may label Homepage Ready as full app startup. An already-unlocked cold start has no authentication trace, and none is synthesized.

Code: `app/core/Performance/HomepageReady.ts` `startHomepageReadyTrace`, `queueColdHomepageReadyTrace`, `resolveColdHomepageReadyTrace`; `app/core/Performance/unlockTraces.ts`; `app/components/Views/Homepage/hooks/useHomepageReady.ts`

## Stage vocabulary

Mobile, the harness parser, recipes and reports share these names.

| Stage                         | Meaning                                                  |
| ----------------------------- | -------------------------------------------------------- |
| `perps_bootstrap_start`       | Perps bootstrap requested                                |
| `surface_demand`              | A visible surface requests Perps state                   |
| `surface_initial_ui_recorded` | Perps shell or header first committed                    |
| `surface_resolved_recorded`   | Valid content, resolved-empty or visible error committed |
| `surface_live_recorded`       | Lifecycle-fresh data consumed by that surface committed  |

- `perps_bootstrap_start` logs under `[PerpsLoadProof]`.
- The four `surface_*` stages log under `[PerpsPerf]`. `surface_demand` logs at once; the other three log after a two-frame paint checkpoint. They are DevLogger records for recipes only, not Sentry measurements.
- Terminal rows already in the Mobile market cache stay `market_source=memory_cache`. Only a Terminal fetch accepted in the current lifecycle records `terminal_v2`.
- An account variant may resolve from cache, but its live stage records `source=fresh_socket` only once the session holds a connection generation from fresh positions, orders and account data.

Code: `app/components/UI/Perps/utils/perpsLoadingSessionModel.ts` `PERPS_BOOTSTRAP_STAGE`; `app/components/Views/Homepage/Sections/Perpetuals/hooks/useHomepagePerpsSurfaceMetrics.ts` `SurfaceStage`, `logSurfaceStage`; `app/components/UI/Perps/utils/perpsLoadingSession.ts` `recordedMarketSource`, `recordedAccountSource`

## Producers

Each boundary has one producer.

| Boundary or measurement                                  | Producer                                                                                                             | Destination                                                                            |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Load Scripts, UI Startup                                 | Mobile startup instrumentation                                                                                       | `Load Scripts`, `UI Startup` traces                                                    |
| Authentication                                           | Mobile login instrumentation                                                                                         | `Authenticate User` trace                                                              |
| Homepage ready                                           | Mobile Homepage instrumentation                                                                                      | `Homepage Ready` trace                                                                 |
| Perps bootstrap start                                    | Mounted Homepage Perps surface                                                                                       | `Perps Loading Session` and `[PerpsLoadProof]`                                         |
| Controller constructed                                   | Core calls `performance.onControllerConstructed` once after disk hydration, with the Mobile clock. Mobile buffers it | `process_to_perps_controller_constructed_ms` on `Perps Loading Session`                |
| Global market preload                                    | Core controller                                                                                                      | `Perps Market Data Preload` trace, overall `perps.operation.market_data_preload` only  |
| User preload                                             | Core controller                                                                                                      | `Perps User Data Preload` trace                                                        |
| Provider init, health, socket, subscriptions             | Mobile connection manager                                                                                            | `Perps Connection Establishment` measurements                                          |
| First live price, positions, orders, account, order book | Mobile stream manager                                                                                                | `Perps WebSocket First *` traces                                                       |
| Homepage Perps TTC and DFD                               | `useSectionPerformance`                                                                                              | Homepage section traces, with `demand_started`, `cache_state`, and section cohort tags |
| Surface initial UI and live-visible                      | `useHomepagePerpsSurfaceMetrics`                                                                                     | `[PerpsPerf]` recipe records only                                                      |
| Markets, account cache and live offsets                  | Mobile loading-session coordinator                                                                                   | `Perps Loading Session` only                                                           |

- Core emits no Terminal request, parse or adoption split, and no disk-hydration identity or age attributes.
- The Mobile tracer adapter routes a Core measurement to its trace when Core passes a trace id. Without an id it writes an ambient `setMeasurement`.
- The Core user-preload trace has no wallet address.

Code: `app/components/UI/Perps/adapters/mobileInfrastructure.ts` `onControllerConstructed`, `tracer.setMeasurement`, `getPreloadTraceData`; `app/components/UI/Perps/utils/perpsLoadingSession.ts` `recordPerpsControllerConstructedAt`; `app/components/UI/Perps/services/PerpsConnectionManager.ts`; `app/components/UI/Perps/providers/PerpsStreamManager.tsx`; `app/components/Views/Homepage/Sections/Perpetuals/PerpsSectionMain.tsx`; `app/util/trace.ts` `TraceName`

## Loading session

`Perps Loading Session` exists because Sentry dashboards cannot join independent root transactions. Details are in [loading-session.md](./loading-session.md). It holds:

- two process-relative measurements, `process_to_perps_bootstrap_start_ms` and `process_to_perps_controller_constructed_ms`
- non-negative bootstrap-relative offsets for markets, one atomic cached account state and the live streams
- lifecycle, surface, content variant, source and outcome attributes

It copies no startup, preload, connection, first-data, TTC or DFD duration.

- `perps_session_id` is created once per lifecycle or context generation. Mobile attaches it as trace data to reused traces for drill-down and never as a dashboard group-by tag.
- Cancelled sessions end with a bounded `cancellation_reason` and no success or content outcome. They stay out of success, error and latency cohorts.

Code: `app/components/UI/Perps/utils/perpsLoadingSession.ts` `MILESTONE_MEASUREMENTS`, `cancelPerpsLoadingSession`, `getActivePerpsLoadingSessionTraceData`

## Cached and resume paths

Resident return, cold disk hydration, short background continuity and reconnect are distinct cohorts. Market and account cache sources are attributes inside them, not lifecycle names.

- A foregrounded `background_short` session cannot finish until the shared connection health check resolves.
- A healthy check keeps the short-resume cohort and resubscribes the active stream channels.
- A failed check upgrades the same session to `background_reconnect` before cached content can finish it.

Code: `app/components/UI/Perps/services/PerpsConnectionManager.ts` `resumeFromForeground`, `performReconnection`; `app/components/UI/Perps/utils/perpsLoadingSession.ts` `markPerpsLoadingSessionConnectionValidated`, `setPerpsLoadingSessionLifecycle`

## Homepage surface readiness

Only the `homepage` surface has a loading-session producer. The session finishes when `PerpsSectionMain` reports a resolved state and the required live data has arrived.

| `content_variant`                             | Waits for live positions, orders and account                                            | Waits for fresh markets (`terminal_global_snapshot_v2` or `provider`) |
| --------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `trending`, `pills`                           | Lifecycle `cold_no_cache`, `background_reconnect`, `account_switch` or `network_switch` | Lifecycle `cold_no_cache`, `background_reconnect` or `network_switch` |
| `positions`, `orders`, `positions_and_orders` | Always                                                                                  | No                                                                    |

- `prices_live` is never required.
- `background_short` also waits for connection validation.
- A failed finish (`success: false`) does not wait for live data.
- The session times out at 90 s.

Code: `app/components/UI/Perps/utils/perpsLoadingSession.ts` `requiresLiveAccount`, `requiresFreshMarkets`, `hasRequiredLiveStreams`; `app/components/UI/Perps/utils/perpsLoadingSessionModel.ts` `PerpsLoadingSurface`, `PERPS_LOADING_SESSION_TIMEOUT_MS`; `app/components/Views/Homepage/Sections/Perpetuals/PerpsSectionMain.tsx` `resolveContentVariant`

## Lifecycle v1

| Lifecycle              | Start condition                                                        | Required proof                                           |
| ---------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------- |
| `cold_no_cache`        | New process (`cold_process` lifecycle context). Caches are not checked | Resolved surface plus bounded required-stream completion |
| `navigate_return`      | Surface remounted in the same process                                  | Resident frame; fresh tick optional                      |
| `background_short`     | Foreground health check keeps the connection                           | Resident frame after health validation                   |
| `background_reconnect` | Foreground health check requires reconnection                          | Cached frame allowed, then fresh takeover                |
| `account_switch`       | Selected account changes                                               | No prior-account frame; new identity accepted            |
| `network_switch`       | Provider, Perps network or HIP-3 context changes                       | No prior-context frame; new identity accepted            |

`provider_switch` and `network_recovery` cohorts are deferred. Provider and HIP-3 changes use `network_switch`.

Code: `app/components/UI/Perps/utils/perpsLoadingSessionModel.ts` `PerpsLoadingLifecycle`, `resolvePerpsLoadingLifecycle`

## TTC and DFD

- Homepage TTC is the existing `Homepage Section Time To Content`, from an explicit section demand boundary to committed resident content, or through the first presented frame after async content resolves. `content_ready_at_demand` separates those cohorts. Idle skeletons and deferred offscreen dwell are not measured.
- Homepage DFD is the existing `Homepage Section Data Fetch`, the loading interval for that section.
- The Perps section restarts both per loading session. Ready content is not accepted at generation start for `account_switch`, `network_switch` and `background_reconnect`.
- A visible error ends with `content_state=error`. Percentile widgets filter `content_state != error`; the error-rate widget filters `content_state = error`.
- Initial UI and live-visible are separate. Resolved content is never labelled "first visible".
- Socket to subscriber to commit to frame splits stay in recipe evidence.

Code: `app/components/Views/Homepage/hooks/useSectionPerformance.ts` `useSectionPerformance`; `app/components/Views/Homepage/Sections/Perpetuals/PerpsSectionMain.tsx`; `app/util/trace.ts` `HomepageSectionTimeToContent`, `HomepageSectionDataFetch`

## Market-detail readiness

Market detail has its own screen-owned session, independent of the Homepage loading session.

- `Perps Market Detail Live` stays the minimum-useful-screen duration.
- `Perps Market Detail Session` adds one detail-mount anchor and records when each applicable section resolves. It stores no controller, connection, WebSocket, chart-internal or API duration.
- One session owns one market, mode, selected account, provider, network and HIP-3 configuration generation. A market, mode or context change ends it with `generation_changed` and starts a new one.
- Backgrounding ends it with `app_backgrounded`; unmount ends it with `surface_unmounted`. Suspended time and stale callbacks stay out of latency percentiles.
- Foreground resume starts a `lifecycle_context=background_resume` cohort. Do not pool it with `cold_process` or `warm` navigation.
- `generation_trigger` is `initial`, `background_resume`, `market_switch`, `mode_switch`, `account_switch`, `network_switch` or `configuration_change`. Navigation widgets filter to `initial`.

| Section          | Lite         | Pro           | Resolved when                                                  |
| ---------------- | ------------ | ------------- | -------------------------------------------------------------- |
| Market           | Yes          | Yes           | Current-symbol metadata is available                           |
| Price            | Yes          | Yes           | Current-symbol display price is positive                       |
| Chart            | Yes          | Yes           | Skeleton replaced by the current-symbol chart or fallback      |
| Stats            | Yes          | Yes           | Current-symbol market statistics resolve                       |
| Market Insights  | When enabled | No            | Content, empty response or fetch error resolves                |
| Account          | Yes          | Yes           | Current-account state or a valid empty state resolves          |
| Order book       | No           | When expanded | Ladder, valid empty state or visible connection error resolves |
| Positions/orders | Yes          | Yes           | Current-account streams resolve to rows or a valid empty state |

Measurements are `market_resolved_ms`, `price_resolved_ms`, `chart_resolved_ms`, `stats_resolved_ms`, `insights_resolved_ms`, `account_resolved_ms`, `order_book_resolved_ms` and `positions_orders_resolved_ms`.

- Each offset is non-negative and relative to detail-session start. Each section also gets a `<section>_state` of `content`, `empty`, `error` or `not_applicable`. `not_applicable` gets no measurement.
- The session ends once every expected section has recorded a state. If any is `error`, it ends with `success=false`, `reason=section_error` and `has_section_error=true`. Timeout (`detail_session_timeout`, 90 s) and cancellation rows stay out of completed-session cohorts.
- Trade-control readiness is derived as `max(market_resolved_ms, price_resolved_ms, account_resolved_ms)`, not emitted.
- `chart_strategy` (tag) is the configured Advanced or Lightweight strategy. `chart_library` (data) is the library that rendered, updated when Advanced falls back to Lightweight.
- `market_source` is `route`, `stream_enrichment` or `unknown`, so deeplink or activity entries that wait for enrichment are not read as fetch latency.
- Stats `error` means the market-data or candle subscription failed. `Perps Market Detail Live` then ends at once with `reason=stats_error`.
- `perps.chart.first_candle` keeps the chart-mount anchor. `Perps WebSocket First *` keep their connection anchors. Neither is copied into the detail session.
- Each detail subscription callback belongs to one effect generation, retired before unsubscribe. A late callback from an A to B to A symbol switch cannot update the new A screen.

Code: `app/components/UI/Perps/hooks/usePerpsMarketDetailSession.ts` `SECTION_MEASUREMENTS`, `usePerpsMarketDetailSession`; `app/components/UI/Perps/hooks/usePerpsMarketDetailLiveMeasurement.ts`; `app/components/UI/Perps/Views/PerpsMarketDetailsView/PerpsMarketDetailsView.tsx` `detailSections`; `app/components/UI/Perps/Views/PerpsProMarketView/hooks/usePerpsProSectionReadiness.ts`; `app/components/UI/Perps/utils/perpsCufTrace.ts` `buildPerpsCufStartTags`; `app/components/UI/Perps/hooks/usePerpsMarketStats.ts`

## Derived metrics

| Metric                                | Source                                                                           |
| ------------------------------------- | -------------------------------------------------------------------------------- |
| Cold app startup                      | `Homepage Ready` duration with `app_start_type=cold` and `start_source=app_open` |
| Authentication                        | `Authenticate User` duration                                                     |
| Auth to home, Homepage to Perps order | Separate traces, no join                                                         |
| Controller init                       | `perps.connection.provider_init` on `Perps Connection Establishment`             |
| Controller constructed                | `process_to_perps_controller_constructed_ms` (process-relative)                  |
| Market preload                        | Overall `perps.operation.market_data_preload`                                    |
| Markets ready                         | `markets_ready_ms`                                                               |
| Account cache ready                   | `account_cache_ready_ms`                                                         |
| Complete live account                 | `max(account_live_ms, positions_live_ms, orders_live_ms)`                        |
| Live prices                           | `prices_live_ms`                                                                 |
| Homepage TTC and DFD                  | Homepage section traces                                                          |
| Initial UI, live-visible              | `[PerpsPerf]` recipe records                                                     |
| Detail minimum useful                 | `Perps Market Detail Live`, split by `detail_mode`                               |
| Detail section resolution             | `Perps Market Detail Session` measurements                                       |
| Cache-to-visible, socket-to-visible   | Recipe evidence only                                                             |

The `*_ready_ms` and `*_live_ms` offsets are bootstrap-relative. The two `process_to_*` measurements are process-relative.

Code: `app/components/UI/Perps/utils/perpsLoadingSession.ts` `MILESTONE_MEASUREMENTS`, `PROCESS_TO_BOOTSTRAP_START_MEASUREMENT`, `PROCESS_TO_CONTROLLER_CONSTRUCTED_MEASUREMENT`; `app/core/Performance/HomepageReady.ts` `resolveColdHomepageReadyTrace`; `app/core/Performance/unlockTraces.ts` `startUnlockTraces`
