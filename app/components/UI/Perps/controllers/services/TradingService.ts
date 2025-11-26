import Logger from '../../../../../util/Logger';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import { ensureError } from '../../utils/perpsErrorHandler';
import { isTPSLOrder } from '../../constants/orderTypes';
import {
  trace,
  endTrace,
  TraceName,
  TraceOperation,
  type TraceContext,
} from '../../../../../util/trace';
import { v4 as uuidv4 } from 'uuid';
import performance from 'react-native-performance';
import { setMeasurement } from '@sentry/react-native';
import { PerpsMeasurementName } from '../../constants/performanceMetrics';
import { RewardsIntegrationService } from './RewardsIntegrationService';
import { MetricsEventBuilder } from '../../../../../core/Analytics/MetricsEventBuilder';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import type { ServiceContext } from './ServiceContext';
import type {
  IPerpsProvider,
  OrderParams,
  OrderResult,
  EditOrderParams,
  CancelOrderParams,
  CancelOrderResult,
  CancelOrdersParams,
  CancelOrdersResult,
  ClosePositionParams,
  ClosePositionsParams,
  ClosePositionsResult,
  Position,
  UpdatePositionTPSLParams,
} from '../types';

/**
 * TradingService
 *
 * Handles trading operations with fee discount management.
 * Controller is responsible for analytics, state management, and tracing.
 */
