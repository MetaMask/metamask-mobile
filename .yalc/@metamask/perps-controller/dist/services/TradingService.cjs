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
var _TradingService_instances, _TradingService_deps, _TradingService_controllerDeps, _TradingService_feeContextTail, _TradingService_getErrorContext, _TradingService_buildAttributionProperties, _TradingService_trackSubmitted, _TradingService_trackOrderResult, _TradingService_handleOrderSuccess, _TradingService_withFeeDiscount, _TradingService_loadPositionData, _TradingService_calculateCloseMetrics, _TradingService_buildCloseEventProperties, _TradingService_trackPositionCloseResult, _TradingService_handleDataLakeReporting, _TradingService_calculateFeeDiscountWithMeasurement;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradingService = void 0;
const bignumber_js_1 = require("bignumber.js");
const uuid_1 = require("uuid");
const eventNames_js_1 = require("../constants/eventNames.cjs");
const orderTypes_js_1 = require("../constants/orderTypes.cjs");
const performanceMetrics_js_1 = require("../constants/performanceMetrics.cjs");
const perpsConfig_js_1 = require("../constants/perpsConfig.cjs");
const index_js_1 = require("../types/index.cjs");
const errorUtils_js_1 = require("../utils/errorUtils.cjs");
const orderTypes_js_2 = require("../utils/orderTypes.cjs");
/**
 * TradingService
 *
 * Handles trading operations with fee discount management.
 * Controller is responsible for analytics, state management, and tracing.
 *
 * Instance-based service with constructor injection of platform dependencies.
 * Controller-level dependencies (RewardsController, NetworkController, etc.)
 * are injected via setControllerDependencies() after construction.
 */
