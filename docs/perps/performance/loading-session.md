# Perps loading session

The loading session measures one visible Perps loading generation. It does not replace app startup, controller preload, connection or Homepage section traces, which keep their owners. Semantics shared with other traces are in [architecture.md](./architecture.md).

## Boundary

- A screen integration starts the session when a visible Perps surface begins loading. Today only the Homepage Perps section does this, through `usePerpsHomepageLoadingSession`.
- The same session finishes when the surface resolves to content, empty or error and all required fresh data has arrived. Requirements per content variant are in [architecture.md](./architecture.md#homepage-surface-readiness).
- Values reported after `preparePerpsLoadingSession()` and before the session starts are buffered (up to 20) and replayed at start with `has_pre_session_milestone`. Earlier values are dropped.
- The connection manager owns connection replacement and stream resubscription.

Code: `app/components/UI/Perps/utils/perpsLoadingSession.ts` `preparePerpsLoadingSession`, `startPerpsLoadingSession`, `finishPerpsLoadingSession`, `PRE_SESSION_EVENT_BUFFER_LIMIT`; `app/components/Views/Homepage/Sections/Perpetuals/hooks/usePerpsHomepageLoadingSession.ts`; `app/components/UI/Perps/services/PerpsConnectionManager.ts`

## Identity

Each session stores three keys.

| Key          | Built from                                              |
| ------------ | ------------------------------------------------------- |
| `marketKey`  | Provider, Perps network and HIP-3 configuration version |
| `accountKey` | Selected account address, lowercased                    |
| `userKey`    | Market key plus account key                             |

Market and price deliveries must match `marketKey`. Positions, orders and account deliveries must match `userKey`. Each delivery carries the identity it was subscribed with, so a late callback from an old account or network cannot complete the current session.

Code: `app/components/UI/Perps/utils/perpsLoadingSessionModel.ts` `createPerpsLoadingSessionIdentity`; `app/components/UI/Perps/utils/perpsLoadingSession.ts` `matchesActiveSessionIdentity`

## Generations

| Generation              | Advances when                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------ |
| `account_generation`    | A session starts for a different account                                                               |
| `context_generation`    | Any new loading session starts                                                                         |
| `connection_generation` | The connection manager replaces the connection, or a healthy foreground ping resubscribes the channels |

- Fresh socket milestones must use the active connection generation.
- When a newer connection takes over, recorded live milestones are cleared and must arrive again from it.
- Account-owned streams set the connection generation. A global price tick cannot set it before positions, orders or account data arrives.
- Generations are trace data for per-run correlation. Dashboards must not group by them.

Code: `app/components/UI/Perps/utils/perpsLoadingSession.ts` `startPerpsLoadingSession`, `prepareFreshSocketGeneration`, `recordValuesReady`; `app/components/UI/Perps/services/PerpsConnectionManager.ts` `advanceConnectionGeneration`, `resubscribeActiveStreamChannels`

## Sources and milestones

| Data             | Sources                                                   |
| ---------------- | --------------------------------------------------------- |
| Markets          | `memory_cache`, `terminal_global_snapshot_v2`, `provider` |
| Account snapshot | `memory_cache`, `provider_snapshot`                       |
| Live data        | `fresh_socket`                                            |

| Measurement                                                                | Clock              |
| -------------------------------------------------------------------------- | ------------------ |
| `process_to_perps_bootstrap_start_ms`                                      | Process-relative   |
| `process_to_perps_controller_constructed_ms`                               | Process-relative   |
| `markets_ready_ms`, `account_cache_ready_ms`                               | Bootstrap-relative |
| `positions_live_ms`, `orders_live_ms`, `account_live_ms`, `prices_live_ms` | Bootstrap-relative |

- The account cache milestone needs positions, orders and account data from the same cache source.
- Cold start, account switch, network switch and reconnect cannot finish from cached account data. They wait for fresh positions, orders and account deliveries.
- A fresh markets source can replace an earlier cached `markets_ready` source.

Code: `app/components/UI/Perps/utils/perpsLoadingSessionModel.ts` `PerpsLoadingSource`; `app/components/UI/Perps/utils/perpsLoadingSession.ts` `MILESTONE_MEASUREMENTS`, `REQUIRED_ACCOUNT_CACHE_STREAM_COUNT`, `requiresLiveAccount`

## Lifecycle

Values are `cold_no_cache`, `navigate_return`, `background_short`, `background_reconnect`, `account_switch` and `network_switch`.

- A short background session waits for foreground connection validation. If the connection must reconnect, the session changes to `background_reconnect` and waits for fresh live milestones.
- The upgrade to `background_reconnect` happens on a wallet-root foreground resume that fails its health check. It also happens in `performReconnection` while the lifecycle context is `background_resume`.
- The wallet-root initial mount and its retry keep the cold or warm lifecycle.

Code: `app/components/UI/Perps/utils/perpsLoadingSessionModel.ts` `PerpsLoadingLifecycle`; `app/components/UI/Perps/services/PerpsConnectionManager.ts` `resumeFromForeground`, `performReconnection`; `app/components/UI/Perps/utils/perpsLoadingSession.ts` `setPerpsLoadingSessionLifecycle`

## Outcomes

| Outcome          | Data                                                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Finished         | `success`, `content_state`, `required_live_streams_complete` and cohort attributes                                            |
| Timed out (90 s) | `success=false`, `content_state=error`, `failure_stage=loading_session_timeout`                                               |
| Cancelled        | `cancellation_reason`: `app_backgrounded`, `context_changed`, `session_restarted`, `surface_unfocused` or `surface_unmounted` |

The Homepage integration cancels on context change, background, focus loss and unmount, so an old generation cannot finish.

Code: `app/components/UI/Perps/utils/perpsLoadingSessionModel.ts` `PerpsLoadingSessionCancellationReason`, `PERPS_LOADING_SESSION_TIMEOUT_MS`; `app/components/UI/Perps/utils/perpsLoadingSession.ts` `cancelPerpsLoadingSession`; `app/components/Views/Homepage/Sections/Perpetuals/hooks/usePerpsHomepageLoadingSession.ts` `cancelOwnedOrPreparedSession`

## Correlation

When a loading session is active as each trace starts, `perps_session_id` and the generations are attached as trace data to:

- `Perps Market Data Preload` and `Perps User Data Preload`, merged in by the Mobile tracer adapter
- `Perps Connection Establishment`
- the `Perps WebSocket First *` traces, plus `connection_generation`

The Homepage section traces get `perps_session_id` only.

`Perps Loading Session` owns only its offsets and bounded outcome data. Dashboards compare the independent traces by release, platform, lifecycle, content variant and source. They do not join unrelated traces by timestamp.

Code: `app/components/UI/Perps/adapters/mobileInfrastructure.ts` `getPreloadTraceData`; `app/components/UI/Perps/services/PerpsConnectionManager.ts`; `app/components/UI/Perps/providers/PerpsStreamManager.tsx` `captureLoadingSessionTraceData`; `app/components/Views/Homepage/Sections/Perpetuals/PerpsSectionMain.tsx`
