import type { GetMarketDataWithPricesParams, MarketTypeFilter, PerpsMarketData } from "../types/index.mjs";
import type { CandleData } from "../types/perps-types.mjs";
export declare function clonePerpsMarketData(markets: PerpsMarketData[]): PerpsMarketData[];
/**
 * Whether a market is a HIP-3 (non-main-DEX) market. A `marketSource` DEX id
 * marks a HIP-3 market even when the `isHip3` flag is unset (e.g. partial route
 * params), so both signals are checked. Used as the single HIP-3 signal so the
 * classifiers stay consistent.
 *
 * @param market - The market data to test.
 * @returns True if the market is HIP-3.
 */
export declare const isHip3Market: (market: Pick<PerpsMarketData, 'isHip3' | 'marketSource'>) => boolean;
/**
 * Returns true when a market matches the given UI filter category.
 *
 * @param market - The market data to test.
 * @param category - The filter category to test against.
 * @returns Whether the market matches the category.
 */
export declare function matchesCategory(market: PerpsMarketData, category: MarketTypeFilter): boolean;
/**
 * Resolve the user-facing category bucket for a market — one of `crypto`,
 * `stock`, `pre-ipo`, `index`, `etf`, `commodity`, `forex`, or `new`. Data-model
 * categories map 1:1. A market with no data-model category is `crypto` when it
 * is main-DEX, or `new` when it is an uncategorized HIP-3 market (`isHip3`, or a
 * `marketSource` DEX id when `isHip3` is unset, e.g. minimal route params).
 * Never returns the `all` sentinel.
 *
 * Centralised as the single source of truth so consumers (e.g. category
 * shortcuts, related markets) share one classification instead of re-deriving
 * it per client and drifting as new categories are added.
 *
 * @param market - The market data to classify.
 * @returns The market type filter bucket.
 */
export declare function getMarketTypeFilter(market: PerpsMarketData): MarketTypeFilter;
/**
 * Applies optional category filtering, sorting, and limit to a list of markets.
 *
 * @param markets - Source market array.
 * @param params - Optional filter/sort/limit params.
 * @returns Filtered, sorted, and/or sliced market array.
 */
export declare function applyMarketFilters(markets: PerpsMarketData[], params?: GetMarketDataWithPricesParams): PerpsMarketData[];
/**
 * Maximum length for market filter patterns (prevents DoS attacks)
 */
export declare const MAX_MARKET_PATTERN_LENGTH = 100;
export type MarketPatternMatcher = RegExp | string;
export type CompiledMarketPattern = {
    pattern: string;
    matcher: MarketPatternMatcher;
};
export declare const escapeRegex: (str: string) => string;
export declare const validateMarketPattern: (pattern: string) => boolean;
export declare const compileMarketPattern: (pattern: string) => MarketPatternMatcher;
export declare const matchesMarketPattern: (symbol: string, matcher: MarketPatternMatcher) => boolean;
export declare const shouldIncludeMarket: (symbol: string, dex: string | null, hip3Enabled: boolean, compiledEnabledPatterns: CompiledMarketPattern[], compiledBlockedPatterns: CompiledMarketPattern[]) => boolean;
export declare const getPerpsDisplaySymbol: (symbol: string) => string;
export declare const getPerpsDexFromSymbol: (symbol: string) => string | null;
type FundingCountdownParams = {
    nextFundingTime?: number;
    fundingIntervalHours?: number;
};
export declare const calculateFundingCountdown: (params?: FundingCountdownParams) => string;
export declare const calculate24hHighLow: (candleData: CandleData | null) => {
    high: number;
    low: number;
};
export declare const filterMarketsByQuery: (markets: PerpsMarketData[], searchQuery: string) => PerpsMarketData[];
export {};
//# sourceMappingURL=marketUtils.d.mts.map