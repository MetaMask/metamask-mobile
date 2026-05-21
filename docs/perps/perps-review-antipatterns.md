# Perps Domain Anti-Patterns

> Patterns to watch for when reviewing perps-related code. Generic code quality is handled by standard review.

## Controller Portability (Core Sync)

The controller at `app/controllers/perps/` is published as `@metamask/perps-controller` and synced to `core` monorepo via `scripts/perps/validate-core-sync.sh`. It must remain platform-agnostic — no mobile-specific imports.

- **Mobile import in controller** — `react-native`, `Engine`, `Sentry`, `DevLogger` imported directly in `app/controllers/perps/`. All platform services must flow through `PerpsPlatformDependencies` (DI). The sync script checks for these but a PR could introduce them.
- **Direct controller import from app code** — app files importing `from '../../controllers/perps/...'` instead of `from '@metamask/perps-controller'`. ESLint rule exists but may be suppressed.
- **`__DEV__` in controller code** — must not appear in controller files. Core replaces it with `false` during sync. If new code adds `__DEV__` checks, sync breaks.
- **New dependency not in DI interface** — controller code reaching outside its boundary (e.g., importing a hook, React context, or mobile utility). Everything the controller needs must come through `infrastructure: PerpsPlatformDependencies` constructor param.
- **Breaking the publisher contract** — changing PerpsController's public API (state shape, method signatures, event names) without considering extension consumers. Controller is a publisher — mobile and extension both consume it.

## Magic Strings, Magic Numbers & Placeholder Values

Constants live in `app/controllers/perps/constants/perpsConfig.ts` (controller-portable) and `app/components/UI/Perps/constants/perpsConfig.ts` (UI-only). PRs must use these — not inline literals.

- **Defaulting to `0` when data is unavailable** — the most common mistake. When price/percentage/data hasn't loaded yet, use the placeholder constants, NOT `0`, `$0`, or `0%`:
  - `PERPS_CONSTANTS.FallbackPriceDisplay` (`'$---'`) — price not yet loaded
  - `PERPS_CONSTANTS.FallbackPercentageDisplay` (`'--%'`) — percentage not yet loaded
  - `PERPS_CONSTANTS.FallbackDataDisplay` (`'--'`) — generic data not yet loaded
  - `PERPS_CONSTANTS.ZeroAmountDisplay` (`'$0'`) / `ZeroAmountDetailedDisplay` (`'$0.00'`) — ONLY for actual confirmed zero values (e.g., no volume), never for "loading" or "unavailable"
  - Defaulting to `0` hides loading states, makes bugs invisible, and can mislead users into thinking their balance/PnL is actually zero.
- **Inline timeout/delay values** — hardcoded `5000`, `10000`, `300` instead of `PERPS_CONSTANTS.WebsocketTimeout`, `PERPS_CONSTANTS.ConnectionTimeoutMs`, `PERFORMANCE_CONFIG.ValidationDebounceMs`, etc. Every timing constant has a named export.
- **Hardcoded slippage** — using `0.03` or `300` instead of `ORDER_SLIPPAGE_CONFIG.DefaultMarketSlippageBps`, `DefaultTpslSlippageBps`, `DefaultLimitSlippageBps`.
- **Hardcoded leverage fallback** — using `3` or `50` instead of `PERPS_CONSTANTS.DefaultMaxLeverage` or `MARGIN_ADJUSTMENT_CONFIG.FallbackMaxLeverage`.
- **Hardcoded precision** — using `6`, `2`, `5` for decimal places instead of `DECIMAL_PRECISION_CONFIG.MaxPriceDecimals`, `MaxSignificantFigures`, `FallbackSizeDecimals`, or `CLOSE_POSITION_CONFIG.UsdDecimalPlaces`.
- **Hardcoded API URLs** — inline `'https://perps.api...'` instead of `DATA_LAKE_API_CONFIG.OrdersEndpoint`.
- **Hardcoded provider name** — `'hyperliquid'` string instead of `PROVIDER_CONFIG.DefaultProvider`.
- **Hardcoded validation thresholds** — `20` for high leverage warning, `0.1` for price deviation, instead of `VALIDATION_THRESHOLDS.HighLeverageWarning`, `VALIDATION_THRESHOLDS.PriceDeviation`.
- **Hardcoded cache durations** — inline `5 * 60 * 1000` instead of `PERFORMANCE_CONFIG.MarketDataCacheDurationMs`, `FeeDiscountCacheDurationMs`, etc.

