var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _TerminalMarketService_instances, _TerminalMarketService_deps, _TerminalMarketService_cache, _TerminalMarketService_globalSnapshotCache, _TerminalMarketService_globalSnapshotInFlight, _TerminalMarketService_globalSnapshotGeneration, _TerminalMarketService_fetchAndValidateGlobalSnapshot, _TerminalMarketService_validateAndMapGlobalSnapshot, _TerminalMarketService_validateRequestedIdentity, _TerminalMarketService_buildGlobalSnapshotUrl, _TerminalMarketService_normalizeDexes, _TerminalMarketService_createFingerprint, _TerminalMarketService_validateSnapshotMarket, _TerminalMarketService_mapSnapshotMarket, _TerminalMarketService_marketTypeFor, _TerminalMarketService_cloneGlobalSnapshotResult, _TerminalMarketService_isNonNegativeSafeInteger, _TerminalMarketService_isPositiveSafeInteger, _TerminalMarketService_validateItems, _TerminalMarketService_mapToMarketInfo, _TerminalMarketService_extractMetadata;
import { array, boolean, is, nullable, number, object, optional, string, tuple, type, union } from "@metamask/superstruct";
import { bytesToHex, sha256, stringToBytes } from "@metamask/utils";
import { canonicalizeHyperLiquidDexes } from "../constants/hyperLiquidConfig.mjs";
import { PERPS_CONSTANTS, TERMINAL_API_CONFIG } from "../constants/perpsConfig.mjs";
import { MarketCategory } from "../types/index.mjs";
import { ensureError } from "../utils/errorUtils.mjs";
import { formatChange } from "../utils/marketDataTransform.mjs";
import { clonePerpsMarketData } from "../utils/marketUtils.mjs";
const VALID_MARKET_TYPES = new Set(Object.values(MarketCategory));
const GLOBAL_SNAPSHOT_SCHEMA_VERSION = 2;
const GLOBAL_SNAPSHOT_CONSUMER_MAX_AGE_MS = 30000;
const GLOBAL_SNAPSHOT_MAX_PAYLOAD_BYTES = 1048576;
const GLOBAL_SNAPSHOT_PERCENT_TOLERANCE = 0.01;
const GLOBAL_SNAPSHOT_MAX_FUTURE_CLOCK_SKEW_MS = 5000;
const MINIMUM_EPOCH_MILLISECONDS = Date.UTC(2000, 0, 1);
const DECIMAL_PATTERN = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/u;
const NON_NEGATIVE_DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/u;
const DEX_PATTERN = /^(?:main|[a-z0-9][a-z0-9-]*)$/u;
const GlobalSnapshotMarketStruct = object({
    symbol: string(),
    provider: string(),
    dex: string(),
    name: nullable(string()),
    description: nullable(string()),
    iconUrl: nullable(string()),
    szDecimals: number(),
    maxLeverage: number(),
    markPrice: string(),
    price: string(),
    midPrice: nullable(string()),
    oraclePrice: string(),
    change24h: string(),
    changePercent24h: number(),
    funding: string(),
    volume24h: string(),
    openInterest: string(),
    category: nullable(string()),
    keywords: nullable(array(string())),
    tags: nullable(array(string())),
    listedAt: nullable(number()),
    trend: array(tuple([number(), string()])),
});
const GlobalSnapshotStruct = object({
    schemaVersion: number(),
    provider: string(),
    network: string(),
    enabledDexes: array(string()),
    fingerprint: string(),
    generatedAt: number(),
    receivedAt: number(),
    maxAgeMs: number(),
    complete: boolean(),
    perDexErrors: array(object({
        dex: string(),
        error: string(),
    })),
    markets: array(GlobalSnapshotMarketStruct),
});
/**
 * Runtime validation schema for a single market item returned by
 * `GET {terminalApi.marketDataUrl}`.
 *
 * Uses `type()` (loose object matching) so that extra fields the API sends
 * (e.g. `price`, `iconUrl`, `trend`) are silently accepted.
 * Each item is individually validated; items that fail validation are
 * filtered out and logged rather than rejecting the entire response.
 */