class TradingService {
    /**
     * Create a new TradingService instance
     *
     * @param deps - Platform dependencies for logging, metrics, etc.
     */
    constructor(deps) {
        _TradingService_instances.add(this);
        /**
         * Platform dependencies for logging, metrics, etc.
         */
        _TradingService_deps.set(this, void 0);
        /**
         * Controller-level dependencies for fee discount calculation.
         * Set via setControllerDependencies() after construction.
         */
        _TradingService_controllerDeps.set(this, null);
        /** Serializes provider fee context so concurrent orders cannot share it. */
        _TradingService_feeContextTail.set(this, Promise.resolve());
        __classPrivateFieldSet(this, _TradingService_deps, deps, "f");
    }
    /**
     * Set controller-level dependencies for fee discount calculation.
     * Called by PerpsController after construction to inject singleton dependencies.
     *
     * @param controllerDeps - Controller-level dependencies (RewardsController, etc.)
     */
    setControllerDependencies(controllerDeps) {
        __classPrivateFieldSet(this, _TradingService_controllerDeps, controllerDeps, "f");
    }
    /**
     * Place a new order with full orchestration
     * Handles tracing, fee discounts, state management, analytics, and data lake reporting
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @param options.reportOrderToDataLake - The report order to data lake value.
     * @returns The result of the operation.
     */
    async placeOrder(options) {
        const { provider, params, context, reportOrderToDataLake } = options;
        const traceId = (0, uuid_1.v4)();
        const startTime = __classPrivateFieldGet(this, _TradingService_deps, "f").performance.now();
        let traceData;
        let orderSubmissionThresholdTimeoutId;
        let didExceedOrderSubmissionThreshold = false;
        const paymentToken = params.trackingData?.tradeWithToken === true
            ? (params.trackingData.mmPayTokenSelected ?? 'unknown_token')
            : 'perps_balance';
        try {
            __classPrivateFieldGet(this, _TradingService_deps, "f").tracer.addBreadcrumb({
                category: 'perps',
                message: 'Order execution started',
                level: 'info',
                data: {
                    payment_token: paymentToken,
                    market: params.symbol,
                    orderType: params.orderType,
                },
            });
            // Start trace for the entire operation
            __classPrivateFieldGet(this, _TradingService_deps, "f").tracer.trace({
                name: index_js_1.PerpsTraceNames.PlaceOrder,
                id: traceId,
                op: index_js_1.PerpsTraceOperations.OrderSubmission,
                tags: {
                    provider: context.tracingContext.provider,
                    orderType: params.orderType,
                    market: params.symbol,
                    leverage: String(params.leverage ?? 1),
                    isTestnet: String(context.tracingContext.isTestnet),
                    payment_token: paymentToken,
                },
                data: {
                    isBuy: params.isBuy,
                    orderPrice: params.price ?? '',
                    payment_token: paymentToken,
                },
            });
            // Calculate fee discount at execution time (fresh, secure)
            const feeResolution = await __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_calculateFeeDiscountWithMeasurement).call(this);
            __classPrivateFieldGet(this, _TradingService_deps, "f").debugLogger.log('TradingService: Fee resolution calculated', {
                feeDiscountBips: feeResolution?.discountBips,
                feeSource: feeResolution?.source,
                hasDiscount: feeResolution?.discountBips !== undefined,
            });
            __classPrivateFieldGet(this, _TradingService_deps, "f").debugLogger.log('TradingService: Submitting order to provider', {
                symbol: params.symbol,
                orderType: params.orderType,
                isBuy: params.isBuy,
                size: params.size,
                leverage: params.leverage,
                hasTP: Boolean(params.takeProfitPrice),
                hasSL: Boolean(params.stopLossPrice),
            });
            // Emit submitted event before the provider round-trip
            __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_trackSubmitted).call(this, index_js_1.PerpsAnalyticsEvent.TradeTransaction, {
                [eventNames_js_1.PERPS_EVENT_PROPERTY.ASSET]: params.symbol,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.DIRECTION]: params.isBuy
                    ? eventNames_js_1.PERPS_EVENT_VALUE.DIRECTION.LONG
                    : eventNames_js_1.PERPS_EVENT_VALUE.DIRECTION.SHORT,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.ORDER_TYPE]: params.orderType,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.LEVERAGE]: parseFloat(String(params.leverage ?? 1)),
                ...__classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_buildAttributionProperties).call(this, params.trackingData),
            });
            // Observational threshold: when the provider round-trip exceeds
            // PlaceOrderTimeoutMs we tag the trace and emit a breadcrumb, but we
            // intentionally do NOT cancel the in-flight order. Cancelling client-side
            // (e.g. Promise.race rejection) does not stop the provider request, so a
            // race-based timeout would let the UI mark an order as failed while
            // HyperLiquid could still accept it. Instead, we always await
            // provider.placeOrder(params) to terminal completion and surface
            // late completions via trace `reason: 'late_success' | 'late_error'`.
            orderSubmissionThresholdTimeoutId = setTimeout(() => {
                didExceedOrderSubmissionThreshold = true;
                __classPrivateFieldGet(this, _TradingService_deps, "f").tracer.addBreadcrumb({
                    category: 'perps',
                    message: 'Order submission exceeded threshold (still pending)',
                    level: 'warning',
                    data: {
                        thresholdMs: perpsConfig_js_1.PERPS_CONSTANTS.PlaceOrderTimeoutMs,
                        payment_token: paymentToken,
                        market: params.symbol,
                        orderType: params.orderType,
                    },
                });
                __classPrivateFieldGet(this, _TradingService_deps, "f").debugLogger.log('TradingService: Order submission exceeded threshold (still pending)', {
                    thresholdMs: perpsConfig_js_1.PERPS_CONSTANTS.PlaceOrderTimeoutMs,
                    symbol: params.symbol,
                    orderType: params.orderType,
                });
            }, perpsConfig_js_1.PERPS_CONSTANTS.PlaceOrderTimeoutMs);
            const result = await __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_withFeeDiscount).call(this, {
                provider,
                feeResolution,
                operation: () => provider.placeOrder(params),
            });
            if (orderSubmissionThresholdTimeoutId !== undefined) {
                clearTimeout(orderSubmissionThresholdTimeoutId);
                orderSubmissionThresholdTimeoutId = undefined;
            }
            __classPrivateFieldGet(this, _TradingService_deps, "f").debugLogger.log('TradingService: Provider response received', {
                success: result.success,
                orderId: result.orderId,
                error: result.error,
                didExceedOrderSubmissionThreshold,
            });
            // Update state and handle success/failure
            const completionDuration = __classPrivateFieldGet(this, _TradingService_deps, "f").performance.now() - startTime;
            if (result.success) {
                // Handle success: state updates, data lake reporting
                await __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_handleOrderSuccess).call(this, {
                    params,
                    context,
                    reportOrderToDataLake,
                });
                traceData = {
                    success: true,
                    orderId: result.orderId ?? '',
                    ...(didExceedOrderSubmissionThreshold
                        ? { reason: 'late_success' }
                        : {}),
                };
                // Invalidate standalone caches so external hooks (e.g., usePerpsPositionForAsset) refresh
                __classPrivateFieldGet(this, _TradingService_deps, "f").cacheInvalidator.invalidate({ cacheType: 'positions' });
                __classPrivateFieldGet(this, _TradingService_deps, "f").cacheInvalidator.invalidate({ cacheType: 'accountState' });
            }
            else {
                traceData = {
                    success: false,
                    reason: didExceedOrderSubmissionThreshold ? 'late_error' : 'error',
                    error: result.error ?? 'Unknown error',
                };
            }
            // Track analytics (success or failure)
            __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_trackOrderResult).call(this, {
                result,
                params,
                context,
                duration: completionDuration,
            });
            return result;
        }
        catch (error) {
            const completionDuration = __classPrivateFieldGet(this, _TradingService_deps, "f").performance.now() - startTime;
            // Track analytics for exception
            __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_trackOrderResult).call(this, {
                result: null,
                error: error instanceof Error ? error : undefined,
                params,
                context,
                duration: completionDuration,
            });
            // withFeeDiscount handles fee discount cleanup automatically
            __classPrivateFieldGet(this, _TradingService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'TradingService.placeOrder'), {
                tags: {
                    feature: perpsConfig_js_1.PERPS_CONSTANTS.FeatureName,
                    provider: context.tracingContext.provider,
                    network: context.tracingContext.isTestnet ? 'testnet' : 'mainnet',
                },
                context: {
                    name: context.errorContext.controller,
                    data: {
                        method: context.errorContext.method,
                        symbol: params.symbol,
                        orderType: params.orderType,
                    },
                },
            });
            traceData = {
                success: false,
                reason: didExceedOrderSubmissionThreshold ? 'late_error' : 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
            throw error;
        }
        finally {
            if (orderSubmissionThresholdTimeoutId !== undefined) {
                clearTimeout(orderSubmissionThresholdTimeoutId);
            }
            // Always end trace on exit (success or failure)
            __classPrivateFieldGet(this, _TradingService_deps, "f").tracer.endTrace({
                name: index_js_1.PerpsTraceNames.PlaceOrder,
                id: traceId,
                data: traceData,
            });
        }
    }
    /**
     * Edit an existing order with full orchestration
     * Handles tracing, fee discounts, state management, and analytics
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    async editOrder(options) {
        const { provider, params, context } = options;
        const traceId = (0, uuid_1.v4)();
        const startTime = __classPrivateFieldGet(this, _TradingService_deps, "f").performance.now();
        let traceData;
        try {
            __classPrivateFieldGet(this, _TradingService_deps, "f").tracer.trace({
                name: index_js_1.PerpsTraceNames.EditOrder,
                id: traceId,
                op: index_js_1.PerpsTraceOperations.OrderSubmission,
                tags: {
                    provider: context.tracingContext.provider,
                    orderType: params.newOrder.orderType,
                    market: params.newOrder.symbol,
                    leverage: String(params.newOrder.leverage ?? 1),
                    isTestnet: String(context.tracingContext.isTestnet),
                },
                data: {
                    isBuy: params.newOrder.isBuy,
                    orderPrice: params.newOrder.price ?? '',
                },
            });
            // Calculate fee discount only if required dependencies are available
            const feeResolution = await __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_calculateFeeDiscountWithMeasurement).call(this);
            // Execute order edit with fee discount management
            const result = await __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_withFeeDiscount).call(this, {
                provider,
                feeResolution,
                operation: () => provider.editOrder(params),
            });
            const completionDuration = __classPrivateFieldGet(this, _TradingService_deps, "f").performance.now() - startTime;
            if (result.success) {
                // Update state on success
                if (context.stateManager) {
                    context.stateManager.update((state) => {
                        state.lastUpdateTimestamp = Date.now();
                    });
                }
                // Track order edit executed
                const editExecutedProps = {
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.STATUS]: eventNames_js_1.PERPS_EVENT_VALUE.STATUS.EXECUTED,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.ASSET]: params.newOrder.symbol,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.DIRECTION]: params.newOrder.isBuy
                        ? eventNames_js_1.PERPS_EVENT_VALUE.DIRECTION.LONG
                        : eventNames_js_1.PERPS_EVENT_VALUE.DIRECTION.SHORT,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.ORDER_TYPE]: params.newOrder.orderType,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.LEVERAGE]: params.newOrder.leverage ?? 1,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.ORDER_SIZE]: params.newOrder.size,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: completionDuration,
                };
                if (params.newOrder.price) {
                    editExecutedProps[eventNames_js_1.PERPS_EVENT_PROPERTY.LIMIT_PRICE] = parseFloat(params.newOrder.price);
                }
                __classPrivateFieldGet(this, _TradingService_deps, "f").metrics.trackPerpsEvent(index_js_1.PerpsAnalyticsEvent.TradeTransaction, editExecutedProps);
                traceData = { success: true, orderId: result.orderId ?? '' };
            }
            else {
                // Track order edit failed
                __classPrivateFieldGet(this, _TradingService_deps, "f").metrics.trackPerpsEvent(index_js_1.PerpsAnalyticsEvent.TradeTransaction, {
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.STATUS]: eventNames_js_1.PERPS_EVENT_VALUE.STATUS.FAILED,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.ASSET]: params.newOrder.symbol,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.DIRECTION]: params.newOrder.isBuy
                        ? eventNames_js_1.PERPS_EVENT_VALUE.DIRECTION.LONG
                        : eventNames_js_1.PERPS_EVENT_VALUE.DIRECTION.SHORT,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.ORDER_TYPE]: params.newOrder.orderType,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.LEVERAGE]: params.newOrder.leverage ?? 1,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.ORDER_SIZE]: params.newOrder.size,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: completionDuration,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: result.error ?? 'Unknown error',
                });
                traceData = { success: false, error: result.error ?? 'Unknown error' };
            }
            return result;
        }
        catch (error) {
            const completionDuration = __classPrivateFieldGet(this, _TradingService_deps, "f").performance.now() - startTime;
            // Track order edit exception
            __classPrivateFieldGet(this, _TradingService_deps, "f").metrics.trackPerpsEvent(index_js_1.PerpsAnalyticsEvent.TradeTransaction, {
                [eventNames_js_1.PERPS_EVENT_PROPERTY.STATUS]: eventNames_js_1.PERPS_EVENT_VALUE.STATUS.FAILED,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.ASSET]: params.newOrder.symbol,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.DIRECTION]: params.newOrder.isBuy
                    ? eventNames_js_1.PERPS_EVENT_VALUE.DIRECTION.LONG
                    : eventNames_js_1.PERPS_EVENT_VALUE.DIRECTION.SHORT,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.ORDER_TYPE]: params.newOrder.orderType,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.LEVERAGE]: params.newOrder.leverage ?? 1,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.ORDER_SIZE]: params.newOrder.size,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: completionDuration,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: error instanceof Error ? error.message : 'Unknown error',
            });
            __classPrivateFieldGet(this, _TradingService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'TradingService.editOrder'), {
                tags: {
                    feature: perpsConfig_js_1.PERPS_CONSTANTS.FeatureName,
                    provider: context.tracingContext.provider,
                    network: context.tracingContext.isTestnet ? 'testnet' : 'mainnet',
                },
                context: {
                    name: context.errorContext.controller,
                    data: {
                        method: context.errorContext.method,
                        orderId: params.orderId,
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
            __classPrivateFieldGet(this, _TradingService_deps, "f").tracer.endTrace({
                name: index_js_1.PerpsTraceNames.EditOrder,
                id: traceId,
                data: traceData,
            });
        }
    }
    /**
     * Cancel a single order with full orchestration
     * Handles tracing, state management, and analytics
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @param options.bulkActionId - Optional batch correlation id.
     * @returns The result of the operation.
     */
    async cancelOrder(options) {
        const { provider, params, context, bulkActionId } = options;
        const traceId = (0, uuid_1.v4)();
        const startTime = __classPrivateFieldGet(this, _TradingService_deps, "f").performance.now();
        let traceData;
        // Shared attribution + bulk correlation props
        const cancelExtraProps = {
            ...__classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_buildAttributionProperties).call(this, params.trackingData),
            ...(bulkActionId && {
                [eventNames_js_1.PERPS_EVENT_PROPERTY.BULK_ACTION_ID]: bulkActionId,
            }),
        };
        try {
            // Start trace for the entire operation
            __classPrivateFieldGet(this, _TradingService_deps, "f").tracer.trace({
                name: index_js_1.PerpsTraceNames.CancelOrder,
                id: traceId,
                op: index_js_1.PerpsTraceOperations.OrderSubmission,
                tags: {
                    provider: context.tracingContext.provider,
                    market: params.symbol,
                    isTestnet: String(context.tracingContext.isTestnet),
                },
                data: {
                    orderId: params.orderId,
                },
            });
            // Emit submitted event before the provider round-trip
            __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_trackSubmitted).call(this, index_js_1.PerpsAnalyticsEvent.OrderCancelTransaction, {
                [eventNames_js_1.PERPS_EVENT_PROPERTY.ASSET]: params.symbol,
                ...cancelExtraProps,
            });
            // Execute order cancellation
            const result = await provider.cancelOrder(params);
            const completionDuration = __classPrivateFieldGet(this, _TradingService_deps, "f").performance.now() - startTime;
            if (result.success) {
                // Update state on success
                if (context.stateManager) {
                    context.stateManager.update((state) => {
                        state.lastUpdateTimestamp = Date.now();
                    });
                }
                // Track order cancel executed
                __classPrivateFieldGet(this, _TradingService_deps, "f").metrics.trackPerpsEvent(index_js_1.PerpsAnalyticsEvent.OrderCancelTransaction, {
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.STATUS]: eventNames_js_1.PERPS_EVENT_VALUE.STATUS.EXECUTED,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.ASSET]: params.symbol,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: completionDuration,
                    ...cancelExtraProps,
                });
                traceData = { success: true, orderId: params.orderId };
            }
            else {
                // Track order cancel failed
                __classPrivateFieldGet(this, _TradingService_deps, "f").metrics.trackPerpsEvent(index_js_1.PerpsAnalyticsEvent.OrderCancelTransaction, {
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.STATUS]: eventNames_js_1.PERPS_EVENT_VALUE.STATUS.FAILED,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.ASSET]: params.symbol,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: completionDuration,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: result.error ?? 'Unknown error',
                    ...cancelExtraProps,
                });
                __classPrivateFieldGet(this, _TradingService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(result.error, 'TradingService.cancelOrder'), __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_getErrorContext).call(this, 'cancelOrder', {
                    symbol: params.symbol,
                    orderId: params.orderId,
                    providerError: result.error ?? 'Unknown error',
                }));
                traceData = { success: false, error: result.error ?? 'Unknown error' };
            }
            return result;
        }
        catch (error) {
            const completionDuration = __classPrivateFieldGet(this, _TradingService_deps, "f").performance.now() - startTime;
            // Track order cancel exception
            __classPrivateFieldGet(this, _TradingService_deps, "f").metrics.trackPerpsEvent(index_js_1.PerpsAnalyticsEvent.OrderCancelTransaction, {
                [eventNames_js_1.PERPS_EVENT_PROPERTY.STATUS]: eventNames_js_1.PERPS_EVENT_VALUE.STATUS.FAILED,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.ASSET]: params.symbol,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: completionDuration,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: error instanceof Error ? error.message : 'Unknown error',
                ...cancelExtraProps,
            });
            __classPrivateFieldGet(this, _TradingService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'TradingService.cancelOrder'), __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_getErrorContext).call(this, 'cancelOrder', { symbol: params.symbol }));
            traceData = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
            throw error;
        }
        finally {
            __classPrivateFieldGet(this, _TradingService_deps, "f").tracer.endTrace({
                name: index_js_1.PerpsTraceNames.CancelOrder,
                id: traceId,
                data: traceData,
            });
        }
    }
    /**
     * Cancel multiple orders with full orchestration
     * Handles tracing, stream pausing, filtering, batch operations, and analytics
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @param options.withStreamPause - The with stream pause value.
     * @returns The result of the operation.
     */
    async cancelOrders(options) {
        const { provider, params, context, withStreamPause } = options;
        const traceId = (0, uuid_1.v4)();
        // Correlation id linking every per-item event to the batch summary
        const bulkActionId = (0, uuid_1.v4)();
        const startTime = __classPrivateFieldGet(this, _TradingService_deps, "f").performance.now();
        let operationResult = null;
        let operationError = null;
        try {
            // Start trace for batch operation
            __classPrivateFieldGet(this, _TradingService_deps, "f").tracer.trace({
                name: index_js_1.PerpsTraceNames.CancelOrder,
                id: traceId,
                op: index_js_1.PerpsTraceOperations.OrderSubmission,
                tags: {
                    provider: context.tracingContext.provider,
                    isBatch: 'true',
                    isTestnet: String(context.tracingContext.isTestnet),
                },
                data: {
                    cancelAll: params.cancelAll ? 'true' : 'false',
                    symbolCount: params.symbols?.length ?? 0,
                    orderIdCount: params.orderIds?.length ?? 0,
                },
            });
            // Pause orders stream to prevent WebSocket updates during cancellation
            operationResult = await withStreamPause(async () => {
                // Get all open orders
                if (!context.getOpenOrders) {
                    throw new Error('getOpenOrders callback not provided in context');
                }
                const orders = await context.getOpenOrders();
                // Filter orders based on params
                let ordersToCancel = orders;
                if (params.cancelAll === true ||
                    (!params.symbols && !params.orderIds)) {
                    // Cancel all orders (excluding TP/SL orders for positions)
                    ordersToCancel = orders.filter((order) => !(0, orderTypes_js_1.isTPSLOrder)(order.detailedOrderType));
                }
                else if (params.orderIds && params.orderIds.length > 0) {
                    // Cancel specific order IDs
                    ordersToCancel = orders.filter((order) => params.orderIds?.includes(order.orderId));
                }
                else if (params.symbols && params.symbols.length > 0) {
                    // Cancel orders for specific symbols
                    ordersToCancel = orders.filter((order) => params.symbols?.includes(order.symbol));
                }
                if (ordersToCancel.length === 0) {
                    return {
                        success: false,
                        successCount: 0,
                        failureCount: 0,
                        results: [],
                    };
                }
                // Use batch cancel if provider supports it
                if (provider.cancelOrders) {
                    return await provider.cancelOrders(ordersToCancel.map((order) => ({
                        symbol: order.symbol,
                        orderId: order.orderId,
                    })));
                }
                // Fallback: Cancel orders in parallel (for providers without batch support)
                const results = await Promise.allSettled(ordersToCancel.map((order) => this.cancelOrder({
                    provider,
                    params: { symbol: order.symbol, orderId: order.orderId },
                    context,
                    bulkActionId,
                })));
                // Aggregate results
                const successCount = results.filter((res) => res.status === 'fulfilled' && res.value.success).length;
                const failureCount = results.length - successCount;
                return {
                    success: successCount > 0,
                    successCount,
                    failureCount,
                    results: results.map((result, index) => {
                        let error;
                        if (result.status === 'rejected') {
                            error =
                                result.reason instanceof Error
                                    ? result.reason.message
                                    : 'Unknown error';
                        }
                        else if (result.status === 'fulfilled' && !result.value.success) {
                            error = result.value.error;
                        }
                        return {
                            orderId: ordersToCancel[index].orderId,
                            symbol: ordersToCancel[index].symbol,
                            success: Boolean(result.status === 'fulfilled' && result.value.success),
                            error,
                        };
                    }),
                };
            }, ['orders']); // Disconnect orders stream during operation
            if (provider.cancelOrders &&
                operationResult &&
                operationResult.failureCount > 0) {
                const failureSummary = operationResult.results
                    .filter((result) => !result.success)
                    .map((result) => `${result.symbol}/${result.orderId}: ${result.error ?? 'Unknown error'}`)
                    .join('; ');
                __classPrivateFieldGet(this, _TradingService_deps, "f").logger.error(new Error(`cancelOrders batch failure: ${operationResult.failureCount}/${operationResult.results.length} failed - ${failureSummary}`), __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_getErrorContext).call(this, 'cancelOrders', {
                    successCount: operationResult.successCount,
                    failureCount: operationResult.failureCount,
                    cancelAll: params.cancelAll,
                }));
            }
            return operationResult;
        }
        catch (error) {
            operationError =
                error instanceof Error ? error : new Error(String(error));
            __classPrivateFieldGet(this, _TradingService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'TradingService.cancelOrders'), __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_getErrorContext).call(this, 'cancelOrders'));
            throw error;
        }
        finally {
            const completionDuration = __classPrivateFieldGet(this, _TradingService_deps, "f").performance.now() - startTime;
            // Track batch cancel event (success or failure)
            const batchCancelProps = {
                [eventNames_js_1.PERPS_EVENT_PROPERTY.STATUS]: operationResult?.success && operationResult.successCount > 0
                    ? eventNames_js_1.PERPS_EVENT_VALUE.STATUS.EXECUTED
                    : eventNames_js_1.PERPS_EVENT_VALUE.STATUS.FAILED,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: completionDuration,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.BULK_ACTION_ID]: bulkActionId,
            };
            if (operationError) {
                batchCancelProps[eventNames_js_1.PERPS_EVENT_PROPERTY.ERROR_MESSAGE] =
                    operationError.message;
            }
            __classPrivateFieldGet(this, _TradingService_deps, "f").metrics.trackPerpsEvent(index_js_1.PerpsAnalyticsEvent.OrderCancelTransaction, batchCancelProps);
            __classPrivateFieldGet(this, _TradingService_deps, "f").tracer.endTrace({
                name: index_js_1.PerpsTraceNames.CancelOrder,
                id: traceId,
            });
        }
    }
    /**
     * Close a single position with full orchestration
     * Handles tracing, fee discounts, state management, analytics, and data lake reporting
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @param options.reportOrderToDataLake - The report order to data lake value.
     * @param options.bulkActionId - Optional batch correlation id.
     * @returns The result of the operation.
     */
    async closePosition(options) {
        const { provider, params, context, reportOrderToDataLake, bulkActionId } = options;
        const traceId = (0, uuid_1.v4)();
        const startTime = __classPrivateFieldGet(this, _TradingService_deps, "f").performance.now();
        let position;
        let result;
        let traceData;
        try {
            __classPrivateFieldGet(this, _TradingService_deps, "f").tracer.trace({
                name: index_js_1.PerpsTraceNames.ClosePosition,
                id: traceId,
                op: index_js_1.PerpsTraceOperations.PositionManagement,
                tags: {
                    provider: context.tracingContext.provider,
                    symbol: params.symbol,
                    closeSize: params.size ?? 'full',
                    isTestnet: String(context.tracingContext.isTestnet),
                },
            });
            // Load position data with measurement
            position = await __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_loadPositionData).call(this, {
                symbol: params.symbol,
                context,
            });
            // Emit submitted event before the provider round-trip
            __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_trackSubmitted).call(this, index_js_1.PerpsAnalyticsEvent.PositionCloseTransaction, {
                [eventNames_js_1.PERPS_EVENT_PROPERTY.ASSET]: params.symbol,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.ORDER_TYPE]: params.orderType ?? eventNames_js_1.PERPS_EVENT_VALUE.ORDER_TYPE.MARKET,
                ...__classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_buildAttributionProperties).call(this, params.trackingData),
                ...(bulkActionId && {
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.BULK_ACTION_ID]: bulkActionId,
                }),
            });
            // Calculate fee discount with measurement
            const feeResolution = await __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_calculateFeeDiscountWithMeasurement).call(this);
            // Execute position close with fee discount management
            result = await __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_withFeeDiscount).call(this, {
                provider,
                feeResolution,
                operation: () => provider.closePosition(params),
            });
            const completionDuration = __classPrivateFieldGet(this, _TradingService_deps, "f").performance.now() - startTime;
            if (result.success) {
                // Update state on success
                if (context.stateManager) {
                    context.stateManager.update((state) => {
                        state.lastUpdateTimestamp = Date.now();
                    });
                }
                // Report to data lake (fire-and-forget)
                __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_handleDataLakeReporting).call(this, reportOrderToDataLake, params.symbol, context);
                traceData = { success: true, filledSize: result.filledSize ?? '' };
                // Invalidate standalone caches so external hooks (e.g., usePerpsPositionForAsset) refresh
                __classPrivateFieldGet(this, _TradingService_deps, "f").cacheInvalidator.invalidate({ cacheType: 'positions' });
                __classPrivateFieldGet(this, _TradingService_deps, "f").cacheInvalidator.invalidate({ cacheType: 'accountState' });
            }
            else {
                traceData = { success: false, error: result.error ?? 'Unknown error' };
                __classPrivateFieldGet(this, _TradingService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(result.error, 'TradingService.closePosition'), __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_getErrorContext).call(this, 'closePosition', {
                    symbol: params.symbol,
                    providerError: result.error ?? 'Unknown error',
                }));
            }
            // Track analytics (success or failure, includes partial fills)
            __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_trackPositionCloseResult).call(this, {
                position,
                result,
                params,
                context,
                duration: completionDuration,
                bulkActionId,
            });
            return result;
        }
        catch (error) {
            const completionDuration = __classPrivateFieldGet(this, _TradingService_deps, "f").performance.now() - startTime;
            traceData = {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
            // Track analytics for exception
            __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_trackPositionCloseResult).call(this, {
                position,
                result: null,
                error: error instanceof Error ? error : undefined,
                params,
                context,
                duration: completionDuration,
                bulkActionId,
            });
            __classPrivateFieldGet(this, _TradingService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'TradingService.closePosition'), {
                tags: {
                    feature: perpsConfig_js_1.PERPS_CONSTANTS.FeatureName,
                    provider: context.tracingContext.provider,
                    network: context.tracingContext.isTestnet ? 'testnet' : 'mainnet',
                },
                context: {
                    name: context.errorContext.controller,
                    data: {
                        method: context.errorContext.method,
                        symbol: params.symbol,
                    },
                },
            });
            throw error;
        }
        finally {
            // Always end trace on exit (success or failure)
            __classPrivateFieldGet(this, _TradingService_deps, "f").tracer.endTrace({
                name: index_js_1.PerpsTraceNames.ClosePosition,
                id: traceId,
                data: traceData,
            });
        }
    }
    /**
     * Close multiple positions with full orchestration
     * Handles tracing, fee discounts, batch operations, and analytics
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    async closePositions(options) {
        const { provider, params, context } = options;
        const traceId = (0, uuid_1.v4)();
        // Correlation id linking every per-item event to the batch summary
        const bulkActionId = (0, uuid_1.v4)();
        const startTime = __classPrivateFieldGet(this, _TradingService_deps, "f").performance.now();
        let operationResult = null;
        let operationError = null;
        try {
            // Start trace for batch operation
            __classPrivateFieldGet(this, _TradingService_deps, "f").tracer.trace({
                name: index_js_1.PerpsTraceNames.ClosePosition,
                id: traceId,
                op: index_js_1.PerpsTraceOperations.PositionManagement,
                tags: {
                    provider: context.tracingContext.provider,
                    isBatch: 'true',
                    isTestnet: String(context.tracingContext.isTestnet),
                },
                data: {
                    closeAll: params.closeAll ? 'true' : 'false',
                    symbolCount: params.symbols?.length ?? 0,
                },
            });
            __classPrivateFieldGet(this, _TradingService_deps, "f").debugLogger.log('[closePositions] Batch method check', {
                providerType: provider.protocolId,
                providerKeys: Object.keys(provider).filter((key) => key.includes('close')),
            });
            // Use batch close if provider supports it (provider handles filtering)
            if (provider.closePositions) {
                const feeResolution = await __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_calculateFeeDiscountWithMeasurement).call(this);
                operationResult = await __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_withFeeDiscount).call(this, {
                    provider,
                    feeResolution,
                    operation: async () => {
                        if (!provider.closePositions) {
                            throw new Error('closePositions method not available');
                        }
                        return provider.closePositions(params);
                    },
                });
            }
            else {
                // Fallback: Get positions, filter, and close in parallel
                if (!context.getPositions) {
                    throw new Error('getPositions callback not provided in context');
                }
                const positions = await context.getPositions();
                const positionsToClose = params.closeAll === true ||
                    !params.symbols ||
                    params.symbols.length === 0
                    ? positions
                    : positions.filter((pos) => params.symbols?.includes(pos.symbol));
                if (positionsToClose.length === 0) {
                    operationResult = {
                        success: false,
                        successCount: 0,
                        failureCount: 0,
                        results: [],
                    };
                    return operationResult;
                }
                const results = await Promise.allSettled(positionsToClose.map((position) => this.closePosition({
                    provider,
                    params: { symbol: position.symbol },
                    context,
                    reportOrderToDataLake: () => Promise.resolve({ success: true }), // No-op for batch fallback
                    bulkActionId,
                })));
                // Aggregate results
                const successCount = results.filter((res) => res.status === 'fulfilled' && res.value.success).length;
                const failureCount = results.length - successCount;
                operationResult = {
                    success: successCount > 0,
                    successCount,
                    failureCount,
                    results: results.map((result, index) => {
                        let error;
                        if (result.status === 'rejected') {
                            error =
                                result.reason instanceof Error
                                    ? result.reason.message
                                    : 'Unknown error';
                        }
                        else if (result.status === 'fulfilled' && !result.value.success) {
                            error = result.value.error;
                        }
                        return {
                            symbol: positionsToClose[index].symbol,
                            success: Boolean(result.status === 'fulfilled' && result.value.success),
                            error,
                        };
                    }),
                };
            }
            if (provider.closePositions &&
                operationResult &&
                operationResult.failureCount > 0) {
                const failureSummary = operationResult.results
                    .filter((result) => !result.success)
                    .map((result) => `${result.symbol}: ${result.error ?? 'Unknown error'}`)
                    .join('; ');
                __classPrivateFieldGet(this, _TradingService_deps, "f").logger.error(new Error(`closePositions batch failure: ${operationResult.failureCount}/${operationResult.results.length} failed - ${failureSummary}`), __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_getErrorContext).call(this, 'closePositions', {
                    successCount: operationResult.successCount,
                    failureCount: operationResult.failureCount,
                    symbols: params.symbols?.length ?? 0,
                    closeAll: params.closeAll,
                }));
            }
            return operationResult;
        }
        catch (error) {
            operationError =
                error instanceof Error ? error : new Error(String(error));
            __classPrivateFieldGet(this, _TradingService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'TradingService.closePositions'), __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_getErrorContext).call(this, 'closePositions', {
                symbols: params.symbols?.length ?? 0,
                closeAll: params.closeAll,
            }));
            throw error;
        }
        finally {
            const completionDuration = __classPrivateFieldGet(this, _TradingService_deps, "f").performance.now() - startTime;
            // Track batch close event (success or failure)
            const batchCloseProps = {
                [eventNames_js_1.PERPS_EVENT_PROPERTY.STATUS]: operationResult?.success && operationResult.successCount > 0
                    ? eventNames_js_1.PERPS_EVENT_VALUE.STATUS.EXECUTED
                    : eventNames_js_1.PERPS_EVENT_VALUE.STATUS.FAILED,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: completionDuration,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.BULK_ACTION_ID]: bulkActionId,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.NUMBER_POSITIONS_CLOSED]: operationResult?.successCount ?? 0,
            };
            if (operationError) {
                batchCloseProps[eventNames_js_1.PERPS_EVENT_PROPERTY.ERROR_MESSAGE] =
                    operationError.message;
            }
            __classPrivateFieldGet(this, _TradingService_deps, "f").metrics.trackPerpsEvent(index_js_1.PerpsAnalyticsEvent.PositionCloseTransaction, batchCloseProps);
            // Invalidate standalone caches on successful batch close
            if (operationResult?.success && operationResult.successCount > 0) {
                __classPrivateFieldGet(this, _TradingService_deps, "f").cacheInvalidator.invalidate({ cacheType: 'positions' });
                __classPrivateFieldGet(this, _TradingService_deps, "f").cacheInvalidator.invalidate({ cacheType: 'accountState' });
            }
            __classPrivateFieldGet(this, _TradingService_deps, "f").tracer.endTrace({
                name: index_js_1.PerpsTraceNames.ClosePosition,
                id: traceId,
            });
        }
    }
    /**
     * Update TP/SL for an existing position with full orchestration
     * Handles tracing, fee discounts, state management, and analytics
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.params - The operation parameters.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    async updatePositionTPSL(options) {
        const { provider, params, context } = options;
        const traceId = (0, uuid_1.v4)();
        const startTime = __classPrivateFieldGet(this, _TradingService_deps, "f").performance.now();
        let traceData;
        let result;
        let errorMessage;
        // Extract tracking data with defaults
        const direction = params.trackingData?.direction;
        const positionSize = params.trackingData?.positionSize;
        const source = params.trackingData?.source ?? eventNames_js_1.PERPS_EVENT_VALUE.SOURCE.TP_SL_VIEW;
        const takeProfitPercentage = params.trackingData?.takeProfitPercentage;
        const stopLossPercentage = params.trackingData?.stopLossPercentage;
        const isEditingExistingPosition = params.trackingData?.isEditingExistingPosition ?? false;
        try {
            __classPrivateFieldGet(this, _TradingService_deps, "f").tracer.trace({
                name: index_js_1.PerpsTraceNames.UpdateTpsl,
                id: traceId,
                op: index_js_1.PerpsTraceOperations.PositionManagement,
                tags: {
                    provider: context.tracingContext.provider,
                    market: params.symbol,
                    isTestnet: String(context.tracingContext.isTestnet),
                },
                data: {
                    takeProfitPrice: params.takeProfitPrice ?? '',
                    stopLossPrice: params.stopLossPrice ?? '',
                },
            });
            // Emit submitted event before the provider round-trip
            __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_trackSubmitted).call(this, index_js_1.PerpsAnalyticsEvent.RiskManagement, {
                [eventNames_js_1.PERPS_EVENT_PROPERTY.ASSET]: params.symbol,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.SOURCE]: source,
                ...__classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_buildAttributionProperties).call(this, params.trackingData),
            });
            // Get fee discount from rewards
            const feeResolution = await __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_calculateFeeDiscountWithMeasurement).call(this);
            // Execute with fee discount management
            result = await __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_withFeeDiscount).call(this, {
                provider,
                feeResolution,
                operation: () => provider.updatePositionTPSL(params),
            });
            if (result.success) {
                // Update state on success
                if (context.stateManager) {
                    context.stateManager.update((state) => {
                        state.lastUpdateTimestamp = Date.now();
                    });
                }
                traceData = { success: true };
            }
            else {
                errorMessage = result.error ?? 'Unknown error';
                traceData = { success: false, error: errorMessage };
            }
            return result;
        }
        catch (error) {
            errorMessage = error instanceof Error ? error.message : 'Unknown error';
            traceData = { success: false, error: errorMessage };
            __classPrivateFieldGet(this, _TradingService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'TradingService.updatePositionTPSL'), __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_getErrorContext).call(this, 'updatePositionTPSL', {
                symbol: params.symbol,
                hasTakeProfit: Boolean(params.takeProfitPrice),
                hasStopLoss: Boolean(params.stopLossPrice),
            }));
            throw error;
        }
        finally {
            const completionDuration = __classPrivateFieldGet(this, _TradingService_deps, "f").performance.now() - startTime;
            // Determine screen type based on whether editing existing position
            const screenType = isEditingExistingPosition
                ? eventNames_js_1.PERPS_EVENT_VALUE.SCREEN_TYPE.EDIT_TPSL
                : eventNames_js_1.PERPS_EVENT_VALUE.SCREEN_TYPE.CREATE_TPSL;
            // Determine if TP/SL are set
            const hasTakeProfit = Boolean(params.takeProfitPrice);
            const hasStopLoss = Boolean(params.stopLossPrice);
            // Determine TP/SL action type
            let tpslAction;
            if (hasTakeProfit && hasStopLoss) {
                tpslAction = eventNames_js_1.PERPS_EVENT_VALUE.ACTION.TPSL;
            }
            else if (hasTakeProfit) {
                tpslAction = eventNames_js_1.PERPS_EVENT_VALUE.ACTION.TP;
            }
            else if (hasStopLoss) {
                tpslAction = eventNames_js_1.PERPS_EVENT_VALUE.ACTION.SL;
            }
            // Build comprehensive event properties
            const eventProperties = {
                [eventNames_js_1.PERPS_EVENT_PROPERTY.STATUS]: result?.success
                    ? eventNames_js_1.PERPS_EVENT_VALUE.STATUS.EXECUTED
                    : eventNames_js_1.PERPS_EVENT_VALUE.STATUS.FAILED,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.ASSET]: params.symbol,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: completionDuration,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.SOURCE]: source,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.SCREEN_TYPE]: screenType,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.HAS_TAKE_PROFIT]: hasTakeProfit,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.HAS_STOP_LOSS]: hasStopLoss,
                ...(tpslAction && {
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.ACTION]: tpslAction,
                }),
                ...(direction && {
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.DIRECTION]: direction === 'long'
                        ? eventNames_js_1.PERPS_EVENT_VALUE.DIRECTION.LONG
                        : eventNames_js_1.PERPS_EVENT_VALUE.DIRECTION.SHORT,
                }),
                ...(positionSize !== undefined && {
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.POSITION_SIZE]: positionSize,
                }),
                ...(params.takeProfitPrice && {
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.TAKE_PROFIT_PRICE]: parseFloat(params.takeProfitPrice),
                }),
                ...(params.stopLossPrice && {
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.STOP_LOSS_PRICE]: parseFloat(params.stopLossPrice),
                }),
                ...(takeProfitPercentage !== undefined && {
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.TAKE_PROFIT_PERCENTAGE]: takeProfitPercentage,
                }),
                ...(stopLossPercentage !== undefined && {
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.STOP_LOSS_PERCENTAGE]: stopLossPercentage,
                }),
                ...(errorMessage && {
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: errorMessage,
                }),
                // Discovery attribution
                ...__classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_buildAttributionProperties).call(this, params.trackingData),
            };
            // Track event once with all properties
            __classPrivateFieldGet(this, _TradingService_deps, "f").metrics.trackPerpsEvent(index_js_1.PerpsAnalyticsEvent.RiskManagement, eventProperties);
            __classPrivateFieldGet(this, _TradingService_deps, "f").tracer.endTrace({
                name: index_js_1.PerpsTraceNames.UpdateTpsl,
                id: traceId,
                data: traceData,
            });
        }
    }
    /**
     * Update margin for an existing position (add or remove)
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.symbol - The trading pair symbol.
     * @param options.amount - The amount value.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    async updateMargin(options) {
        const { provider, symbol, amount, context } = options;
        const traceId = (0, uuid_1.v4)();
        const startTime = __classPrivateFieldGet(this, _TradingService_deps, "f").performance.now();
        try {
            __classPrivateFieldGet(this, _TradingService_deps, "f").tracer.trace({
                name: index_js_1.PerpsTraceNames.UpdateMargin,
                id: traceId,
                op: index_js_1.PerpsTraceOperations.PositionManagement,
                tags: {
                    provider: context.tracingContext.provider,
                    symbol,
                    isAdd: String(parseFloat(amount) > 0),
                    isTestnet: String(context.tracingContext.isTestnet),
                },
            });
            // Call provider method
            const result = await provider.updateMargin?.({ symbol, amount });
            if (!result) {
                throw new Error('Provider does not support margin adjustment');
            }
            const completionDuration = __classPrivateFieldGet(this, _TradingService_deps, "f").performance.now() - startTime;
            if (result.success) {
                // Update state on success
                if (context.stateManager) {
                    context.stateManager.update((state) => {
                        state.lastUpdateTimestamp = Date.now();
                    });
                }
                // Track success analytics
                __classPrivateFieldGet(this, _TradingService_deps, "f").metrics.trackPerpsEvent(index_js_1.PerpsAnalyticsEvent.RiskManagement, {
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.STATUS]: eventNames_js_1.PERPS_EVENT_VALUE.STATUS.EXECUTED,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.ASSET]: symbol,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.ACTION]: parseFloat(amount) > 0 ? 'add_margin' : 'remove_margin',
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.MARGIN_USED]: Math.abs(parseFloat(amount)),
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: completionDuration,
                });
                // Invalidate standalone caches so external hooks refresh
                __classPrivateFieldGet(this, _TradingService_deps, "f").cacheInvalidator.invalidate({ cacheType: 'positions' });
                __classPrivateFieldGet(this, _TradingService_deps, "f").cacheInvalidator.invalidate({ cacheType: 'accountState' });
            }
            else {
                // Track failure analytics for a non-throwing provider failure so the
                // terminal Risk Management event is emitted exactly once here (the
                // thrown path below handles exceptions).
                __classPrivateFieldGet(this, _TradingService_deps, "f").metrics.trackPerpsEvent(index_js_1.PerpsAnalyticsEvent.RiskManagement, {
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.STATUS]: eventNames_js_1.PERPS_EVENT_VALUE.STATUS.FAILED,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.ASSET]: symbol,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.ACTION]: parseFloat(amount) > 0 ? 'add_margin' : 'remove_margin',
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.MARGIN_USED]: Math.abs(parseFloat(amount)),
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: completionDuration,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: result.error ?? 'Unknown error',
                });
            }
            __classPrivateFieldGet(this, _TradingService_deps, "f").tracer.endTrace({
                name: index_js_1.PerpsTraceNames.UpdateMargin,
                id: traceId,
                data: { success: result.success, error: result.error ?? '' },
            });
            return result;
        }
        catch (error) {
            const completionDuration = __classPrivateFieldGet(this, _TradingService_deps, "f").performance.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            __classPrivateFieldGet(this, _TradingService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'TradingService.updateMargin'), __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_getErrorContext).call(this, 'updateMargin', { symbol, amount }));
            // Track failure analytics
            __classPrivateFieldGet(this, _TradingService_deps, "f").metrics.trackPerpsEvent(index_js_1.PerpsAnalyticsEvent.RiskManagement, {
                [eventNames_js_1.PERPS_EVENT_PROPERTY.STATUS]: eventNames_js_1.PERPS_EVENT_VALUE.STATUS.FAILED,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.ASSET]: symbol,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.ACTION]: parseFloat(amount) > 0 ? 'add_margin' : 'remove_margin',
                [eventNames_js_1.PERPS_EVENT_PROPERTY.MARGIN_USED]: Math.abs(parseFloat(amount)),
                [eventNames_js_1.PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: completionDuration,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: errorMessage,
            });
            __classPrivateFieldGet(this, _TradingService_deps, "f").tracer.endTrace({
                name: index_js_1.PerpsTraceNames.UpdateMargin,
                id: traceId,
                data: { success: false, error: errorMessage },
            });
            throw error;
        }
    }
    /**
     * Flip position (reverse direction while keeping size and leverage)
     *
     * @param options - The configuration options.
     * @param options.provider - The perps provider instance.
     * @param options.position - The position data.
     * @param options.trackingData - Optional tracking data for analytics events.
     * @param options.context - The service context for dependencies.
     * @returns The result of the operation.
     */
    async flipPosition(options) {
        const { provider, position, trackingData, context } = options;
        const traceId = (0, uuid_1.v4)();
        const startTime = __classPrivateFieldGet(this, _TradingService_deps, "f").performance.now();
        try {
            __classPrivateFieldGet(this, _TradingService_deps, "f").tracer.trace({
                name: index_js_1.PerpsTraceNames.FlipPosition,
                id: traceId,
                op: index_js_1.PerpsTraceOperations.PositionManagement,
                tags: {
                    provider: context.tracingContext.provider,
                    symbol: position.symbol,
                    isTestnet: String(context.tracingContext.isTestnet),
                },
            });
            // Calculate flip parameters
            const positionSize = Math.abs(parseFloat(position.size));
            const isCurrentlyLong = parseFloat(position.size) > 0;
            const oppositeDirection = !isCurrentlyLong;
            const flipSize = positionSize * 2;
            // Direction-specific flip action, shared by the submitted and terminal events
            const flipAction = isCurrentlyLong
                ? eventNames_js_1.PERPS_EVENT_VALUE.ACTION.FLIP_LONG_TO_SHORT
                : eventNames_js_1.PERPS_EVENT_VALUE.ACTION.FLIP_SHORT_TO_LONG;
            // Create order params for flip
            // Use 2x position size: 1x to close current position + 1x to open opposite position.
            // Do not pass the position entry price as currentPrice: the provider must fetch
            // live market data for validation and IOC pricing.
            const orderParams = {
                symbol: position.symbol,
                isBuy: oppositeDirection,
                size: flipSize.toString(),
                orderType: 'market',
                leverage: position.leverage?.value,
            };
            // Emit submitted event before the provider round-trip, keeping flip
            // trades aligned with the consolidated placeOrder pipeline.
            __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_trackSubmitted).call(this, index_js_1.PerpsAnalyticsEvent.TradeTransaction, {
                [eventNames_js_1.PERPS_EVENT_PROPERTY.ASSET]: position.symbol,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.DIRECTION]: oppositeDirection
                    ? eventNames_js_1.PERPS_EVENT_VALUE.DIRECTION.LONG
                    : eventNames_js_1.PERPS_EVENT_VALUE.DIRECTION.SHORT,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.ORDER_TYPE]: 'market',
                [eventNames_js_1.PERPS_EVENT_PROPERTY.LEVERAGE]: position.leverage?.value || 1,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.ORDER_SIZE]: positionSize,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.ACTION]: flipAction,
                ...__classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_buildAttributionProperties).call(this, trackingData),
            });
            const feeResolution = await __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_calculateFeeDiscountWithMeasurement).call(this);
            // Place flip order (HyperLiquid handles margin transfer automatically)
            const result = await __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_withFeeDiscount).call(this, {
                provider,
                feeResolution,
                operation: () => provider.placeOrder(orderParams),
            });
            const completionDuration = __classPrivateFieldGet(this, _TradingService_deps, "f").performance.now() - startTime;
            const executedPrice = parseFloat(result.averagePrice ?? position.entryPrice);
            if (result.success) {
                // Update state on success
                if (context.stateManager) {
                    context.stateManager.update((state) => {
                        state.lastUpdateTimestamp = Date.now();
                    });
                }
                // Track success analytics with direction-specific flip action
                __classPrivateFieldGet(this, _TradingService_deps, "f").metrics.trackPerpsEvent(index_js_1.PerpsAnalyticsEvent.TradeTransaction, {
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.STATUS]: eventNames_js_1.PERPS_EVENT_VALUE.STATUS.EXECUTED,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.ASSET]: position.symbol,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.DIRECTION]: oppositeDirection
                        ? eventNames_js_1.PERPS_EVENT_VALUE.DIRECTION.LONG
                        : eventNames_js_1.PERPS_EVENT_VALUE.DIRECTION.SHORT,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.ORDER_TYPE]: 'market',
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.LEVERAGE]: position.leverage?.value || 1,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.ORDER_SIZE]: positionSize,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: completionDuration,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.ACTION]: flipAction,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.ORDER_VALUE]: positionSize * executedPrice,
                    // MetaMask fee on flip trades
                    ...(trackingData?.metamaskFee !== undefined && {
                        [eventNames_js_1.PERPS_EVENT_PROPERTY.METAMASK_FEE]: trackingData.metamaskFee,
                    }),
                    ...(trackingData?.vipTier !== undefined && {
                        [eventNames_js_1.PERPS_EVENT_PROPERTY.VIP_TIER]: trackingData.vipTier,
                    }),
                    ...(trackingData?.vipDiscount !== undefined && {
                        [eventNames_js_1.PERPS_EVENT_PROPERTY.VIP_DISCOUNT]: trackingData.vipDiscount,
                    }),
                    ...__classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_buildAttributionProperties).call(this, trackingData),
                });
                // Invalidate standalone caches so external hooks refresh
                __classPrivateFieldGet(this, _TradingService_deps, "f").cacheInvalidator.invalidate({ cacheType: 'positions' });
                __classPrivateFieldGet(this, _TradingService_deps, "f").cacheInvalidator.invalidate({ cacheType: 'accountState' });
            }
            else {
                // Provider rejected the flip without throwing: emit a terminal failed
                // event so every submitted flip is paired with executed or failed.
                __classPrivateFieldGet(this, _TradingService_deps, "f").metrics.trackPerpsEvent(index_js_1.PerpsAnalyticsEvent.TradeTransaction, {
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.STATUS]: eventNames_js_1.PERPS_EVENT_VALUE.STATUS.FAILED,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.ASSET]: position.symbol,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.ACTION]: flipAction,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: completionDuration,
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: result.error ?? 'Unknown error',
                    ...(trackingData?.vipTier !== undefined && {
                        [eventNames_js_1.PERPS_EVENT_PROPERTY.VIP_TIER]: trackingData.vipTier,
                    }),
                    ...(trackingData?.vipDiscount !== undefined && {
                        [eventNames_js_1.PERPS_EVENT_PROPERTY.VIP_DISCOUNT]: trackingData.vipDiscount,
                    }),
                    ...__classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_buildAttributionProperties).call(this, trackingData),
                });
            }
            __classPrivateFieldGet(this, _TradingService_deps, "f").tracer.endTrace({
                name: index_js_1.PerpsTraceNames.FlipPosition,
                id: traceId,
                data: { success: result.success ?? false, error: result.error ?? '' },
            });
            return result;
        }
        catch (error) {
            const completionDuration = __classPrivateFieldGet(this, _TradingService_deps, "f").performance.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            __classPrivateFieldGet(this, _TradingService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'TradingService.flipPosition'), __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_getErrorContext).call(this, 'flipPosition', { symbol: position.symbol }));
            // Track failure analytics with direction-specific flip action
            const wasLong = parseFloat(position.size) > 0;
            const failFlipAction = wasLong
                ? eventNames_js_1.PERPS_EVENT_VALUE.ACTION.FLIP_LONG_TO_SHORT
                : eventNames_js_1.PERPS_EVENT_VALUE.ACTION.FLIP_SHORT_TO_LONG;
            __classPrivateFieldGet(this, _TradingService_deps, "f").metrics.trackPerpsEvent(index_js_1.PerpsAnalyticsEvent.TradeTransaction, {
                [eventNames_js_1.PERPS_EVENT_PROPERTY.STATUS]: eventNames_js_1.PERPS_EVENT_VALUE.STATUS.FAILED,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.ASSET]: position.symbol,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.ACTION]: failFlipAction,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: completionDuration,
                [eventNames_js_1.PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: errorMessage,
                ...(trackingData?.vipTier !== undefined && {
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.VIP_TIER]: trackingData.vipTier,
                }),
                ...(trackingData?.vipDiscount !== undefined && {
                    [eventNames_js_1.PERPS_EVENT_PROPERTY.VIP_DISCOUNT]: trackingData.vipDiscount,
                }),
                ...__classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_buildAttributionProperties).call(this, trackingData),
            });
            __classPrivateFieldGet(this, _TradingService_deps, "f").tracer.endTrace({
                name: index_js_1.PerpsTraceNames.FlipPosition,
                id: traceId,
                data: { success: false, error: errorMessage },
            });
            throw error;
        }
    }
}
exports.TradingService = TradingService;
_TradingService_deps = new WeakMap(), _TradingService_controllerDeps = new WeakMap(), _TradingService_feeContextTail = new WeakMap(), _TradingService_instances = new WeakSet(), _TradingService_getErrorContext = function _TradingService_getErrorContext(method, additionalContext) {
    return {
        controller: 'TradingService',
        method,
        ...additionalContext,
    };
}, _TradingService_buildAttributionProperties = function _TradingService_buildAttributionProperties(trackingData) {
    const properties = {};
    if (trackingData?.entryPoint !== undefined) {
        properties[eventNames_js_1.PERPS_EVENT_PROPERTY.ENTRY_POINT] = trackingData.entryPoint;
    }
    if (trackingData?.discoverySource !== undefined) {
        properties[eventNames_js_1.PERPS_EVENT_PROPERTY.DISCOVERY_SOURCE] =
            trackingData.discoverySource;
    }
    if (trackingData?.perpDiscoverySource !== undefined) {
        properties[eventNames_js_1.PERPS_EVENT_PROPERTY.PERP_DISCOVERY_SOURCE] =
            trackingData.perpDiscoverySource;
    }
    if (trackingData?.hlFeeRate !== undefined) {
        properties[eventNames_js_1.PERPS_EVENT_PROPERTY.HL_FEE_RATE] = trackingData.hlFeeRate;
    }
    return properties;
}, _TradingService_trackSubmitted = function _TradingService_trackSubmitted(event, properties) {
    __classPrivateFieldGet(this, _TradingService_deps, "f").metrics.trackPerpsEvent(event, {
        [eventNames_js_1.PERPS_EVENT_PROPERTY.STATUS]: eventNames_js_1.PERPS_EVENT_VALUE.STATUS.SUBMITTED,
        ...properties,
    });
}, _TradingService_trackOrderResult = function _TradingService_trackOrderResult(options) {
    const { result, error, params, duration } = options;
    const status = result?.success === true
        ? eventNames_js_1.PERPS_EVENT_VALUE.STATUS.EXECUTED
        : eventNames_js_1.PERPS_EVENT_VALUE.STATUS.FAILED;
    // Build base properties
    const properties = {
        [eventNames_js_1.PERPS_EVENT_PROPERTY.STATUS]: status,
        [eventNames_js_1.PERPS_EVENT_PROPERTY.ASSET]: params.symbol,
        [eventNames_js_1.PERPS_EVENT_PROPERTY.DIRECTION]: params.isBuy
            ? eventNames_js_1.PERPS_EVENT_VALUE.DIRECTION.LONG
            : eventNames_js_1.PERPS_EVENT_VALUE.DIRECTION.SHORT,
        [eventNames_js_1.PERPS_EVENT_PROPERTY.ORDER_TYPE]: params.orderType,
        [eventNames_js_1.PERPS_EVENT_PROPERTY.LEVERAGE]: parseFloat(String(params.leverage ?? 1)),
        [eventNames_js_1.PERPS_EVENT_PROPERTY.ORDER_SIZE]: parseFloat(result?.filledSize ?? params.size),
        [eventNames_js_1.PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: duration,
    };
    // Add optional properties
    if (params.trackingData?.marginUsed !== undefined) {
        properties[eventNames_js_1.PERPS_EVENT_PROPERTY.MARGIN_USED] =
            params.trackingData.marginUsed;
    }
    if (params.trackingData?.totalFee !== undefined) {
        properties[eventNames_js_1.PERPS_EVENT_PROPERTY.FEES] = params.trackingData.totalFee;
    }
    if (result?.averagePrice ?? params.trackingData?.marketPrice) {
        properties[eventNames_js_1.PERPS_EVENT_PROPERTY.ASSET_PRICE] = result?.averagePrice
            ? parseFloat(result.averagePrice)
            : params.trackingData?.marketPrice;
    }
    // Trigger limit placements carry a real limit price too, so the companion
    // property must not go missing when order_type is stop_limit/take_profit_limit.
    if ((0, orderTypes_js_2.isLimitExecutionOrderType)(params.orderType) && params.price) {
        properties[eventNames_js_1.PERPS_EVENT_PROPERTY.LIMIT_PRICE] = parseFloat(params.price);
    }
    if (params.trackingData?.source) {
        properties[eventNames_js_1.PERPS_EVENT_PROPERTY.SOURCE] = params.trackingData.source;
    }
    if (params.trackingData?.chartLibrary) {
        properties[eventNames_js_1.PERPS_EVENT_PROPERTY.CHART_LIBRARY] =
            params.trackingData.chartLibrary;
    }
    if (params.trackingData?.tradeAction) {
        properties[eventNames_js_1.PERPS_EVENT_PROPERTY.ACTION] = params.trackingData.tradeAction;
    }
    // Pay with any token: trade_with_token (boolean); when true, include mm_pay_token_selected and mm_pay_network_selected; when false (Perps balance), include mm_pay_token_selected: "Perps Balance"
    properties[eventNames_js_1.PERPS_EVENT_PROPERTY.TRADE_WITH_TOKEN] =
        params.trackingData?.tradeWithToken === true;
    if (params.trackingData?.tradeWithToken === true) {
        if (params.trackingData.mmPayTokenSelected !== undefined) {
            properties[eventNames_js_1.PERPS_EVENT_PROPERTY.MM_PAY_TOKEN_SELECTED] =
                params.trackingData.mmPayTokenSelected;
        }
        if (params.trackingData.mmPayNetworkSelected !== undefined) {
            properties[eventNames_js_1.PERPS_EVENT_PROPERTY.MM_PAY_NETWORK_SELECTED] =
                params.trackingData.mmPayNetworkSelected;
        }
    }
    else if (params.trackingData !== undefined) {
        properties[eventNames_js_1.PERPS_EVENT_PROPERTY.MM_PAY_TOKEN_SELECTED] =
            eventNames_js_1.PERPS_EVENT_VALUE.MM_PAY_TOKEN.PERPS_BALANCE;
    }
    // Calculate order value in USD (size * price)
    const orderSize = parseFloat(result?.filledSize ?? params.size);
    const assetPrice = result?.averagePrice
        ? parseFloat(result.averagePrice)
        : params.trackingData?.marketPrice;
    if (assetPrice && orderSize) {
        properties[eventNames_js_1.PERPS_EVENT_PROPERTY.ORDER_VALUE] = orderSize * assetPrice;
    }
    // Add success-specific properties
    if (status === eventNames_js_1.PERPS_EVENT_VALUE.STATUS.EXECUTED) {
        if (params.trackingData?.metamaskFee !== undefined) {
            properties[eventNames_js_1.PERPS_EVENT_PROPERTY.METAMASK_FEE] =
                params.trackingData.metamaskFee;
        }
        if (params.trackingData?.metamaskFeeRate !== undefined) {
            properties[eventNames_js_1.PERPS_EVENT_PROPERTY.METAMASK_FEE_RATE] =
                params.trackingData.metamaskFeeRate;
        }
        if (params.trackingData?.feeDiscountPercentage !== undefined) {
            properties[eventNames_js_1.PERPS_EVENT_PROPERTY.DISCOUNT_PERCENTAGE] =
                params.trackingData.feeDiscountPercentage;
        }
        if (params.trackingData?.estimatedPoints !== undefined) {
            properties[eventNames_js_1.PERPS_EVENT_PROPERTY.ESTIMATED_REWARDS] =
                params.trackingData.estimatedPoints;
        }
        if (params.takeProfitPrice) {
            properties[eventNames_js_1.PERPS_EVENT_PROPERTY.TAKE_PROFIT_PRICE] = parseFloat(params.takeProfitPrice);
        }
        if (params.stopLossPrice) {
            properties[eventNames_js_1.PERPS_EVENT_PROPERTY.STOP_LOSS_PRICE] = parseFloat(params.stopLossPrice);
        }
    }
    else {
        // Add failure-specific properties
        properties[eventNames_js_1.PERPS_EVENT_PROPERTY.ERROR_MESSAGE] =
            error?.message ?? result?.error ?? 'Unknown error';
    }
    if (params.trackingData?.vipTier !== undefined) {
        properties[eventNames_js_1.PERPS_EVENT_PROPERTY.VIP_TIER] = params.trackingData.vipTier;
    }
    if (params.trackingData?.vipDiscount !== undefined) {
        properties[eventNames_js_1.PERPS_EVENT_PROPERTY.VIP_DISCOUNT] =
            params.trackingData.vipDiscount;
    }
    if (params.trackingData?.abTests &&
        Object.keys(params.trackingData.abTests).length > 0) {
        properties[eventNames_js_1.PERPS_EVENT_PROPERTY.AB_TESTS] = params.trackingData.abTests;
    }
    // Propagate discovery attribution + hl_fee_rate
    Object.assign(properties, __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_buildAttributionProperties).call(this, params.trackingData));
    // Emit an additional partially filled trade event when the fill is partial,
    // mirroring the close path so the fill's partiality is visible in analytics
    // rather than hidden behind a status=executed event. Classification is based
    // on the provider's final submitted size (post precision rounding, USD
    // recalculation, and $10-minimum retry), not the caller's pre-normalization
    // params.size — the provider transforms the size before submission and a
    // complete fill of the normalized size must not look partial. When the
    // provider did not report a submitted size we do not classify (rather than
    // guess from params.size). The partial event mirrors the close schema:
    // order_size = submitted size, amount_filled = filled, remaining = the rest.
    // Compare and subtract the decimal size strings with arbitrary-precision
    // math (BigNumber): routing them through parseFloat can introduce
    // binary-float artifacts that collapse distinct values (misclassifying the
    // fill) or leave e-17 dust in remaining_amount. Only convert to Number for
    // the emitted analytics values, after the exact decimal subtraction.
    const submittedSize = result?.submittedSize === undefined
        ? undefined
        : new bignumber_js_1.BigNumber(result.submittedSize);
    const filledSize = result?.filledSize === undefined
        ? undefined
        : new bignumber_js_1.BigNumber(result.filledSize);
    if (result?.success === true &&
        submittedSize !== undefined &&
        filledSize !== undefined &&
        submittedSize.isFinite() &&
        filledSize.isFinite() &&
        filledSize.gt(0) &&
        filledSize.lt(submittedSize)) {
        __classPrivateFieldGet(this, _TradingService_deps, "f").metrics.trackPerpsEvent(index_js_1.PerpsAnalyticsEvent.TradeTransaction, {
            ...properties,
            [eventNames_js_1.PERPS_EVENT_PROPERTY.STATUS]: eventNames_js_1.PERPS_EVENT_VALUE.STATUS.PARTIALLY_FILLED,
            [eventNames_js_1.PERPS_EVENT_PROPERTY.ORDER_SIZE]: submittedSize.toNumber(),
            [eventNames_js_1.PERPS_EVENT_PROPERTY.AMOUNT_FILLED]: filledSize.toNumber(),
            [eventNames_js_1.PERPS_EVENT_PROPERTY.REMAINING_AMOUNT]: submittedSize
                .minus(filledSize)
                .toNumber(),
        });
    }
    __classPrivateFieldGet(this, _TradingService_deps, "f").metrics.trackPerpsEvent(index_js_1.PerpsAnalyticsEvent.TradeTransaction, properties);
}, _TradingService_handleOrderSuccess = 
/**
 * Handle successful order placement (state updates, analytics, data lake reporting)
 *
 * @param options - The configuration options.
 * @param options.params - The operation parameters.
 * @param options.context - The service context for dependencies.
 * @param options.reportOrderToDataLake - The report order to data lake value.
 */
