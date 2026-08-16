"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectOrderBookGrouping = exports.selectPerpsMode = exports.selectProLayoutPreferences = exports.selectMarketFilterPreferences = exports.selectPendingTradeConfiguration = exports.selectTradeConfiguration = exports.selectRecentlyViewedMarkets = exports.selectIsWatchlistMarket = exports.selectWatchlistMarkets = exports.selectHasPlacedFirstOrder = exports.selectIsFirstTimeUser = void 0;
const reselect_1 = require("reselect");
const perpsConfig_js_1 = require("./constants/perpsConfig.cjs");
/**
 * Select whether the user is a first-time perps user
 *
 * @param state - PerpsController state
 * @returns true if user is first-time, false otherwise
 */
const selectIsFirstTimeUser = (state) => {
    if (state?.isTestnet) {
        return state?.isFirstTimeUser?.testnet ?? true;
    }
    return state?.isFirstTimeUser?.mainnet ?? true;
};
exports.selectIsFirstTimeUser = selectIsFirstTimeUser;
/**
 * Select whether user has ever placed their first successful order
 *
 * @param state - PerpsController state
 * @returns boolean indicating if first order was placed
 */
const selectHasPlacedFirstOrder = (state) => {
    if (state?.isTestnet) {
        return state?.hasPlacedFirstOrder?.testnet ?? false;
    }
    return state?.hasPlacedFirstOrder?.mainnet ?? false;
};
exports.selectHasPlacedFirstOrder = selectHasPlacedFirstOrder;
/**
 * Select watchlist markets for the current network
 *
 * @param state - PerpsController state
 * @returns Array of watchlist market symbols for current network
 */
const selectWatchlistMarkets = (state) => {
    if (state?.isTestnet) {
        return state?.watchlistMarkets?.testnet ?? [];
    }
    return state?.watchlistMarkets?.mainnet ?? [];
};
exports.selectWatchlistMarkets = selectWatchlistMarkets;
/**
 * Check if a specific market is in the watchlist on the current network
 *
 * @param state - PerpsController state
 * @param symbol - Market symbol to check (e.g., 'BTC', 'ETH')
 * @returns boolean indicating if market is in watchlist
 */
const selectIsWatchlistMarket = (state, symbol) => {
    const watchlist = (0, exports.selectWatchlistMarkets)(state);
    return watchlist.includes(symbol);
};
exports.selectIsWatchlistMarket = selectIsWatchlistMarket;
/**
 * Select recently viewed markets for the current network.
 *
 * Returns up to PERPS_CONSTANTS.RecentlyViewedMarketsLimit symbols, ordered
 * newest-first, filtered to entries within PERPS_CONSTANTS.RecentlyViewedMarketsTtlMs
 * (24 hours). Returns an empty array when no qualifying entries exist.
 *
 * @param state - PerpsController state
 * @returns Ordered array of recently viewed market symbols
 */
const selectRecentlyViewedMarkets = (state) => {
    const network = state?.isTestnet ? 'testnet' : 'mainnet';
    const entries = state?.recentlyViewedMarkets?.[network] ?? [];
    const cutoff = Date.now() - perpsConfig_js_1.PERPS_CONSTANTS.RecentlyViewedMarketsTtlMs;
    return entries
        .filter((entry) => entry.viewedAt > cutoff)
        .map((entry) => entry.symbol)
        .slice(0, perpsConfig_js_1.PERPS_CONSTANTS.RecentlyViewedMarketsLimit);
};
exports.selectRecentlyViewedMarkets = selectRecentlyViewedMarkets;
/**
 * Select trade configuration for a specific market on the current network.
 * Uses memoization to return stable object references and prevent unnecessary re-renders.
 *
 * Usage: selectTradeConfiguration(state, coin)
 *
 * @param state - The perps controller state.
 * @param coin - The market coin symbol.
 * @returns The trade configuration for the specified market, or undefined.
 */
