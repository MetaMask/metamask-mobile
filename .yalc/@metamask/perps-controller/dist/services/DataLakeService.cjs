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
var _DataLakeService_instances, _DataLakeService_deps, _DataLakeService_messenger, _DataLakeService_getBearerToken;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataLakeService = void 0;
const uuid_1 = require("uuid");
const performanceMetrics_js_1 = require("../constants/performanceMetrics.cjs");
const perpsConfig_js_1 = require("../constants/perpsConfig.cjs");
const index_js_1 = require("../types/index.cjs");
const accountUtils_js_1 = require("../utils/accountUtils.cjs");
const errorUtils_js_1 = require("../utils/errorUtils.cjs");
/**
 * DataLakeService
 *
 * Handles reporting order events to external Data Lake API.
 * Implements exponential backoff retry logic and performance tracing.
 * Stateless service that operates purely on external API calls.
 *
 * Instance-based service with constructor injection of platform dependencies.
 */
class DataLakeService {
    /**
     * Create a new DataLakeService instance
     *
     * @param deps - Platform dependencies for logging, metrics, etc.
     * @param messenger - Controller messenger for cross-controller communication.
     */
    constructor(deps, messenger) {
        _DataLakeService_instances.add(this);
        _DataLakeService_deps.set(this, void 0);
        _DataLakeService_messenger.set(this, void 0);
        __classPrivateFieldSet(this, _DataLakeService_deps, deps, "f");
        __classPrivateFieldSet(this, _DataLakeService_messenger, messenger, "f");
    }
    /**
     * Report order events to data lake API with retry (non-blocking)
     * Implements exponential backoff retry logic (max 3 retries)
     *
     * @param options - Configuration object
     * @param options.action - Order action ('open' or 'close')
     * @param options.symbol - Market symbol
     * @param options.slPrice - Optional stop loss price.
     * @param options.tpPrice - Optional take profit price.
     * @param options.isTestnet - Whether this is a testnet operation (skips API call)
     * @param options.context - ServiceContext for dependencies (messenger, tracing)
     * @param options.retryCount - Internal retry counter (managed by service)
     * @param options._traceId - Internal trace ID (managed by service)
     * @returns Result object with success flag and optional error message
     */
    async reportOrder(options) {
        const { action, symbol, slPrice, tpPrice, isTestnet, context, retryCount = 0, _traceId, } = options;
        // Skip data lake reporting for testnet as the API doesn't handle testnet data
        if (isTestnet) {
            __classPrivateFieldGet(this, _DataLakeService_deps, "f").debugLogger.log('DataLake API: Skipping for testnet', {
                action,
                symbol,
                network: 'testnet',
            });
            return { success: true, error: 'Skipped for testnet' };
        }
        const MAX_RETRIES = 3;
        const RETRY_DELAY_MS = 1000;
        // Generate trace ID once on first call
        const traceId = _traceId ?? (0, uuid_1.v4)();
        // Start trace only on first attempt
        if (retryCount === 0) {
            __classPrivateFieldGet(this, _DataLakeService_deps, "f").tracer.trace({
                name: index_js_1.PerpsTraceNames.DataLakeReport,
                op: index_js_1.PerpsTraceOperations.Operation,
                id: traceId,
                tags: {
                    action,
                    symbol,
                    provider: context.tracingContext.provider,
                    isTestnet: String(context.tracingContext.isTestnet),
                },
            });
        }
        // Log the attempt
        __classPrivateFieldGet(this, _DataLakeService_deps, "f").debugLogger.log('DataLake API: Starting order report', {
            action,
            symbol,
            attempt: retryCount + 1,
            maxAttempts: MAX_RETRIES + 1,
            hasStopLoss: Boolean(slPrice),
            hasTakeProfit: Boolean(tpPrice),
            timestamp: new Date().toISOString(),
        });
        const apiCallStartTime = __classPrivateFieldGet(this, _DataLakeService_deps, "f").performance.now();
        try {
            const token = await __classPrivateFieldGet(this, _DataLakeService_instances, "m", _DataLakeService_getBearerToken).call(this);
            const evmAccount = (0, accountUtils_js_1.getSelectedEvmAccountFromMessenger)(__classPrivateFieldGet(this, _DataLakeService_messenger, "f"));
            if (!evmAccount || !token) {
                __classPrivateFieldGet(this, _DataLakeService_deps, "f").debugLogger.log('DataLake API: Missing requirements', {
                    hasAccount: Boolean(evmAccount),
                    hasToken: Boolean(token),
                    action,
                    symbol,
                });
                return { success: false, error: 'No account or token available' };
            }
            const response = await fetch(perpsConfig_js_1.DATA_LAKE_API_CONFIG.OrdersEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    user_id: evmAccount.address,
                    symbol,
                    sl_price: slPrice,
                    tp_price: tpPrice,
                }),
            });
            if (!response.ok) {
                throw new Error(`DataLake API error: ${response.status}`);
            }
            // Consume response body (might be empty for 201, but good to check)
            const responseBody = await response.text();
            const apiCallDuration = __classPrivateFieldGet(this, _DataLakeService_deps, "f").performance.now() - apiCallStartTime;
            // Record measurement
            __classPrivateFieldGet(this, _DataLakeService_deps, "f").tracer.setMeasurement(performanceMetrics_js_1.PerpsMeasurementName.PerpsDataLakeApiCall, apiCallDuration, 'millisecond');
            // Success logging
            __classPrivateFieldGet(this, _DataLakeService_deps, "f").debugLogger.log('DataLake API: Order reported successfully', {
                action,
                symbol,
                status: response.status,
                attempt: retryCount + 1,
                responseBody: responseBody || 'empty',
                duration: `${apiCallDuration.toFixed(0)}ms`,
            });
            // End trace on success
            __classPrivateFieldGet(this, _DataLakeService_deps, "f").tracer.endTrace({
                name: index_js_1.PerpsTraceNames.DataLakeReport,
                id: traceId,
                data: {
                    success: true,
                    retries: retryCount,
                },
            });
            return { success: true };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            __classPrivateFieldGet(this, _DataLakeService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'DataLakeService.reportOrder'), {
                tags: { feature: perpsConfig_js_1.PERPS_CONSTANTS.FeatureName },
                context: {
                    name: 'DataLakeService.reportOrder',
                    data: {
                        action,
                        symbol,
                        retryCount,
                        willRetry: retryCount < MAX_RETRIES,
                    },
                },
            });
            // Retry logic
            if (retryCount < MAX_RETRIES) {
                const retryDelay = RETRY_DELAY_MS * Math.pow(2, retryCount);
                __classPrivateFieldGet(this, _DataLakeService_deps, "f").debugLogger.log('DataLake API: Scheduling retry', {
                    retryIn: `${retryDelay}ms`,
                    nextAttempt: retryCount + 2,
                    action,
                    symbol,
                });
                setTimeout(() => {
                    this.reportOrder({
                        action,
                        symbol,
                        slPrice,
                        tpPrice,
                        isTestnet,
                        context,
                        retryCount: retryCount + 1,
                        _traceId: traceId,
                    }).catch((_retryError) => {
                        __classPrivateFieldGet(this, _DataLakeService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(_retryError, 'DataLakeService.reportOrder'), {
                            tags: { feature: perpsConfig_js_1.PERPS_CONSTANTS.FeatureName },
                            context: {
                                name: 'DataLakeService.reportOrder',
                                data: {
                                    operation: 'retry',
                                    retryCount: retryCount + 1,
                                    action,
                                    symbol,
                                },
                            },
                        });
                    });
                }, retryDelay);
                return { success: false, error: errorMessage };
            }
            __classPrivateFieldGet(this, _DataLakeService_deps, "f").tracer.endTrace({
                name: index_js_1.PerpsTraceNames.DataLakeReport,
                id: traceId,
                data: {
                    success: false,
                    error: errorMessage,
                    totalRetries: retryCount,
                },
            });
            __classPrivateFieldGet(this, _DataLakeService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'DataLakeService.reportOrder'), {
                tags: { feature: perpsConfig_js_1.PERPS_CONSTANTS.FeatureName },
                context: {
                    name: 'DataLakeService.reportOrder',
                    data: { operation: 'finalFailure', action, symbol, retryCount },
                },
            });
            return { success: false, error: errorMessage };
        }
    }
}
exports.DataLakeService = DataLakeService;
_DataLakeService_deps = new WeakMap(), _DataLakeService_messenger = new WeakMap(), _DataLakeService_instances = new WeakSet(), _DataLakeService_getBearerToken = 
/**
 * Get bearer token via DI authentication controller
 *
 * @returns The bearer token string for API authentication.
 */
async function _DataLakeService_getBearerToken() {
    return __classPrivateFieldGet(this, _DataLakeService_messenger, "f").call('AuthenticationController:getBearerToken');
};
//# sourceMappingURL=DataLakeService.cjs.map