async function _TradingService_handleOrderSuccess(options) {
    const { params, context, reportOrderToDataLake } = options;
    // Update state on success
    if (context.stateManager) {
        context.stateManager.update((state) => {
            state.lastUpdateTimestamp = Date.now();
        });
    }
    // Save executed trade configuration for this market
    if (params.leverage && context.saveTradeConfiguration) {
        context.saveTradeConfiguration(params.symbol, params.leverage);
    }
    // Report to data lake (fire-and-forget with retry)
    reportOrderToDataLake({
        action: 'open',
        symbol: params.symbol,
        slPrice: params.stopLossPrice
            ? parseFloat(params.stopLossPrice)
            : undefined,
        tpPrice: params.takeProfitPrice
            ? parseFloat(params.takeProfitPrice)
            : undefined,
    }).catch((error) => {
        __classPrivateFieldGet(this, _TradingService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'TradingService.handleOrderSuccess'), {
            tags: {
                feature: perpsConfig_js_1.PERPS_CONSTANTS.FeatureName,
                provider: context.tracingContext.provider,
                network: context.tracingContext.isTestnet ? 'testnet' : 'mainnet',
            },
            context: {
                name: context.errorContext.controller,
                data: {
                    method: context.errorContext.method,
                    operation: 'reportOrderToDataLake',
                    symbol: params.symbol,
                },
            },
        });
    });
}, _TradingService_withFeeDiscount = 
/**
 * Execute a trading operation with fee discount context
 * Ensures fee discount is always cleared after operation (success or failure)
 *
 * @param options - The configuration options.
 * @param options.provider - The perps provider instance.
 * @param options.feeResolution - The resolved fee and attribution source.
 * @param options.operation - The operation value.
 * @returns The result of the operation.
 */
