"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterMarketsByQuery = exports.calculate24hHighLow = exports.calculateFundingCountdown = exports.getPerpsDexFromSymbol = exports.getPerpsDisplaySymbol = exports.shouldIncludeMarket = exports.matchesMarketPattern = exports.compileMarketPattern = exports.validateMarketPattern = exports.escapeRegex = exports.MAX_MARKET_PATTERN_LENGTH = exports.applyMarketFilters = exports.getMarketTypeFilter = exports.matchesCategory = exports.isHip3Market = exports.clonePerpsMarketData = void 0;
const sortMarkets_js_1 = require("./sortMarkets.cjs");
function clonePerpsMarketData(markets) {
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
exports.clonePerpsMarketData = clonePerpsMarketData;
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
const isHip3Market = (market) => Boolean(market.isHip3) || Boolean(market.marketSource);
exports.isHip3Market = isHip3Market;
/**
 * Returns true when a market matches the given UI filter category.
 *
 * @param market - The market data to test.
 * @param category - The filter category to test against.
 * @returns Whether the market matches the category.
 */
function matchesCategory(market, category) {
    switch (category) {
        case 'all':
            return true;
        case 'new':
            // Explicitly flagged, or an uncategorized HIP-3 market (kept in sync with
            // getMarketTypeFilter's 'new' bucket).
            return (market.isNewMarket === true ||
                ((0, exports.isHip3Market)(market) && market.marketType === undefined));
        case 'crypto':
            // Main-DEX markets, plus HIP-3 assets explicitly typed as CryptoCurrency.
            return !(0, exports.isHip3Market)(market) || market.marketType === 'crypto';
        default:
            // Every other filter is a 1:1 data-model category match.
            return market.marketType !== undefined && market.marketType === category;
    }
}
exports.matchesCategory = matchesCategory;
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
function getMarketTypeFilter(market) {
    const { marketType } = market;
    if (marketType) {
        return marketType;
    }
    // No data-model category: an uncategorized HIP-3 market is the 'new' bucket;
    // otherwise it's a main-DEX crypto market.
    return (0, exports.isHip3Market)(market) ? 'new' : 'crypto';
}
exports.getMarketTypeFilter = getMarketTypeFilter;
/**
 * Applies optional category filtering, sorting, and limit to a list of markets.
 *
 * @param markets - Source market array.
 * @param params - Optional filter/sort/limit params.
 * @returns Filtered, sorted, and/or sliced market array.
 */
function applyMarketFilters(markets, params) {
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
        result = (0, sortMarkets_js_1.sortMarkets)({
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
exports.applyMarketFilters = applyMarketFilters;
/**
 * Maximum length for market filter patterns (prevents DoS attacks)
 */
exports.MAX_MARKET_PATTERN_LENGTH = 100;
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
exports.escapeRegex = escapeRegex;
const validateMarketPattern = (pattern) => {
    if (!pattern || pattern.trim().length === 0) {
        throw new Error('Market pattern cannot be empty');
    }
    const normalizedPattern = pattern.trim();
    if (normalizedPattern.length > exports.MAX_MARKET_PATTERN_LENGTH) {
        throw new Error(`Market pattern exceeds maximum length (${exports.MAX_MARKET_PATTERN_LENGTH} chars): ${normalizedPattern}`);
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
exports.validateMarketPattern = validateMarketPattern;
const compileMarketPattern = (pattern) => {
    const normalizedPattern = pattern.trim();
    (0, exports.validateMarketPattern)(normalizedPattern);
    if (normalizedPattern.endsWith(':*')) {
        const prefix = normalizedPattern.slice(0, -2);
        return new RegExp(`^${(0, exports.escapeRegex)(prefix)}:`, 'u');
    }
    if (!normalizedPattern.includes(':')) {
        return new RegExp(`^${(0, exports.escapeRegex)(normalizedPattern)}:`, 'u');
    }
    return normalizedPattern;
};
exports.compileMarketPattern = compileMarketPattern;
const matchesMarketPattern = (symbol, matcher) => {
    if (typeof matcher === 'string') {
        return symbol === matcher;
    }
    return matcher.test(symbol);
};
exports.matchesMarketPattern = matchesMarketPattern;
const shouldIncludeMarket = (symbol, dex, hip3Enabled, compiledEnabledPatterns, compiledBlockedPatterns) => {
    if (dex === null) {
        return true;
    }
    if (!hip3Enabled) {
        return false;
    }
    if (compiledEnabledPatterns.length > 0) {
        const whitelisted = compiledEnabledPatterns.some(({ matcher }) => (0, exports.matchesMarketPattern)(symbol, matcher));
        if (!whitelisted) {
            return false;
        }
    }
    if (compiledBlockedPatterns.length === 0) {
        return true;
    }
    const blacklisted = compiledBlockedPatterns.some(({ matcher }) => (0, exports.matchesMarketPattern)(symbol, matcher));
    return !blacklisted;
};
exports.shouldIncludeMarket = shouldIncludeMarket;
const getPerpsDisplaySymbol = (symbol) => {
    if (!symbol || typeof symbol !== 'string') {
        return symbol;
    }
    const colonIndex = symbol.indexOf(':');
    if (colonIndex > 0 && colonIndex < symbol.length - 1) {
        return symbol.substring(colonIndex + 1);
    }
    return symbol;
};
exports.getPerpsDisplaySymbol = getPerpsDisplaySymbol;
const getPerpsDexFromSymbol = (symbol) => {
    if (!symbol || typeof symbol !== 'string') {
        return null;
    }
    const colonIndex = symbol.indexOf(':');
    if (colonIndex > 0 && colonIndex < symbol.length - 1) {
        return symbol.substring(0, colonIndex);
    }
    return null;
};
exports.getPerpsDexFromSymbol = getPerpsDexFromSymbol;
const calculateFundingCountdown = (params) => {
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
exports.calculateFundingCountdown = calculateFundingCountdown;
const calculate24hHighLow = (candleData) => {
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
exports.calculate24hHighLow = calculate24hHighLow;
const filterMarketsByQuery = (markets, searchQuery) => {
    if (!searchQuery?.trim()) {
        return markets;
    }
    const lowerQuery = searchQuery.toLowerCase().trim();
    return markets.filter((market) => market.symbol?.toLowerCase().includes(lowerQuery) ||
        market.name?.toLowerCase().includes(lowerQuery));
};
exports.filterMarketsByQuery = filterMarketsByQuery;
//# sourceMappingURL=marketUtils.cjs.map