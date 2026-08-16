import { sortMarkets } from "./sortMarkets.mjs";
export function clonePerpsMarketData(markets) {
    return markets.map((market) => ({
        ...market,
        ...(market.keywords && { keywords: [...market.keywords] }),
        ...(market.tags && { tags: [...market.tags] }),
        ...(market.categories && { categories: [...market.categories] }),
        ...(market.trend && {
            trend: market.trend.map(([timestamp, price]) => [
                timestamp,
                price,
            ]),
        }),
    }));
}
// ============================================================================
// Market category classification (pure functions)
// No service dependencies — pure data transformations that can be tested and
// reused independently. `matchesCategory` and `getMarketTypeFilter` share the
// same category model.
// ============================================================================
/**
 * Whether a market is a HIP-3 (non-main-DEX) market. A `marketSource` DEX id
 * marks a HIP-3 market even when the `isHip3` flag is unset (e.g. partial route
 * params), so both signals are checked. Used as the single HIP-3 signal so the
 * classifiers stay consistent.
 *
 * @param market - The market data to test.
 * @returns True if the market is HIP-3.
 */
export const isHip3Market = (market) => Boolean(market.isHip3) || Boolean(market.marketSource);
/**
 * Returns true when a market matches the given UI filter category.
 *
 * @param market - The market data to test.
 * @param category - The filter category to test against.
 * @returns Whether the market matches the category.
 */
export function matchesCategory(market, category) {
    switch (category) {
        case 'all':
            return true;
        case 'new':
            // Explicitly flagged, or an uncategorized HIP-3 market (kept in sync with
            // getMarketTypeFilter's 'new' bucket).
            return (market.isNewMarket === true ||
                (isHip3Market(market) && market.marketType === undefined));
        case 'crypto':
            // Main-DEX markets, plus HIP-3 assets explicitly typed as CryptoCurrency.
            return !isHip3Market(market) || market.marketType === 'crypto';
        default:
            // Every other filter is a 1:1 data-model category match.
            return market.marketType !== undefined && market.marketType === category;
    }
}
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
export function getMarketTypeFilter(market) {
    const { marketType } = market;
    if (marketType) {
        return marketType;
    }
    // No data-model category: an uncategorized HIP-3 market is the 'new' bucket;
    // otherwise it's a main-DEX crypto market.
    return isHip3Market(market) ? 'new' : 'crypto';
}
/**
 * Applies optional category filtering, sorting, and limit to a list of markets.
 *
 * @param markets - Source market array.
 * @param params - Optional filter/sort/limit params.
 * @returns Filtered, sorted, and/or sliced market array.
 */
export function applyMarketFilters(markets, params) {
    let result = markets;
    if (params?.categories?.length) {
        const { categories } = params;
        result = result.filter((market) => 
        // A market is included if it matches ANY of the requested categories.
        categories.some((category) => matchesCategory(market, category)));
    }
    if (params?.excludeSymbols?.length) {
        const excluded = new Set(params.excludeSymbols);
        result = result.filter((market) => !excluded.has(market.symbol));
    }
    if (params?.sortBy) {
        result = sortMarkets({
            markets: result,
            sortBy: params.sortBy,
            direction: params.direction,
        });
    }
    if (params?.limit !== undefined) {
        result = result.slice(0, params.limit);
    }
    return result;
}
/**
 * Maximum length for market filter patterns (prevents DoS attacks)
 */
