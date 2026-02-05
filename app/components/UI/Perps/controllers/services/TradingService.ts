import { ensureError } from '../../../../../util/errorUtils';
import { isTPSLOrder } from '../../constants/orderTypes';
import { v4 as uuidv4 } from 'uuid';
import { PerpsMeasurementName } from '../../constants/performanceMetrics';
import type { RewardsIntegrationService } from './RewardsIntegrationService';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '../../constants/eventNames';
import type { ServiceContext } from './ServiceContext';
import {
  PerpsAnalyticsEvent,
  PerpsTraceNames,
  PerpsTraceOperations,
  type PerpsProvider,
  type OrderParams,
  type OrderResult,
  type EditOrderParams,
  type CancelOrderParams,
  type CancelOrderResult,
  type CancelOrdersParams,
  type CancelOrdersResult,
  type ClosePositionParams,
  type ClosePositionsParams,
  type ClosePositionsResult,
  type Position,
  type UpdatePositionTPSLParams,
  type PerpsAnalyticsProperties,
  type PerpsPlatformDependencies,
} from '../types';
import { PerpsCacheInvalidator } from '../../services/PerpsCacheInvalidator';

/**
 * Controller-level dependencies for TradingService.
 * These are singletons that don't change per-call, injected once via setControllerDependencies().
 */
export interface TradingServiceControllerDeps {
  rewardsIntegrationService: RewardsIntegrationService;
}

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
export class TradingService {
  /**
   * Platform dependencies for logging, metrics, etc.
   */
  private readonly deps: PerpsPlatformDependencies;

  /**
   * Controller-level dependencies for fee discount calculation.
   * Set via setControllerDependencies() after construction.
   */
  private controllerDeps: TradingServiceControllerDeps | null = null;

  /**
   * Create a new TradingService instance
   * @param deps - Platform dependencies for logging, metrics, etc.
   */
  constructor(deps: PerpsPlatformDependencies) {
    this.deps = deps;
  }

  /**
   * Set controller-level dependencies for fee discount calculation.
   * Called by PerpsController after construction to inject singleton dependencies.
   *
   * @param controllerDeps - Controller-level dependencies (RewardsController, etc.)
   */
  setControllerDependencies(
    controllerDeps: TradingServiceControllerDeps,
  ): void {
    this.controllerDeps = controllerDeps;
  }