## Protocol Abstraction

All provider access must go through `AggregatedPerpsProvider` → `ProviderRouter`. HyperLiquid is primary, MYX is feature-flagged.

- **Hardcoded provider** — uses HyperLiquid or MYX APIs directly instead of going through `AggregatedPerpsProvider` / `ProviderRouter`. All operations must route through the abstraction.
- **Provider-specific branching in UI** — `if (provider === 'hyperliquid')` in components or hooks. Provider differences must be normalized in the aggregation layer, not leaked to the view.
- **Provider-specific error handling** — catches errors from one provider but not others. All providers must have consistent error boundaries via the aggregated layer.
- **Hardcoded market symbols** — string literals `"BTC"` or `"ETH"` instead of market config constants. Breaks when new markets or providers are added.
- **Hardcoded decimals/precision** — using provider-native decimal formats without normalization. HyperLiquid and MYX use different precision for prices, sizes, and leverage. Must go through `MarketDataFormatters` (DI).

## MetaMetrics Events

8 consolidated events with typed constants. Reference: `docs/perps/perps-metametrics-reference.md`.

- **Magic string event properties** — using `'status'`, `'asset'`, `'direction'` instead of `PERPS_EVENT_PROPERTY.STATUS`, `PERPS_EVENT_PROPERTY.ASSET`, etc. from `@metamask/perps-controller`.
- **Magic string event values** — using `'executed'`, `'long'`, `'market'` instead of `PERPS_EVENT_VALUE.STATUS.EXECUTED`, `PERPS_EVENT_VALUE.DIRECTION.LONG`, `PERPS_EVENT_VALUE.ORDER_TYPE.MARKET`.
- **New event instead of property** — creating a 9th event when the change should be a new `screen_type`, `interaction_type`, or `action_type` value on an existing event. The 8-event model is intentional (Segment cost optimization).
- **Missing `source` on screen view** — `PERPS_SCREEN_VIEWED` without `source` property loses navigation flow tracking. Source = current screen, not earlier in the chain.
- **Hardcoded source in reusable component** — reusable components (`PerpsMarketTypeSection`, `PerpsWatchlistMarkets`, `PerpsCard`) must receive `source` as a prop from the parent screen, not set it implicitly.
- **New screen/view without tracking** — adding a new view without `PERPS_SCREEN_VIEWED` event + `usePerpsMeasurement` Sentry trace.
- **Missing `completion_duration` on transaction events** — all transaction events (`PERPS_TRADE_TRANSACTION`, `PERPS_POSITION_CLOSE_TRANSACTION`, etc.) require duration tracking.

## Sentry Tracing

38+ traces for performance monitoring. Reference: `docs/perps/perps-sentry-reference.md`.

- **New screen without `usePerpsMeasurement`** — every new view needs a Sentry performance trace with appropriate `conditions` for when data is loaded.
- **Missing error context** — `Logger.error()` calls without `{ feature: 'perps', context: 'ClassName.method', provider, network }`. Sentry filtering depends on these fields.
- **Missing `ensureError()` wrapper** — catching errors without `ensureError(error)` before passing to `Logger.error()`. Non-Error objects crash Sentry reporting.
- **New trace without TraceName enum** — hardcoded trace name strings instead of adding to `TraceName` enum in `app/util/trace.ts`.
- **Missing `endTrace` in finally block** — `trace()` started but `endTrace()` not in a `finally` block. Orphaned traces leak in Sentry.

## Connection & WebSocket Architecture

Single `PerpsAlwaysOnProvider` at wallet root owns lifecycle. All `PerpsConnectionProvider` instances use `manageLifecycle={false}`.

