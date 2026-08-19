"use strict";
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
var _MarketDataService_instances, _MarketDataService_deps, _MarketDataService_enrichWithTerminalMetadata;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketDataService = void 0;
const uuid_1 = require("uuid");
const performanceMetrics_js_1 = require("../constants/performanceMetrics.cjs");
const perpsConfig_js_1 = require("../constants/perpsConfig.cjs");
const perpsErrorCodes_js_1 = require("../perpsErrorCodes.cjs");
const index_js_1 = require("../types/index.cjs");
const coalescePerpsRestRequest_js_1 = require("../utils/coalescePerpsRestRequest.cjs");
const errorUtils_js_1 = require("../utils/errorUtils.cjs");
const marketUtils_js_1 = require("../utils/marketUtils.cjs");
/**
 * MarketDataService
 *
 * Handles all read-only data-fetching operations for the Perps controller.
 * This service is stateless and delegates to the provider.
 * The controller is responsible for tracing and state management.
 *
 * Instance-based service with constructor injection of platform dependencies.
 */
class MarketDataService {
    /**
     * Create a new MarketDataService instance
     *
     * @param deps - Platform dependencies for logging, metrics, etc.
     */
    constructor(deps) {
        _MarketDataService_instances.add(this);
        _MarketDataService_deps.set(this, void 0);
        __classPrivateFieldSet(this, _MarketDataService_deps, deps, "f");
    }
    /**
     * Get current positions
     * Handles full orchestration: tracing, error logging, state management, and provider delegation
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    async getPositions(options) {
        const { provider, params, context } = options;
        const traceId = (0, uuid_1.v4)();
        let traceData;
        try {
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").tracer.trace({
                name: index_js_1.PerpsTraceNames.GetPositions,
                id: traceId,
                op: index_js_1.PerpsTraceOperations.Operation,
                tags: {
                    provider: context.tracingContext.provider,
                    isTestnet: String(context.tracingContext.isTestnet),
                },
            });
            const positions = await provider.getPositions(params);
            // Update state on success (if stateManager is provided)
            if (context.stateManager) {
                context.stateManager.update((state) => {
                    state.lastUpdateTimestamp = Date.now();
                    state.lastError = null;
                });
            }
            traceData = { success: true };
            return positions;
        }
        catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : perpsErrorCodes_js_1.PERPS_ERROR_CODES.POSITIONS_FAILED;
            // Update error state (if stateManager is provided)
            if (context.stateManager) {
                context.stateManager.update((state) => {
                    state.lastError = errorMessage;
                    state.lastUpdateTimestamp = Date.now();
                });
            }
            traceData = {
                success: false,
                error: errorMessage,
            };
            throw error;
        }
        finally {
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").tracer.endTrace({
                name: index_js_1.PerpsTraceNames.GetPositions,
                id: traceId,
                data: traceData,
            });
        }
    }
    /**
     * Get order fills for a specific user or order
     * Handles full orchestration: tracing, error logging, and provider delegation
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @param options.forceRefresh - Bypass the request-coalesce cache end-to-end
     * (user-initiated refresh).
     * @returns The result of the operation.
     */
    async getOrderFills(options) {
        const { provider, params, context, forceRefresh } = options;
        const traceId = (0, uuid_1.v4)();
        let traceData;
        try {
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").tracer.trace({
                name: index_js_1.PerpsTraceNames.OrderFillsFetch,
                id: traceId,
                op: index_js_1.PerpsTraceOperations.Operation,
                tags: {
                    provider: context.tracingContext.provider,
                    isTestnet: String(context.tracingContext.isTestnet),
                },
            });
            // Pagination / explicit end-window callers bypass the shared cache so
            // their specific page never collides with the default "recent fills"
            // bucket. Day-granular startTime bucket prevents a ~90d caller from
            // sharing payloads with an all-history caller.
            const isPaginated = params?.limit !== undefined || params?.endTime !== undefined;
            if (isPaginated) {
                const result = await provider.getOrderFills(params, { forceRefresh });
                traceData = { success: true };
                return result;
            }
            // Non-paginated: resolve the caller's account so the cache key is
            // account-scoped. Without this, callers that omit params.accountId
            // (the common hook path) would collide on a shared "default" bucket —
            // after an account switch, account B could receive account A's
            // still-fresh payload until the TTL expired. Pin the resolved id onto
            // the forwarded params so the provider cannot re-resolve to a different
            // account between our resolve() and its fetch (TOCTOU guard).
            const resolvedAccountId = params?.accountId ?? (await provider.getCurrentAccountId());
            const pinnedParams = {
                ...params,
                accountId: resolvedAccountId,
            };
            const result = await (0, coalescePerpsRestRequest_js_1.coalescePerpsRestRequest)([
                context.tracingContext.provider,
                context.tracingContext.isTestnet ? 'testnet' : 'mainnet',
                'getOrderFills',
                resolvedAccountId,
                params?.aggregateByTime === true ? 'agg' : 'raw',
                params?.startTime === undefined
                    ? 'unbounded'
                    : `s${Math.floor(params.startTime / 86400000)}`,
            ].join('|'), () => provider.getOrderFills(pinnedParams, { forceRefresh }), { forceRefresh });
            traceData = { success: true };
            return result;
        }
        catch (error) {
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'MarketDataService.getOrderFills'), {
                tags: {
                    feature: perpsConfig_js_1.PERPS_CONSTANTS.FeatureName,
                    provider: context.tracingContext.provider,
                    network: context.tracingContext.isTestnet ? 'testnet' : 'mainnet',
                },
                context: {
                    name: context.errorContext.controller,
                    data: {
                        method: context.errorContext.method,
                        params,
                    },
                },
            });
            traceData = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
            throw error;
        }
        finally {
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").tracer.endTrace({
                name: index_js_1.PerpsTraceNames.OrderFillsFetch,
                id: traceId,
                data: traceData,
            });
        }
    }
    /**
     * Get historical user orders (order lifecycle)
     * Handles full orchestration: tracing, error logging, and provider delegation
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @param options.forceRefresh - Bypass the request-coalesce cache end-to-end
     * (user-initiated refresh).
     * @returns The result of the operation.
     */
    async getOrders(options) {
        const { provider, params, context, forceRefresh } = options;
        const traceId = (0, uuid_1.v4)();
        let traceData;
        try {
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").tracer.trace({
                name: index_js_1.PerpsTraceNames.OrdersFetch,
                id: traceId,
                op: index_js_1.PerpsTraceOperations.Operation,
                tags: {
                    provider: context.tracingContext.provider,
                    isTestnet: String(context.tracingContext.isTestnet),
                },
            });
            const isPaginated = params?.limit !== undefined ||
                params?.offset !== undefined ||
                params?.endTime !== undefined;
            if (isPaginated) {
                const result = await provider.getOrders(params, { forceRefresh });
                traceData = { success: true };
                return result;
            }
            // Non-paginated: resolve the caller's account so the cache key is
            // account-scoped (see getOrderFills for rationale). Pin the resolved
            // id onto the forwarded params so the provider cannot re-resolve to a
            // different account between our resolve() and its fetch.
            const resolvedAccountId = params?.accountId ?? (await provider.getCurrentAccountId());
            const pinnedParams = {
                ...params,
                accountId: resolvedAccountId,
            };
            const result = await (0, coalescePerpsRestRequest_js_1.coalescePerpsRestRequest)([
                context.tracingContext.provider,
                context.tracingContext.isTestnet ? 'testnet' : 'mainnet',
                'getOrders',
                resolvedAccountId,
            ].join('|'), () => provider.getOrders(pinnedParams, { forceRefresh }), { forceRefresh });
            traceData = { success: true };
            return result;
        }
        catch (error) {
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'MarketDataService.getOrders'), {
                tags: {
                    feature: perpsConfig_js_1.PERPS_CONSTANTS.FeatureName,
                    provider: context.tracingContext.provider,
                    network: context.tracingContext.isTestnet ? 'testnet' : 'mainnet',
                },
                context: {
                    name: context.errorContext.controller,
                    data: {
                        method: context.errorContext.method,
                        params,
                    },
                },
            });
            traceData = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
            throw error;
        }
        finally {
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").tracer.endTrace({
                name: index_js_1.PerpsTraceNames.OrdersFetch,
                id: traceId,
                data: traceData,
            });
        }
    }
    /**
     * Get current open orders
     * Handles full orchestration: tracing, error logging, performance measurement, and provider delegation
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    async getOpenOrders(options) {
        const { provider, params, context } = options;
        const traceId = (0, uuid_1.v4)();
        const startTime = __classPrivateFieldGet(this, _MarketDataService_deps, "f").performance.now();
        let traceData;
        try {
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").tracer.trace({
                name: index_js_1.PerpsTraceNames.OrdersFetch,
                id: traceId,
                op: index_js_1.PerpsTraceOperations.Operation,
                tags: {
                    provider: context.tracingContext.provider,
                    isTestnet: String(context.tracingContext.isTestnet),
                },
            });
            const result = await provider.getOpenOrders(params);
            const completionDuration = __classPrivateFieldGet(this, _MarketDataService_deps, "f").performance.now() - startTime;
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").tracer.setMeasurement(performanceMetrics_js_1.PerpsMeasurementName.PerpsGetOpenOrdersOperation, completionDuration, 'millisecond');
            traceData = { success: true };
            return result;
        }
        catch (error) {
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'MarketDataService.getOpenOrders'), {
                tags: {
                    feature: perpsConfig_js_1.PERPS_CONSTANTS.FeatureName,
                    provider: context.tracingContext.provider,
                    network: context.tracingContext.isTestnet ? 'testnet' : 'mainnet',
                },
                context: {
                    name: context.errorContext.controller,
                    data: {
                        method: context.errorContext.method,
                        params,
                    },
                },
            });
            traceData = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
            throw error;
        }
        finally {
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").tracer.endTrace({
                name: index_js_1.PerpsTraceNames.OrdersFetch,
                id: traceId,
                data: traceData,
            });
        }
    }
    /**
     * Get funding rates
     * Handles full orchestration: tracing, error logging, and provider delegation
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @param options.forceRefresh - Bypass the request-coalesce cache end-to-end
     * (user-initiated refresh).
     * @returns The result of the operation.
     */
    async getFunding(options) {
        const { provider, params, context, forceRefresh } = options;
        const traceId = (0, uuid_1.v4)();
        let traceData;
        try {
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").tracer.trace({
                name: index_js_1.PerpsTraceNames.FundingFetch,
                id: traceId,
                op: index_js_1.PerpsTraceOperations.Operation,
                tags: {
                    provider: context.tracingContext.provider,
                    isTestnet: String(context.tracingContext.isTestnet),
                },
            });
            const isPaginated = params?.limit !== undefined ||
                params?.offset !== undefined ||
                params?.startTime !== undefined ||
                params?.endTime !== undefined;
            if (isPaginated) {
                const result = await provider.getFunding(params, { forceRefresh });
                traceData = { success: true };
                return result;
            }
            // Non-paginated: resolve the caller's account so the cache key is
            // account-scoped (see getOrderFills for rationale). Pin the resolved
            // id onto the forwarded params so the provider cannot re-resolve to a
            // different account between our resolve() and its fetch.
            const resolvedAccountId = params?.accountId ?? (await provider.getCurrentAccountId());
            const pinnedParams = {
                ...params,
                accountId: resolvedAccountId,
            };
            const result = await (0, coalescePerpsRestRequest_js_1.coalescePerpsRestRequest)([
                context.tracingContext.provider,
                context.tracingContext.isTestnet ? 'testnet' : 'mainnet',
                'getFunding',
                resolvedAccountId,
            ].join('|'), () => provider.getFunding(pinnedParams, { forceRefresh }), { forceRefresh });
            traceData = { success: true };
            return result;
        }
        catch (error) {
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'MarketDataService.getFunding'), {
                tags: {
                    feature: perpsConfig_js_1.PERPS_CONSTANTS.FeatureName,
                    provider: context.tracingContext.provider,
                    network: context.tracingContext.isTestnet ? 'testnet' : 'mainnet',
                },
                context: {
                    name: context.errorContext.controller,
                    data: {
                        method: context.errorContext.method,
                        params,
                    },
                },
            });
            traceData = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
            throw error;
        }
        finally {
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").tracer.endTrace({
                name: index_js_1.PerpsTraceNames.FundingFetch,
                id: traceId,
                data: traceData,
            });
        }
    }
    /**
     * Get account state
     * Handles full orchestration: tracing, error logging, state management, and provider delegation
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    async getAccountState(options) {
        const { provider, params, context } = options;
        const traceId = (0, uuid_1.v4)();
        let traceData;
        try {
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").tracer.trace({
                name: index_js_1.PerpsTraceNames.GetAccountState,
                id: traceId,
                op: index_js_1.PerpsTraceOperations.Operation,
                tags: {
                    provider: context.tracingContext.provider,
                    isTestnet: String(context.tracingContext.isTestnet),
                    source: params?.source ?? 'unknown',
                },
            });
            const accountState = await provider.getAccountState(params);
            // Safety check for accountState
            if (!accountState) {
                const error = new Error('Failed to get account state: received null/undefined response');
                __classPrivateFieldGet(this, _MarketDataService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'MarketDataService.getAccountState'), {
                    tags: {
                        feature: perpsConfig_js_1.PERPS_CONSTANTS.FeatureName,
                        provider: context.tracingContext.provider,
                        network: context.tracingContext.isTestnet ? 'testnet' : 'mainnet',
                    },
                    context: {
                        name: context.errorContext.controller,
                        data: {
                            method: context.errorContext.method,
                            operation: 'nullAccountStateCheck',
                        },
                    },
                });
                throw error;
            }
            // Update state on success (if stateManager is provided)
            if (context.stateManager) {
                context.stateManager.update((state) => {
                    state.accountState = accountState;
                    state.lastUpdateTimestamp = Date.now();
                    state.lastError = null;
                });
            }
            traceData = { success: true };
            return accountState;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Account state fetch failed';
            // Update error state (if stateManager is provided)
            if (context.stateManager) {
                context.stateManager.update((state) => {
                    state.lastError = errorMessage;
                    state.lastUpdateTimestamp = Date.now();
                });
            }
            traceData = {
                success: false,
                error: errorMessage,
            };
            throw error;
        }
        finally {
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").tracer.endTrace({
                name: index_js_1.PerpsTraceNames.GetAccountState,
                id: traceId,
                data: traceData,
            });
        }
    }
    /**
     * Get historical portfolio data
     * Handles full orchestration: tracing, error logging, state management, and provider delegation
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    async getHistoricalPortfolio(options) {
        const { provider, params, context } = options;
        const traceId = (0, uuid_1.v4)();
        let traceData;
        try {
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").tracer.trace({
                name: index_js_1.PerpsTraceNames.GetHistoricalPortfolio,
                id: traceId,
                op: index_js_1.PerpsTraceOperations.Operation,
                tags: {
                    provider: context.tracingContext.provider,
                    isTestnet: String(context.tracingContext.isTestnet),
                },
            });
            if (!provider.getHistoricalPortfolio) {
                throw new Error('Historical portfolio not supported by provider');
            }
            const result = await provider.getHistoricalPortfolio(params);
            traceData = { success: true };
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Failed to get historical portfolio';
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'MarketDataService.getHistoricalPortfolio'), {
                tags: {
                    feature: perpsConfig_js_1.PERPS_CONSTANTS.FeatureName,
                    provider: context.tracingContext.provider,
                    network: context.tracingContext.isTestnet ? 'testnet' : 'mainnet',
                },
                context: {
                    name: context.errorContext.controller,
                    data: {
                        method: context.errorContext.method,
                        params,
                    },
                },
            });
            // Update error state (if stateManager is provided)
            if (context.stateManager) {
                context.stateManager.update((state) => {
                    state.lastError = errorMessage;
                    state.lastUpdateTimestamp = Date.now();
                });
            }
            traceData = {
                success: false,
                error: errorMessage,
            };
            throw error;
        }
        finally {
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").tracer.endTrace({
                name: index_js_1.PerpsTraceNames.GetHistoricalPortfolio,
                id: traceId,
                data: traceData,
            });
        }
    }
    /**
     * Get available markets
     * Handles full orchestration: tracing, error logging, state management, and provider delegation.
     * When `useTerminalApi` is true, attempts the Terminal API first; on failure or empty
     * response, falls back silently to the HyperLiquid provider path.
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @param options.isMarketAllowed - Optional filter callback applied to
     * Terminal API results so that allowlist/blocklist rules from the provider
     * layer are enforced even when the provider is bypassed. Skipped when
     * `params.skipFilters` is true.
     * @returns The result of the operation.
     */
    async getMarkets(options) {
        const { provider, params, context, isMarketAllowed } = options;
        // The Terminal API describes HYPERLIQUID markets only: serving its
        // metadata (minimums, leverage caps) while another venue is active
        // would hand the UI the wrong venue's trading rules — found on
        // device as a Lighter order form defaulting below the venue floor.
        const useTerminalApi = params?.useTerminalApi &&
            (provider.protocolId === 'hyperliquid' ||
                provider.protocolId === 'aggregated');
        const traceId = (0, uuid_1.v4)();
        let traceData;
        try {
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").tracer.trace({
                name: index_js_1.PerpsTraceNames.GetMarkets,
                id: traceId,
                op: index_js_1.PerpsTraceOperations.Operation,
                tags: {
                    provider: context.tracingContext.provider,
                    isTestnet: String(context.tracingContext.isTestnet),
                    ...(params?.symbols && {
                        symbolCount: String(params.symbols.length),
                    }),
                    ...(params?.dex !== undefined && { dex: params.dex }),
                    ...(useTerminalApi !== undefined && {
                        useTerminalApi: String(useTerminalApi),
                    }),
                },
            });
            // Terminal API path: attempt first when flag is enabled
            if (useTerminalApi && __classPrivateFieldGet(this, _MarketDataService_deps, "f").terminalMarketService) {
                try {
                    const { markets: terminalMarkets } = await __classPrivateFieldGet(this, _MarketDataService_deps, "f").terminalMarketService.fetchMarkets();
                    if (terminalMarkets.length > 0) {
                        let filtered = terminalMarkets;
                        // Apply allowlist/blocklist filtering (same as provider path)
                        if (!params?.skipFilters && isMarketAllowed) {
                            filtered = filtered.filter((market) => isMarketAllowed(market.name));
                        }
                        // Filter by specific DEX when requested
                        if (params?.dex !== undefined) {
                            const dexPrefix = params.dex ? `${params.dex}:` : '';
                            filtered = filtered.filter((market) => dexPrefix
                                ? market.name.startsWith(dexPrefix)
                                : !market.name.includes(':'));
                        }
                        // Filter by symbols when requested
                        if (params?.symbols?.length) {
                            filtered = filtered.filter((market) => params.symbols.some((sym) => market.name.toLowerCase() === sym.toLowerCase()));
                        }
                        // Fall back to provider when a constrained query (symbols or dex)
                        // yields no matches — Terminal partial coverage should not hide
                        // valid provider-backed markets.
                        const isConstrainedQuery = (params?.symbols?.length ?? 0) > 0 || params?.dex !== undefined;
                        if (filtered.length === 0 && isConstrainedQuery) {
                            // Let execution continue to the provider path below.
                        }
                        else {
                            if (context.stateManager) {
                                context.stateManager.update((state) => {
                                    state.lastError = null;
                                    state.lastUpdateTimestamp = Date.now();
                                });
                            }
                            traceData = { success: true };
                            return filtered;
                        }
                    }
                }
                catch (terminalError) {
                    __classPrivateFieldGet(this, _MarketDataService_deps, "f").terminalMarketService.logError(terminalError, 'getMarkets');
                }
            }
            const markets = await provider.getMarkets(params);
            if (context.stateManager) {
                context.stateManager.update((state) => {
                    state.lastError = null;
                    state.lastUpdateTimestamp = Date.now();
                });
            }
            traceData = { success: true };
            return markets;
        }
        catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : perpsErrorCodes_js_1.PERPS_ERROR_CODES.MARKETS_FAILED;
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'MarketDataService.getMarkets'), {
                tags: {
                    feature: perpsConfig_js_1.PERPS_CONSTANTS.FeatureName,
                    provider: context.tracingContext.provider,
                    network: context.tracingContext.isTestnet ? 'testnet' : 'mainnet',
                },
                context: {
                    name: context.errorContext.controller,
                    data: {
                        method: context.errorContext.method,
                        params,
                    },
                },
            });
            if (context.stateManager) {
                context.stateManager.update((state) => {
                    state.lastError = errorMessage;
                    state.lastUpdateTimestamp = Date.now();
                });
            }
            traceData = {
                success: false,
                error: errorMessage,
            };
            throw error;
        }
        finally {
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").tracer.endTrace({
                name: index_js_1.PerpsTraceNames.GetMarkets,
                id: traceId,
                data: traceData,
            });
        }
    }
    /**
     * Get market data with prices (includes price, volume, 24h change).
     * Applies optional category filtering, sorting, and limit after fetching.
     * An explicitly configured global snapshot is the preferred complete source.
     * `useTerminalApi` controls only legacy metadata enrichment of provider data.
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - Optional filter/sort/limit params.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    async getMarketDataWithPrices(options) {
        const { provider, params, context } = options;
        const { globalSnapshot } = context;
        const useTerminalApi = params?.useTerminalApi;
        const traceId = (0, uuid_1.v4)();
        let traceData;
        try {
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").tracer.trace({
                name: index_js_1.PerpsTraceNames.GetMarketDataWithPrices,
                id: traceId,
                op: index_js_1.PerpsTraceOperations.Operation,
                tags: {
                    provider: context.tracingContext.provider,
                    isTestnet: String(context.tracingContext.isTestnet),
                    ...(params?.categories && {
                        categoryCount: String(params.categories.length),
                    }),
                    ...(useTerminalApi !== undefined && {
                        useTerminalApi: String(useTerminalApi),
                    }),
                },
            });
            // Prefer a separately configured atomic snapshot only for an exact,
            // still-current provider/network/DEX identity. A rejected snapshot has
            // one lexical fallback to the provider below and is not followed by a
            // second legacy Terminal request.
            let snapshotAttempted = false;
            if (globalSnapshot &&
                __classPrivateFieldGet(this, _MarketDataService_deps, "f").terminalMarketService?.fetchGlobalSnapshot) {
                snapshotAttempted = true;
                if (!globalSnapshot.isCurrent()) {
                    throw new Error('Terminal global snapshot context changed');
                }
                try {
                    const snapshot = await __classPrivateFieldGet(this, _MarketDataService_deps, "f").terminalMarketService.fetchGlobalSnapshot(globalSnapshot.request);
                    if (!globalSnapshot.isCurrent()) {
                        throw new Error('Terminal global snapshot context changed');
                    }
                    if (Date.now() >= snapshot.expiresAt) {
                        throw new Error('Terminal global snapshot expired');
                    }
                    if (snapshot.markets.length > 0) {
                        traceData = { success: true };
                        const allowedMarkets = snapshot.markets.filter((market) => globalSnapshot.isMarketAllowed(market.symbol));
                        return (0, marketUtils_js_1.applyMarketFilters)(allowedMarkets, params);
                    }
                }
                catch (snapshotError) {
                    if (!globalSnapshot.isCurrent()) {
                        throw new Error('Terminal global snapshot context changed');
                    }
                    __classPrivateFieldGet(this, _MarketDataService_deps, "f").terminalMarketService.logError(snapshotError, 'getMarketDataWithPrices.globalSnapshot');
                }
            }
            // Fetch Terminal API metadata before provider data when enabled.
            // Terminal metadata enriches the provider result (name, keywords, tags,
            // categories) but never replaces live pricing / funding data.
            let terminalMetadata;
            if (!snapshotAttempted &&
                useTerminalApi &&
                __classPrivateFieldGet(this, _MarketDataService_deps, "f").terminalMarketService) {
                try {
                    const result = await __classPrivateFieldGet(this, _MarketDataService_deps, "f").terminalMarketService.fetchMarkets();
                    if (result.metadata.size > 0) {
                        terminalMetadata = result.metadata;
                    }
                }
                catch (terminalError) {
                    __classPrivateFieldGet(this, _MarketDataService_deps, "f").terminalMarketService.logError(terminalError, 'getMarketDataWithPrices');
                }
            }
            const markets = await provider.getMarketDataWithPrices();
            if (snapshotAttempted && globalSnapshot && !globalSnapshot.isCurrent()) {
                throw new Error('Terminal global snapshot context changed');
            }
            // Enrich with terminal metadata when available
            const enriched = terminalMetadata
                ? __classPrivateFieldGet(this, _MarketDataService_instances, "m", _MarketDataService_enrichWithTerminalMetadata).call(this, markets, terminalMetadata)
                : markets;
            const filtered = (0, marketUtils_js_1.applyMarketFilters)(enriched, params);
            traceData = { success: true };
            return filtered;
        }
        catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : perpsErrorCodes_js_1.PERPS_ERROR_CODES.MARKETS_FAILED;
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'MarketDataService.getMarketDataWithPrices'), {
                tags: {
                    feature: perpsConfig_js_1.PERPS_CONSTANTS.FeatureName,
                    provider: context.tracingContext.provider,
                    network: context.tracingContext.isTestnet ? 'testnet' : 'mainnet',
                },
                context: {
                    name: context.errorContext.controller,
                    data: {
                        method: context.errorContext.method,
                        params,
                    },
                },
            });
            traceData = {
                success: false,
                error: errorMessage,
            };
            throw error;
        }
        finally {
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").tracer.endTrace({
                name: index_js_1.PerpsTraceNames.GetMarketDataWithPrices,
                id: traceId,
                data: traceData,
            });
        }
    }
    /**
     * Get available DEXs (HIP-3 support required)
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    async getAvailableDexs(options) {
        const { provider, params } = options;
        try {
            if (!provider.getAvailableDexs) {
                throw new Error('Provider does not support HIP-3 DEXs');
            }
            return await provider.getAvailableDexs(params);
        }
        catch (error) {
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'MarketDataService.getAvailableDexs'), {
                context: {
                    name: 'MarketDataService.getAvailableDexs',
                    data: { params },
                },
            });
            throw error;
        }
    }
    /**
     * Fetch historical candle data for charting
     * Handles full orchestration: tracing, error logging, state management, and provider delegation
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.symbol - The trading pair symbol.
     * @param options.interval - The candle interval period.
     * @param options.limit - Maximum number of items to fetch.
     * @param options.endTime - End timestamp in milliseconds.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    async fetchHistoricalCandles(options) {
        const { provider, symbol, interval, limit = 100, endTime, context, } = options;
        const traceId = (0, uuid_1.v4)();
        let traceData;
        try {
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").tracer.trace({
                name: index_js_1.PerpsTraceNames.FetchHistoricalCandles,
                id: traceId,
                op: index_js_1.PerpsTraceOperations.Operation,
                tags: {
                    provider: context.tracingContext.provider,
                    isTestnet: String(context.tracingContext.isTestnet),
                    symbol,
                    interval,
                },
            });
            if (!provider.fetchHistoricalCandles) {
                throw new Error('Historical candles not supported by provider');
            }
            const result = await provider.fetchHistoricalCandles({
                symbol,
                interval,
                limit,
                endTime,
            });
            traceData = { success: true };
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : 'Failed to fetch historical candles';
            // Expected cancellation — skip Sentry and state updates
            if (!(0, errorUtils_js_1.isAbortError)(error)) {
                __classPrivateFieldGet(this, _MarketDataService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'MarketDataService.fetchHistoricalCandles'), {
                    tags: {
                        feature: perpsConfig_js_1.PERPS_CONSTANTS.FeatureName,
                        provider: context.tracingContext.provider,
                        network: context.tracingContext.isTestnet ? 'testnet' : 'mainnet',
                    },
                    context: {
                        name: context.errorContext.controller,
                        data: {
                            method: context.errorContext.method,
                            symbol,
                            interval,
                            limit,
                            endTime,
                        },
                    },
                });
                // Update error state (if stateManager is provided)
                if (context.stateManager) {
                    context.stateManager.update((state) => {
                        state.lastError = errorMessage;
                        state.lastUpdateTimestamp = Date.now();
                    });
                }
            }
            traceData = {
                success: false,
                error: errorMessage,
            };
            throw error;
        }
        finally {
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").tracer.endTrace({
                name: index_js_1.PerpsTraceNames.FetchHistoricalCandles,
                id: traceId,
                data: traceData,
            });
        }
    }
    /**
     * Calculate liquidation price for a position
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    async calculateLiquidationPrice(options) {
        const { provider, params } = options;
        try {
            return await provider.calculateLiquidationPrice(params);
        }
        catch (error) {
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'MarketDataService.calculateLiquidationPrice'), {
                context: {
                    name: 'MarketDataService.calculateLiquidationPrice',
                    data: { params },
                },
            });
            throw error;
        }
    }
    /**
     * Calculate maintenance margin for a position
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    async calculateMaintenanceMargin(options) {
        const { provider, params } = options;
        try {
            return await provider.calculateMaintenanceMargin(params);
        }
        catch (error) {
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'MarketDataService.calculateMaintenanceMargin'), {
                context: {
                    name: 'MarketDataService.calculateMaintenanceMargin',
                    data: { params },
                },
            });
            throw error;
        }
    }
    /**
     * Get maximum leverage for an asset
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.asset - The asset identifier.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    async getMaxLeverage(options) {
        const { provider, asset } = options;
        try {
            return await provider.getMaxLeverage(asset);
        }
        catch (error) {
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'MarketDataService.getMaxLeverage'), {
                context: {
                    name: 'MarketDataService.getMaxLeverage',
                    data: { asset },
                },
            });
            throw error;
        }
    }
    /**
     * Calculate fees for an order
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    async calculateFees(options) {
        const { provider, params, context } = options;
        try {
            const fees = await provider.calculateFees(params);
            // Read-only preview of the same cached benefits snapshot the fee resolver
            // reads. The quoted rates are left untouched: surfacing eligibility and
            // the remaining notional must not mutate the cap or the cache.
            return context.subscriptionFeeWaiver
                ? { ...fees, subscription: context.subscriptionFeeWaiver }
                : fees;
        }
        catch (error) {
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'MarketDataService.calculateFees'), {
                context: {
                    name: 'MarketDataService.calculateFees',
                    data: { params },
                },
            });
            throw error;
        }
    }
    /**
     * Validate an order before placement
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    async validateOrder(options) {
        const { provider, params } = options;
        try {
            return await provider.validateOrder(params);
        }
        catch (error) {
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'MarketDataService.validateOrder'), {
                context: {
                    name: 'MarketDataService.validateOrder',
                    data: { params },
                },
            });
            throw error;
        }
    }
    /**
     * Validate a position close request
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    async validateClosePosition(options) {
        const { provider, params } = options;
        try {
            return await provider.validateClosePosition(params);
        }
        catch (error) {
            __classPrivateFieldGet(this, _MarketDataService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'MarketDataService.validateClosePosition'), {
                context: {
                    name: 'MarketDataService.validateClosePosition',
                    data: { params },
                },
            });
            throw error;
        }
    }
    /**
     * Get supported withdrawal routes (synchronous)
     * Note: This method doesn't log errors to avoid needing context for a synchronous getter
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @returns The result of the operation.
     */
    getWithdrawalRoutes(options) {
        const { provider } = options;
        try {
            return provider.getWithdrawalRoutes();
        }
        catch {
            // Silent fail - withdrawal routes are not critical
            return [];
        }
    }
    /**
     * Get block explorer URL (synchronous)
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.address - The wallet address.
     * @returns The result of the operation.
     */
    getBlockExplorerUrl(options) {
        const { provider, address } = options;
        return provider.getBlockExplorerUrl(address);
    }
}
exports.MarketDataService = MarketDataService;
_MarketDataService_deps = new WeakMap(), _MarketDataService_instances = new WeakSet(), _MarketDataService_enrichWithTerminalMetadata = function _MarketDataService_enrichWithTerminalMetadata(markets, metadata) {
    return markets.map((market) => {
        const meta = metadata.get(market.symbol);
        if (!meta) {
            return market;
        }
        return {
            ...market,
            ...(meta.name !== undefined && { name: meta.name }),
            ...(meta.description !== undefined && {
                description: meta.description,
            }),
            ...(meta.marketType !== undefined && { marketType: meta.marketType }),
            ...(meta.keywords !== undefined && { keywords: meta.keywords }),
            ...(meta.tags !== undefined && { tags: meta.tags }),
            ...(meta.categories !== undefined && { categories: meta.categories }),
            ...(meta.listedAt !== undefined && { listedAt: meta.listedAt }),
        };
    });
};
//# sourceMappingURL=MarketDataService.cjs.map