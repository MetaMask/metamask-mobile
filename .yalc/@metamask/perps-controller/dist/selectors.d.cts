import { SortOptionId } from "./constants/perpsConfig.cjs";
import type { PerpsMode, ProLayoutPreferences } from "./constants/perpsConfig.cjs";
import type { PerpsControllerState } from "./PerpsController.cjs";
import type { OrderType, PerpsSelectedPaymentToken, SortDirection } from "./types/index.cjs";
/**
 * Select whether the user is a first-time perps user
 *
 * @param state - PerpsController state
 * @returns true if user is first-time, false otherwise
 */
export declare const selectIsFirstTimeUser: (state: PerpsControllerState | undefined) => boolean;
/**
 * Select whether user has ever placed their first successful order
 *
 * @param state - PerpsController state
 * @returns boolean indicating if first order was placed
 */
export declare const selectHasPlacedFirstOrder: (state: PerpsControllerState) => boolean;
/**
 * Select watchlist markets for the current network
 *
 * @param state - PerpsController state
 * @returns Array of watchlist market symbols for current network
 */
export declare const selectWatchlistMarkets: (state: PerpsControllerState) => string[];
/**
 * Check if a specific market is in the watchlist on the current network
 *
 * @param state - PerpsController state
 * @param symbol - Market symbol to check (e.g., 'BTC', 'ETH')
 * @returns boolean indicating if market is in watchlist
 */
