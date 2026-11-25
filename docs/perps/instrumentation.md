# Perps instrumentation

The Perps event set, every property and value constant, and the transaction events Core emits are in Core [contracts/events.md](https://github.com/MetaMask/core/blob/main/packages/perps-controller/docs/contracts/events.md). Core's trace names, operations and measurement names are in Core [contracts/traces.md](https://github.com/MetaMask/core/blob/main/packages/perps-controller/docs/contracts/traces.md). This file covers what Mobile adds and emits.

## Events

Mobile emits the Core event set plus one event of its own.

| Event                                                                        | Emitted by                 | Properties                                                                  |
| ---------------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------- |
| `Perp Margin Adjustment Transaction` (`PERPS_MARGIN_ADJUSTMENT_TRANSACTION`) | `usePerpsMarginAdjustment` | `asset`, `action` (`add` or `remove`), `status`, `error_message` on failure |

For failed results, `error_message` contains the controller's stable `errorCode` when available, otherwise its original `error` text. Thrown errors send their message. Toasts and `onError` callbacks receive translated copy independently.

This event is a known exception to the fixed-event rule. It is not in Core's `PerpsAnalyticsEvent`. It stays until product decides whether to move it into Core or fold it into an existing event.

`MetaMetrics.events.ts` holds 15 `Perp *` names, Core's 14 plus this one.

Code: `app/core/Analytics/MetaMetrics.events.ts` `PERPS_MARGIN_ADJUSTMENT_TRANSACTION`; `app/components/UI/Perps/hooks/usePerpsMarginAdjustment.ts` `trackAdjustment`.

## How Mobile emits

| Path                                            | What it adds                                                                                                                                                                                                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `usePerpsEventTracking`                         | `timestamp` on every event. On `Perp Screen Viewed` it also adds stored UTM attribution and the navigation `source`, then a companion `Asset Viewed` built by `mergeAssetViewedProperties('Perps', ...)`, except for `screen_type: cancel_all_orders`. |
| Core events through `createMobileMetrics`       | Maps `trackPerpsEvent(event, properties)` to the `MetaMetricsEvents` entry with the same name. An unknown name is tracked as `{ category: event }`. No `timestamp`.                                                                                    |
| `enrichWithPerpsMode` in `analytics.trackEvent` | `perps_mode` (`lite` or `pro`) on every `Perp *` event and on `Asset Viewed` with `trade_type: Perps`. An explicit caller value wins. Separate from `mode`, which search uses for query intent.                                                        |
| `enrichWithABTests` in `analytics.trackEvent`   | `active_ab_tests` for events registered in `AB_TEST_ANALYTICS_MAPPINGS`. See [A/B registry](#ab-registry).                                                                                                                                             |

`usePerpsEventTracking` has two forms:

```typescript
// Declarative: tracks once when every condition is true
usePerpsEventTracking({
  eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
  properties: {
    [PERPS_EVENT_PROPERTY.SCREEN_TYPE]: PERPS_EVENT_VALUE.SCREEN_TYPE.TRADING,
  },
  conditions: [!!asset],
});

// Imperative
const { track } = usePerpsEventTracking();
track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
  [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
    PERPS_EVENT_VALUE.INTERACTION_TYPE.TAP,
});
```

Code: `app/components/UI/Perps/hooks/usePerpsEventTracking.ts` `usePerpsEventTracking`, `shouldEmitAssetViewedForPerpsScreenViewed`; `app/components/UI/Perps/adapters/mobileInfrastructure.ts` `createMobileMetrics`; `app/util/analytics/enrichWithPerpsMode.ts` `enrichWithPerpsMode`; `app/util/analytics/analytics.ts`; `app/util/analytics/enrichWithABTests.ts` `enrichWithABTests`.

## Client-emitted events in Mobile

| Event                                                                     | Mobile emitters                                                                                                                                                                            |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Perp Screen Viewed`                                                      | Perps screens through `usePerpsEventTracking`; `PerpsGlobalErrorGate` with `screen_type: error`, `screen_name: connection_error`, `error_type: network`, `error_message`, `retry_attempts` |
| `Perp UI Interaction`                                                     | Perps components; `PerpsConnectionErrorView` with `action: connection_retry` or `connection_go_back`, `attempt_number`, `error_message`; `PerpsAlwaysOnProvider` for Chase repricing       |
| `Perp Error`                                                              | `PerpsOrderView`, `usePerpsProOrderForm`, `PerpsMarketDetailsView`, `PerpsAdjustMarginBottomSheet`, `PerpsChartFullscreenModal`, `usePerpsChartInteractions`, `usePerpsNavigation`         |
| `Perp Transaction Considered`, `Perp Trade Quote Received`                | `PerpsOrderView`                                                                                                                                                                           |
| `Perp Search Query`, `Perp Search Result Tapped`, `Perp Search Abandoned` | `PerpsMarketListView`                                                                                                                                                                      |

- Showing an unsupported-account explanation emits `Perp Screen Viewed` with `screen_type: account_unsupported` and the presenting screen as `source`. Prefetch alone does not count.
- Home section impressions come from `usePerpsHomeSectionTracking`, one `Perp Screen Viewed` per section with `section_name` and `section_index`.
- `favorite_toggled` is emitted by `usePerpsWatchlistActions`. Core 22.3.0, the version Mobile pins, emits it too from `toggleWatchlistMarket`, which the hook calls.

Code: `app/components/UI/Perps/components/PerpsGlobalErrorGate/PerpsGlobalErrorGate.tsx`; `app/components/UI/Perps/components/PerpsConnectionErrorView/PerpsConnectionErrorView.tsx`; `app/components/UI/Perps/Views/PerpsOrderView/PerpsOrderView.tsx`; `app/components/UI/Perps/Views/PerpsMarketListView/PerpsMarketListView.tsx`; `app/components/UI/Perps/hooks/usePerpsHomeSectionTracking.ts`; `app/components/UI/Perps/hooks/usePerpsWatchlistActions.ts`.

## Mobile-local values

These values are not in Core's `PERPS_EVENT_PROPERTY` or `PERPS_EVENT_VALUE`. Each one is a candidate to move into Core.

| Property                   | Local values                                                                                                         | Defined in                                                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `screen_type`              | `mode_selection`, `account_unsupported`                                                                              | `PERPS_MODE_SELECTION_SCREEN_TYPE`, `usePerpsAccountSupport`                                                                       |
| `interaction_type`         | `mode_selection_dismissed`                                                                                           | `PERPS_MODE_SELECTION_DISMISSED`                                                                                                   |
| `interaction_type`         | `chase_concurrency_limit_hit`, `chase_max_distance_hit`, `chase_reprice` (every 10th repricing)                      | `CHASE_METAMETRICS_INTERACTION`, `CHASE_REPRICE_SAMPLE_INTERVAL`                                                                   |
| `interaction_type`         | `related_market_clicked`, `related_markets_header_tapped`                                                            | `RELATED_MARKET_CLICKED`, `RELATED_MARKETS_HEADER_TAPPED`                                                                          |
| `source`                   | `related_markets`, `explore_search`                                                                                  | `RELATED_MARKETS_SOURCE`, `PERPS_ANALYTICS_SOURCE_EXPLORE_SEARCH`                                                                  |
| `source_section`           | `recently_viewed`, `recently_added`, `perps_tab_markets`                                                             | `RECENTLY_VIEWED_SOURCE_SECTION`, `RECENTLY_ADDED_SOURCE_SECTION`, `PERPS_TAB_SOURCE_SECTION`                                      |
| `source_section` (Explore) | `perps_movers`, `perps_crypto`, `perps_markets`                                                                      | String literals in the Explore tabs                                                                                                |
| `section_name`             | `social_feed`                                                                                                        | `PerpsHomeSectionName`                                                                                                             |
| `button_clicked`           | `competition_banner_engage`, `competition_banner_close`                                                              | `COMPETITION_BANNER_BUTTON`                                                                                                        |
| `button_location`          | `perps_section_header`                                                                                               | `PERPS_SECTION_HEADER_BUTTON_LOCATION`                                                                                             |
| Property keys              | `size_unit`, `fill_pct_at_terminate`, `source_market`, `market`, `category`, `position`, `market_insights_displayed` | `PERPS_ANALYTICS_SIZE_UNIT`, `CHASE_METAMETRICS_PROPERTY`, `RELATED_MARKETS_EVENT_PROPERTY`, a literal in `PerpsMarketDetailsView` |

`market_category` and the market-list filter `button_clicked` send the raw `MarketTypeFilter`, so they can carry any of its values.

Code: `app/components/UI/Perps/utils/openPerpsModeSelection.ts`; `app/components/UI/Perps/constants/chaseAnalytics.ts`; `app/components/UI/Perps/utils/relatedMarkets.ts`; `app/components/UI/Perps/constants/perpsAnalytics.ts`; `app/components/UI/Perps/components/PerpsRecentlyViewedRail/PerpsRecentlyViewedRail.tsx`; `app/components/UI/Perps/components/PerpsRecentlyAddedSection/PerpsRecentlyAddedSection.tsx`; `app/components/Views/TrendingView/tabs/PerpsTab.tsx`; `app/components/Views/TrendingView/tabs/NowTab.tsx`; `app/components/Views/TrendingView/tabs/CryptoTab.tsx`; `app/components/Views/TrendingView/tabs/RwasTab.tsx`; `app/components/UI/Perps/hooks/usePerpsHomeSectionTracking.ts`; `app/components/UI/Perps/components/PerpsCompetitionBanner/PerpsCompetitionBanner.tsx`; `app/components/UI/Perps/utils/perpsHeaderEntryNavigation.ts`; `app/components/UI/Perps/Views/PerpsMarketDetailsView/PerpsMarketDetailsView.tsx`; `app/components/UI/Perps/Views/PerpsMarketListView/PerpsMarketListView.tsx`.

## A/B registry

`enrichWithABTests` adds the user's variant to `active_ab_tests` on the listed events. `useABTest` emits `Experiment Viewed` as the exposure signal. Flag keys and their hooks are in [feature-flags.md](./feature-flags.md#ab-test-flags).

| Flag key                                            | Experiment                        | Events tagged                                                                                         |
| --------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `perpsTAT3938AbtestScreenVsBottomSheet`             | Perps Screen vs Bottom Sheet      | Position Close, Margin Adjustment, Transaction Considered, Trade Quote Received, Trade Transaction    |
| `perpsTAT4021AbtestPerpsHeaderMarketList`           | Perps Header Market List Redirect | UI Interaction, Screen Viewed, Trade Transaction, only when `perps_mode` is `pro`                     |
| `perpsTAT3793AbtestPerpsHomeExplore`                | Perps Home Explore Table          | Screen Viewed, UI Interaction, Transaction Considered, Trade Transaction, Error                       |
| `perpsTAT4046AbtestFeeDisplayFormat`                | Perps Fee Display Format          | Screen Viewed, Trade Transaction                                                                      |
| `perpsTAT4267AbtestLiveTrades`                      | Perps Home Live Trades            | Screen Viewed, UI Interaction, Transaction Considered, Trade Transaction, Error                       |
| `perpsTAT3597AbtestPerpsSectionPriority` (Homepage) | Perps section priority            | Home Viewed, Perp UI Interaction, Perp Trade Transaction, Action Button Clicked, Token Details Opened |

Code: `app/components/UI/Perps/abTestConfig.ts`; `app/components/Views/Homepage/abTestConfig.ts` `PERPS_SECTION_PRIORITY_AB_TEST_ANALYTICS_MAPPING`; `app/util/analytics/abTestAnalyticsRegistry.ts` `AB_TEST_ANALYTICS_MAPPINGS`; `app/hooks/useABTest.ts`.

## Tracing tools

| Tool                               | Use                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `usePerpsMeasurement`              | A span inside one component. Default op `perps.operation`. `tags` apply at start, `endData` at end. Each start gets a new id. The simple `conditions` form adds a `[!conditions[0]]` reset meant for visibility toggles; readiness spans use `endConditions`, which adds no implicit reset.                                                                                                                                  |
| `perpsCufTrace`                    | Cross-surface CUF spans. `startPerpsCufTrace` at the gesture mints a per-operation id. A `watchPerpsCuf*` matcher waits; the stream manager's `handlePerpsCuf*Delivered` dispatchers end the span when the change renders. A 30 s fallback ends it otherwise. Close, cancel and TP/SL succeed only after `acceptPerpsCufRequest`. `clearPendingPerpsCufTraces` abandons pending spans as `disconnected` on a session change. |
| `perpsTradeSheetInteractiveTrace`  | Trade action to interactive bottom sheet, 30 s timeout                                                                                                                                                                                                                                                                                                                                                                       |
| `perpsLoadingSession`              | Homepage readiness for one account, provider, network and HIP-3 generation. Op `perps.loading`. See [performance/architecture.md](./performance/architecture.md).                                                                                                                                                                                                                                                            |
| `usePerpsMarketDetailSession`      | Lite and Pro market-detail section readiness from one screen-open anchor. Op `perps.loading`.                                                                                                                                                                                                                                                                                                                                |
| `trace()` from `app/util/trace.ts` | `PerpsConnectionManager`, `PerpsStreamManager`, `PerpsAdvancedChart`                                                                                                                                                                                                                                                                                                                                                         |
| Core `tracer` dependency           | `mobileInfrastructure` maps each `PerpsTraceName` to `TraceName` by cast, tracks up to 100 open trace ids to route measurements, and adds loading-session data to the two preload traces                                                                                                                                                                                                                                     |

CUF tags (`PERPS_CUF_TAG`) are `feature`, `lifecycle_context` (`cold_process`, `warm`, `background_resume`), and flow variants such as `variant`, `direction`, `order_type`. End data holds `success`, `boundary`, `reason` (`order_failed`, `request_failed`, `exception`, `already_closed`, `stream_timeout`, `superseded`, `disconnected`, `controller_timeout`), and `toast_position_delta_ms` on market place-order.

Code: `app/components/UI/Perps/hooks/usePerpsMeasurement.ts` `usePerpsMeasurement`; `app/components/UI/Perps/utils/perpsCufTrace.ts`; `app/components/UI/Perps/constants/perpsCufTags.ts` `PERPS_CUF_TAG`, `PERPS_CUF_END_REASON`, `PERPS_CUF_STREAM_TIMEOUT_MS`; `app/components/UI/Perps/utils/perpsLifecycleContext.ts`; `app/components/UI/Perps/utils/perpsTradeSheetInteractiveTrace.ts`; `app/components/UI/Perps/utils/perpsLoadingSession.ts`; `app/components/UI/Perps/hooks/usePerpsMarketDetailSession.ts`; `app/components/UI/Perps/adapters/mobileInfrastructure.ts` `tracer`, `toTraceName`.

## Traces Mobile starts

| Kind       | Trace name (`TraceName`)                                                                                                                                                 | Op                              | Started in                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- | ----------------------------------------------------------------------------------------- |
| Screen     | `PerpsMarketListView`                                                                                                                                                    | `perps.operation`               | `PerpsHomeView` and `PerpsMarketListView`                                                 |
| Screen     | `PerpsPositionDetailsView`                                                                                                                                               | `perps.operation`               | `PerpsMarketDetailsView`                                                                  |
| Screen     | `PerpsOrderView`                                                                                                                                                         | `perps.operation`               | `PerpsOrderView`, `PerpsBalanceOrderView`                                                 |
| Screen     | `PerpsClosePositionView`, `PerpsAdjustMarginView`, `PerpsFlipPositionSheet`, `PerpsWithdrawView`, `PerpsTransactionsView`, `PerpsOrderDetailsView`, `PerpsOrderBookView` | `perps.operation`               | The matching view or sheet; `usePerpsClosePositionForm` for the close view                |
| Screen     | `PerpsOrderSubmissionToast`                                                                                                                                              | `perps.order_submission`        | `usePerpsOrderExecution`                                                                  |
| CUF        | `PerpsEntryToLiveMarketList`, `PerpsMarketDetailLive`, `PerpsTradePageRender`                                                                                            | `perps.operation`               | `usePerpsMeasurement` with `endConditions`                                                |
| CUF        | `PerpsPlaceOrderToPositionRendered`, `PerpsPlaceLimitOrderToOrderRendered`                                                                                               | `perps.operation`               | `usePerpsOrderExecution`                                                                  |
| CUF        | `PerpsClosePositionToConfirmation`, `PerpsCancelOrderToConfirmation`, `PerpsUpdateTPSLToConfirmation`, `PerpsTerminateTwapToConfirmation`, `PerpsEditOrder`              | `perps.operation`               | `usePerpsClosePosition`, `usePerpsTrading`, `usePerpsTPSLUpdate`, `usePerpsTerminateTwap` |
| CUF        | `PerpsTradeSheetInteractive`                                                                                                                                             | `perps.operation`               | `perpsTradeSheetInteractiveTrace`                                                         |
| Operation  | `PerpsAccountSupportCheck`                                                                                                                                               | `perps.operation`               | `usePerpsAccountSupport.checkAccountSupport` (end data: `result`)                         |
| Stream     | `PerpsWebSocketFirstPrice`, `PerpsWebSocketFirstOrders`, `PerpsWebSocketFirstPositions`, `PerpsWebSocketFirstAccount`, `PerpsWebSocketFirstOrderBook`                    | `perps.operation`               | `PerpsStreamManager` channels                                                             |
| Connection | `PerpsConnectionEstablishment`                                                                                                                                           | `perps.operation`               | `PerpsConnectionManager.connect`                                                          |
| Connection | `PerpsAccountSwitchReconnection`                                                                                                                                         | `perps.operation`               | `PerpsConnectionManager.performReconnection`, on every reconnect                          |
| Connection | `PerpsWebSocketReconnectToFreshData`                                                                                                                                     | `perps.operation`               | `PerpsConnectionManager.performReconnection` (CUF)                                        |
| Session    | `PerpsLoadingSession`, `PerpsMarketDetailSession`                                                                                                                        | `perps.loading`                 | `perpsLoadingSession`, `usePerpsMarketDetailSession`                                      |
| Chart      | `PerpsChartFirstCandle` (`perps.chart.first_candle`), `PerpsChartFullscreenOpen` (`perps.chart.full_screen_open`)                                                        | `perps.chart`                   | `PerpsAdvancedChart`                                                                      |
| Chart      | `PerpsAdvancedChartIntervalVisible`                                                                                                                                      | `perps.advanced_chart_interval` | `PerpsAdvancedChart`                                                                      |

- Chase termination skips `PerpsCancelOrderToConfirmation`, since Chase rotates child order ids while repricing.
- `PerpsEditOrder` (`Perps Edit Order`) is also the name of Core's edit-order trace with op `perps.order_submission`. Both spans share one Sentry name.
- `TraceName` also lists names no Mobile code starts, namely `PerpsOpenPosition`, `PerpsDeposit`, `PerpsMarketDataUpdate`, `PerpsWebSocketConnected`, `PerpsWebSocketDisconnected`, `PerpsRewardsAPICall`, `PerpsAdvancedChartInitialVisible`. The other Perps names are started by Core through the tracer.
- `TraceOperation.PerpsMarketData`, `PerpsPositionManagement` and `PerpsAdvancedChart` have no Mobile caller.

Code: `app/util/trace.ts` `TraceName`, `TraceOperation`; `app/components/UI/Perps/services/PerpsConnectionManager.ts`; `app/components/UI/Perps/providers/PerpsStreamManager.tsx`; `app/components/UI/Perps/hooks/usePerpsOrderExecution.ts`; `app/components/UI/Perps/hooks/usePerpsTrading.ts`; `app/components/UI/Perps/components/PerpsAdvancedChart/PerpsAdvancedChart.tsx`; `app/components/UI/Perps/Views/PerpsProMarketView/components/PerpsProPositionsPanel.tsx`.

## Measurements Mobile sets

Names come from Core's `PerpsMeasurementName`.

| Measurement                                                                                                                                                                                           | Set in                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `perps.connection.provider_init`, `perps.websocket.health_check`, `perps.websocket.connection_establishment`, `perps.connection.subscriptions_preload`, `perps.websocket.connection_with_preload`     | `PerpsConnectionManager.connect`, on `PerpsConnectionEstablishment`               |
| `perps.connection.cleanup`, `perps.connection.controller_reinit`, `perps.websocket.reconnection_health_check`, `perps.connection.reconnection_preload`, `perps.websocket.account_switch_reconnection` | `PerpsConnectionManager.performReconnection`, on `PerpsAccountSwitchReconnection` |
| `perps.api.rewards_points_estimation`                                                                                                                                                                 | `usePerpsOrderFees`                                                               |

`perps.websocket.first_position_data` is logged through `DevLogger` only. Mobile sets no `perps.screen.*` or `perps.ui.*` measurement.

Code: `app/components/UI/Perps/services/PerpsConnectionManager.ts` `setMeasurement`; `app/components/UI/Perps/hooks/usePerpsOrderFees.ts`; `app/components/UI/Perps/providers/PerpsStreamManager.tsx`.

## Adding a Mobile trace

1. Add the name to `TraceName` in `app/util/trace.ts`, using an existing `TraceOperation` where one fits.
2. Use `usePerpsMeasurement` for one component. Use `startPerpsCufTrace` with a `watchPerpsCuf*` matcher and a stream dispatcher when the gesture and the live render are in different surfaces.
3. A trace Core starts is added in Core first, then mirrored in `TraceName`. See Core [contracts/traces.md](https://github.com/MetaMask/core/blob/main/packages/perps-controller/docs/contracts/traces.md#adding-a-trace-or-measurement).

Code: `app/util/trace.ts`; `app/components/UI/Perps/hooks/usePerpsMeasurement.ts`; `app/components/UI/Perps/utils/perpsCufTrace.ts`.

## Error reporting

- Mobile code reports with `Logger.error(ensureError(error, '<Caller.method>'), { tags, context })`. `ensureError` is in `app/util/errorUtils.ts`.
- Tags carry `feature` (`PERPS_CONSTANTS.FeatureName`), and where known `provider`, `network`, `operation`, `action`, `component`. `context` is `{ name, data }`.
- Core errors reach Sentry through the `logger` dependency, which adds `feature`.
- `PerpsConnectionProvider` callbacks tag `component: PerpsConnectionManager` with `action` `connection_connection`, `connection_disconnection`, `connection_reconnection` or `connection_ensure_connected_on_entry`.
- Failed retries from the error screen add `perps.connection` breadcrumbs, not events. The error view impression adds a breadcrumb and `Perp Screen Viewed`.
- Development log markers come from Core `PERFORMANCE_CONFIG.LoggingMarkers`.

Code: `app/util/errorUtils.ts` `ensureError`; `app/components/UI/Perps/adapters/mobileInfrastructure.ts` `logger`; `app/components/UI/Perps/providers/PerpsConnectionProvider.tsx`; `app/components/UI/Perps/components/PerpsGlobalErrorGate/PerpsGlobalErrorGate.tsx`; `app/components/UI/Perps/services/PerpsConnectionManager.ts`.
