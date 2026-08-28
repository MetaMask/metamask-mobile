import { createSelector } from 'reselect';
import { RootState } from '../../../../../reducers';
import {
  selectIsFirstTimeUser,
  selectWatchlistMarkets,
  selectIsWatchlistMarket,
  selectMarketFilterPreferences,
  selectRecentlyViewedMarkets,
  selectPerpsMode as selectPerpsModeCore,
  selectProLayoutPreferences as selectProLayoutPreferencesCore,
  selectOrderBookPreferences as selectOrderBookPreferencesCore,
  DEFAULT_PERPS_MODE,
  DEFAULT_PRO_LAYOUT_PREFERENCES,
  DEFAULT_ORDER_BOOK_PREFERENCES,
  InitializationState,
  type OrderBookPreferences,
  type PerpsActiveProviderMode,
  type PerpsMode,
  type ProLayoutPreferences,
} from '@metamask/perps-controller';

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
 * Persisted Pro-mode layout preferences.
 *
 * Wraps the core `selectProLayoutPreferences` from `@metamask/perps-controller`,
 * defaulting to `DEFAULT_PRO_LAYOUT_PREFERENCES` when controller state is
 * missing/partial (e.g. before Engine init, rehydration, or minimal E2E
 * fixtures). The core selector already merges over defaults, so the wrapper
 * only needs to guard the undefined-state path.
 */
const selectPerpsProLayoutPreferences = createSelector(
  selectPerpsControllerState,
  (perpsControllerState): ProLayoutPreferences => {
    try {
      return perpsControllerState
        ? selectProLayoutPreferencesCore(perpsControllerState)
        : DEFAULT_PRO_LAYOUT_PREFERENCES;
    } catch {
      return DEFAULT_PRO_LAYOUT_PREFERENCES;
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
  selectPerpsMarketFilterPreferences,
  selectPerpsInitializationState,
  selectIsPerpsBalanceSelected,
  selectPerpsPayWithToken,
  selectPerpsMode,
  selectPerpsProLayoutPreferences,
  selectPerpsProChartExpanded,
  selectPerpsOrderBookPreferences,
  selectPerpsProPositionsSideFilter,
  selectPerpsProPositionsSortConfig,
  selectPerpsProOrdersSideFilter,
  selectPerpsProOrdersSortConfig,
};