export declare const selectIsWatchlistMarket: (state: PerpsControllerState, symbol: string) => boolean;
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
export declare const selectRecentlyViewedMarkets: (state: PerpsControllerState) => string[];
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
export declare const selectTradeConfiguration: ((state: PerpsControllerState, _coin: string) => {
    leverage?: number | undefined;
} | undefined) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: boolean | undefined, resultFuncArgs_1: {
        testnet: {
            [marketSymbol: string]: {
                leverage?: number | undefined;
                orderBookGrouping?: number | undefined;
                pendingConfig?: {
                    amount?: string | undefined;
                    leverage?: number | undefined;
                    takeProfitPrice?: string | undefined;
                    stopLossPrice?: string | undefined;
                    limitPrice?: string | undefined;
                    orderType?: OrderType | undefined;
                    timestamp: number;
                } | undefined;
            };
        };
        mainnet: {
            [marketSymbol: string]: {
                leverage?: number | undefined;
                orderBookGrouping?: number | undefined;
                pendingConfig?: {
                    amount?: string | undefined;
                    leverage?: number | undefined;
                    takeProfitPrice?: string | undefined;
                    stopLossPrice?: string | undefined;
                    limitPrice?: string | undefined;
                    orderType?: OrderType | undefined;
                    timestamp: number;
                } | undefined;
            };
        };
    } | undefined, resultFuncArgs_2: string) => {
        leverage?: number | undefined;
    } | undefined;
    memoizedResultFunc: ((resultFuncArgs_0: boolean | undefined, resultFuncArgs_1: {
        testnet: {
            [marketSymbol: string]: {
                leverage?: number | undefined;
                orderBookGrouping?: number | undefined;
                pendingConfig?: {
                    amount?: string | undefined;
                    leverage?: number | undefined;
                    takeProfitPrice?: string | undefined;
                    stopLossPrice?: string | undefined;
                    limitPrice?: string | undefined;
                    orderType?: OrderType | undefined;
                    timestamp: number;
                } | undefined;
            };
        };
        mainnet: {
            [marketSymbol: string]: {
                leverage?: number | undefined;
                orderBookGrouping?: number | undefined;
                pendingConfig?: {
                    amount?: string | undefined;
                    leverage?: number | undefined;
                    takeProfitPrice?: string | undefined;
                    stopLossPrice?: string | undefined;
                    limitPrice?: string | undefined;
                    orderType?: OrderType | undefined;
                    timestamp: number;
                } | undefined;
            };
        };
    } | undefined, resultFuncArgs_2: string) => {
        leverage?: number | undefined;
    } | undefined) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => {
        leverage?: number | undefined;
    } | undefined;
    dependencies: [(state: PerpsControllerState) => boolean | undefined, (state: PerpsControllerState, _coin: string) => PerpsControllerState['tradeConfigurations'] | undefined, (_state: PerpsControllerState, coin: string) => string];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    memoize: typeof import("reselect").weakMapMemoize;
    argsMemoize: typeof import("reselect").weakMapMemoize;
};
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
export declare const selectPendingTradeConfiguration: ((state: PerpsControllerState, _coin: string) => {
    amount?: string | undefined;
    leverage?: number | undefined;
    takeProfitPrice?: string | undefined;
    stopLossPrice?: string | undefined;
    limitPrice?: string | undefined;
    orderType?: OrderType | undefined;
    selectedPaymentToken?: PerpsSelectedPaymentToken | null | undefined;
} | undefined) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: boolean | undefined, resultFuncArgs_1: {
        testnet: {
            [marketSymbol: string]: {
                leverage?: number | undefined;
                orderBookGrouping?: number | undefined;
                pendingConfig?: {
                    amount?: string | undefined;
                    leverage?: number | undefined;
                    takeProfitPrice?: string | undefined;
                    stopLossPrice?: string | undefined;
                    limitPrice?: string | undefined;
                    orderType?: OrderType | undefined;
                    timestamp: number;
                } | undefined;
            };
        };
        mainnet: {
            [marketSymbol: string]: {
                leverage?: number | undefined;
                orderBookGrouping?: number | undefined;
                pendingConfig?: {
                    amount?: string | undefined;
                    leverage?: number | undefined;
                    takeProfitPrice?: string | undefined;
                    stopLossPrice?: string | undefined;
                    limitPrice?: string | undefined;
                    orderType?: OrderType | undefined;
                    timestamp: number;
                } | undefined;
            };
        };
    } | undefined, resultFuncArgs_2: string) => {
        amount?: string | undefined;
        leverage?: number | undefined;
        takeProfitPrice?: string | undefined;
        stopLossPrice?: string | undefined;
        limitPrice?: string | undefined;
        orderType?: OrderType | undefined;
        selectedPaymentToken?: PerpsSelectedPaymentToken | null | undefined;
    } | undefined;
    memoizedResultFunc: ((resultFuncArgs_0: boolean | undefined, resultFuncArgs_1: {
        testnet: {
            [marketSymbol: string]: {
                leverage?: number | undefined;
                orderBookGrouping?: number | undefined;
                pendingConfig?: {
                    amount?: string | undefined;
                    leverage?: number | undefined;
                    takeProfitPrice?: string | undefined;
                    stopLossPrice?: string | undefined;
                    limitPrice?: string | undefined;
                    orderType?: OrderType | undefined;
                    timestamp: number;
                } | undefined;
            };
        };
        mainnet: {
            [marketSymbol: string]: {
                leverage?: number | undefined;
                orderBookGrouping?: number | undefined;
                pendingConfig?: {
                    amount?: string | undefined;
                    leverage?: number | undefined;
                    takeProfitPrice?: string | undefined;
                    stopLossPrice?: string | undefined;
                    limitPrice?: string | undefined;
                    orderType?: OrderType | undefined;
                    timestamp: number;
                } | undefined;
            };
        };
    } | undefined, resultFuncArgs_2: string) => {
        amount?: string | undefined;
        leverage?: number | undefined;
        takeProfitPrice?: string | undefined;
        stopLossPrice?: string | undefined;
        limitPrice?: string | undefined;
        orderType?: OrderType | undefined;
        selectedPaymentToken?: PerpsSelectedPaymentToken | null | undefined;
    } | undefined) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => {
        amount?: string | undefined;
        leverage?: number | undefined;
        takeProfitPrice?: string | undefined;
        stopLossPrice?: string | undefined;
        limitPrice?: string | undefined;
        orderType?: OrderType | undefined;
        selectedPaymentToken?: PerpsSelectedPaymentToken | null | undefined;
    } | undefined;
    dependencies: [(state: PerpsControllerState) => boolean | undefined, (state: PerpsControllerState, _coin: string) => PerpsControllerState['tradeConfigurations'] | undefined, (_state: PerpsControllerState, coin: string) => string];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    memoize: typeof import("reselect").weakMapMemoize;
    argsMemoize: typeof import("reselect").weakMapMemoize;
};
/**
 * Select market filter preferences (network-independent)
 *
 * @param state - PerpsController state
 * @returns Sort/filter preferences object with optionId and direction
 */