export class TradingService {
  /**
   * Error context helper for consistent logging
   */
  private static getErrorContext(
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
  private static trackOrderResult(options: {
    result: OrderResult | null;
    error?: Error;
    params: OrderParams;
    context: ServiceContext;
    duration: number;
  }): void {
    const { result, error, params, context, duration } = options;

    const status =
      result?.success === true
        ? PerpsEventValues.STATUS.EXECUTED
        : PerpsEventValues.STATUS.FAILED;

    const eventBuilder = MetricsEventBuilder.createEventBuilder(
      MetaMetricsEvents.PERPS_TRADE_TRANSACTION,
    ).addProperties({
      [PerpsEventProperties.STATUS]: status,
      [PerpsEventProperties.ASSET]: params.coin,
      [PerpsEventProperties.DIRECTION]: params.isBuy
        ? PerpsEventValues.DIRECTION.LONG
        : PerpsEventValues.DIRECTION.SHORT,
      [PerpsEventProperties.ORDER_TYPE]: params.orderType,
      [PerpsEventProperties.LEVERAGE]: parseFloat(String(params.leverage || 1)),
      [PerpsEventProperties.ORDER_SIZE]: parseFloat(
        result?.filledSize || params.size,
      ),
      [PerpsEventProperties.COMPLETION_DURATION]: duration,
      ...(params.trackingData?.marginUsed != null && {
        [PerpsEventProperties.MARGIN_USED]: params.trackingData.marginUsed,
      }),
      ...(params.trackingData?.totalFee != null && {
        [PerpsEventProperties.FEES]: params.trackingData.totalFee,
      }),
      ...((result?.averagePrice || params.trackingData?.marketPrice) && {
        [PerpsEventProperties.ASSET_PRICE]: result?.averagePrice
          ? parseFloat(result.averagePrice)
          : params.trackingData?.marketPrice,
      }),
      ...(params.orderType === 'limit' &&
        params.price && {
          [PerpsEventProperties.LIMIT_PRICE]: parseFloat(params.price),
        }),
    });

    // Add success-specific properties
    if (status === PerpsEventValues.STATUS.EXECUTED) {
      eventBuilder.addProperties({
        ...(params.trackingData?.metamaskFee != null && {
          [PerpsEventProperties.METAMASK_FEE]: params.trackingData.metamaskFee,
        }),
        ...(params.trackingData?.metamaskFeeRate != null && {
          [PerpsEventProperties.METAMASK_FEE_RATE]:
            params.trackingData.metamaskFeeRate,
        }),
        ...(params.trackingData?.feeDiscountPercentage != null && {
          [PerpsEventProperties.DISCOUNT_PERCENTAGE]:
            params.trackingData.feeDiscountPercentage,
        }),
        ...(params.trackingData?.estimatedPoints != null && {
          [PerpsEventProperties.ESTIMATED_REWARDS]:
            params.trackingData.estimatedPoints,
        }),
        ...(params.takeProfitPrice && {
          [PerpsEventProperties.TAKE_PROFIT_PRICE]: parseFloat(
            params.takeProfitPrice,
          ),
        }),
        ...(params.stopLossPrice && {
          [PerpsEventProperties.STOP_LOSS_PRICE]: parseFloat(
            params.stopLossPrice,
          ),
        }),
      });
    } else {
      // Add failure-specific properties
      eventBuilder.addProperties({
        [PerpsEventProperties.ERROR_MESSAGE]:
          error?.message || result?.error || 'Unknown error',
      });
    }

    context.analytics.trackEvent(eventBuilder.build());
  }

  /**
   * Handle successful order placement (state updates, analytics, data lake reporting)
   */
  private static async handleOrderSuccess(options: {
    params: OrderParams;
    context: ServiceContext;
    reportOrderToDataLake: (params: {
      action: 'open' | 'close';
      coin: string;
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
      context.saveTradeConfiguration(params.coin, params.leverage);
    }

    // Report to data lake (fire-and-forget with retry)
    reportOrderToDataLake({
      action: 'open',
      coin: params.coin,
      sl_price: params.stopLossPrice
        ? parseFloat(params.stopLossPrice)
        : undefined,
      tp_price: params.takeProfitPrice
        ? parseFloat(params.takeProfitPrice)
        : undefined,
    }).catch((error) => {
      Logger.error(ensureError(error), {
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
            coin: params.coin,
          },
        },
      });
    });
  }

  /**
   * Execute a trading operation with fee discount context
   * Ensures fee discount is always cleared after operation (success or failure)
   */
  private static async withFeeDiscount<T>(options: {
    provider: IPerpsProvider;
    feeDiscountBips?: number;
    operation: () => Promise<T>;
  }): Promise<T> {
    const { provider, feeDiscountBips, operation } = options;

    try {
      // Set discount context in provider for this operation
      if (feeDiscountBips !== undefined && provider.setUserFeeDiscount) {
        provider.setUserFeeDiscount(feeDiscountBips);
        DevLogger.log('TradingService: Fee discount set in provider', {
          feeDiscountBips,
        });
      }

      // Execute the operation
      return await operation();
    } finally {
      // Always clear discount context, even on exception
      if (provider.setUserFeeDiscount) {
        provider.setUserFeeDiscount(undefined);
        DevLogger.log('TradingService: Fee discount cleared from provider');
      }
    }
  }

  /**
   * Place a new order with full orchestration
   * Handles tracing, fee discounts, state management, analytics, and data lake reporting
   */
  static async placeOrder(options: {
    provider: IPerpsProvider;
    params: OrderParams;
    context: ServiceContext;
    reportOrderToDataLake: (params: {
      action: 'open' | 'close';
      coin: string;
      sl_price?: number;
      tp_price?: number;
    }) => Promise<{ success: boolean; error?: string }>;
  }): Promise<OrderResult> {
    const { provider, params, context, reportOrderToDataLake } = options;
    const traceId = uuidv4();
    const startTime = performance.now();
    let traceData:
      | { success: boolean; error?: string; orderId?: string }
      | undefined;

    try {
      // Start trace for the entire operation
      const traceSpan = trace({
        name: TraceName.PerpsPlaceOrder,
        id: traceId,
        op: TraceOperation.PerpsOrderSubmission,
        tags: {
          provider: context.tracingContext.provider,
          orderType: params.orderType,
          market: params.coin,
          leverage: params.leverage || 1,
          isTestnet: context.tracingContext.isTestnet,
        },
        data: {
          isBuy: params.isBuy,
          orderPrice: params.price || '',
        },
      });

      // Calculate fee discount at execution time (fresh, secure)
      const feeDiscountBips = await this.calculateFeeDiscountWithMeasurement(
        traceSpan,
        context,
      );

      DevLogger.log('TradingService: Fee discount calculated', {
        feeDiscountBips,
        hasDiscount: feeDiscountBips !== undefined,
      });

      DevLogger.log('TradingService: Submitting order to provider', {
        coin: params.coin,
        orderType: params.orderType,
        isBuy: params.isBuy,
        size: params.size,
        leverage: params.leverage,
        hasTP: !!params.takeProfitPrice,
        hasSL: !!params.stopLossPrice,
      });

      // Execute order with fee discount management
      const result = await this.withFeeDiscount({
        provider,
        feeDiscountBips,
        operation: () => provider.placeOrder(params),
      });

      DevLogger.log('TradingService: Provider response received', {
        success: result.success,
        orderId: result.orderId,
        error: result.error,
      });

      // Update state and handle success/failure
      const completionDuration = performance.now() - startTime;

      if (result.success) {
        // Handle success: state updates, data lake reporting
        await this.handleOrderSuccess({
          params,
          context,
          reportOrderToDataLake,
        });
        traceData = { success: true, orderId: result.orderId || '' };
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
      const completionDuration = performance.now() - startTime;

      // Track analytics for exception
      this.trackOrderResult({
        result: null,
        error: error instanceof Error ? error : undefined,
        params,
        context,
        duration: completionDuration,
      });

      // withFeeDiscount handles fee discount cleanup automatically

      Logger.error(ensureError(error), {
        tags: {
          feature: 'perps',
          provider: context.tracingContext.provider,
          network: context.tracingContext.isTestnet ? 'testnet' : 'mainnet',
        },
        context: {
          name: context.errorContext.controller,
          data: {
            method: context.errorContext.method,
            coin: params.coin,
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
      endTrace({
        name: TraceName.PerpsPlaceOrder,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Load position data with performance measurement
   */
  private static async loadPositionData(options: {
    coin: string;
    context: ServiceContext;
    traceSpan: TraceContext;
  }): Promise<Position | undefined> {
    const { coin, context, traceSpan } = options;

    const positionLoadStart = performance.now();
    try {
      const positions = context.getPositions
        ? await context.getPositions()
        : [];
      const position = positions.find((p) => p.coin === coin);

      setMeasurement(
        PerpsMeasurementName.PERPS_GET_POSITIONS_OPERATION,
        performance.now() - positionLoadStart,
        'millisecond',
        traceSpan,
      );

      return position;
    } catch (err) {
      DevLogger.log(
        'TradingService: Could not get position data for tracking',
        err,
      );
      return undefined;
    }
  }

  /**
   * Calculate close position metrics
   */
  private static calculateCloseMetrics(
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
        ? PerpsEventValues.DIRECTION.LONG
        : PerpsEventValues.DIRECTION.SHORT;

    const filledSize = result.filledSize ? parseFloat(result.filledSize) : 0;
    const requestedSize = params.size
      ? parseFloat(params.size)
      : Math.abs(parseFloat(position.size));
    const isPartiallyFilled = filledSize > 0 && filledSize < requestedSize;

    const orderType = params.orderType || PerpsEventValues.ORDER_TYPE.MARKET;
    const closePercentage = params.size
      ? (parseFloat(params.size) / Math.abs(parseFloat(position.size))) * 100
      : 100;
    const closeType =
      closePercentage === 100
        ? PerpsEventValues.CLOSE_TYPE.FULL
        : PerpsEventValues.CLOSE_TYPE.PARTIAL;

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
  private static buildCloseEventProperties(
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
      [PerpsEventProperties.STATUS]: status,
      [PerpsEventProperties.ASSET]: position.coin,
      [PerpsEventProperties.DIRECTION]: metrics.direction,
      [PerpsEventProperties.ORDER_TYPE]: metrics.orderType,
      [PerpsEventProperties.ORDER_SIZE]: metrics.requestedSize,
      [PerpsEventProperties.OPEN_POSITION_SIZE]: Math.abs(
        parseFloat(position.size),
      ),
      [PerpsEventProperties.PERCENTAGE_CLOSED]: metrics.closePercentage,
      ...(position.unrealizedPnl && {
        [PerpsEventProperties.PNL_DOLLAR]: parseFloat(position.unrealizedPnl),
      }),
      ...(position.returnOnEquity && {
        [PerpsEventProperties.PNL_PERCENT]:
          parseFloat(position.returnOnEquity) * 100,
      }),
      ...(params.trackingData?.totalFee != null && {
        [PerpsEventProperties.FEE]: params.trackingData.totalFee,
      }),
      ...(params.trackingData?.metamaskFee != null && {
        [PerpsEventProperties.METAMASK_FEE]: params.trackingData.metamaskFee,
      }),
      ...(params.trackingData?.metamaskFeeRate != null && {
        [PerpsEventProperties.METAMASK_FEE_RATE]:
          params.trackingData.metamaskFeeRate,
      }),
      ...(params.trackingData?.feeDiscountPercentage != null && {
        [PerpsEventProperties.DISCOUNT_PERCENTAGE]:
          params.trackingData.feeDiscountPercentage,
      }),
      ...(params.trackingData?.estimatedPoints != null && {
        [PerpsEventProperties.ESTIMATED_REWARDS]:
          params.trackingData.estimatedPoints,
      }),
      ...((params.trackingData?.marketPrice || result?.averagePrice) && {
        [PerpsEventProperties.ASSET_PRICE]: result?.averagePrice
          ? parseFloat(result.averagePrice)
          : params.trackingData?.marketPrice,
      }),
      ...(params.orderType === 'limit' &&
        params.price && {
          [PerpsEventProperties.LIMIT_PRICE]: parseFloat(params.price),
        }),
      ...(params.trackingData?.receivedAmount != null && {
        [PerpsEventProperties.RECEIVED_AMOUNT]:
          params.trackingData.receivedAmount,
      }),
    };

    // Add success-specific properties
    if (status === PerpsEventValues.STATUS.EXECUTED) {
      return {
        ...baseProperties,
        [PerpsEventProperties.CLOSE_TYPE]: metrics.closeType,
      };
    }

    // Add error for failures
    return {
      ...baseProperties,
      ...(error && { [PerpsEventProperties.ERROR_MESSAGE]: error }),
    };
  }

  /**
   * Track position close result analytics (consolidates all tracking logic)
   */
  private static trackPositionCloseResult(options: {
    position: Position | undefined;
    result: OrderResult | null;
    error?: Error;
    params: ClosePositionParams;
    context: ServiceContext;
    duration: number;
  }): void {
    const { position, result, error, params, context, duration } = options;

    if (!position) {
      return;
    }

    const metrics = result
      ? this.calculateCloseMetrics(position, params, result)
      : {
          direction:
            parseFloat(position.size) > 0
              ? PerpsEventValues.DIRECTION.LONG
              : PerpsEventValues.DIRECTION.SHORT,
          closePercentage: params.size
            ? (parseFloat(params.size) / Math.abs(parseFloat(position.size))) *
              100
            : 100,
          closeType: PerpsEventValues.CLOSE_TYPE.FULL,
          orderType: params.orderType || PerpsEventValues.ORDER_TYPE.MARKET,
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
        PerpsEventValues.STATUS.PARTIALLY_FILLED,
      );

      context.analytics.trackEvent(
        MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.PERPS_POSITION_CLOSE_TRANSACTION,
        )
          .addProperties({
            ...partialProperties,
            [PerpsEventProperties.AMOUNT_FILLED]: metrics.filledSize,
            [PerpsEventProperties.REMAINING_AMOUNT]:
              metrics.requestedSize - metrics.filledSize,
            [PerpsEventProperties.COMPLETION_DURATION]: duration,
          })
          .build(),
      );
    }

    // Determine status
    const status =
      result?.success === true
        ? PerpsEventValues.STATUS.EXECUTED
        : PerpsEventValues.STATUS.FAILED;

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

    context.analytics.trackEvent(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.PERPS_POSITION_CLOSE_TRANSACTION,
      )
        .addProperties({
          ...eventProperties,
          [PerpsEventProperties.COMPLETION_DURATION]: duration,
        })
        .build(),
    );
  }

  /**
   * Handle data lake reporting (fire-and-forget)
   */
  private static handleDataLakeReporting(
    reportOrderToDataLake: (params: {
      action: 'open' | 'close';
      coin: string;
    }) => Promise<{ success: boolean; error?: string }>,
    coin: string,
    context: ServiceContext,
  ): void {
    reportOrderToDataLake({
      action: 'close',
      coin,
    }).catch((error) => {
      Logger.error(ensureError(error), {
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
            coin,
          },
        },
      });
    });
  }

  /**
   * Calculate fee discount with performance measurement
   * Helper method for placeOrder orchestration
   */
  private static async calculateFeeDiscountWithMeasurement(
    traceSpan: TraceContext,
    context: ServiceContext,
  ): Promise<number | undefined> {
    if (
      !context.rewardsController ||
      !context.networkController ||
      !context.messenger
    ) {
      return undefined;
    }

    const orderExecutionFeeDiscountStartTime = performance.now();
    // Calculate fee discount only if required dependencies are available
    const discountBips =
      context.rewardsController &&
      context.networkController &&
      context.messenger
        ? await RewardsIntegrationService.calculateUserFeeDiscount({
            rewardsController: context.rewardsController,
            networkController: context.networkController,
            messenger: context.messenger,
          })
        : undefined;
    const orderExecutionFeeDiscountDuration =
      performance.now() - orderExecutionFeeDiscountStartTime;

    // Attach measurement to the parent trace span
    setMeasurement(
      PerpsMeasurementName.PERPS_REWARDS_ORDER_EXECUTION_FEE_DISCOUNT_API_CALL,
      orderExecutionFeeDiscountDuration,
      'millisecond',
      traceSpan,
    );

    DevLogger.log('TradingService: Fee discount API call completed', {
      discountBips,
      duration: `${orderExecutionFeeDiscountDuration.toFixed(0)}ms`,
    });

    return discountBips;
  }

  /**
   * Edit an existing order with full orchestration
   * Handles tracing, fee discounts, state management, and analytics
   */
  static async editOrder(options: {
    provider: IPerpsProvider;
    params: EditOrderParams;
    context: ServiceContext;
  }): Promise<OrderResult> {
    const { provider, params, context } = options;
    const traceId = uuidv4();
    const startTime = performance.now();
    let traceData:
      | { success: boolean; error?: string; orderId?: string }
      | undefined;

    try {
      trace({
        name: TraceName.PerpsEditOrder,
        id: traceId,
        op: TraceOperation.PerpsOrderSubmission,
        tags: {
          provider: context.tracingContext.provider,
          orderType: params.newOrder.orderType,
          market: params.newOrder.coin,
          leverage: params.newOrder.leverage || 1,
          isTestnet: context.tracingContext.isTestnet,
        },
        data: {
          isBuy: params.newOrder.isBuy,
          orderPrice: params.newOrder.price || '',
        },
      });

      // Calculate fee discount only if required dependencies are available
      const feeDiscountBips =
        context.rewardsController &&
        context.networkController &&
        context.messenger
          ? await RewardsIntegrationService.calculateUserFeeDiscount({
              rewardsController: context.rewardsController,
              networkController: context.networkController,
              messenger: context.messenger,
            })
          : undefined;

      // Execute order edit with fee discount management
      const result = await this.withFeeDiscount({
        provider,
        feeDiscountBips,
        operation: () => provider.editOrder(params),
      });

      const completionDuration = performance.now() - startTime;

      if (result.success) {
        // Update state on success
        if (context.stateManager) {
          context.stateManager.update((state) => {
            state.lastUpdateTimestamp = Date.now();
          });
        }

        // Track order edit executed
        context.analytics.trackEvent(
          MetricsEventBuilder.createEventBuilder(
            MetaMetricsEvents.PERPS_TRADE_TRANSACTION,
          )
            .addProperties({
              [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.EXECUTED,
              [PerpsEventProperties.ASSET]: params.newOrder.coin,
              [PerpsEventProperties.DIRECTION]: params.newOrder.isBuy
                ? PerpsEventValues.DIRECTION.LONG
                : PerpsEventValues.DIRECTION.SHORT,
              [PerpsEventProperties.ORDER_TYPE]: params.newOrder.orderType,
              [PerpsEventProperties.LEVERAGE]: params.newOrder.leverage || 1,
              [PerpsEventProperties.ORDER_SIZE]: params.newOrder.size,
              [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
              ...(params.newOrder.price && {
                [PerpsEventProperties.LIMIT_PRICE]: parseFloat(
                  params.newOrder.price,
                ),
              }),
            })
            .build(),
        );

        traceData = { success: true, orderId: result.orderId || '' };
      } else {
        // Track order edit failed
        context.analytics.trackEvent(
          MetricsEventBuilder.createEventBuilder(
            MetaMetricsEvents.PERPS_TRADE_TRANSACTION,
          )
            .addProperties({
              [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.FAILED,
              [PerpsEventProperties.ASSET]: params.newOrder.coin,
              [PerpsEventProperties.DIRECTION]: params.newOrder.isBuy
                ? PerpsEventValues.DIRECTION.LONG
                : PerpsEventValues.DIRECTION.SHORT,
              [PerpsEventProperties.ORDER_TYPE]: params.newOrder.orderType,
              [PerpsEventProperties.LEVERAGE]: params.newOrder.leverage || 1,
              [PerpsEventProperties.ORDER_SIZE]: params.newOrder.size,
              [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
              [PerpsEventProperties.ERROR_MESSAGE]:
                result.error || 'Unknown error',
            })
            .build(),
        );

        traceData = { success: false, error: result.error || 'Unknown error' };
      }

      return result;
    } catch (error) {
      const completionDuration = performance.now() - startTime;

      // Track order edit exception
      context.analytics.trackEvent(
        MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.PERPS_TRADE_TRANSACTION,
        )
          .addProperties({
            [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.FAILED,
            [PerpsEventProperties.ASSET]: params.newOrder.coin,
            [PerpsEventProperties.DIRECTION]: params.newOrder.isBuy
              ? PerpsEventValues.DIRECTION.LONG
              : PerpsEventValues.DIRECTION.SHORT,
            [PerpsEventProperties.ORDER_TYPE]: params.newOrder.orderType,
            [PerpsEventProperties.LEVERAGE]: params.newOrder.leverage || 1,
            [PerpsEventProperties.ORDER_SIZE]: params.newOrder.size,
            [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
            [PerpsEventProperties.ERROR_MESSAGE]:
              error instanceof Error ? error.message : 'Unknown error',
          })
          .build(),
      );

      Logger.error(ensureError(error), {
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
      endTrace({
        name: TraceName.PerpsEditOrder,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Cancel a single order with full orchestration
   * Handles tracing, state management, and analytics
   */
  static async cancelOrder(options: {
    provider: IPerpsProvider;
    params: CancelOrderParams;
    context: ServiceContext;
  }): Promise<CancelOrderResult> {
    const { provider, params, context } = options;
    const traceId = uuidv4();
    const startTime = performance.now();
    let traceData:
      | { success: boolean; error?: string; orderId?: string }
      | undefined;

    try {
      // Start trace for the entire operation
      trace({
        name: TraceName.PerpsCancelOrder,
        id: traceId,
        op: TraceOperation.PerpsOrderSubmission,
        tags: {
          provider: context.tracingContext.provider,
          market: params.coin,
          isTestnet: context.tracingContext.isTestnet,
        },
        data: {
          orderId: params.orderId,
        },
      });

      // Execute order cancellation
      const result = await provider.cancelOrder(params);
      const completionDuration = performance.now() - startTime;

      if (result.success) {
        // Update state on success
        if (context.stateManager) {
          context.stateManager.update((state) => {
            state.lastUpdateTimestamp = Date.now();
          });
        }

        // Track order cancel executed
        const eventBuilder = MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.PERPS_ORDER_CANCEL_TRANSACTION,
        ).addProperties({
          [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.EXECUTED,
          [PerpsEventProperties.ASSET]: params.coin,
          [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
        });
        context.analytics.trackEvent(eventBuilder.build());

        traceData = { success: true, orderId: params.orderId };
      } else {
        // Track order cancel failed
        const eventBuilder = MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.PERPS_ORDER_CANCEL_TRANSACTION,
        ).addProperties({
          [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.FAILED,
          [PerpsEventProperties.ASSET]: params.coin,
          [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
          [PerpsEventProperties.ERROR_MESSAGE]: result.error || 'Unknown error',
        });
        context.analytics.trackEvent(eventBuilder.build());

        traceData = { success: false, error: result.error || 'Unknown error' };
      }

      return result;
    } catch (error) {
      const completionDuration = performance.now() - startTime;

      // Track order cancel exception
      const eventBuilder = MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.PERPS_ORDER_CANCEL_TRANSACTION,
      ).addProperties({
        [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.FAILED,
        [PerpsEventProperties.ASSET]: params.coin,
        [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
        [PerpsEventProperties.ERROR_MESSAGE]:
          error instanceof Error ? error.message : 'Unknown error',
      });
      context.analytics.trackEvent(eventBuilder.build());

      Logger.error(
        ensureError(error),
        this.getErrorContext('cancelOrder', { coin: params.coin }),
      );

      traceData = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      throw error;
    } finally {
      endTrace({
        name: TraceName.PerpsCancelOrder,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Cancel multiple orders with full orchestration
   * Handles tracing, stream pausing, filtering, batch operations, and analytics
   */
  static async cancelOrders(options: {
    provider: IPerpsProvider;
    params: CancelOrdersParams;
    context: ServiceContext;
    withStreamPause: <T>(
      operation: () => Promise<T>,
      channels: string[],
    ) => Promise<T>;
  }): Promise<CancelOrdersResult> {
    const { provider, params, context, withStreamPause } = options;
    const traceId = uuidv4();
    const startTime = performance.now();
    let operationResult: CancelOrdersResult | null = null;
    let operationError: Error | null = null;

    try {
      // Start trace for batch operation
      trace({
        name: TraceName.PerpsCancelOrder,
        id: traceId,
        op: TraceOperation.PerpsOrderSubmission,
        tags: {
          provider: context.tracingContext.provider,
          isBatch: 'true',
          isTestnet: context.tracingContext.isTestnet,
        },
        data: {
          cancelAll: params.cancelAll ? 'true' : 'false',
          coinCount: params.coins?.length || 0,
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
        if (params.cancelAll || (!params.coins && !params.orderIds)) {
          // Cancel all orders (excluding TP/SL orders for positions)
          ordersToCancel = orders.filter(
            (o) => !isTPSLOrder(o.detailedOrderType),
          );
        } else if (params.orderIds && params.orderIds.length > 0) {
          // Cancel specific order IDs
          ordersToCancel = orders.filter((o) =>
            params.orderIds?.includes(o.orderId),
          );
        } else if (params.coins && params.coins.length > 0) {
          // Cancel orders for specific coins
          ordersToCancel = orders.filter((o) =>
            params.coins?.includes(o.symbol),
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
              coin: order.symbol,
              orderId: order.orderId,
            })),
          );
        }

        // Fallback: Cancel orders in parallel (for providers without batch support)
        const results = await Promise.allSettled(
          ordersToCancel.map((order) =>
            this.cancelOrder({
              provider,
              params: { coin: order.symbol, orderId: order.orderId },
              context,
            }),
          ),
        );

        // Aggregate results
        const successCount = results.filter(
          (r) => r.status === 'fulfilled' && r.value.success,
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
              coin: ordersToCancel[index].symbol,
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
      Logger.error(ensureError(error), this.getErrorContext('cancelOrders'));
      throw error;
    } finally {
      const completionDuration = performance.now() - startTime;

      // Track batch cancel event (success or failure)
      const eventBuilder = MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.PERPS_ORDER_CANCEL_TRANSACTION,
      ).addProperties({
        [PerpsEventProperties.STATUS]:
          operationResult?.success && operationResult.successCount > 0
            ? PerpsEventValues.STATUS.EXECUTED
            : PerpsEventValues.STATUS.FAILED,
        [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
        ...(operationError && {
          [PerpsEventProperties.ERROR_MESSAGE]: operationError.message,
        }),
      });
      context.analytics.trackEvent(eventBuilder.build());

      endTrace({
        name: TraceName.PerpsCancelOrder,
        id: traceId,
      });
    }
  }

  /**
   * Close a single position with full orchestration
   * Handles tracing, fee discounts, state management, analytics, and data lake reporting
   */
  static async closePosition(options: {
    provider: IPerpsProvider;
    params: ClosePositionParams;
    context: ServiceContext;
    reportOrderToDataLake: (params: {
      action: 'open' | 'close';
      coin: string;
    }) => Promise<{ success: boolean; error?: string }>;
  }): Promise<OrderResult> {
    const { provider, params, context, reportOrderToDataLake } = options;
    const traceId = uuidv4();
    const startTime = performance.now();
    let position: Position | undefined;
    let result: OrderResult | undefined;
    let traceData:
      | { success: boolean; error?: string; filledSize?: string }
      | undefined;

    try {
      const traceSpan = trace({
        name: TraceName.PerpsClosePosition,
        id: traceId,
        op: TraceOperation.PerpsPositionManagement,
        tags: {
          provider: context.tracingContext.provider,
          coin: params.coin,
          closeSize: params.size || 'full',
          isTestnet: context.tracingContext.isTestnet,
        },
      });

      // Load position data with measurement
      position = await this.loadPositionData({
        coin: params.coin,
        context,
        traceSpan,
      });

      // Calculate fee discount with measurement
      const feeDiscountBips = await this.calculateFeeDiscountWithMeasurement(
        traceSpan,
        context,
      );

      // Execute position close with fee discount management
      result = await this.withFeeDiscount({
        provider,
        feeDiscountBips,
        operation: () => provider.closePosition(params),
      });

      const completionDuration = performance.now() - startTime;

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
          params.coin,
          context,
        );

        traceData = { success: true, filledSize: result.filledSize || '' };
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
      const completionDuration = performance.now() - startTime;

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

      Logger.error(ensureError(error), {
        tags: {
          feature: 'perps',
          provider: context.tracingContext.provider,
          network: context.tracingContext.isTestnet ? 'testnet' : 'mainnet',
        },
        context: {
          name: context.errorContext.controller,
          data: {
            method: context.errorContext.method,
            coin: params.coin,
          },
        },
      });

      throw error;
    } finally {
      // Always end trace on exit (success or failure)
      endTrace({
        name: TraceName.PerpsClosePosition,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Close multiple positions with full orchestration
   * Handles tracing, fee discounts, batch operations, and analytics
   */
  static async closePositions(options: {
    provider: IPerpsProvider;
    params: ClosePositionsParams;
    context: ServiceContext;
  }): Promise<ClosePositionsResult> {
    const { provider, params, context } = options;
    const traceId = uuidv4();
    const startTime = performance.now();
    let operationResult: ClosePositionsResult | null = null;
    let operationError: Error | null = null;

    try {
      // Start trace for batch operation
      const traceSpan = trace({
        name: TraceName.PerpsClosePosition,
        id: traceId,
        op: TraceOperation.PerpsPositionManagement,
        tags: {
          provider: context.tracingContext.provider,
          isBatch: 'true',
          isTestnet: context.tracingContext.isTestnet,
        },
        data: {
          closeAll: params.closeAll ? 'true' : 'false',
          coinCount: params.coins?.length || 0,
        },
      });

      DevLogger.log('[closePositions] Batch method check', {
        providerType: provider.protocolId,
        hasBatchMethod: !!provider.closePositions,
        methodType: typeof provider.closePositions,
        providerKeys: Object.keys(provider).filter((k) => k.includes('close')),
      });

      // Use batch close if provider supports it (provider handles filtering)
      if (provider.closePositions) {
        const feeDiscountBips = await this.calculateFeeDiscountWithMeasurement(
          traceSpan,
          context,
        );

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
          params.closeAll || !params.coins || params.coins.length === 0
            ? positions
            : positions.filter((p) => params.coins?.includes(p.coin));

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
              params: { coin: position.coin },
              context,
              reportOrderToDataLake: () => Promise.resolve({ success: true }), // No-op for batch fallback
            }),
          ),
        );

        // Aggregate results
        const successCount = results.filter(
          (r) => r.status === 'fulfilled' && r.value.success,
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
              coin: positionsToClose[index].coin,
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
      Logger.error(
        ensureError(error),
        this.getErrorContext('closePositions', {
          coins: params.coins?.length || 0,
          closeAll: params.closeAll,
        }),
      );
      throw error;
    } finally {
      const completionDuration = performance.now() - startTime;

      // Track batch close event (success or failure)
      const eventBuilder = MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.PERPS_POSITION_CLOSE_TRANSACTION,
      ).addProperties({
        [PerpsEventProperties.STATUS]:
          operationResult?.success && operationResult.successCount > 0
            ? PerpsEventValues.STATUS.EXECUTED
            : PerpsEventValues.STATUS.FAILED,
        [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
        ...(operationError && {
          [PerpsEventProperties.ERROR_MESSAGE]: operationError.message,
        }),
      });
      context.analytics.trackEvent(eventBuilder.build());

      endTrace({
        name: TraceName.PerpsClosePosition,
        id: traceId,
      });
    }
  }

  /**
   * Update TP/SL for an existing position with full orchestration
   * Handles tracing, fee discounts, state management, and analytics
   */
  static async updatePositionTPSL(options: {
    provider: IPerpsProvider;
    params: UpdatePositionTPSLParams;
    context: ServiceContext;
  }): Promise<OrderResult> {
    const { provider, params, context } = options;
    const traceId = uuidv4();
    const startTime = performance.now();
    let traceData: { success: boolean; error?: string } | undefined;
    let result: OrderResult | undefined;
    let errorMessage: string | undefined;

    // Extract tracking data with defaults
    const direction = params.trackingData?.direction;
    const positionSize = params.trackingData?.positionSize;
    const source =
      params.trackingData?.source || PerpsEventValues.SOURCE.TP_SL_VIEW;

    try {
      const traceSpan = trace({
        name: TraceName.PerpsUpdateTPSL,
        id: traceId,
        op: TraceOperation.PerpsPositionManagement,
        tags: {
          provider: context.tracingContext.provider,
          market: params.coin,
          isTestnet: context.tracingContext.isTestnet,
        },
        data: {
          takeProfitPrice: params.takeProfitPrice || '',
          stopLossPrice: params.stopLossPrice || '',
        },
      });

      // Get fee discount from rewards
      const feeDiscountBips = await this.calculateFeeDiscountWithMeasurement(
        traceSpan,
        context,
      );

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
      const completionDuration = performance.now() - startTime;

      // Build comprehensive event properties
      const eventProperties = {
        [PerpsEventProperties.STATUS]: result?.success
          ? PerpsEventValues.STATUS.EXECUTED
          : PerpsEventValues.STATUS.FAILED,
        [PerpsEventProperties.ASSET]: params.coin,
        [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
        [PerpsEventProperties.SOURCE]: source,
        ...(direction && {
          [PerpsEventProperties.DIRECTION]:
            direction === 'long'
              ? PerpsEventValues.DIRECTION.LONG
              : PerpsEventValues.DIRECTION.SHORT,
        }),
        ...(positionSize !== undefined && {
          [PerpsEventProperties.POSITION_SIZE]: positionSize,
        }),
        ...(params.takeProfitPrice && {
          [PerpsEventProperties.TAKE_PROFIT_PRICE]: parseFloat(
            params.takeProfitPrice,
          ),
        }),
        ...(params.stopLossPrice && {
          [PerpsEventProperties.STOP_LOSS_PRICE]: parseFloat(
            params.stopLossPrice,
          ),
        }),
        ...(errorMessage && {
          [PerpsEventProperties.ERROR_MESSAGE]: errorMessage,
        }),
      };

      // Track event once with all properties
      const eventBuilder = MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.PERPS_RISK_MANAGEMENT,
      ).addProperties(eventProperties);
      context.analytics.trackEvent(eventBuilder.build());

      endTrace({
        name: TraceName.PerpsUpdateTPSL,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Update margin for an existing position (add or remove)
   */
  static async updateMargin(options: {
    provider: IPerpsProvider;
    coin: string;
    amount: string;
    context: ServiceContext;
  }): Promise<{ success: boolean; error?: string }> {
    const { provider, coin, amount, context } = options;
    const traceId = uuidv4();
    const startTime = performance.now();

    try {
      trace({
        name: 'PerpsUpdateMargin' as TraceName,
        id: traceId,
        op: TraceOperation.PerpsPositionManagement,
        tags: {
          provider: context.tracingContext.provider,
          coin,
          isAdd: parseFloat(amount) > 0,
          isTestnet: context.tracingContext.isTestnet,
        },
      });

      // Call provider method
      const result = await provider.updateMargin?.({ coin, amount });

      if (!result) {
        throw new Error('Provider does not support margin adjustment');
      }

      const completionDuration = performance.now() - startTime;

      if (result.success) {
        // Update state on success
        if (context.stateManager) {
          context.stateManager.update((state) => {
            state.lastUpdateTimestamp = Date.now();
          });
        }

        // Track success analytics
        const eventBuilder = MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.PERPS_RISK_MANAGEMENT,
        ).addProperties({
          [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.EXECUTED,
          [PerpsEventProperties.ASSET]: coin,
          [PerpsEventProperties.ACTION]:
            parseFloat(amount) > 0 ? 'add_margin' : 'remove_margin',
          [PerpsEventProperties.MARGIN_USED]: Math.abs(parseFloat(amount)),
          [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
        });
        context.analytics.trackEvent(eventBuilder.build());
      }

      endTrace({
        name: 'PerpsUpdateMargin' as TraceName,
        id: traceId,
        data: { success: result.success, error: result.error || '' },
      });

      return result;
    } catch (error) {
      const completionDuration = performance.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      Logger.error(
        ensureError(error),
        this.getErrorContext('updateMargin', { coin, amount }),
      );

      // Track failure analytics
      const eventBuilder = MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.PERPS_RISK_MANAGEMENT,
      ).addProperties({
        [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.FAILED,
        [PerpsEventProperties.ASSET]: coin,
        [PerpsEventProperties.ACTION]:
          parseFloat(amount) > 0 ? 'add_margin' : 'remove_margin',
        [PerpsEventProperties.MARGIN_USED]: Math.abs(parseFloat(amount)),
        [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
        [PerpsEventProperties.ERROR_MESSAGE]: errorMessage,
      });
      context.analytics.trackEvent(eventBuilder.build());

      endTrace({
        name: 'PerpsUpdateMargin' as TraceName,
        id: traceId,
        data: { success: false, error: errorMessage },
      });

      throw error;
    }
  }

  /**
   * Flip position (reverse direction while keeping size and leverage)
   */
  static async flipPosition(options: {
    provider: IPerpsProvider;
    position: Position;
    context: ServiceContext;
  }): Promise<OrderResult> {
    const { provider, position, context } = options;
    const traceId = uuidv4();
    const startTime = performance.now();

    try {
      trace({
        name: 'PerpsFlipPosition' as TraceName,
        id: traceId,
        op: TraceOperation.PerpsPositionManagement,
        tags: {
          provider: context.tracingContext.provider,
          coin: position.coin,
          isTestnet: context.tracingContext.isTestnet,
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
        coin: position.coin,
        isBuy: oppositeDirection,
        size: flipSize.toString(),
        orderType: 'market',
        leverage: position.leverage?.value,
        currentPrice: entryPrice,
      };

      // Place flip order (HyperLiquid handles margin transfer automatically)
      const result = await provider.placeOrder(orderParams);

      const completionDuration = performance.now() - startTime;

      if (result.success) {
        // Update state on success
        if (context.stateManager) {
          context.stateManager.update((state) => {
            state.lastUpdateTimestamp = Date.now();
          });
        }

        // Track success analytics
        const eventBuilder = MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.PERPS_TRADE_TRANSACTION,
        ).addProperties({
          [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.EXECUTED,
          [PerpsEventProperties.ASSET]: position.coin,
          [PerpsEventProperties.DIRECTION]: oppositeDirection
            ? PerpsEventValues.DIRECTION.LONG
            : PerpsEventValues.DIRECTION.SHORT,
          [PerpsEventProperties.ORDER_TYPE]: 'market',
          [PerpsEventProperties.LEVERAGE]: position.leverage?.value || 1,
          [PerpsEventProperties.ORDER_SIZE]: positionSize,
          [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
          [PerpsEventProperties.ACTION]: 'flip_position',
        });
        context.analytics.trackEvent(eventBuilder.build());
      }

      endTrace({
        name: 'PerpsFlipPosition' as TraceName,
        id: traceId,
        data: { success: result.success ?? false, error: result.error || '' },
      });

      return result;
    } catch (error) {
      const completionDuration = performance.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      Logger.error(
        ensureError(error),
        this.getErrorContext('flipPosition', { coin: position.coin }),
      );

      // Track failure analytics
      const eventBuilder = MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.PERPS_TRADE_TRANSACTION,
      ).addProperties({
        [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.FAILED,
        [PerpsEventProperties.ASSET]: position.coin,
        [PerpsEventProperties.ACTION]: 'flip_position',
        [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
        [PerpsEventProperties.ERROR_MESSAGE]: errorMessage,
      });
      context.analytics.trackEvent(eventBuilder.build());

      endTrace({
        name: 'PerpsFlipPosition' as TraceName,
        id: traceId,
        data: { success: false, error: errorMessage },
      });

      throw error;
    }
  }
}