- **New `PerpsConnectionProvider` with lifecycle** — adding a `PerpsConnectionProvider` without `manageLifecycle={false}` creates reference-count bugs. Only `PerpsAlwaysOnProvider` manages connect/disconnect.
- **Unthrottled WS → setState** — every WS tick triggers state update. Must use `useLivePrices` with appropriate `throttleMs` (100ms for charts, 2s for lists, 10s for order forms). Exception: subscriptions that must react to user form input within the same tick (e.g. the L2 order-book subscription in `usePerpsEstimatedSlippage`) can use a sub-second cadence via `PERFORMANCE_CONFIG.SlippageEstimateThrottleMs`; downstream `useMemo` must keep per-tick work cheap so the faster cadence does not cause render pressure.
- **Per-component WS subscription** — creating a new WebSocket connection per component instead of using `PerpsStreamManager` shared subscriptions with reference counting.
- **WS subscription leak** — subscribing on mount without unsubscribing on unmount or market switch. `PerpsStreamManager` handles ref counting but custom subscriptions must clean up.
- **Stale data after async gap** — reading position/order state, awaiting something, then using the stale read. WS updates change state between awaits. Re-read after async boundaries.
- **Missing cache invalidation** — after trade/withdrawal/position change, not calling `PerpsCacheInvalidator.invalidate()` for affected cache types (`positions`, `accountState`). Standalone queries on token detail pages show stale data.

## Data Flow & State

Controller → Redux → Hooks → Components. Standalone mode for lightweight queries without full init.

- **Direct controller call from component** — components calling `PerpsController.method()` directly instead of going through hooks (`usePerpsTrading`, `usePerpsAccount`, etc.).
- **Missing `accountState` check** — accessing positions/orders/balances without verifying accountState is loaded. Causes undefined errors on first load or account switch.
- **Stale position after close** — position in UI after close because local state not cleared or WS update not processed. Must refresh via `PerpsCacheInvalidator`.
- **Preload data not seeded** — new hook not using `getPreloadedData()` lazy initializer. First render shows skeleton instead of cached data from the 5-minute preload cycle.
- **Order state race** — submitting order and immediately reading order state. WS confirmation hasn't arrived. Use transaction receipt or poll with backoff.
- **Leverage/validation bypass** — allowing values outside market's `maxLeverage` or skipping pre-trade checks (balance, market open, position limit).

## Trade Flow

- **Pre-trade checks missing** — submitting trade without verifying: sufficient balance, market open, position limit, leverage within bounds, slippage tolerance set.
- **Post-trade state not refreshed** — after trade confirmation, not triggering refresh of balances, positions, orders. User sees stale data until next WS tick.
- **Missing slippage in order params** — creating order without slippage tolerance, or hardcoding slippage instead of user preference.

## Agentic Testability (testIDs)

PRs that touch UI components must include testIDs so agentic recipes and E2E tests can navigate and assert on the app without manual interaction.

- **Missing testID on interactive elements** — any `TextInput`, `Pressable`, `Button`, or touchable in a new or modified component without a `testID` prop. Agentic recipes use `app-state.sh press <testID>` and `eval_sync` fiber-walk queries to interact with and assert on UI. If the element has no testID, the recipe cannot press it or read its value — the fix is untestable agentically.
- **testID not in `Perps.testIds.ts`** — testIDs defined as inline strings instead of exported constants from `app/components/UI/Perps/Perps.testIds.ts`. All testIDs must be centralized so recipes can reference them by constant name.
- **testID missing from the element that holds the value** — adding testID to a wrapper View instead of the `TextInput` or Text that actually contains the value. CDP fiber-walk reads `value` from the React element with the matching testID — the testID must be on the element that owns the state.
- **TP/SL price inputs without testID** — the trigger price `TextInput` components in `PerpsTPSLView` (and similar order-form screens) frequently lack testIDs, making it impossible to assert the accepted decimal precision agentically. Any PR touching these screens must add `testID` to both the Take Profit and Stop Loss price inputs.
