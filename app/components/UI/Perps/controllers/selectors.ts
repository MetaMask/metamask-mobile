import { createSelector } from 'reselect';

import { MARKET_SORTING_CONFIG, SortOptionId } from '../constants/perpsConfig';
import type { PerpsControllerState } from './PerpsController';
import type { SortDirection } from '../utils/sortMarkets';

/**
 * Select whether the user is a first-time perps user
 *
 * @param state - PerpsController state
 * @returns true if user is first-time, false otherwise
 */
export const selectIsFirstTimeUser = (
  state: PerpsControllerState | undefined,
): boolean => {
  if (state?.isTestnet) {
    return state?.isFirstTimeUser?.testnet ?? true;
  }
  return state?.isFirstTimeUser?.mainnet ?? true;
};

/**
 * Select whether user has ever placed their first successful order
 *
 * @param state - PerpsController state
 * @returns boolean indicating if first order was placed
 */
export const selectHasPlacedFirstOrder = (
  state: PerpsControllerState,
): boolean => {
  if (state?.isTestnet) {
    return state?.hasPlacedFirstOrder?.testnet ?? false;
  }
  return state?.hasPlacedFirstOrder?.mainnet ?? false;
};

/**
 * Select watchlist markets for the current network
 *
 * @param state - PerpsController state
 * @returns Array of watchlist market symbols for current network
 */
export const selectWatchlistMarkets = (
  state: PerpsControllerState,
): string[] => {
  if (state?.isTestnet) {
    return state?.watchlistMarkets?.testnet ?? [];
  }
  return state?.watchlistMarkets?.mainnet ?? [];
};

/**
 * Check if a specific market is in the watchlist on the current network
 *
 * @param state - PerpsController state
 * @param symbol - Market symbol to check (e.g., 'BTC', 'ETH')
 * @returns boolean indicating if market is in watchlist
 */
export const selectIsWatchlistMarket = (
  state: PerpsControllerState,
  symbol: string,
): boolean => {
  const watchlist = selectWatchlistMarkets(state);
  return watchlist.includes(symbol);
};

/**
 * Select trade configuration for a specific market on the current network.
 * Uses memoization to return stable object references and prevent unnecessary re-renders.
 *
 * Usage: selectTradeConfiguration(state, coin)
 */
export const selectTradeConfiguration = createSelector(
  [
    (state: PerpsControllerState): boolean | undefined => state?.isTestnet,
    (
      state: PerpsControllerState,
      _coin: string,
    ): PerpsControllerState['tradeConfigurations'] | undefined =>
      state?.tradeConfigurations,
    (_state: PerpsControllerState, coin: string): string => coin,
  ],
  (isTestnet, configs, coin): { leverage?: number } | undefined => {
    const network = isTestnet ? 'testnet' : 'mainnet';
    const config = configs?.[network]?.[coin];

    if (!config?.leverage) {
      return undefined;
    }

    return { leverage: config.leverage };
  },
);

/**
 * Select pending trade configuration for a specific market on the current network.
 * Returns undefined if config doesn't exist or has expired (more than 5 minutes old).
 *
 * Usage: selectPendingTradeConfiguration(state, coin)
 */
export const selectPendingTradeConfiguration = createSelector(
  [
    (state: PerpsControllerState): boolean | undefined => state?.isTestnet,
    (
      state: PerpsControllerState,
      _coin: string,
    ): PerpsControllerState['tradeConfigurations'] | undefined =>
      state?.tradeConfigurations,
    (_state: PerpsControllerState, coin: string): string => coin,
  ],
  (
    isTestnet,
    configs,
    coin,
  ):
    | {
        amount?: string;
        leverage?: number;
        takeProfitPrice?: string;
        stopLossPrice?: string;
        limitPrice?: string;
        orderType?: 'market' | 'limit';
      }
    | undefined => {
    const network = isTestnet ? 'testnet' : 'mainnet';
    const config = configs?.[network]?.[coin]?.pendingConfig;

    if (!config) {
      return undefined;
    }

    // Check if config has expired (5 minutes = 300,000 milliseconds)
    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    const now = Date.now();
    const age = now - config.timestamp;

    if (age > FIVE_MINUTES_MS) {
      // Config expired, return undefined
      return undefined;
    }

    // Return config without timestamp
    const { timestamp, ...configWithoutTimestamp } = config;
    return configWithoutTimestamp;
  },
);

/**
 * Select market filter preferences (network-independent)
 *
 * @param state - PerpsController state
 * @returns Sort/filter preferences object with optionId and direction
 */
export const selectMarketFilterPreferences = (
  state: PerpsControllerState,
): { optionId: SortOptionId; direction: SortDirection } => {
  const pref = state?.marketFilterPreferences;

  // Handle legacy string format (backward compatibility)
  if (typeof pref === 'string') {
    // Map legacy compound IDs to new format
    // Old format: 'priceChange-desc' or 'priceChange-asc'
    // New format: { optionId: 'priceChange', direction: 'desc'/'asc' }
    if (pref === 'priceChange-desc') {
      return {
        optionId: 'priceChange',
        direction: 'desc',
      };
    }
    if (pref === 'priceChange-asc') {
      return {
        optionId: 'priceChange',
        direction: 'asc',
      };
    }

    // Handle other simple legacy strings (e.g., 'volume', 'openInterest', etc.)
    return {
      optionId: pref as SortOptionId,
      direction: MARKET_SORTING_CONFIG.DefaultDirection,
    };
  }

  // Return new object format or default
  return (
    pref ?? {
      optionId: MARKET_SORTING_CONFIG.DefaultSortOptionId,
      direction: MARKET_SORTING_CONFIG.DefaultDirection,
    }
  );
};

/**
 * Select order book grouping for a specific market on the current network.
 *
 * Usage: selectOrderBookGrouping(state, coin)
 */
export const selectOrderBookGrouping = createSelector(
  [
    (state: PerpsControllerState): boolean | undefined => state?.isTestnet,
    (
      state: PerpsControllerState,
      _coin: string,
    ): PerpsControllerState['tradeConfigurations'] | undefined =>
      state?.tradeConfigurations,
    (_state: PerpsControllerState, coin: string): string => coin,
  ],
  (isTestnet, configs, coin): number | undefined => {
    const network = isTestnet ? 'testnet' : 'mainnet';
    return configs?.[network]?.[coin]?.orderBookGrouping;
  },
);