export declare const selectMarketFilterPreferences: (state: PerpsControllerState) => {
    optionId: SortOptionId;
    direction: SortDirection;
};
/**
 * Select pro-mode layout preferences (network-independent).
 *
 * Merges over defaults so callers always receive a fully-populated object,
 * even when the state slice (or a nested field) is missing.
 *
 * @param state - PerpsController state
 * @returns The pro-mode layout preferences object
 */
export declare const selectProLayoutPreferences: (state: PerpsControllerState) => ProLayoutPreferences;
/**
 * Select the current Perps interface mode (lite/pro).
 *
 * Falls back to the default mode when the state slice is missing.
 *
 * @param state - PerpsController state
 * @returns The current Perps mode
 */
export declare const selectPerpsMode: (state: PerpsControllerState) => PerpsMode;
/**
 * Select order book grouping for a specific market on the current network.
 *
 * Usage: selectOrderBookGrouping(state, coin)
 *
 * @param state - The perps controller state.
 * @param coin - The market coin symbol.
 * @returns The order book grouping value, or undefined.
 */
export declare const selectOrderBookGrouping: ((state: PerpsControllerState, _coin: string) => number | undefined) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: boolean | undefined, resultFuncArgs_1: {
        testnet: {
            [marketSymbol: string]: {
                leverage?: number | undefined;
                orderBookGrouping?: number | undefined;
                pendingConfig?: {
                    amount?: string | undefined;
                    leverage?: number | undefined;
                    takeProfitPrice?: string | undefined;
                    stopLossPrice?: string | undefined;
                    limitPrice?: string | undefined;
                    orderType?: OrderType | undefined;
                    timestamp: number;
                } | undefined;
            };
        };
        mainnet: {
            [marketSymbol: string]: {
                leverage?: number | undefined;
                orderBookGrouping?: number | undefined;
                pendingConfig?: {
                    amount?: string | undefined;
                    leverage?: number | undefined;
                    takeProfitPrice?: string | undefined;
                    stopLossPrice?: string | undefined;
                    limitPrice?: string | undefined;
                    orderType?: OrderType | undefined;
                    timestamp: number;
                } | undefined;
            };
        };
    } | undefined, resultFuncArgs_2: string) => number | undefined;
    memoizedResultFunc: ((resultFuncArgs_0: boolean | undefined, resultFuncArgs_1: {
        testnet: {
            [marketSymbol: string]: {
                leverage?: number | undefined;
                orderBookGrouping?: number | undefined;
                pendingConfig?: {
                    amount?: string | undefined;
                    leverage?: number | undefined;
                    takeProfitPrice?: string | undefined;
                    stopLossPrice?: string | undefined;
                    limitPrice?: string | undefined;
                    orderType?: OrderType | undefined;
                    timestamp: number;
                } | undefined;
            };
        };
        mainnet: {
            [marketSymbol: string]: {
                leverage?: number | undefined;
                orderBookGrouping?: number | undefined;
                pendingConfig?: {
                    amount?: string | undefined;
                    leverage?: number | undefined;
                    takeProfitPrice?: string | undefined;
                    stopLossPrice?: string | undefined;
                    limitPrice?: string | undefined;
                    orderType?: OrderType | undefined;
                    timestamp: number;
                } | undefined;
            };
        };
    } | undefined, resultFuncArgs_2: string) => number | undefined) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => number | undefined;
    dependencies: [(state: PerpsControllerState) => boolean | undefined, (state: PerpsControllerState, _coin: string) => PerpsControllerState['tradeConfigurations'] | undefined, (_state: PerpsControllerState, coin: string) => string];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    memoize: typeof import("reselect").weakMapMemoize;
    argsMemoize: typeof import("reselect").weakMapMemoize;
};
//# sourceMappingURL=selectors.d.cts.map