async function _TradingService_withFeeDiscount(options) {
    const { provider, feeResolution, operation } = options;
    const previous = __classPrivateFieldGet(this, _TradingService_feeContextTail, "f");
    let release = () => undefined;
    __classPrivateFieldSet(this, _TradingService_feeContextTail, new Promise((resolve) => {
        release = resolve;
    }), "f");
    await previous;
    try {
        if (provider.setUserFeeResolution) {
            provider.setUserFeeResolution(feeResolution);
        }
        else if (provider.setUserFeeDiscount) {
            provider.setUserFeeDiscount(feeResolution?.discountBips);
        }
        if (feeResolution) {
            __classPrivateFieldGet(this, _TradingService_deps, "f").debugLogger.log('TradingService: Fee resolution set in provider', {
                feeDiscountBips: feeResolution.discountBips,
                feeSource: feeResolution.source,
            });
        }
        // Execute the operation
        return await operation();
    }
    finally {
        // Always clear discount context, even on exception
        if (provider.setUserFeeResolution) {
            provider.setUserFeeResolution(undefined);
        }
        else if (provider.setUserFeeDiscount) {
            provider.setUserFeeDiscount(undefined);
        }
        __classPrivateFieldGet(this, _TradingService_deps, "f").debugLogger.log('TradingService: Fee resolution cleared from provider');
        release();
    }
}, _TradingService_loadPositionData = 
/**
 * Load position data with performance measurement
 *
 * @param options - The configuration options.
 * @param options.symbol - The trading pair symbol.
 * @param options.context - The service context for dependencies.
 * @returns The result of the operation.
 */
