import { createSelector } from 'reselect';
import type { PerpsControllerState } from './PerpsController';
import {
  MARKET_SORTING_CONFIG,
  type SortOptionId,
} from '../constants/perpsConfig';

/**
 * Select whether the user is a first-time perps user
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
 * Select trade configuration for a specific market on the current network
 * Uses memoization to return stable object references and prevent unnecessary re-renders
 * @param state - PerpsController state
 * @param coin - Market symbol (e.g., 'BTC', 'ETH')
 * @returns Trade configuration object with leverage, or undefined
 */
export const selectTradeConfiguration = createSelector(
  [
    (state: PerpsControllerState) => state?.isTestnet,
    (state: PerpsControllerState, _coin: string) => state?.tradeConfigurations,
    (_state: PerpsControllerState, coin: string) => coin,
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
 * Select market filter preferences (network-independent)
 * @param state - PerpsController state
 * @returns Sort/filter option ID
 */
export const selectMarketFilterPreferences = (
  state: PerpsControllerState,
): SortOptionId =>
  state?.marketFilterPreferences ??
  MARKET_SORTING_CONFIG.DEFAULT_SORT_OPTION_ID;
