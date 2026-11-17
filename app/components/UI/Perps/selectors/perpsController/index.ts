import { createSelector } from 'reselect';
import { RootState } from '../../../../../reducers';
import {
  selectIsFirstTimeUser,
  selectWatchlistMarkets,
  selectIsWatchlistMarket,
  selectMarketFilterPreferences,
  selectRecentlyViewedMarkets,
  selectVisibleCandleCount as selectVisibleCandleCountCore,
  selectPerpsMode as selectPerpsModeCore,
  selectOrderBookPreferences as selectOrderBookPreferencesCore,
  DEFAULT_PERPS_MODE,
  DEFAULT_PRO_LAYOUT_PREFERENCES,
  DEFAULT_ORDER_BOOK_PREFERENCES,
  VISIBLE_CANDLE_COUNT_CONFIG,
  InitializationState,
  type OrderBookPreferences,
  type PerpsActiveProviderMode,
  type PerpsMode,
  type ProLayoutPreferences,
} from '@metamask/perps-controller';
import { MOBILE_PRO_LAYOUT_DEFAULTS } from '../../constants/perpsConfig';

const selectPerpsControllerState = (state: RootState) =>
  state.engine.backgroundState.PerpsController;

const selectPerpsProvider = createSelector(
  selectPerpsControllerState,
  (perpsControllerState): PerpsActiveProviderMode | undefined =>
    perpsControllerState?.activeProvider,
);

const selectPerpsAccountState = createSelector(
  selectPerpsControllerState,
  (perpsControllerState) => perpsControllerState?.accountState || null,
);

const selectPerpsDepositState = createSelector(
  selectPerpsControllerState,
  (perpsControllerState) => {
    if (!perpsControllerState) {
      return {
        inProgress: false,
        lastResult: null,
      };
    }

    return {
      inProgress: perpsControllerState.depositInProgress || false,
      lastResult: perpsControllerState.lastDepositResult || null,
    };
  },
);

const selectPerpsEligibility = createSelector(
  selectPerpsControllerState,
  (perpsControllerState) => perpsControllerState?.isEligible || false,
);

const selectPerpsNetwork = createSelector(
  selectPerpsControllerState,
  (perpsControllerState) =>
    perpsControllerState?.isTestnet ? 'testnet' : 'mainnet',
);

const selectPerpsBalances = createSelector(
  selectPerpsControllerState,
  (perpsControllerState) => perpsControllerState?.perpsBalances || {},
);

const DEFAULT_MARKET_FILTER_PREFERENCES = {
  optionId: 'volume',
  direction: 'desc' as const,
};

// When PerpsController state is missing or partial (e.g. before Engine init, rehydration, or minimal E2E fixtures),
// avoid calling perps-controller selectors with undefined (they may access .length etc. on nested props).
// Normalize return values (?? []) so we're safe even when the package returns undefined for partial state.
const selectIsFirstTimePerpsUser = createSelector(
  selectPerpsControllerState,
  (perpsControllerState) => {
    try {
      return perpsControllerState
        ? selectIsFirstTimeUser(perpsControllerState)
        : true;
    } catch {
      return true;
    }
  },
);

const selectPerpsWatchlistMarkets = createSelector(
  selectPerpsControllerState,
  (perpsControllerState) => {
    try {
      return (
        (perpsControllerState
          ? selectWatchlistMarkets(perpsControllerState)
          : undefined) ?? []
      );
    } catch {
      return [];
    }
  },
);

/**
 * Symbols of markets the user has recently viewed, newest-first.
 *
 * Delegates to the core `selectRecentlyViewedMarkets`, which already
 * filters out entries older than `RecentlyViewedMarketsTtlMs` (24h) and
 * caps the list at `RecentlyViewedMarketsLimit` (10).
 */
const selectPerpsRecentlyViewedMarkets = createSelector(
  selectPerpsControllerState,
  (perpsControllerState) => {
    try {
      return (
        (perpsControllerState
          ? selectRecentlyViewedMarkets(perpsControllerState)
          : undefined) ?? []
      );
    } catch {
      return [];
    }
  },
);

/**
 * Symbol of the market the user viewed most recently (24h TTL).
 * Falls back to BTC when the recently-viewed list is empty so Pro entry
 * points have a market to land on (TAT-3706 / TAT-3702).
 */
const selectPerpsLastViewedMarketSymbol = createSelector(
  selectPerpsRecentlyViewedMarkets,
  (symbols): string => {
    const lastViewed = symbols[0];
    return typeof lastViewed === 'string' && lastViewed.length > 0
      ? lastViewed
      : 'BTC';
  },
);

/**
 * Number of candles shown in Lite and Pro chart viewports.
 * Shared across markets and sessions via PerpsController.visibleCandleCount.
 */