exports.selectTradeConfiguration = (0, reselect_1.createSelector)([
    (state) => state?.isTestnet,
    (state, _coin) => state?.tradeConfigurations,
    (_state, coin) => coin,
], (isTestnet, configs, coin) => {
    const network = isTestnet ? 'testnet' : 'mainnet';
    const config = configs?.[network]?.[coin];
    if (!config?.leverage) {
        return undefined;
    }
    return { leverage: config.leverage };
});
/**
 * Select pending trade configuration for a specific market on the current network.
 * Returns undefined if config doesn't exist or has expired (more than 5 minutes old).
 *
 * Usage: selectPendingTradeConfiguration(state, coin)
 *
 * @param state - The perps controller state.
 * @param coin - The market coin symbol.
 * @returns The pending trade configuration, or undefined if expired or not found.
 */
exports.selectPendingTradeConfiguration = (0, reselect_1.createSelector)([
    (state) => state?.isTestnet,
    (state, _coin) => state?.tradeConfigurations,
    (_state, coin) => coin,
], (isTestnet, configs, coin) => {
    const network = isTestnet ? 'testnet' : 'mainnet';
    const config = configs?.[network]?.[coin]?.pendingConfig;
    if (!config) {
        return undefined;
    }
    // Check if config has expired (5 minutes = 300,000 milliseconds)
    const now = Date.now();
    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    const age = now - config.timestamp;
    if (age > FIVE_MINUTES_MS) {
        // Config expired, return undefined
        return undefined;
    }
    // Return config without timestamp
    const { timestamp, ...configWithoutTimestamp } = config;
    return configWithoutTimestamp;
});
/**
 * Select market filter preferences (network-independent)
 *
 * @param state - PerpsController state
 * @returns Sort/filter preferences object with optionId and direction
 */
const selectMarketFilterPreferences = (state) => {
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
            optionId: pref,
            direction: perpsConfig_js_1.MARKET_SORTING_CONFIG.DefaultDirection,
        };
    }
    // Return new object format or default
    return (pref ?? {
        optionId: perpsConfig_js_1.MARKET_SORTING_CONFIG.DefaultSortOptionId,
        direction: perpsConfig_js_1.MARKET_SORTING_CONFIG.DefaultDirection,
    });
};
exports.selectMarketFilterPreferences = selectMarketFilterPreferences;
/**
 * Select pro-mode layout preferences (network-independent).
 *
 * Merges over defaults so callers always receive a fully-populated object,
 * even when the state slice (or a nested field) is missing.
 *
 * @param state - PerpsController state
 * @returns The pro-mode layout preferences object
 */
const selectProLayoutPreferences = (state) => ({
    ...perpsConfig_js_1.DEFAULT_PRO_LAYOUT_PREFERENCES,
    ...state?.proLayoutPreferences,
});
exports.selectProLayoutPreferences = selectProLayoutPreferences;
/**
 * Select the current Perps interface mode (lite/pro).
 *
 * Falls back to the default mode when the state slice is missing.
 *
 * @param state - PerpsController state
 * @returns The current Perps mode
 */
const selectPerpsMode = (state) => state?.mode ?? perpsConfig_js_1.DEFAULT_PERPS_MODE;
exports.selectPerpsMode = selectPerpsMode;
/**
 * Select order book grouping for a specific market on the current network.
 *
 * Usage: selectOrderBookGrouping(state, coin)
 *
 * @param state - The perps controller state.
 * @param coin - The market coin symbol.
 * @returns The order book grouping value, or undefined.
 */
exports.selectOrderBookGrouping = (0, reselect_1.createSelector)([
    (state) => state?.isTestnet,
    (state, _coin) => state?.tradeConfigurations,
    (_state, coin) => coin,
], (isTestnet, configs, coin) => {
    const network = isTestnet ? 'testnet' : 'mainnet';
    return configs?.[network]?.[coin]?.orderBookGrouping;
});
//# sourceMappingURL=selectors.cjs.map