export const MAX_MARKET_PATTERN_LENGTH = 100;
export const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
export const validateMarketPattern = (pattern) => {
    if (!pattern || pattern.trim().length === 0) {
        throw new Error('Market pattern cannot be empty');
    }
    const normalizedPattern = pattern.trim();
    if (normalizedPattern.length > MAX_MARKET_PATTERN_LENGTH) {
        throw new Error(`Market pattern exceeds maximum length (${MAX_MARKET_PATTERN_LENGTH} chars): ${normalizedPattern}`);
    }
    const dangerousChars = /[\\()[\]{}^$+?.|]/u;
    if (dangerousChars.test(normalizedPattern)) {
        throw new Error(`Market pattern contains invalid regex characters: ${normalizedPattern}`);
    }
    const validPattern = /^[a-zA-Z0-9:_\-*]+$/u;
    if (!validPattern.test(normalizedPattern)) {
        throw new Error(`Market pattern contains invalid characters: ${normalizedPattern}`);
    }
    return true;
};
export const compileMarketPattern = (pattern) => {
    const normalizedPattern = pattern.trim();
    validateMarketPattern(normalizedPattern);
    if (normalizedPattern.endsWith(':*')) {
        const prefix = normalizedPattern.slice(0, -2);
        return new RegExp(`^${escapeRegex(prefix)}:`, 'u');
    }
    if (!normalizedPattern.includes(':')) {
        return new RegExp(`^${escapeRegex(normalizedPattern)}:`, 'u');
    }
    return normalizedPattern;
};
export const matchesMarketPattern = (symbol, matcher) => {
    if (typeof matcher === 'string') {
        return symbol === matcher;
    }
    return matcher.test(symbol);
};
export const shouldIncludeMarket = (symbol, dex, hip3Enabled, compiledEnabledPatterns, compiledBlockedPatterns) => {
    if (dex === null) {
        return true;
    }
    if (!hip3Enabled) {
        return false;
    }
    if (compiledEnabledPatterns.length > 0) {
        const whitelisted = compiledEnabledPatterns.some(({ matcher }) => matchesMarketPattern(symbol, matcher));
        if (!whitelisted) {
            return false;
        }
    }
    if (compiledBlockedPatterns.length === 0) {
        return true;
    }
    const blacklisted = compiledBlockedPatterns.some(({ matcher }) => matchesMarketPattern(symbol, matcher));
    return !blacklisted;
};
export const getPerpsDisplaySymbol = (symbol) => {
    if (!symbol || typeof symbol !== 'string') {
        return symbol;
    }
    const colonIndex = symbol.indexOf(':');
    if (colonIndex > 0 && colonIndex < symbol.length - 1) {
        return symbol.substring(colonIndex + 1);
    }
    return symbol;
};
export const getPerpsDexFromSymbol = (symbol) => {
    if (!symbol || typeof symbol !== 'string') {
        return null;
    }
    const colonIndex = symbol.indexOf(':');
    if (colonIndex > 0 && colonIndex < symbol.length - 1) {
        return symbol.substring(0, colonIndex);
    }
    return null;
};
export const calculateFundingCountdown = (params) => {
    const now = new Date();
    const nowMs = now.getTime();
    if (params?.nextFundingTime && params.nextFundingTime > nowMs) {
        const msUntilFunding = params.nextFundingTime - nowMs;
        const hoursUntilFunding = msUntilFunding / (1000 * 60 * 60);
        if (hoursUntilFunding <= 1.1) {
            const totalSeconds = Math.floor(msUntilFunding / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            const formattedHours = String(hours).padStart(2, '0');
            const formattedMinutes = String(minutes).padStart(2, '0');
            const formattedSeconds = String(seconds).padStart(2, '0');
            return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
        }
    }
    const utcMinutes = now.getUTCMinutes();
    const utcSeconds = now.getUTCSeconds();
    const minutesUntilNextHour = 59 - utcMinutes;
    const secondsUntilNextHour = 60 - utcSeconds;
    const finalSeconds = secondsUntilNextHour === 60 ? 0 : secondsUntilNextHour;
    const finalMinutes = secondsUntilNextHour === 60
        ? minutesUntilNextHour + 1
        : minutesUntilNextHour;
    const finalHours = finalMinutes === 60 ? 1 : 0;
    const adjustedMinutes = finalMinutes === 60 ? 0 : finalMinutes;
    const formattedHours = String(finalHours).padStart(2, '0');
    const formattedMinutes = String(adjustedMinutes).padStart(2, '0');
    const formattedSeconds = String(finalSeconds).padStart(2, '0');
    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
};
export const calculate24hHighLow = (candleData) => {
    if (!candleData?.candles || candleData.candles.length === 0) {
        return { high: 0, low: 0 };
    }
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
    let last24hCandles = candleData.candles.filter((candle) => candle.time >= twentyFourHoursAgo);
    if (last24hCandles.length === 0) {
        last24hCandles = [...candleData.candles];
    }
    const highs = last24hCandles.map((candle) => parseFloat(candle.high));
    const lows = last24hCandles.map((candle) => parseFloat(candle.low));
    return {
        high: Math.max(...highs),
        low: Math.min(...lows),
    };
};
export const filterMarketsByQuery = (markets, searchQuery) => {
    if (!searchQuery?.trim()) {
        return markets;
    }
    const lowerQuery = searchQuery.toLowerCase().trim();
    return markets.filter((market) => market.symbol?.toLowerCase().includes(lowerQuery) ||
        market.name?.toLowerCase().includes(lowerQuery));
};
//# sourceMappingURL=marketUtils.mjs.map