const selectPerpsVisibleCandleCount = createSelector(
  selectPerpsControllerState,
  (perpsControllerState): number => {
    try {
      const raw = perpsControllerState
        ? selectVisibleCandleCountCore(perpsControllerState)
        : VISIBLE_CANDLE_COUNT_CONFIG.Default;
      if (typeof raw !== 'number' || !Number.isFinite(raw)) {
        return VISIBLE_CANDLE_COUNT_CONFIG.Default;
      }
      return Math.min(
        VISIBLE_CANDLE_COUNT_CONFIG.Max,
        Math.max(VISIBLE_CANDLE_COUNT_CONFIG.Min, Math.round(raw)),
      );
    } catch {
      return VISIBLE_CANDLE_COUNT_CONFIG.Default;
    }
  },
);

const selectPerpsMarketFilterPreferences = createSelector(
  selectPerpsControllerState,
  (perpsControllerState) => {
    try {
      return (
        (perpsControllerState
          ? selectMarketFilterPreferences(perpsControllerState)
          : undefined) ?? DEFAULT_MARKET_FILTER_PREFERENCES
      );
    } catch {
      return DEFAULT_MARKET_FILTER_PREFERENCES;
    }
  },
);

/**
 * True when the user selected the synthetic "Perps balance" option (selectedPaymentToken === null).
 */
const selectIsPerpsBalanceSelected = createSelector(
  selectPerpsControllerState,
  (perpsControllerState) => perpsControllerState?.selectedPaymentToken == null,
);

const selectPerpsPayWithToken = createSelector(
  selectPerpsControllerState,
  (perpsControllerState) => perpsControllerState?.selectedPaymentToken,
);
/**
 * Selects the current initialization state of the Perps controller.
 * Used by UI components to determine if operations can be performed.
 *
 * @returns InitializationState enum value:
 * - 'uninitialized': Controller not yet started
 * - 'initializing': Currently attempting initialization (may be retrying)
 * - 'initialized': Ready for operations
 * - 'failed': All retry attempts exhausted, user action required
 */
const selectPerpsInitializationState = createSelector(
  selectPerpsControllerState,
  (perpsControllerState) =>
    perpsControllerState?.initializationState ||
    InitializationState.Uninitialized,
);

/**
 * Current Perps interface mode (Lite ⇄ Pro).
 *
 * Wraps the core `selectPerpsMode` from `@metamask/perps-controller` (TAT-3582),
 * defaulting to `DEFAULT_PERPS_MODE` when controller state is missing/partial
 * (e.g. before Engine init, rehydration, or minimal E2E fixtures).
 */
const selectPerpsMode = createSelector(
  selectPerpsControllerState,
  (perpsControllerState): PerpsMode => {
    try {
      return perpsControllerState
        ? selectPerpsModeCore(perpsControllerState)
        : DEFAULT_PERPS_MODE;
    } catch {
      return DEFAULT_PERPS_MODE;
    }
  },
);

/**
 * Pro-mode layout defaults for this client. The shared controller defaults are
 * Extension's; mobile ships the order book open and pinned right.
 */
const MOBILE_DEFAULT_PRO_LAYOUT_PREFERENCES: ProLayoutPreferences = {
  ...DEFAULT_PRO_LAYOUT_PREFERENCES,
  ...MOBILE_PRO_LAYOUT_DEFAULTS,
};

/**
 * Persisted Pro-mode layout preferences, over the mobile defaults.
 *
 * Deliberately reads `proLayoutPreferences` directly rather than through the
 * core `selectProLayoutPreferences`: that helper merges the Extension defaults
 * in itself, so its output cannot distinguish a persisted `'left'` from a
 * defaulted one. Reading the raw slice keeps a stored choice authoritative
 * while still answering with mobile's values when nothing is stored yet —
 * before Engine init or migration 151, or in minimal test fixtures.
 *
 * Inputs on `proLayoutPreferences` rather than the whole controller slice:
 * `update()` is immer-based, so this nested object keeps its identity across
 * unrelated controller changes and the memo survives live ticks. Children that
 * return objects (the sort configs) would otherwise churn on every update.
 */
const selectPerpsProLayoutPreferences = createSelector(
  (state: RootState) =>
    state.engine.backgroundState.PerpsController?.proLayoutPreferences,
  (proLayoutPreferences): ProLayoutPreferences => {
    try {
      return {
        ...MOBILE_DEFAULT_PRO_LAYOUT_PREFERENCES,
        ...proLayoutPreferences,
      };
    } catch {
      return MOBILE_DEFAULT_PRO_LAYOUT_PREFERENCES;
    }
  },
);

/**
 * Whether the Pro inline chart is expanded. Persisted globally across markets
 * and app restarts via `PerpsController.proLayoutPreferences.chartExpanded`.
 * Defaults to `true` (visible) so first-time Pro users see the chart.
 */
const selectPerpsProChartExpanded = createSelector(
  selectPerpsProLayoutPreferences,
  (proLayoutPreferences): boolean => proLayoutPreferences.chartExpanded,
);

