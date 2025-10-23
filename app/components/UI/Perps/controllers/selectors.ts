import type { PerpsControllerState } from './PerpsController';

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