  /**
   * Error context helper for consistent logging
   */
  private getErrorContext(
    method: string,
    additionalContext?: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      controller: 'TradingService',
      method,
      ...additionalContext,
    };
  }

  /**
   * Track order result analytics event (success or failure)
   */
  private trackOrderResult(options: {
    result: OrderResult | null;
    error?: Error;
    params: OrderParams;
    context: ServiceContext;
    duration: number;
  }): void {
    const { result, error, params, duration } = options;

    const status =
      result?.success === true
        ? PERPS_EVENT_VALUE.STATUS.EXECUTED
        : PERPS_EVENT_VALUE.STATUS.FAILED;

    // Build base properties
    const properties: PerpsAnalyticsProperties = {
      [PERPS_EVENT_PROPERTY.STATUS]: status,
      [PERPS_EVENT_PROPERTY.ASSET]: params.symbol,
      [PERPS_EVENT_PROPERTY.DIRECTION]: params.isBuy
        ? PERPS_EVENT_VALUE.DIRECTION.LONG
        : PERPS_EVENT_VALUE.DIRECTION.SHORT,
      [PERPS_EVENT_PROPERTY.ORDER_TYPE]: params.orderType,
      [PERPS_EVENT_PROPERTY.LEVERAGE]: parseFloat(String(params.leverage || 1)),
      [PERPS_EVENT_PROPERTY.ORDER_SIZE]: parseFloat(
        result?.filledSize || params.size,
      ),
      [PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: duration,
    };

    // Add optional properties
    if (params.trackingData?.marginUsed != null) {
      properties[PERPS_EVENT_PROPERTY.MARGIN_USED] =
        params.trackingData.marginUsed;
    }
    if (params.trackingData?.totalFee != null) {
      properties[PERPS_EVENT_PROPERTY.FEES] = params.trackingData.totalFee;
    }
    if (result?.averagePrice || params.trackingData?.marketPrice) {
      properties[PERPS_EVENT_PROPERTY.ASSET_PRICE] = result?.averagePrice
        ? parseFloat(result.averagePrice)
        : params.trackingData?.marketPrice;
    }
    if (params.orderType === 'limit' && params.price) {
      properties[PERPS_EVENT_PROPERTY.LIMIT_PRICE] = parseFloat(params.price);
    }
    if (params.trackingData?.source) {
      properties[PERPS_EVENT_PROPERTY.SOURCE] = params.trackingData.source;
    }
    if (params.trackingData?.tradeAction) {
      properties[PERPS_EVENT_PROPERTY.ACTION] = params.trackingData.tradeAction;
    }

    // Add success-specific properties
    if (status === PERPS_EVENT_VALUE.STATUS.EXECUTED) {
      if (params.trackingData?.metamaskFee != null) {
        properties[PERPS_EVENT_PROPERTY.METAMASK_FEE] =
          params.trackingData.metamaskFee;
      }
      if (params.trackingData?.metamaskFeeRate != null) {
        properties[PERPS_EVENT_PROPERTY.METAMASK_FEE_RATE] =
          params.trackingData.metamaskFeeRate;
      }
      if (params.trackingData?.feeDiscountPercentage != null) {
        properties[PERPS_EVENT_PROPERTY.DISCOUNT_PERCENTAGE] =
          params.trackingData.feeDiscountPercentage;
      }
      if (params.trackingData?.estimatedPoints != null) {
        properties[PERPS_EVENT_PROPERTY.ESTIMATED_REWARDS] =
          params.trackingData.estimatedPoints;
      }
      if (params.takeProfitPrice) {
        properties[PERPS_EVENT_PROPERTY.TAKE_PROFIT_PRICE] = parseFloat(
          params.takeProfitPrice,
        );
      }
      if (params.stopLossPrice) {
        properties[PERPS_EVENT_PROPERTY.STOP_LOSS_PRICE] = parseFloat(
          params.stopLossPrice,
        );
      }
    } else {
      // Add failure-specific properties
      properties[PERPS_EVENT_PROPERTY.ERROR_MESSAGE] =
        error?.message || result?.error || 'Unknown error';
    }

    this.deps.metrics.trackPerpsEvent(
      PerpsAnalyticsEvent.TradeTransaction,
      properties,
    );
  }

  /**
   * Handle successful order placement (state updates, analytics, data lake reporting)
   */
  private async handleOrderSuccess(options: {
    params: OrderParams;
    context: ServiceContext;
    reportOrderToDataLake: (params: {
      action: 'open' | 'close';
      symbol: string;
      sl_price?: number;
      tp_price?: number;
    }) => Promise<{ success: boolean; error?: string }>;
  }): Promise<void> {
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
      sl_price: params.stopLossPrice
        ? parseFloat(params.stopLossPrice)
        : undefined,
      tp_price: params.takeProfitPrice
        ? parseFloat(params.takeProfitPrice)
        : undefined,
    }).catch((error) => {
      this.deps.logger.error(ensureError(error), {
        tags: {
          feature: 'perps',
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
  }

  /**
   * Execute a trading operation with fee discount context
   * Ensures fee discount is always cleared after operation (success or failure)
   */
  private async withFeeDiscount<T>(options: {
    provider: PerpsProvider;
    feeDiscountBips?: number;
    operation: () => Promise<T>;
  }): Promise<T> {
    const { provider, feeDiscountBips, operation } = options;

    try {
      // Set discount context in provider for this operation
      if (feeDiscountBips !== undefined && provider.setUserFeeDiscount) {
        provider.setUserFeeDiscount(feeDiscountBips);
        this.deps.debugLogger.log(
          'TradingService: Fee discount set in provider',
          {
            feeDiscountBips,
          },
        );
      }

      // Execute the operation
      return await operation();
    } finally {
      // Always clear discount context, even on exception
      if (provider.setUserFeeDiscount) {
        provider.setUserFeeDiscount(undefined);
        this.deps.debugLogger.log(
          'TradingService: Fee discount cleared from provider',
        );
      }
    }
  }

  /**
   * Place a new order with full orchestration
   * Handles tracing, fee discounts, state management, analytics, and data lake reporting
   */
  async placeOrder(options: {
    provider: PerpsProvider;
    params: OrderParams;
    context: ServiceContext;
    reportOrderToDataLake: (params: {
      action: 'open' | 'close';
      symbol: string;
      sl_price?: number;
      tp_price?: number;
    }) => Promise<{ success: boolean; error?: string }>;
  }): Promise<OrderResult> {
    const { provider, params, context, reportOrderToDataLake } = options;
    const traceId = uuidv4();
    const startTime = this.deps.performance.now();
    let traceData:
      | { success: boolean; error?: string; orderId?: string }
      | undefined;

    try {
      // Start trace for the entire operation
      this.deps.tracer.trace({
        name: PerpsTraceNames.PlaceOrder,
        id: traceId,
        op: PerpsTraceOperations.OrderSubmission,
        tags: {
          provider: context.tracingContext.provider,
          orderType: params.orderType,
          market: params.symbol,
          leverage: String(params.leverage || 1),
          isTestnet: String(context.tracingContext.isTestnet),
        },
        data: {
          isBuy: params.isBuy,
          orderPrice: params.price || '',
        },
      });

      // Calculate fee discount at execution time (fresh, secure)
      const feeDiscountBips = await this.calculateFeeDiscountWithMeasurement();

      this.deps.debugLogger.log('TradingService: Fee discount calculated', {
        feeDiscountBips,
        hasDiscount: feeDiscountBips !== undefined,
      });

      this.deps.debugLogger.log(
        'TradingService: Submitting order to provider',
        {
          symbol: params.symbol,
          orderType: params.orderType,
          isBuy: params.isBuy,
          size: params.size,
          leverage: params.leverage,
          hasTP: !!params.takeProfitPrice,
          hasSL: !!params.stopLossPrice,
        },
      );

      // Execute order with fee discount management
      const result = await this.withFeeDiscount({
        provider,
        feeDiscountBips,
        operation: () => provider.placeOrder(params),
      });

      this.deps.debugLogger.log('TradingService: Provider response received', {
        success: result.success,
        orderId: result.orderId,
        error: result.error,
      });

      // Update state and handle success/failure
      const completionDuration = this.deps.performance.now() - startTime;

      if (result.success) {
        // Handle success: state updates, data lake reporting
        await this.handleOrderSuccess({
          params,
          context,
          reportOrderToDataLake,
        });
        traceData = { success: true, orderId: result.orderId || '' };

        // Invalidate readOnly caches so external hooks (e.g., usePerpsPositionForAsset) refresh
        PerpsCacheInvalidator.invalidate('positions');
        PerpsCacheInvalidator.invalidate('accountState');
      } else {
        traceData = { success: false, error: result.error || 'Unknown error' };
      }

      // Track analytics (success or failure)
      this.trackOrderResult({
        result,
        params,
        context,
        duration: completionDuration,
      });

      return result;
    } catch (error) {
      const completionDuration = this.deps.performance.now() - startTime;

      // Track analytics for exception
      this.trackOrderResult({
        result: null,
        error: error instanceof Error ? error : undefined,
        params,
        context,
        duration: completionDuration,
      });

      // withFeeDiscount handles fee discount cleanup automatically

      this.deps.logger.error(ensureError(error), {
        tags: {
          feature: 'perps',
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
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      throw error;
    } finally {
      // Always end trace on exit (success or failure)
      this.deps.tracer.endTrace({
        name: PerpsTraceNames.PlaceOrder,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Load position data with performance measurement
   */
  private async loadPositionData(options: {
    symbol: string;
    context: ServiceContext;
  }): Promise<Position | undefined> {
    const { symbol, context } = options;

    const positionLoadStart = this.deps.performance.now();
    try {
      const positions = context.getPositions
        ? await context.getPositions()
        : [];
      const position = positions.find((pos) => pos.symbol === symbol);

      this.deps.tracer.setMeasurement(
        PerpsMeasurementName.PerpsGetPositionsOperation,
        this.deps.performance.now() - positionLoadStart,
        'millisecond',
      );

      return position;
    } catch (err) {
      this.deps.debugLogger.log(
        'TradingService: Could not get position data for tracking',
        err instanceof Error ? err.message : String(err),
      );
      return undefined;
    }
  }

  /**
   * Calculate close position metrics
   */
  private calculateCloseMetrics(
    position: Position,
    params: ClosePositionParams,
    result: OrderResult,
  ): {
    direction: string;
    closePercentage: number;
    closeType: string;
    orderType: string;
    filledSize: number;
    requestedSize: number;
    isPartiallyFilled: boolean;
  } {
    const direction =
      parseFloat(position.size) > 0
        ? PERPS_EVENT_VALUE.DIRECTION.LONG
        : PERPS_EVENT_VALUE.DIRECTION.SHORT;

    const filledSize = result.filledSize ? parseFloat(result.filledSize) : 0;
    const requestedSize = params.size
      ? parseFloat(params.size)
      : Math.abs(parseFloat(position.size));
    const isPartiallyFilled = filledSize > 0 && filledSize < requestedSize;

    const orderType = params.orderType || PERPS_EVENT_VALUE.ORDER_TYPE.MARKET;
    const closePercentage = params.size
      ? (parseFloat(params.size) / Math.abs(parseFloat(position.size))) * 100
      : 100;
    const closeType =
      closePercentage === 100
        ? PERPS_EVENT_VALUE.CLOSE_TYPE.FULL
        : PERPS_EVENT_VALUE.CLOSE_TYPE.PARTIAL;

    return {
      direction,
      closePercentage,
      closeType,
      orderType,
      filledSize,
      requestedSize,
      isPartiallyFilled,
    };
  }

  /**
   * Build event properties for position close analytics
   */
  private buildCloseEventProperties(
    position: Position,
    params: ClosePositionParams,
    metrics: {
      direction: string;
      closePercentage: number;
      closeType: string;
      orderType: string;
      requestedSize: number;
    },
    result: OrderResult | null,
    status: string,
    error?: string,
  ): Record<string, unknown> {
    const baseProperties = {
      [PERPS_EVENT_PROPERTY.STATUS]: status,
      [PERPS_EVENT_PROPERTY.ASSET]: position.symbol,
      [PERPS_EVENT_PROPERTY.DIRECTION]: metrics.direction,
      [PERPS_EVENT_PROPERTY.ORDER_TYPE]: metrics.orderType,
      [PERPS_EVENT_PROPERTY.ORDER_SIZE]: metrics.requestedSize,
      [PERPS_EVENT_PROPERTY.OPEN_POSITION_SIZE]: Math.abs(
        parseFloat(position.size),
      ),
      [PERPS_EVENT_PROPERTY.PERCENTAGE_CLOSED]: metrics.closePercentage,
      ...(position.unrealizedPnl && {
        [PERPS_EVENT_PROPERTY.PNL_DOLLAR]: parseFloat(position.unrealizedPnl),
      }),
      ...(position.returnOnEquity && {
        [PERPS_EVENT_PROPERTY.PNL_PERCENT]:
          parseFloat(position.returnOnEquity) * 100,
      }),
      ...(params.trackingData?.totalFee != null && {
        [PERPS_EVENT_PROPERTY.FEE]: params.trackingData.totalFee,
      }),
      ...(params.trackingData?.metamaskFee != null && {
        [PERPS_EVENT_PROPERTY.METAMASK_FEE]: params.trackingData.metamaskFee,
      }),
      ...(params.trackingData?.metamaskFeeRate != null && {
        [PERPS_EVENT_PROPERTY.METAMASK_FEE_RATE]:
          params.trackingData.metamaskFeeRate,
      }),
      ...(params.trackingData?.feeDiscountPercentage != null && {
        [PERPS_EVENT_PROPERTY.DISCOUNT_PERCENTAGE]:
          params.trackingData.feeDiscountPercentage,
      }),
      ...(params.trackingData?.estimatedPoints != null && {
        [PERPS_EVENT_PROPERTY.ESTIMATED_REWARDS]:
          params.trackingData.estimatedPoints,
      }),
      ...((params.trackingData?.marketPrice || result?.averagePrice) && {
        [PERPS_EVENT_PROPERTY.ASSET_PRICE]: result?.averagePrice
          ? parseFloat(result.averagePrice)
          : params.trackingData?.marketPrice,
      }),
      ...(params.orderType === 'limit' &&
        params.price && {
          [PERPS_EVENT_PROPERTY.LIMIT_PRICE]: parseFloat(params.price),
        }),
      ...(params.trackingData?.receivedAmount != null && {
        [PERPS_EVENT_PROPERTY.RECEIVED_AMOUNT]:
          params.trackingData.receivedAmount,
      }),
    };

    // Add success-specific properties
    if (status === PERPS_EVENT_VALUE.STATUS.EXECUTED) {
      return {
        ...baseProperties,
        [PERPS_EVENT_PROPERTY.CLOSE_TYPE]: metrics.closeType,
      };
    }

    // Add error for failures
    return {
      ...baseProperties,
      ...(error && { [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: error }),
    };
  }

  /**
   * Track position close result analytics (consolidates all tracking logic)
   */
  private trackPositionCloseResult(options: {
    position: Position | undefined;
    result: OrderResult | null;
    error?: Error;
    params: ClosePositionParams;
    context: ServiceContext;
    duration: number;
  }): void {
    const { position, result, error, params, duration } = options;

    if (!position) {
      return;
    }

    const metrics = result
      ? this.calculateCloseMetrics(position, params, result)
      : {
          direction:
            parseFloat(position.size) > 0
              ? PERPS_EVENT_VALUE.DIRECTION.LONG
              : PERPS_EVENT_VALUE.DIRECTION.SHORT,
          closePercentage: params.size
            ? (parseFloat(params.size) / Math.abs(parseFloat(position.size))) *
              100
            : 100,
          closeType: PERPS_EVENT_VALUE.CLOSE_TYPE.FULL,
          orderType: params.orderType || PERPS_EVENT_VALUE.ORDER_TYPE.MARKET,
          requestedSize: params.size
            ? parseFloat(params.size)
            : Math.abs(parseFloat(position.size)),
          filledSize: 0,
          isPartiallyFilled: false,
        };

    // Track partially filled event if applicable
    if (result?.success && metrics.isPartiallyFilled) {
      const partialProperties = this.buildCloseEventProperties(
        position,
        params,
        metrics,
        result,
        PERPS_EVENT_VALUE.STATUS.PARTIALLY_FILLED,
      );

      this.deps.metrics.trackPerpsEvent(
        PerpsAnalyticsEvent.PositionCloseTransaction,
        {
          ...partialProperties,
          [PERPS_EVENT_PROPERTY.AMOUNT_FILLED]: metrics.filledSize,
          [PERPS_EVENT_PROPERTY.REMAINING_AMOUNT]:
            metrics.requestedSize - metrics.filledSize,
          [PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: duration,
        },
      );
    }

    // Determine status
    const status =
      result?.success === true
        ? PERPS_EVENT_VALUE.STATUS.EXECUTED
        : PERPS_EVENT_VALUE.STATUS.FAILED;

    const errorMessage = error?.message || result?.error;

    // Track main close event
    const eventProperties = this.buildCloseEventProperties(
      position,
      params,
      metrics,
      result,
      status,
      errorMessage,
    );

    this.deps.metrics.trackPerpsEvent(
      PerpsAnalyticsEvent.PositionCloseTransaction,
      {
        ...eventProperties,
        [PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: duration,
      },
    );
  }

  /**
   * Handle data lake reporting (fire-and-forget)
   */
  private handleDataLakeReporting(
    reportOrderToDataLake: (params: {
      action: 'open' | 'close';
      symbol: string;
    }) => Promise<{ success: boolean; error?: string }>,
    symbol: string,
    context: ServiceContext,
  ): void {
    reportOrderToDataLake({
      action: 'close',
      symbol,
    }).catch((error) => {
      this.deps.logger.error(ensureError(error), {
        tags: {
          feature: 'perps',
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
  }

  /**
   * Calculate fee discount with performance measurement
   * Uses controller dependencies injected via setControllerDependencies()
   * Helper method for placeOrder orchestration
   */
  private async calculateFeeDiscountWithMeasurement(): Promise<
    number | undefined
  > {
    // Check if controller dependencies are available
    if (!this.controllerDeps) {
      this.deps.debugLogger.log(
        'TradingService: Controller dependencies not set, skipping fee discount',
      );
      return undefined;
    }

    const { rewardsIntegrationService } = this.controllerDeps;

    const orderExecutionFeeDiscountStartTime = this.deps.performance.now();

    // Calculate fee discount using messenger pattern (service handles controller access internally)
    const discountBips =
      await rewardsIntegrationService.calculateUserFeeDiscount();

    const orderExecutionFeeDiscountDuration =
      this.deps.performance.now() - orderExecutionFeeDiscountStartTime;

    // Record measurement
    this.deps.tracer.setMeasurement(
      PerpsMeasurementName.PerpsRewardsOrderExecutionFeeDiscountApiCall,
      orderExecutionFeeDiscountDuration,
      'millisecond',
    );

    this.deps.debugLogger.log(
      'TradingService: Fee discount API call completed',
      {
        discountBips,
        duration: `${orderExecutionFeeDiscountDuration.toFixed(0)}ms`,
      },
    );

    return discountBips;
  }

  /**
   * Edit an existing order with full orchestration
   * Handles tracing, fee discounts, state management, and analytics
   */
  async editOrder(options: {
    provider: PerpsProvider;
    params: EditOrderParams;
    context: ServiceContext;
  }): Promise<OrderResult> {
    const { provider, params, context } = options;
    const traceId = uuidv4();
    const startTime = this.deps.performance.now();
    let traceData:
      | { success: boolean; error?: string; orderId?: string }
      | undefined;

    try {
      this.deps.tracer.trace({
        name: PerpsTraceNames.EditOrder,
        id: traceId,
        op: PerpsTraceOperations.OrderSubmission,
        tags: {
          provider: context.tracingContext.provider,
          orderType: params.newOrder.orderType,
          market: params.newOrder.symbol,
          leverage: String(params.newOrder.leverage || 1),
          isTestnet: String(context.tracingContext.isTestnet),
        },
        data: {
          isBuy: params.newOrder.isBuy,
          orderPrice: params.newOrder.price || '',
        },
      });

      // Calculate fee discount only if required dependencies are available
      const feeDiscountBips = await this.calculateFeeDiscountWithMeasurement();

      // Execute order edit with fee discount management
      const result = await this.withFeeDiscount({
        provider,
        feeDiscountBips,
        operation: () => provider.editOrder(params),
      });

      const completionDuration = this.deps.performance.now() - startTime;

      if (result.success) {
        // Update state on success
        if (context.stateManager) {
          context.stateManager.update((state) => {
            state.lastUpdateTimestamp = Date.now();
          });
        }

        // Track order edit executed
        const editExecutedProps: PerpsAnalyticsProperties = {
          [PERPS_EVENT_PROPERTY.STATUS]: PERPS_EVENT_VALUE.STATUS.EXECUTED,
          [PERPS_EVENT_PROPERTY.ASSET]: params.newOrder.symbol,
          [PERPS_EVENT_PROPERTY.DIRECTION]: params.newOrder.isBuy
            ? PERPS_EVENT_VALUE.DIRECTION.LONG
            : PERPS_EVENT_VALUE.DIRECTION.SHORT,
          [PERPS_EVENT_PROPERTY.ORDER_TYPE]: params.newOrder.orderType,
          [PERPS_EVENT_PROPERTY.LEVERAGE]: params.newOrder.leverage || 1,
          [PERPS_EVENT_PROPERTY.ORDER_SIZE]: params.newOrder.size,
          [PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: completionDuration,
        };
        if (params.newOrder.price) {
          editExecutedProps[PERPS_EVENT_PROPERTY.LIMIT_PRICE] = parseFloat(
            params.newOrder.price,
          );
        }
        this.deps.metrics.trackPerpsEvent(
          PerpsAnalyticsEvent.TradeTransaction,
          editExecutedProps,
        );

        traceData = { success: true, orderId: result.orderId || '' };
      } else {
        // Track order edit failed
        this.deps.metrics.trackPerpsEvent(
          PerpsAnalyticsEvent.TradeTransaction,
          {
            [PERPS_EVENT_PROPERTY.STATUS]: PERPS_EVENT_VALUE.STATUS.FAILED,
            [PERPS_EVENT_PROPERTY.ASSET]: params.newOrder.symbol,
            [PERPS_EVENT_PROPERTY.DIRECTION]: params.newOrder.isBuy
              ? PERPS_EVENT_VALUE.DIRECTION.LONG
              : PERPS_EVENT_VALUE.DIRECTION.SHORT,
            [PERPS_EVENT_PROPERTY.ORDER_TYPE]: params.newOrder.orderType,
            [PERPS_EVENT_PROPERTY.LEVERAGE]: params.newOrder.leverage || 1,
            [PERPS_EVENT_PROPERTY.ORDER_SIZE]: params.newOrder.size,
            [PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: completionDuration,
            [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]:
              result.error || 'Unknown error',
          },
        );

        traceData = { success: false, error: result.error || 'Unknown error' };
      }

      return result;
    } catch (error) {
      const completionDuration = this.deps.performance.now() - startTime;

      // Track order edit exception
      this.deps.metrics.trackPerpsEvent(PerpsAnalyticsEvent.TradeTransaction, {
        [PERPS_EVENT_PROPERTY.STATUS]: PERPS_EVENT_VALUE.STATUS.FAILED,
        [PERPS_EVENT_PROPERTY.ASSET]: params.newOrder.symbol,
        [PERPS_EVENT_PROPERTY.DIRECTION]: params.newOrder.isBuy
          ? PERPS_EVENT_VALUE.DIRECTION.LONG
          : PERPS_EVENT_VALUE.DIRECTION.SHORT,
        [PERPS_EVENT_PROPERTY.ORDER_TYPE]: params.newOrder.orderType,
        [PERPS_EVENT_PROPERTY.LEVERAGE]: params.newOrder.leverage || 1,
        [PERPS_EVENT_PROPERTY.ORDER_SIZE]: params.newOrder.size,
        [PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: completionDuration,
        [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]:
          error instanceof Error ? error.message : 'Unknown error',
      });

      this.deps.logger.error(ensureError(error), {
        tags: {
          feature: 'perps',
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
    } finally {
      this.deps.tracer.endTrace({
        name: PerpsTraceNames.EditOrder,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Cancel a single order with full orchestration
   * Handles tracing, state management, and analytics
   */
  async cancelOrder(options: {
    provider: PerpsProvider;
    params: CancelOrderParams;
    context: ServiceContext;
  }): Promise<CancelOrderResult> {
    const { provider, params, context } = options;
    const traceId = uuidv4();
    const startTime = this.deps.performance.now();
    let traceData:
      | { success: boolean; error?: string; orderId?: string }
      | undefined;

    try {
      // Start trace for the entire operation
      this.deps.tracer.trace({
        name: PerpsTraceNames.CancelOrder,
        id: traceId,
        op: PerpsTraceOperations.OrderSubmission,
        tags: {
          provider: context.tracingContext.provider,
          market: params.symbol,
          isTestnet: String(context.tracingContext.isTestnet),
        },
        data: {
          orderId: params.orderId,
        },
      });

      // Execute order cancellation
      const result = await provider.cancelOrder(params);
      const completionDuration = this.deps.performance.now() - startTime;

      if (result.success) {
        // Update state on success
        if (context.stateManager) {
          context.stateManager.update((state) => {
            state.lastUpdateTimestamp = Date.now();
          });
        }

        // Track order cancel executed
        this.deps.metrics.trackPerpsEvent(
          PerpsAnalyticsEvent.OrderCancelTransaction,
          {
            [PERPS_EVENT_PROPERTY.STATUS]: PERPS_EVENT_VALUE.STATUS.EXECUTED,
            [PERPS_EVENT_PROPERTY.ASSET]: params.symbol,
            [PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: completionDuration,
          },
        );

        traceData = { success: true, orderId: params.orderId };
      } else {
        // Track order cancel failed
        this.deps.metrics.trackPerpsEvent(
          PerpsAnalyticsEvent.OrderCancelTransaction,
          {
            [PERPS_EVENT_PROPERTY.STATUS]: PERPS_EVENT_VALUE.STATUS.FAILED,
            [PERPS_EVENT_PROPERTY.ASSET]: params.symbol,
            [PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: completionDuration,
            [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]:
              result.error || 'Unknown error',
          },
        );

        traceData = { success: false, error: result.error || 'Unknown error' };
      }

      return result;
    } catch (error) {
      const completionDuration = this.deps.performance.now() - startTime;

      // Track order cancel exception
      this.deps.metrics.trackPerpsEvent(
        PerpsAnalyticsEvent.OrderCancelTransaction,
        {
          [PERPS_EVENT_PROPERTY.STATUS]: PERPS_EVENT_VALUE.STATUS.FAILED,
          [PERPS_EVENT_PROPERTY.ASSET]: params.symbol,
          [PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: completionDuration,
          [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]:
            error instanceof Error ? error.message : 'Unknown error',
        },
      );

      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('cancelOrder', { symbol: params.symbol }),
      );

      traceData = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      throw error;
    } finally {
      this.deps.tracer.endTrace({
        name: PerpsTraceNames.CancelOrder,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Cancel multiple orders with full orchestration
   * Handles tracing, stream pausing, filtering, batch operations, and analytics
   */
  async cancelOrders(options: {
    provider: PerpsProvider;
    params: CancelOrdersParams;
    context: ServiceContext;
    withStreamPause: <T>(
      operation: () => Promise<T>,
      channels: string[],
    ) => Promise<T>;
  }): Promise<CancelOrdersResult> {
    const { provider, params, context, withStreamPause } = options;
    const traceId = uuidv4();
    const startTime = this.deps.performance.now();
    let operationResult: CancelOrdersResult | null = null;
    let operationError: Error | null = null;

    try {
      // Start trace for batch operation
      this.deps.tracer.trace({
        name: PerpsTraceNames.CancelOrder,
        id: traceId,
        op: PerpsTraceOperations.OrderSubmission,
        tags: {
          provider: context.tracingContext.provider,
          isBatch: 'true',
          isTestnet: String(context.tracingContext.isTestnet),
        },
        data: {
          cancelAll: params.cancelAll ? 'true' : 'false',
          symbolCount: params.symbols?.length || 0,
          orderIdCount: params.orderIds?.length || 0,
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
        if (params.cancelAll || (!params.symbols && !params.orderIds)) {
          // Cancel all orders (excluding TP/SL orders for positions)
          ordersToCancel = orders.filter(
            (order) => !isTPSLOrder(order.detailedOrderType),
          );
        } else if (params.orderIds && params.orderIds.length > 0) {
          // Cancel specific order IDs
          ordersToCancel = orders.filter((order) =>
            params.orderIds?.includes(order.orderId),
          );
        } else if (params.symbols && params.symbols.length > 0) {
          // Cancel orders for specific symbols
          ordersToCancel = orders.filter((order) =>
            params.symbols?.includes(order.symbol),
          );
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
          return await provider.cancelOrders(
            ordersToCancel.map((order) => ({
              symbol: order.symbol,
              orderId: order.orderId,
            })),
          );
        }

        // Fallback: Cancel orders in parallel (for providers without batch support)
        const results = await Promise.allSettled(
          ordersToCancel.map((order) =>
            this.cancelOrder({
              provider,
              params: { symbol: order.symbol, orderId: order.orderId },
              context,
            }),
          ),
        );

        // Aggregate results
        const successCount = results.filter(
          (res) => res.status === 'fulfilled' && res.value.success,
        ).length;
        const failureCount = results.length - successCount;

        return {
          success: successCount > 0,
          successCount,
          failureCount,
          results: results.map((result, index) => {
            let error: string | undefined;
            if (result.status === 'rejected') {
              error =
                result.reason instanceof Error
                  ? result.reason.message
                  : 'Unknown error';
            } else if (result.status === 'fulfilled' && !result.value.success) {
              error = result.value.error;
            }

            return {
              orderId: ordersToCancel[index].orderId,
              symbol: ordersToCancel[index].symbol,
              success: !!(
                result.status === 'fulfilled' && result.value.success
              ),
              error,
            };
          }),
        };
      }, ['orders']); // Disconnect orders stream during operation

      return operationResult;
    } catch (error) {
      operationError =
        error instanceof Error ? error : new Error(String(error));
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('cancelOrders'),
      );
      throw error;
    } finally {
      const completionDuration = this.deps.performance.now() - startTime;

      // Track batch cancel event (success or failure)
      const batchCancelProps: PerpsAnalyticsProperties = {
        [PERPS_EVENT_PROPERTY.STATUS]:
          operationResult?.success && operationResult.successCount > 0
            ? PERPS_EVENT_VALUE.STATUS.EXECUTED
            : PERPS_EVENT_VALUE.STATUS.FAILED,
        [PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: completionDuration,
      };
      if (operationError) {
        batchCancelProps[PERPS_EVENT_PROPERTY.ERROR_MESSAGE] =
          operationError.message;
      }
      this.deps.metrics.trackPerpsEvent(
        PerpsAnalyticsEvent.OrderCancelTransaction,
        batchCancelProps,
      );

      this.deps.tracer.endTrace({
        name: PerpsTraceNames.CancelOrder,
        id: traceId,
      });
    }
  }

  /**
   * Close a single position with full orchestration
   * Handles tracing, fee discounts, state management, analytics, and data lake reporting
   */
  async closePosition(options: {
    provider: PerpsProvider;
    params: ClosePositionParams;
    context: ServiceContext;
    reportOrderToDataLake: (params: {
      action: 'open' | 'close';
      symbol: string;
    }) => Promise<{ success: boolean; error?: string }>;
  }): Promise<OrderResult> {
    const { provider, params, context, reportOrderToDataLake } = options;
    const traceId = uuidv4();
    const startTime = this.deps.performance.now();
    let position: Position | undefined;
    let result: OrderResult | undefined;
    let traceData:
      | { success: boolean; error?: string; filledSize?: string }
      | undefined;

    try {
      this.deps.tracer.trace({
        name: PerpsTraceNames.ClosePosition,
        id: traceId,
        op: PerpsTraceOperations.PositionManagement,
        tags: {
          provider: context.tracingContext.provider,
          symbol: params.symbol,
          closeSize: params.size || 'full',
          isTestnet: String(context.tracingContext.isTestnet),
        },
      });

      // Load position data with measurement
      position = await this.loadPositionData({
        symbol: params.symbol,
        context,
      });

      // Calculate fee discount with measurement
      const feeDiscountBips = await this.calculateFeeDiscountWithMeasurement();

      // Execute position close with fee discount management
      result = await this.withFeeDiscount({
        provider,
        feeDiscountBips,
        operation: () => provider.closePosition(params),
      });

      const completionDuration = this.deps.performance.now() - startTime;

      if (result.success) {
        // Update state on success
        if (context.stateManager) {
          context.stateManager.update((state) => {
            state.lastUpdateTimestamp = Date.now();
          });
        }

        // Report to data lake (fire-and-forget)
        this.handleDataLakeReporting(
          reportOrderToDataLake,
          params.symbol,
          context,
        );

        traceData = { success: true, filledSize: result.filledSize || '' };

        // Invalidate readOnly caches so external hooks (e.g., usePerpsPositionForAsset) refresh
        PerpsCacheInvalidator.invalidate('positions');
        PerpsCacheInvalidator.invalidate('accountState');
      } else {
        traceData = { success: false, error: result.error || 'Unknown error' };
      }

      // Track analytics (success or failure, includes partial fills)
      this.trackPositionCloseResult({
        position,
        result,
        params,
        context,
        duration: completionDuration,
      });

      return result;
    } catch (error) {
      const completionDuration = this.deps.performance.now() - startTime;

      traceData = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      // Track analytics for exception
      this.trackPositionCloseResult({
        position,
        result: null,
        error: error instanceof Error ? error : undefined,
        params,
        context,
        duration: completionDuration,
      });

      this.deps.logger.error(ensureError(error), {
        tags: {
          feature: 'perps',
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
    } finally {
      // Always end trace on exit (success or failure)
      this.deps.tracer.endTrace({
        name: PerpsTraceNames.ClosePosition,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Close multiple positions with full orchestration
   * Handles tracing, fee discounts, batch operations, and analytics
   */
  async closePositions(options: {
    provider: PerpsProvider;
    params: ClosePositionsParams;
    context: ServiceContext;
  }): Promise<ClosePositionsResult> {
    const { provider, params, context } = options;
    const traceId = uuidv4();
    const startTime = this.deps.performance.now();
    let operationResult: ClosePositionsResult | null = null;
    let operationError: Error | null = null;

    try {
      // Start trace for batch operation
      this.deps.tracer.trace({
        name: PerpsTraceNames.ClosePosition,
        id: traceId,
        op: PerpsTraceOperations.PositionManagement,
        tags: {
          provider: context.tracingContext.provider,
          isBatch: 'true',
          isTestnet: String(context.tracingContext.isTestnet),
        },
        data: {
          closeAll: params.closeAll ? 'true' : 'false',
          symbolCount: params.symbols?.length || 0,
        },
      });

      this.deps.debugLogger.log('[closePositions] Batch method check', {
        providerType: provider.protocolId,
        hasBatchMethod: !!provider.closePositions,
        methodType: typeof provider.closePositions,
        providerKeys: Object.keys(provider).filter((key) =>
          key.includes('close'),
        ),
      });

      // Use batch close if provider supports it (provider handles filtering)
      if (provider.closePositions) {
        const feeDiscountBips =
          await this.calculateFeeDiscountWithMeasurement();

        operationResult = await this.withFeeDiscount({
          provider,
          feeDiscountBips,
          operation: async () => {
            if (!provider.closePositions) {
              throw new Error('closePositions method not available');
            }
            return provider.closePositions(params);
          },
        });
      } else {
        // Fallback: Get positions, filter, and close in parallel
        if (!context.getPositions) {
          throw new Error('getPositions callback not provided in context');
        }
        const positions = await context.getPositions();

        const positionsToClose =
          params.closeAll || !params.symbols || params.symbols.length === 0
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

        const results = await Promise.allSettled(
          positionsToClose.map((position) =>
            this.closePosition({
              provider,
              params: { symbol: position.symbol },
              context,
              reportOrderToDataLake: () => Promise.resolve({ success: true }), // No-op for batch fallback
            }),
          ),
        );

        // Aggregate results
        const successCount = results.filter(
          (res) => res.status === 'fulfilled' && res.value.success,
        ).length;
        const failureCount = results.length - successCount;

        operationResult = {
          success: successCount > 0,
          successCount,
          failureCount,
          results: results.map((result, index) => {
            let error: string | undefined;
            if (result.status === 'rejected') {
              error =
                result.reason instanceof Error
                  ? result.reason.message
                  : 'Unknown error';
            } else if (result.status === 'fulfilled' && !result.value.success) {
              error = result.value.error;
            }

            return {
              symbol: positionsToClose[index].symbol,
              success: !!(
                result.status === 'fulfilled' && result.value.success
              ),
              error,
            };
          }),
        };
      }

      return operationResult;
    } catch (error) {
      operationError =
        error instanceof Error ? error : new Error(String(error));
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('closePositions', {
          symbols: params.symbols?.length || 0,
          closeAll: params.closeAll,
        }),
      );
      throw error;
    } finally {
      const completionDuration = this.deps.performance.now() - startTime;

      // Track batch close event (success or failure)
      const batchCloseProps: PerpsAnalyticsProperties = {
        [PERPS_EVENT_PROPERTY.STATUS]:
          operationResult?.success && operationResult.successCount > 0
            ? PERPS_EVENT_VALUE.STATUS.EXECUTED
            : PERPS_EVENT_VALUE.STATUS.FAILED,
        [PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: completionDuration,
      };
      if (operationError) {
        batchCloseProps[PERPS_EVENT_PROPERTY.ERROR_MESSAGE] =
          operationError.message;
      }
      this.deps.metrics.trackPerpsEvent(
        PerpsAnalyticsEvent.PositionCloseTransaction,
        batchCloseProps,
      );

      // Invalidate readOnly caches on successful batch close
      if (operationResult?.success && operationResult.successCount > 0) {
        PerpsCacheInvalidator.invalidate('positions');
        PerpsCacheInvalidator.invalidate('accountState');
      }

      this.deps.tracer.endTrace({
        name: PerpsTraceNames.ClosePosition,
        id: traceId,
      });
    }
  }

  /**
   * Update TP/SL for an existing position with full orchestration
   * Handles tracing, fee discounts, state management, and analytics
   */
  async updatePositionTPSL(options: {
    provider: PerpsProvider;
    params: UpdatePositionTPSLParams;
    context: ServiceContext;
  }): Promise<OrderResult> {
    const { provider, params, context } = options;
    const traceId = uuidv4();
    const startTime = this.deps.performance.now();
    let traceData: { success: boolean; error?: string } | undefined;
    let result: OrderResult | undefined;
    let errorMessage: string | undefined;

    // Extract tracking data with defaults
    const direction = params.trackingData?.direction;
    const positionSize = params.trackingData?.positionSize;
    const source =
      params.trackingData?.source || PERPS_EVENT_VALUE.SOURCE.TP_SL_VIEW;
    const takeProfitPercentage = params.trackingData?.takeProfitPercentage;
    const stopLossPercentage = params.trackingData?.stopLossPercentage;
    const isEditingExistingPosition =
      params.trackingData?.isEditingExistingPosition ?? false;

    try {
      this.deps.tracer.trace({
        name: PerpsTraceNames.UpdateTpsl,
        id: traceId,
        op: PerpsTraceOperations.PositionManagement,
        tags: {
          provider: context.tracingContext.provider,
          market: params.symbol,
          isTestnet: String(context.tracingContext.isTestnet),
        },
        data: {
          takeProfitPrice: params.takeProfitPrice || '',
          stopLossPrice: params.stopLossPrice || '',
        },
      });

      // Get fee discount from rewards
      const feeDiscountBips = await this.calculateFeeDiscountWithMeasurement();

      // Execute with fee discount management
      result = await this.withFeeDiscount({
        provider,
        feeDiscountBips,
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
      } else {
        errorMessage = result.error || 'Unknown error';
        traceData = { success: false, error: errorMessage };
      }

      return result;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      traceData = { success: false, error: errorMessage };
      throw error;
    } finally {
      const completionDuration = this.deps.performance.now() - startTime;

      // Determine screen type based on whether editing existing position
      const screenType = isEditingExistingPosition
        ? PERPS_EVENT_VALUE.SCREEN_TYPE.EDIT_TPSL
        : PERPS_EVENT_VALUE.SCREEN_TYPE.CREATE_TPSL;

      // Determine if TP/SL are set
      const hasTakeProfit = !!params.takeProfitPrice;
      const hasStopLoss = !!params.stopLossPrice;

      // Build comprehensive event properties
      const eventProperties = {
        [PERPS_EVENT_PROPERTY.STATUS]: result?.success
          ? PERPS_EVENT_VALUE.STATUS.EXECUTED
          : PERPS_EVENT_VALUE.STATUS.FAILED,
        [PERPS_EVENT_PROPERTY.ASSET]: params.symbol,
        [PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: completionDuration,
        [PERPS_EVENT_PROPERTY.SOURCE]: source,
        [PERPS_EVENT_PROPERTY.SCREEN_TYPE]: screenType,
        [PERPS_EVENT_PROPERTY.HAS_TAKE_PROFIT]: hasTakeProfit,
        [PERPS_EVENT_PROPERTY.HAS_STOP_LOSS]: hasStopLoss,
        ...(direction && {
          [PERPS_EVENT_PROPERTY.DIRECTION]:
            direction === 'long'
              ? PERPS_EVENT_VALUE.DIRECTION.LONG
              : PERPS_EVENT_VALUE.DIRECTION.SHORT,
        }),
        ...(positionSize !== undefined && {
          [PERPS_EVENT_PROPERTY.POSITION_SIZE]: positionSize,
        }),
        ...(params.takeProfitPrice && {
          [PERPS_EVENT_PROPERTY.TAKE_PROFIT_PRICE]: parseFloat(
            params.takeProfitPrice,
          ),
        }),
        ...(params.stopLossPrice && {
          [PERPS_EVENT_PROPERTY.STOP_LOSS_PRICE]: parseFloat(
            params.stopLossPrice,
          ),
        }),
        ...(takeProfitPercentage !== undefined && {
          [PERPS_EVENT_PROPERTY.TAKE_PROFIT_PERCENTAGE]: takeProfitPercentage,
        }),
        ...(stopLossPercentage !== undefined && {
          [PERPS_EVENT_PROPERTY.STOP_LOSS_PERCENTAGE]: stopLossPercentage,
        }),
        ...(errorMessage && {
          [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: errorMessage,
        }),
      };

      // Track event once with all properties
      this.deps.metrics.trackPerpsEvent(
        PerpsAnalyticsEvent.RiskManagement,
        eventProperties,
      );

      this.deps.tracer.endTrace({
        name: PerpsTraceNames.UpdateTpsl,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Update margin for an existing position (add or remove)
   */
  async updateMargin(options: {
    provider: PerpsProvider;
    symbol: string;
    amount: string;
    context: ServiceContext;
  }): Promise<{ success: boolean; error?: string }> {
    const { provider, symbol, amount, context } = options;
    const traceId = uuidv4();
    const startTime = this.deps.performance.now();

    try {
      this.deps.tracer.trace({
        name: PerpsTraceNames.UpdateMargin,
        id: traceId,
        op: PerpsTraceOperations.PositionManagement,
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

      const completionDuration = this.deps.performance.now() - startTime;

      if (result.success) {
        // Update state on success
        if (context.stateManager) {
          context.stateManager.update((state) => {
            state.lastUpdateTimestamp = Date.now();
          });
        }

        // Track success analytics
        this.deps.metrics.trackPerpsEvent(PerpsAnalyticsEvent.RiskManagement, {
          [PERPS_EVENT_PROPERTY.STATUS]: PERPS_EVENT_VALUE.STATUS.EXECUTED,
          [PERPS_EVENT_PROPERTY.ASSET]: symbol,
          [PERPS_EVENT_PROPERTY.ACTION]:
            parseFloat(amount) > 0 ? 'add_margin' : 'remove_margin',
          [PERPS_EVENT_PROPERTY.MARGIN_USED]: Math.abs(parseFloat(amount)),
          [PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: completionDuration,
        });

        // Invalidate readOnly caches so external hooks refresh
        PerpsCacheInvalidator.invalidate('positions');
        PerpsCacheInvalidator.invalidate('accountState');
      }

      this.deps.tracer.endTrace({
        name: PerpsTraceNames.UpdateMargin,
        id: traceId,
        data: { success: result.success, error: result.error || '' },
      });

      return result;
    } catch (error) {
      const completionDuration = this.deps.performance.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('updateMargin', { symbol, amount }),
      );

      // Track failure analytics
      this.deps.metrics.trackPerpsEvent(PerpsAnalyticsEvent.RiskManagement, {
        [PERPS_EVENT_PROPERTY.STATUS]: PERPS_EVENT_VALUE.STATUS.FAILED,
        [PERPS_EVENT_PROPERTY.ASSET]: symbol,
        [PERPS_EVENT_PROPERTY.ACTION]:
          parseFloat(amount) > 0 ? 'add_margin' : 'remove_margin',
        [PERPS_EVENT_PROPERTY.MARGIN_USED]: Math.abs(parseFloat(amount)),
        [PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: completionDuration,
        [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: errorMessage,
      });

      this.deps.tracer.endTrace({
        name: PerpsTraceNames.UpdateMargin,
        id: traceId,
        data: { success: false, error: errorMessage },
      });

      throw error;
    }
  }

  /**
   * Flip position (reverse direction while keeping size and leverage)
   */
  async flipPosition(options: {
    provider: PerpsProvider;
    position: Position;
    context: ServiceContext;
  }): Promise<OrderResult> {
    const { provider, position, context } = options;
    const traceId = uuidv4();
    const startTime = this.deps.performance.now();

    try {
      this.deps.tracer.trace({
        name: PerpsTraceNames.FlipPosition,
        id: traceId,
        op: PerpsTraceOperations.PositionManagement,
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

      // Validate available balance for fees
      const accountState = await provider.getAccountState?.();
      if (!accountState) {
        throw new Error('Failed to get account state');
      }

      const availableBalance = parseFloat(accountState.availableBalance);

      // Estimate fees (close + open, approximately 0.09% of notional)
      // Flip requires 2x position size (1x to close, 1x to open opposite)
      const entryPrice = parseFloat(position.entryPrice);
      const flipSize = positionSize * 2;
      const notionalValue = flipSize * entryPrice;
      const estimatedFees = notionalValue * 0.0009;

      if (estimatedFees > availableBalance) {
        throw new Error(
          `Insufficient balance for flip fees. Need $${estimatedFees.toFixed(2)}, have $${availableBalance.toFixed(2)}`,
        );
      }

      // Create order params for flip
      // Use 2x position size: 1x to close current position + 1x to open opposite position
      const orderParams: OrderParams = {
        symbol: position.symbol,
        isBuy: oppositeDirection,
        size: flipSize.toString(),
        orderType: 'market',
        leverage: position.leverage?.value,
        currentPrice: entryPrice,
      };

      // Place flip order (HyperLiquid handles margin transfer automatically)
      const result = await provider.placeOrder(orderParams);

      const completionDuration = this.deps.performance.now() - startTime;

      if (result.success) {
        // Update state on success
        if (context.stateManager) {
          context.stateManager.update((state) => {
            state.lastUpdateTimestamp = Date.now();
          });
        }

        // Track success analytics
        this.deps.metrics.trackPerpsEvent(
          PerpsAnalyticsEvent.TradeTransaction,
          {
            [PERPS_EVENT_PROPERTY.STATUS]: PERPS_EVENT_VALUE.STATUS.EXECUTED,
            [PERPS_EVENT_PROPERTY.ASSET]: position.symbol,
            [PERPS_EVENT_PROPERTY.DIRECTION]: oppositeDirection
              ? PERPS_EVENT_VALUE.DIRECTION.LONG
              : PERPS_EVENT_VALUE.DIRECTION.SHORT,
            [PERPS_EVENT_PROPERTY.ORDER_TYPE]: 'market',
            [PERPS_EVENT_PROPERTY.LEVERAGE]: position.leverage?.value || 1,
            [PERPS_EVENT_PROPERTY.ORDER_SIZE]: positionSize,
            [PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: completionDuration,
            [PERPS_EVENT_PROPERTY.ACTION]: 'flip_position',
          },
        );

        // Invalidate readOnly caches so external hooks refresh
        PerpsCacheInvalidator.invalidate('positions');
        PerpsCacheInvalidator.invalidate('accountState');
      }

      this.deps.tracer.endTrace({
        name: PerpsTraceNames.FlipPosition,
        id: traceId,
        data: { success: result.success ?? false, error: result.error || '' },
      });

      return result;
    } catch (error) {
      const completionDuration = this.deps.performance.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('flipPosition', { symbol: position.symbol }),
      );

      // Track failure analytics
      this.deps.metrics.trackPerpsEvent(PerpsAnalyticsEvent.TradeTransaction, {
        [PERPS_EVENT_PROPERTY.STATUS]: PERPS_EVENT_VALUE.STATUS.FAILED,
        [PERPS_EVENT_PROPERTY.ASSET]: position.symbol,
        [PERPS_EVENT_PROPERTY.ACTION]: 'flip_position',
        [PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: completionDuration,
        [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: errorMessage,
      });

      this.deps.tracer.endTrace({
        name: PerpsTraceNames.FlipPosition,
        id: traceId,
        data: { success: false, error: errorMessage },
      });

      throw error;
    }
  }
}