/**
 * Whether the Pro order-book column is shown. Persisted globally across markets
 * and app restarts via `PerpsController.proLayoutPreferences.orderBookExpanded`.
 * Mobile defaults to shown (see `MOBILE_PRO_LAYOUT_DEFAULTS`).
 */
const selectPerpsProOrderBookExpanded = createSelector(
  selectPerpsProLayoutPreferences,
  (proLayoutPreferences): boolean => proLayoutPreferences.orderBookExpanded,
);

/**
 * Which side of the Pro trading area the order-book column is pinned to.
 * Persisted globally across markets and app restarts via
 * `PerpsController.proLayoutPreferences.orderBookPosition`.
 * Mobile defaults to `'right'` (see `MOBILE_PRO_LAYOUT_DEFAULTS`).
 */
const selectPerpsProOrderBookPosition = createSelector(
  selectPerpsProLayoutPreferences,
  (proLayoutPreferences): ProLayoutPreferences['orderBookPosition'] =>
    proLayoutPreferences.orderBookPosition,
);

/**
 * Market-agnostic Pro order-book listed-by preferences (currency + metric).
 * Group-by remains per-market via `selectOrderBookGrouping`.
 */
const selectPerpsOrderBookPreferences = createSelector(
  selectPerpsControllerState,
  (perpsControllerState): OrderBookPreferences => {
    try {
      return perpsControllerState
        ? selectOrderBookPreferencesCore(perpsControllerState)
        : DEFAULT_ORDER_BOOK_PREFERENCES;
    } catch {
      return DEFAULT_ORDER_BOOK_PREFERENCES;
    }
  },
);

/**
 * Pro Positions panel side filter (all/long/short). Persisted globally
 * across markets and app restarts via
 * `PerpsController.proLayoutPreferences.positionsSideFilter`.
 * Independent of `ordersSideFilter`.
 */
const selectPerpsProPositionsSideFilter = createSelector(
  selectPerpsProLayoutPreferences,
  (proLayoutPreferences) => proLayoutPreferences.positionsSideFilter,
);

/**
 * Pro Positions list sort config composed from flat controller fields.
 * Persisted globally across markets and app restarts via
 * `positionsSortField` / `positionsSortDirection` on
 * `PerpsController.proLayoutPreferences`.
 */
const selectPerpsProPositionsSortConfig = createSelector(
  selectPerpsProLayoutPreferences,
  (proLayoutPreferences) => ({
    field: proLayoutPreferences.positionsSortField,
    direction: proLayoutPreferences.positionsSortDirection,
  }),
);

/**
 * Pro Orders panel side filter (all/long/short). Persisted globally across
 * markets and app restarts via
 * `PerpsController.proLayoutPreferences.ordersSideFilter`.
 * Independent of `positionsSideFilter`.
 */
const selectPerpsProOrdersSideFilter = createSelector(
  selectPerpsProLayoutPreferences,
  (proLayoutPreferences) => proLayoutPreferences.ordersSideFilter,
);

/**
 * Pro Orders list sort config composed from flat controller fields.
 * Persisted globally across markets and app restarts via
 * `ordersSortField` / `ordersSortDirection` on
 * `PerpsController.proLayoutPreferences`.
 */
const selectPerpsProOrdersSortConfig = createSelector(
  selectPerpsProLayoutPreferences,
  (proLayoutPreferences) => ({
    field: proLayoutPreferences.ordersSortField,
    direction: proLayoutPreferences.ordersSortDirection,
  }),
);

// Factory function to create selector for specific market
export const createSelectIsWatchlistMarket = (symbol: string) =>
  createSelector(selectPerpsControllerState, (perpsControllerState) => {
    try {
      return perpsControllerState
        ? selectIsWatchlistMarket(perpsControllerState, symbol)
        : false;
    } catch {
      return false;
    }
  });

export {
  selectPerpsProvider,
  selectPerpsAccountState,
  selectPerpsDepositState,
  selectPerpsEligibility,
  selectPerpsNetwork,
  selectPerpsBalances,
  selectIsFirstTimePerpsUser,
  selectPerpsWatchlistMarkets,
  selectPerpsRecentlyViewedMarkets,
  selectPerpsLastViewedMarketSymbol,
  selectPerpsVisibleCandleCount,
  selectPerpsMarketFilterPreferences,
  selectPerpsInitializationState,
  selectIsPerpsBalanceSelected,
  selectPerpsPayWithToken,
  selectPerpsMode,
  selectPerpsProLayoutPreferences,
  selectPerpsProChartExpanded,
  selectPerpsProOrderBookExpanded,
  selectPerpsProOrderBookPosition,
  selectPerpsOrderBookPreferences,
  selectPerpsProPositionsSideFilter,
  selectPerpsProPositionsSortConfig,
  selectPerpsProOrdersSideFilter,
  selectPerpsProOrdersSortConfig,
};