const TerminalPerpetualItemStruct = type({
    symbol: string(),
    name: optional(nullable(string())),
    description: optional(nullable(string())),
    szDecimals: optional(number()),
    maxLeverage: optional(number()),
    marginTableId: optional(number()),
    onlyIsolated: optional(boolean()),
    isDelisted: optional(boolean()),
    minimumOrderSize: optional(number()),
    keywords: optional(nullable(array(string()))),
    tags: optional(nullable(array(string()))),
    categories: optional(nullable(array(string()))),
    marketType: optional(nullable(string())),
    listedAt: optional(nullable(union([number(), string()]))),
});
/**
 * TerminalMarketService
 *
 * Fetches structured market metadata from the MetaMask Terminal API.
 * Caches responses for {@link TERMINAL_API_CONFIG.CacheTtlMs} to avoid
 * redundant network calls across polling cycles.
 *
 * Instance-based service with constructor injection of platform dependencies.
 */
export class TerminalMarketService {
    constructor(deps) {
        _TerminalMarketService_instances.add(this);
        _TerminalMarketService_deps.set(this, void 0);
        _TerminalMarketService_cache.set(this, null);
        _TerminalMarketService_globalSnapshotCache.set(this, new Map());
        _TerminalMarketService_globalSnapshotInFlight.set(this, new Map());
        _TerminalMarketService_globalSnapshotGeneration.set(this, 0);
        __classPrivateFieldSet(this, _TerminalMarketService_deps, deps, "f");
    }
    /**
     * Fetch markets from the Terminal API.
     * Returns cached data when available and within TTL.
     *
     * @returns Object with mapped MarketInfo array and per-symbol metadata.
     */
    async fetchMarkets() {
        if (__classPrivateFieldGet(this, _TerminalMarketService_cache, "f") &&
            Date.now() - __classPrivateFieldGet(this, _TerminalMarketService_cache, "f").timestamp < TERMINAL_API_CONFIG.CacheTtlMs) {
            return {
                markets: __classPrivateFieldGet(this, _TerminalMarketService_cache, "f").markets,
                metadata: __classPrivateFieldGet(this, _TerminalMarketService_cache, "f").metadata,
            };
        }
        const marketDataUrl = __classPrivateFieldGet(this, _TerminalMarketService_deps, "f").terminalApi?.marketDataUrl ?? __classPrivateFieldGet(this, _TerminalMarketService_deps, "f").terminalApiUrl;
        if (!marketDataUrl) {
            throw new Error('Terminal API market-data URL not configured');
        }
        const url = marketDataUrl;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(new Error('Terminal API fetch timed out')), TERMINAL_API_CONFIG.FetchTimeoutMs);
        let response;
        try {
            response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
            });
        }
        finally {
            clearTimeout(timeoutId);
        }
        if (!response.ok) {
            throw new Error(`Terminal API returned ${String(response.status)}: ${response.statusText}`);
        }
        const body = await response.json();
        if (!Array.isArray(body)) {
            throw new Error(`Terminal API returned non-array body: ${typeof body}`);
        }
        const items = __classPrivateFieldGet(this, _TerminalMarketService_instances, "m", _TerminalMarketService_validateItems).call(this, body);
        const markets = __classPrivateFieldGet(this, _TerminalMarketService_instances, "m", _TerminalMarketService_mapToMarketInfo).call(this, items);
        const metadata = __classPrivateFieldGet(this, _TerminalMarketService_instances, "m", _TerminalMarketService_extractMetadata).call(this, items);
        __classPrivateFieldSet(this, _TerminalMarketService_cache, { markets, metadata, timestamp: Date.now() }, "f");
        return { markets, metadata };
    }
    /**
     * Fetch, authenticate by exact identity, and map a schema-v2 atomic market
     * snapshot. Accepted entries remain inside the source freshness window;
     * rejected responses are never cached.
     *
     * @param request - Exact provider/network/DEX identity expected by the client.
     * @returns UI-ready market data and its source-bounded expiry.
     */
    async fetchGlobalSnapshot(request) {
        const identity = __classPrivateFieldGet(this, _TerminalMarketService_instances, "m", _TerminalMarketService_validateRequestedIdentity).call(this, request);
        if (!__classPrivateFieldGet(this, _TerminalMarketService_deps, "f").terminalApi?.globalSnapshotUrl) {
            throw new Error('Terminal global snapshot URL not configured');
        }
        const url = __classPrivateFieldGet(this, _TerminalMarketService_instances, "m", _TerminalMarketService_buildGlobalSnapshotUrl).call(this, __classPrivateFieldGet(this, _TerminalMarketService_deps, "f").terminalApi.globalSnapshotUrl, identity);
        const cacheKey = [
            url,
            String(GLOBAL_SNAPSHOT_SCHEMA_VERSION),
            identity.provider,
            identity.network,
            identity.enabledDexes.join(','),
        ].join('|');
        const now = Date.now();
        const cached = __classPrivateFieldGet(this, _TerminalMarketService_globalSnapshotCache, "f").get(cacheKey);
        if (cached && now < cached.expiresAt) {
            return __classPrivateFieldGet(this, _TerminalMarketService_instances, "m", _TerminalMarketService_cloneGlobalSnapshotResult).call(this, cached);
        }
        if (cached) {
            __classPrivateFieldGet(this, _TerminalMarketService_globalSnapshotCache, "f").delete(cacheKey);
        }
        const existing = __classPrivateFieldGet(this, _TerminalMarketService_globalSnapshotInFlight, "f").get(cacheKey);
        if (existing) {
            return __classPrivateFieldGet(this, _TerminalMarketService_instances, "m", _TerminalMarketService_cloneGlobalSnapshotResult).call(this, await existing);
        }
        const generation = __classPrivateFieldGet(this, _TerminalMarketService_globalSnapshotGeneration, "f");
        const pending = __classPrivateFieldGet(this, _TerminalMarketService_instances, "m", _TerminalMarketService_fetchAndValidateGlobalSnapshot).call(this, identity, url).then((result) => {
            if (__classPrivateFieldGet(this, _TerminalMarketService_globalSnapshotGeneration, "f") !== generation) {
                return result;
            }
            __classPrivateFieldGet(this, _TerminalMarketService_globalSnapshotCache, "f").set(cacheKey, result);
            return result;
        });
        __classPrivateFieldGet(this, _TerminalMarketService_globalSnapshotInFlight, "f").set(cacheKey, pending);
        try {
            return __classPrivateFieldGet(this, _TerminalMarketService_instances, "m", _TerminalMarketService_cloneGlobalSnapshotResult).call(this, await pending);
        }
        finally {
            if (__classPrivateFieldGet(this, _TerminalMarketService_globalSnapshotInFlight, "f").get(cacheKey) === pending) {
                __classPrivateFieldGet(this, _TerminalMarketService_globalSnapshotInFlight, "f").delete(cacheKey);
            }
        }
    }
    /**
     * Invalidate the internal cache so the next fetch hits the network.
     */
    clearCache() {
        __classPrivateFieldSet(this, _TerminalMarketService_cache, null, "f");
        __classPrivateFieldSet(this, _TerminalMarketService_globalSnapshotGeneration, __classPrivateFieldGet(this, _TerminalMarketService_globalSnapshotGeneration, "f") + 1, "f");
        __classPrivateFieldGet(this, _TerminalMarketService_globalSnapshotCache, "f").clear();
        __classPrivateFieldGet(this, _TerminalMarketService_globalSnapshotInFlight, "f").clear();
    }
    /**
     * Log a Terminal API error to Sentry without surfacing it to the user.
     *
     * @param error - The caught error.
     * @param method - The calling method name for context.
     */
    logError(error, method) {
        __classPrivateFieldGet(this, _TerminalMarketService_deps, "f").logger.error(ensureError(error, `TerminalMarketService.${method}`), {
            tags: { feature: PERPS_CONSTANTS.FeatureName, source: 'terminal-api' },
            context: {
                name: `TerminalMarketService.${method}`,
                data: {
                    url: method.includes('globalSnapshot')
                        ? __classPrivateFieldGet(this, _TerminalMarketService_deps, "f").terminalApi?.globalSnapshotUrl
                        : (__classPrivateFieldGet(this, _TerminalMarketService_deps, "f").terminalApi?.marketDataUrl ??
                            __classPrivateFieldGet(this, _TerminalMarketService_deps, "f").terminalApiUrl),
                },
            },
        });
    }
}
_TerminalMarketService_deps = new WeakMap(), _TerminalMarketService_cache = new WeakMap(), _TerminalMarketService_globalSnapshotCache = new WeakMap(), _TerminalMarketService_globalSnapshotInFlight = new WeakMap(), _TerminalMarketService_globalSnapshotGeneration = new WeakMap(), _TerminalMarketService_instances = new WeakSet(), _TerminalMarketService_fetchAndValidateGlobalSnapshot = async function _TerminalMarketService_fetchAndValidateGlobalSnapshot(identity, url) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(new Error('Terminal global snapshot timed out')), TERMINAL_API_CONFIG.FetchTimeoutMs);
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
        });
        if (!response.ok) {
            throw new Error(`Terminal global snapshot returned ${String(response.status)}: ${response.statusText}`);
        }
        const declaredLength = response.headers?.get('content-length');
        if (declaredLength !== null &&
            declaredLength !== undefined &&
            /^\d+$/u.test(declaredLength) &&
            Number(declaredLength) > GLOBAL_SNAPSHOT_MAX_PAYLOAD_BYTES) {
            throw new Error('Terminal global snapshot payload exceeds 1 MiB');
        }
        // React Native fetch does not consistently expose a streaming reader.
        // Reject declared oversize bodies before allocation, then enforce the same
        // byte cap after text() for servers that omit Content-Length.
        const text = await response.text();
        if (stringToBytes(text).byteLength > GLOBAL_SNAPSHOT_MAX_PAYLOAD_BYTES) {
            throw new Error('Terminal global snapshot payload exceeds 1 MiB');
        }
        let body;
        try {
            body = JSON.parse(text);
        }
        catch {
            throw new Error('Terminal global snapshot returned invalid JSON');
        }
        if (!is(body, GlobalSnapshotStruct)) {
            throw new Error('Terminal global snapshot failed schema validation');
        }
        return __classPrivateFieldGet(this, _TerminalMarketService_instances, "m", _TerminalMarketService_validateAndMapGlobalSnapshot).call(this, body, identity, Date.now());
    }
    finally {
        clearTimeout(timeoutId);
    }
}, _TerminalMarketService_validateAndMapGlobalSnapshot = async function _TerminalMarketService_validateAndMapGlobalSnapshot(snapshot, identity, now) {
    if (snapshot.schemaVersion !== GLOBAL_SNAPSHOT_SCHEMA_VERSION) {
        throw new Error('Terminal global snapshot schema version mismatch');
    }
    if (snapshot.provider !== identity.provider ||
        snapshot.network !== identity.network) {
        throw new Error('Terminal global snapshot identity mismatch');
    }
    const responseDexes = __classPrivateFieldGet(this, _TerminalMarketService_instances, "m", _TerminalMarketService_normalizeDexes).call(this, snapshot.enabledDexes);
    if (responseDexes.length !== identity.enabledDexes.length ||
        responseDexes.some((dex, index) => dex !== identity.enabledDexes[index])) {
        throw new Error('Terminal global snapshot DEX mismatch');
    }
    const expectedFingerprint = await __classPrivateFieldGet(this, _TerminalMarketService_instances, "m", _TerminalMarketService_createFingerprint).call(this, identity);
    if (snapshot.fingerprint !== expectedFingerprint) {
        throw new Error('Terminal global snapshot fingerprint mismatch');
    }
    if (!snapshot.complete || snapshot.perDexErrors.length > 0) {
        throw new Error('Terminal global snapshot is incomplete');
    }
    if (!__classPrivateFieldGet(this, _TerminalMarketService_instances, "m", _TerminalMarketService_isNonNegativeSafeInteger).call(this, snapshot.generatedAt) ||
        !__classPrivateFieldGet(this, _TerminalMarketService_instances, "m", _TerminalMarketService_isNonNegativeSafeInteger).call(this, snapshot.receivedAt) ||
        !__classPrivateFieldGet(this, _TerminalMarketService_instances, "m", _TerminalMarketService_isPositiveSafeInteger).call(this, snapshot.maxAgeMs) ||
        snapshot.receivedAt > snapshot.generatedAt ||
        snapshot.generatedAt > now + GLOBAL_SNAPSHOT_MAX_FUTURE_CLOCK_SKEW_MS ||
        snapshot.receivedAt > now + GLOBAL_SNAPSHOT_MAX_FUTURE_CLOCK_SKEW_MS) {
        throw new Error('Terminal global snapshot has invalid timestamps');
    }
    const trustedMaxAgeMs = Math.min(snapshot.maxAgeMs, GLOBAL_SNAPSHOT_CONSUMER_MAX_AGE_MS);
    const expiresAt = snapshot.receivedAt + trustedMaxAgeMs;
    if (now >= expiresAt) {
        throw new Error('Terminal global snapshot is stale');
    }
    if (snapshot.markets.length === 0) {
        throw new Error('Terminal global snapshot has no markets');
    }
    const marketKeys = new Set();
    const representedDexes = new Set();
    const markets = snapshot.markets
        .map((market, index) => {
        __classPrivateFieldGet(this, _TerminalMarketService_instances, "m", _TerminalMarketService_validateSnapshotMarket).call(this, market, identity, index, snapshot.generatedAt);
        const key = `${market.dex}:${market.symbol}`;
        if (marketKeys.has(key)) {
            throw new Error(`Terminal global snapshot duplicates market ${key}`);
        }
        marketKeys.add(key);
        representedDexes.add(market.dex);
        return market;
    })
        .map((market) => __classPrivateFieldGet(this, _TerminalMarketService_instances, "m", _TerminalMarketService_mapSnapshotMarket).call(this, market, expiresAt));
    if (identity.enabledDexes.some((dex) => !representedDexes.has(dex))) {
        throw new Error('Terminal global snapshot is missing a requested DEX');
    }
    if (markets.length === 0) {
        throw new Error('Terminal global snapshot has no tradable markets');
    }
    return { markets, expiresAt };
}, _TerminalMarketService_validateRequestedIdentity = function _TerminalMarketService_validateRequestedIdentity(request) {
    if (request.provider !== 'hyperliquid') {
        throw new Error('Terminal global snapshot provider is unsupported');
    }
    if (request.network !== 'mainnet' && request.network !== 'testnet') {
        throw new Error('Terminal global snapshot network is unsupported');
    }
    return {
        provider: request.provider,
        network: request.network,
        enabledDexes: __classPrivateFieldGet(this, _TerminalMarketService_instances, "m", _TerminalMarketService_normalizeDexes).call(this, request.enabledDexes),
    };
}, _TerminalMarketService_buildGlobalSnapshotUrl = function _TerminalMarketService_buildGlobalSnapshotUrl(baseUrl, identity) {
    const query = new URLSearchParams({
        provider: identity.provider,
        network: identity.network,
        dexes: identity.enabledDexes.join(','),
    });
    return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${query.toString()}`;
}, _TerminalMarketService_normalizeDexes = function _TerminalMarketService_normalizeDexes(dexes) {
    if (!Array.isArray(dexes) || dexes.length === 0) {
        throw new Error('Terminal global snapshot requires at least one DEX');
    }
    const normalized = dexes.map((dex) => {
        if (typeof dex !== 'string' || !DEX_PATTERN.test(dex)) {
            throw new Error('Terminal global snapshot contains an invalid DEX');
        }
        return dex;
    });
    if (new Set(normalized).size !== normalized.length) {
        throw new Error('Terminal global snapshot contains duplicate DEXes');
    }
    if (!normalized.includes('main')) {
        throw new Error('Terminal global snapshot requires the main DEX');
    }
    return canonicalizeHyperLiquidDexes(normalized);
}, _TerminalMarketService_createFingerprint = async function _TerminalMarketService_createFingerprint(identity) {
    const canonicalIdentity = JSON.stringify({
        provider: identity.provider,
        network: identity.network,
        enabledDexes: identity.enabledDexes,
    });
    const digest = await sha256(stringToBytes(canonicalIdentity));
    return `sha256:${bytesToHex(digest).slice(2)}`;
}, _TerminalMarketService_validateSnapshotMarket = function _TerminalMarketService_validateSnapshotMarket(market, identity, index, generatedAt) {
    const invalid = (field) => new Error(`Terminal global snapshot market ${String(index)} has invalid ${field}`);
    if (!identity.enabledDexes.includes(market.dex)) {
        throw invalid('dex');
    }
    const expectedProvider = market.dex === 'main' ? 'hyperliquid' : market.dex;
    if (market.provider !== expectedProvider) {
        throw invalid('provider');
    }
    const expectedPrefix = market.dex === 'main' ? '' : `${market.dex}:`;
    if (market.symbol.length === 0 ||
        (expectedPrefix
            ? !market.symbol.startsWith(expectedPrefix)
            : market.symbol.includes(':'))) {
        throw invalid('symbol');
    }
    if (!__classPrivateFieldGet(this, _TerminalMarketService_instances, "m", _TerminalMarketService_isNonNegativeSafeInteger).call(this, market.szDecimals) ||
        !__classPrivateFieldGet(this, _TerminalMarketService_instances, "m", _TerminalMarketService_isPositiveSafeInteger).call(this, market.maxLeverage) ||
        (market.listedAt !== null &&
            (!__classPrivateFieldGet(this, _TerminalMarketService_instances, "m", _TerminalMarketService_isNonNegativeSafeInteger).call(this, market.listedAt) ||
                market.listedAt < MINIMUM_EPOCH_MILLISECONDS ||
                market.listedAt > generatedAt))) {
        throw invalid('integer field');
    }
    const decimalFields = [
        ['markPrice', market.markPrice, true],
        ['price', market.price, true],
        ['oraclePrice', market.oraclePrice, true],
        ['change24h', market.change24h, false],
        ['volume24h', market.volume24h, true],
        ['openInterest', market.openInterest, true],
        ['funding', market.funding, false],
    ];
    if (market.midPrice !== null) {
        decimalFields.push(['midPrice', market.midPrice, true]);
    }
    for (const [field, value, nonNegative] of decimalFields) {
        const pattern = nonNegative
            ? NON_NEGATIVE_DECIMAL_PATTERN
            : DECIMAL_PATTERN;
        if (!pattern.test(value) || !Number.isFinite(Number(value))) {
            throw invalid(field);
        }
    }
    if (market.price !== market.markPrice) {
        throw invalid('deprecated price alias');
    }
    if (Number(market.oraclePrice) <= 0 ||
        (market.midPrice !== null && Number(market.midPrice) <= 0)) {
        throw invalid('reference price');
    }
    const price = Number(market.markPrice);
    const change24h = Number(market.change24h);
    const previousPrice = price - change24h;
    if (price <= 0 || previousPrice <= 0 || !Number.isFinite(previousPrice)) {
        throw invalid('mark/change coherence');
    }
    const derivedPercent = (change24h / previousPrice) * 100;
    if (!Number.isFinite(derivedPercent) ||
        !Number.isFinite(market.changePercent24h) ||
        Math.abs(market.changePercent24h - derivedPercent) >
            GLOBAL_SNAPSHOT_PERCENT_TOLERANCE) {
        throw invalid('changePercent24h coherence');
    }
    for (const [field, values] of [
        ['keywords', market.keywords],
        ['tags', market.tags],
    ]) {
        if (values !== null &&
            (values.some((value) => value.length === 0) ||
                new Set(values).size !== values.length)) {
            throw invalid(field);
        }
    }
    for (const [field, value] of [
        ['name', market.name],
        ['description', market.description],
        ['iconUrl', market.iconUrl],
        ['category', market.category],
    ]) {
        if (value !== null && value.length === 0) {
            throw invalid(field);
        }
    }
    let previousTrendTimestamp = -1;
    for (const [timestamp, trendPrice] of market.trend) {
        if (!__classPrivateFieldGet(this, _TerminalMarketService_instances, "m", _TerminalMarketService_isNonNegativeSafeInteger).call(this, timestamp) ||
            timestamp < MINIMUM_EPOCH_MILLISECONDS ||
            timestamp > generatedAt ||
            timestamp <= previousTrendTimestamp ||
            !NON_NEGATIVE_DECIMAL_PATTERN.test(trendPrice) ||
            !Number.isFinite(Number(trendPrice)) ||
            Number(trendPrice) <= 0) {
            throw invalid('trend');
        }
        previousTrendTimestamp = timestamp;
    }
}, _TerminalMarketService_mapSnapshotMarket = function _TerminalMarketService_mapSnapshotMarket(market, sourceExpiresAt) {
    const formatters = __classPrivateFieldGet(this, _TerminalMarketService_deps, "f").marketDataFormatters;
    // Keep both provider price semantics explicit in the wire contract. Core
    // maps markPrice to its UI price while retaining validation of midPrice.
    const price = Number(market.markPrice);
    const change24h = Number(market.change24h);
    const volume = Number(market.volume24h);
    const openInterest = Number(market.openInterest);
    const isHip3 = market.dex !== 'main';
    const marketType = __classPrivateFieldGet(this, _TerminalMarketService_instances, "m", _TerminalMarketService_marketTypeFor).call(this, market.dex, market.category);
    return {
        symbol: market.symbol,
        name: market.name ?? market.symbol,
        ...(market.description !== null && {
            description: market.description,
        }),
        maxLeverage: `${String(market.maxLeverage)}x`,
        price: formatters.formatPerpsFiat(price, {
            ranges: formatters.priceRangesUniversal,
        }),
        change24h: formatChange(change24h, formatters),
        change24hPercent: formatters.formatPercentage(market.changePercent24h),
        volume: formatters.formatVolume(volume),
        openInterest: formatters.formatVolume(openInterest),
        fundingRate: Number(market.funding),
        marketSource: isHip3 ? market.dex : undefined,
        marketType,
        isHip3,
        isNewMarket: isHip3 && marketType === undefined,
        ...(market.keywords && { keywords: market.keywords }),
        ...(market.tags && { tags: market.tags }),
        ...(market.category && { categories: [market.category] }),
        ...(market.listedAt !== null && { listedAt: market.listedAt }),
        trend: market.trend,
        dataSource: 'terminal-global-snapshot-mark',
        sourceExpiresAt,
    };
}, _TerminalMarketService_marketTypeFor = function _TerminalMarketService_marketTypeFor(dex, category) {
    if (dex === 'main') {
        return MarketCategory.CryptoCurrency;
    }
    if (category === 'stocks') {
        return MarketCategory.Stock;
    }
    if (category === 'pre_ipo') {
        return MarketCategory.PreIpo;
    }
    if (category && VALID_MARKET_TYPES.has(category)) {
        return category;
    }
    return undefined;
}, _TerminalMarketService_cloneGlobalSnapshotResult = function _TerminalMarketService_cloneGlobalSnapshotResult(result) {
    return {
        expiresAt: result.expiresAt,
        markets: clonePerpsMarketData(result.markets),
    };
}, _TerminalMarketService_isNonNegativeSafeInteger = function _TerminalMarketService_isNonNegativeSafeInteger(value) {
    return (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0);
}, _TerminalMarketService_isPositiveSafeInteger = function _TerminalMarketService_isPositiveSafeInteger(value) {
    return __classPrivateFieldGet(this, _TerminalMarketService_instances, "m", _TerminalMarketService_isNonNegativeSafeInteger).call(this, value) && value > 0;
}, _TerminalMarketService_validateItems = function _TerminalMarketService_validateItems(raw) {
    const valid = [];
    for (const item of raw) {
        if (is(item, TerminalPerpetualItemStruct)) {
            valid.push(item);
        }
        else {
            __classPrivateFieldGet(this, _TerminalMarketService_deps, "f").logger.error(ensureError(new Error('Terminal API item failed schema validation'), 'TerminalMarketService.validateItems'), {
                tags: {
                    feature: PERPS_CONSTANTS.FeatureName,
                    source: 'terminal-api',
                },
                context: {
                    name: 'TerminalMarketService.validateItems',
                    data: {
                        symbol: typeof item === 'object' &&
                            item !== null &&
                            Object.prototype.hasOwnProperty.call(item, 'symbol')
                            ? item.symbol
                            : undefined,
                    },
                },
            });
        }
    }
    return valid;
}, _TerminalMarketService_mapToMarketInfo = function _TerminalMarketService_mapToMarketInfo(items) {
    return items
        .filter((item) => typeof item.symbol === 'string' && item.symbol.length > 0)
        .map((item) => ({
        name: item.symbol,
        szDecimals: item.szDecimals ?? 0,
        maxLeverage: item.maxLeverage ?? 1,
        marginTableId: item.marginTableId ?? 0,
        ...(item.onlyIsolated === true && { onlyIsolated: true }),
        ...(item.isDelisted === true && { isDelisted: true }),
        ...(item.minimumOrderSize !== undefined && {
            minimumOrderSize: item.minimumOrderSize,
        }),
    }));
}, _TerminalMarketService_extractMetadata = function _TerminalMarketService_extractMetadata(items) {
    const map = new Map();
    for (const item of items) {
        if (typeof item.symbol !== 'string' || item.symbol.length === 0) {
            continue;
        }
        const entry = {};
        if (typeof item.name === 'string' && item.name.length > 0) {
            entry.name = item.name;
        }
        if (typeof item.description === 'string' && item.description.length > 0) {
            entry.description = item.description;
        }
        if (Array.isArray(item.keywords) && item.keywords.length > 0) {
            entry.keywords = item.keywords;
        }
        if (Array.isArray(item.tags) && item.tags.length > 0) {
            entry.tags = item.tags;
        }
        if (Array.isArray(item.categories) && item.categories.length > 0) {
            entry.categories = item.categories;
        }
        if (typeof item.marketType === 'string' &&
            VALID_MARKET_TYPES.has(item.marketType)) {
            entry.marketType =
                item.marketType;
        }
        if (item.listedAt !== null && item.listedAt !== undefined) {
            const listedAtMs = typeof item.listedAt === 'number'
                ? item.listedAt
                : Date.parse(item.listedAt);
            if (isFinite(listedAtMs)) {
                entry.listedAt = listedAtMs;
            }
        }
        map.set(item.symbol, entry);
    }
    return map;
};
//# sourceMappingURL=TerminalMarketService.mjs.map