async function _TradingService_loadPositionData(options) {
    const { symbol, context } = options;
    const positionLoadStart = __classPrivateFieldGet(this, _TradingService_deps, "f").performance.now();
    try {
        const positions = context.getPositions
            ? await context.getPositions()
            : [];
        const position = positions.find((pos) => pos.symbol === symbol);
        __classPrivateFieldGet(this, _TradingService_deps, "f").tracer.setMeasurement(performanceMetrics_js_1.PerpsMeasurementName.PerpsGetPositionsOperation, __classPrivateFieldGet(this, _TradingService_deps, "f").performance.now() - positionLoadStart, 'millisecond');
        return position;
    }
    catch (error) {
        __classPrivateFieldGet(this, _TradingService_deps, "f").debugLogger.log('TradingService: Could not get position data for tracking', error instanceof Error ? error.message : String(error));
        return undefined;
    }
}, _TradingService_calculateCloseMetrics = function _TradingService_calculateCloseMetrics(position, params, result) {
    const direction = parseFloat(position.size) > 0
        ? eventNames_js_1.PERPS_EVENT_VALUE.DIRECTION.LONG
        : eventNames_js_1.PERPS_EVENT_VALUE.DIRECTION.SHORT;
    const filledSize = result.filledSize ? parseFloat(result.filledSize) : 0;
    const requestedSize = params.size
        ? parseFloat(params.size)
        : Math.abs(parseFloat(position.size));
    const isPartiallyFilled = filledSize > 0 && filledSize < requestedSize;
    const orderType = params.orderType ?? eventNames_js_1.PERPS_EVENT_VALUE.ORDER_TYPE.MARKET;
    const closePercentage = params.size
        ? (parseFloat(params.size) / Math.abs(parseFloat(position.size))) * 100
        : 100;
    const closeType = closePercentage === 100
        ? eventNames_js_1.PERPS_EVENT_VALUE.CLOSE_TYPE.FULL
        : eventNames_js_1.PERPS_EVENT_VALUE.CLOSE_TYPE.PARTIAL;
    return {
        direction,
        closePercentage,
        closeType,
        orderType,
        filledSize,
        requestedSize,
        isPartiallyFilled,
    };
}, _TradingService_buildCloseEventProperties = function _TradingService_buildCloseEventProperties(position, params, metrics, result, status, error) {
    // Effective leverage = positionUSD / marginUSD, rounded to 1 decimal place.
    // Computed from the live position rather than the configured leverage so it's
    // populated for every close, including TP/SL triggers.
    const positionUSD = Math.abs(parseFloat(position.positionValue));
    const marginUSD = parseFloat(position.marginUsed);
    const effectiveLeverage = Number.isFinite(positionUSD) &&
        Number.isFinite(marginUSD) &&
        marginUSD > 0
        ? Math.round((positionUSD / marginUSD) * 10) / 10
        : undefined;
    const baseProperties = {
        [eventNames_js_1.PERPS_EVENT_PROPERTY.STATUS]: status,
        [eventNames_js_1.PERPS_EVENT_PROPERTY.ASSET]: position.symbol,
        [eventNames_js_1.PERPS_EVENT_PROPERTY.DIRECTION]: metrics.direction,
        [eventNames_js_1.PERPS_EVENT_PROPERTY.ORDER_TYPE]: metrics.orderType,
        [eventNames_js_1.PERPS_EVENT_PROPERTY.ORDER_SIZE]: metrics.requestedSize,
        [eventNames_js_1.PERPS_EVENT_PROPERTY.OPEN_POSITION_SIZE]: Math.abs(parseFloat(position.size)),
        [eventNames_js_1.PERPS_EVENT_PROPERTY.PERCENTAGE_CLOSED]: metrics.closePercentage,
        ...(position.unrealizedPnl && {
            [eventNames_js_1.PERPS_EVENT_PROPERTY.PNL_DOLLAR]: parseFloat(position.unrealizedPnl),
        }),
        ...(position.returnOnEquity && {
            [eventNames_js_1.PERPS_EVENT_PROPERTY.PNL_PERCENT]: parseFloat(position.returnOnEquity) * 100,
        }),
        ...(params.trackingData?.totalFee !== undefined && {
            [eventNames_js_1.PERPS_EVENT_PROPERTY.FEE]: params.trackingData.totalFee,
        }),
        ...(params.trackingData?.metamaskFee !== undefined && {
            [eventNames_js_1.PERPS_EVENT_PROPERTY.METAMASK_FEE]: params.trackingData.metamaskFee,
        }),
        ...(params.trackingData?.metamaskFeeRate !== undefined && {
            [eventNames_js_1.PERPS_EVENT_PROPERTY.METAMASK_FEE_RATE]: params.trackingData.metamaskFeeRate,
        }),
        ...(params.trackingData?.feeDiscountPercentage !== undefined && {
            [eventNames_js_1.PERPS_EVENT_PROPERTY.DISCOUNT_PERCENTAGE]: params.trackingData.feeDiscountPercentage,
        }),
        ...(params.trackingData?.estimatedPoints !== undefined && {
            [eventNames_js_1.PERPS_EVENT_PROPERTY.ESTIMATED_REWARDS]: params.trackingData.estimatedPoints,
        }),
        ...((params.trackingData?.marketPrice ?? result?.averagePrice) && {
            [eventNames_js_1.PERPS_EVENT_PROPERTY.ASSET_PRICE]: result?.averagePrice
                ? parseFloat(result.averagePrice)
                : params.trackingData?.marketPrice,
        }),
        ...(params.orderType &&
            (0, orderTypes_js_2.isLimitExecutionOrderType)(params.orderType) &&
            params.price && {
            [eventNames_js_1.PERPS_EVENT_PROPERTY.LIMIT_PRICE]: parseFloat(params.price),
        }),
        ...(params.trackingData?.receivedAmount !== undefined && {
            [eventNames_js_1.PERPS_EVENT_PROPERTY.RECEIVED_AMOUNT]: params.trackingData.receivedAmount,
        }),
        ...(params.trackingData?.source && {
            [eventNames_js_1.PERPS_EVENT_PROPERTY.SOURCE]: params.trackingData.source,
        }),
        ...(params.trackingData?.vipTier !== undefined && {
            [eventNames_js_1.PERPS_EVENT_PROPERTY.VIP_TIER]: params.trackingData.vipTier,
        }),
        ...(params.trackingData?.vipDiscount !== undefined && {
            [eventNames_js_1.PERPS_EVENT_PROPERTY.VIP_DISCOUNT]: params.trackingData.vipDiscount,
        }),
        // Effective leverage on close events
        ...(effectiveLeverage !== undefined && {
            [eventNames_js_1.PERPS_EVENT_PROPERTY.LEVERAGE]: effectiveLeverage,
        }),
        // Discovery attribution + hl_fee_rate
        ...__classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_buildAttributionProperties).call(this, params.trackingData),
    };
    // Calculate and add order value in USD (size * price)
    const closeAssetPrice = result?.averagePrice
        ? parseFloat(result.averagePrice)
        : params.trackingData?.marketPrice;
    const orderValue = closeAssetPrice && metrics.requestedSize
        ? metrics.requestedSize * closeAssetPrice
        : undefined;
    // Add success-specific properties
    if (status === eventNames_js_1.PERPS_EVENT_VALUE.STATUS.EXECUTED) {
        return {
            ...baseProperties,
            [eventNames_js_1.PERPS_EVENT_PROPERTY.CLOSE_TYPE]: metrics.closeType,
            ...(orderValue !== undefined && {
                [eventNames_js_1.PERPS_EVENT_PROPERTY.ORDER_VALUE]: orderValue,
            }),
        };
    }
    // Add error for failures
    return {
        ...baseProperties,
        ...(error && { [eventNames_js_1.PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: error }),
        ...(orderValue !== undefined && {
            [eventNames_js_1.PERPS_EVENT_PROPERTY.ORDER_VALUE]: orderValue,
        }),
    };
}, _TradingService_trackPositionCloseResult = function _TradingService_trackPositionCloseResult(options) {
    const { position, result, error, params, duration, bulkActionId } = options;
    // Bulk action correlation id for batch close events
    const bulkActionProps = bulkActionId
        ? { [eventNames_js_1.PERPS_EVENT_PROPERTY.BULK_ACTION_ID]: bulkActionId }
        : {};
    if (!position) {
        // No local position record, yet closePosition already emitted a
        // submitted event and the close may still complete at the provider.
        // Emit a terminal (executed/failed) event so every submitted close has a
        // matching outcome, even without position-derived metrics.
        const status = result?.success === true
            ? eventNames_js_1.PERPS_EVENT_VALUE.STATUS.EXECUTED
            : eventNames_js_1.PERPS_EVENT_VALUE.STATUS.FAILED;
        const errorMessage = error?.message ?? result?.error;
        __classPrivateFieldGet(this, _TradingService_deps, "f").metrics.trackPerpsEvent(index_js_1.PerpsAnalyticsEvent.PositionCloseTransaction, {
            [eventNames_js_1.PERPS_EVENT_PROPERTY.STATUS]: status,
            [eventNames_js_1.PERPS_EVENT_PROPERTY.ASSET]: params.symbol,
            [eventNames_js_1.PERPS_EVENT_PROPERTY.ORDER_TYPE]: params.orderType ?? eventNames_js_1.PERPS_EVENT_VALUE.ORDER_TYPE.MARKET,
            [eventNames_js_1.PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: duration,
            ...(errorMessage && {
                [eventNames_js_1.PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: errorMessage,
            }),
            ...__classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_buildAttributionProperties).call(this, params.trackingData),
            ...bulkActionProps,
        });
        return;
    }
    const metrics = result
        ? __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_calculateCloseMetrics).call(this, position, params, result)
        : {
            direction: parseFloat(position.size) > 0
                ? eventNames_js_1.PERPS_EVENT_VALUE.DIRECTION.LONG
                : eventNames_js_1.PERPS_EVENT_VALUE.DIRECTION.SHORT,
            closePercentage: params.size
                ? (parseFloat(params.size) / Math.abs(parseFloat(position.size))) *
                    100
                : 100,
            closeType: eventNames_js_1.PERPS_EVENT_VALUE.CLOSE_TYPE.FULL,
            orderType: params.orderType ?? eventNames_js_1.PERPS_EVENT_VALUE.ORDER_TYPE.MARKET,
            requestedSize: params.size
                ? parseFloat(params.size)
                : Math.abs(parseFloat(position.size)),
            filledSize: 0,
            isPartiallyFilled: false,
        };
    // Track partially filled event if applicable
    if (result?.success && metrics.isPartiallyFilled) {
        const partialProperties = __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_buildCloseEventProperties).call(this, position, params, metrics, result, eventNames_js_1.PERPS_EVENT_VALUE.STATUS.PARTIALLY_FILLED);
        __classPrivateFieldGet(this, _TradingService_deps, "f").metrics.trackPerpsEvent(index_js_1.PerpsAnalyticsEvent.PositionCloseTransaction, {
            ...partialProperties,
            [eventNames_js_1.PERPS_EVENT_PROPERTY.AMOUNT_FILLED]: metrics.filledSize,
            [eventNames_js_1.PERPS_EVENT_PROPERTY.REMAINING_AMOUNT]: metrics.requestedSize - metrics.filledSize,
            [eventNames_js_1.PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: duration,
            ...bulkActionProps,
        });
    }
    // Determine status
    const status = result?.success === true
        ? eventNames_js_1.PERPS_EVENT_VALUE.STATUS.EXECUTED
        : eventNames_js_1.PERPS_EVENT_VALUE.STATUS.FAILED;
    const errorMessage = error?.message ?? result?.error;
    // Track main close event
    const eventProperties = __classPrivateFieldGet(this, _TradingService_instances, "m", _TradingService_buildCloseEventProperties).call(this, position, params, metrics, result, status, errorMessage);
    __classPrivateFieldGet(this, _TradingService_deps, "f").metrics.trackPerpsEvent(index_js_1.PerpsAnalyticsEvent.PositionCloseTransaction, {
        ...eventProperties,
        [eventNames_js_1.PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: duration,
        ...bulkActionProps,
    });
}, _TradingService_handleDataLakeReporting = function _TradingService_handleDataLakeReporting(reportOrderToDataLake, symbol, context) {
    reportOrderToDataLake({
        action: 'close',
        symbol,
    }).catch((error) => {
        __classPrivateFieldGet(this, _TradingService_deps, "f").logger.error((0, errorUtils_js_1.ensureError)(error, 'TradingService.handleDataLakeReporting'), {
            tags: {
                feature: perpsConfig_js_1.PERPS_CONSTANTS.FeatureName,
                provider: context.tracingContext.provider,
                network: context.tracingContext.isTestnet ? 'testnet' : 'mainnet',
            },
            context: {
                name: context.errorContext.controller,
                data: {
                    method: context.errorContext.method,
                    operation: 'reportOrderToDataLake',
                    symbol,
                },
            },
        });
    });
}, _TradingService_calculateFeeDiscountWithMeasurement = 
/**
 * Calculate fee discount with performance measurement
 * Uses controller dependencies injected via setControllerDependencies()
 * Helper method for placeOrder orchestration
 *
 * @returns The result of the operation.
 */
async function _TradingService_calculateFeeDiscountWithMeasurement() {
    // Check if controller dependencies are available
    if (!__classPrivateFieldGet(this, _TradingService_controllerDeps, "f")) {
        __classPrivateFieldGet(this, _TradingService_deps, "f").debugLogger.log('TradingService: Controller dependencies not set, skipping fee discount');
        return undefined;
    }
    const { rewardsIntegrationService } = __classPrivateFieldGet(this, _TradingService_controllerDeps, "f");
    const orderExecutionFeeDiscountStartTime = __classPrivateFieldGet(this, _TradingService_deps, "f").performance.now();
    // Calculate fee discount using messenger pattern (service handles controller access internally)
    const resolution = await rewardsIntegrationService.resolveFee();
    const orderExecutionFeeDiscountDuration = __classPrivateFieldGet(this, _TradingService_deps, "f").performance.now() - orderExecutionFeeDiscountStartTime;
    // Record measurement
    __classPrivateFieldGet(this, _TradingService_deps, "f").tracer.setMeasurement(performanceMetrics_js_1.PerpsMeasurementName.PerpsRewardsOrderExecutionFeeDiscountApiCall, orderExecutionFeeDiscountDuration, 'millisecond');
    __classPrivateFieldGet(this, _TradingService_deps, "f").debugLogger.log('TradingService: Fee discount API call completed', {
        discountBips: resolution.discountBips,
        source: resolution.source,
        duration: `${orderExecutionFeeDiscountDuration.toFixed(0)}ms`,
    });
    return resolution;
};
//# sourceMappingURL=TradingService.cjs.map