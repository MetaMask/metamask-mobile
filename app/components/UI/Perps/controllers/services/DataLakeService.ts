import { v4 as uuidv4 } from 'uuid';
import type { Span } from '@sentry/core';
import performance from 'react-native-performance';
import { setMeasurement } from '@sentry/react-native';
import Logger from '../../../../../util/Logger';
import { ensureError } from '../../../../../util/errorUtils';
import { getEvmAccountFromSelectedAccountGroup } from '../../utils/accountUtils';
import {
  trace,
  endTrace,
  TraceName,
  TraceOperation,
} from '../../../../../util/trace';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import { PerpsMeasurementName } from '../../constants/performanceMetrics';
import { DATA_LAKE_API_CONFIG } from '../../constants/perpsConfig';
import type { ServiceContext } from './ServiceContext';

/**
 * DataLakeService
 *
 * Handles reporting order events to external Data Lake API.
 * Implements exponential backoff retry logic and performance tracing.
 * Stateless service that operates purely on external API calls.
 */
export class DataLakeService {
  /**
   * Error context helper for consistent logging
   */
  private static getErrorContext(
    method: string,
    additionalContext?: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      controller: 'DataLakeService',
      method,
      ...additionalContext,
    };
  }

  /**
   * Report order events to data lake API with retry (non-blocking)
   * Implements exponential backoff retry logic (max 3 retries)
   *
   * @param options - Configuration object
   * @param options.action - Order action ('open' or 'close')
   * @param options.coin - Market symbol
   * @param options.sl_price - Optional stop loss price
   * @param options.tp_price - Optional take profit price
   * @param options.isTestnet - Whether this is a testnet operation (skips API call)
   * @param options.context - ServiceContext for dependencies (messenger, tracing)
   * @param options.retryCount - Internal retry counter (managed by service)
   * @param options._traceId - Internal trace ID (managed by service)
   * @returns Result object with success flag and optional error message
   */
  static async reportOrder(options: {
    action: 'open' | 'close';
    coin: string;
    sl_price?: number;
    tp_price?: number;
    isTestnet: boolean;
    context: ServiceContext;
    retryCount?: number;
    _traceId?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const {
      action,
      coin,
      sl_price,
      tp_price,
      isTestnet,
      context,
      retryCount = 0,
      _traceId,
    } = options;

    // Skip data lake reporting for testnet as the API doesn't handle testnet data
    if (isTestnet) {
      DevLogger.log('DataLake API: Skipping for testnet', {
        action,
        coin,
        network: 'testnet',
      });
      return { success: true, error: 'Skipped for testnet' };
    }

    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1000;

    // Generate trace ID once on first call
    const traceId = _traceId || uuidv4();

    // Start trace only on first attempt
    let traceSpan: Span | undefined;
    if (retryCount === 0) {
      traceSpan = trace({
        name: TraceName.PerpsDataLakeReport,
        op: TraceOperation.PerpsOperation,
        id: traceId,
        tags: {
          action,
          coin,
          provider: context.tracingContext.provider,
          isTestnet: context.tracingContext.isTestnet,
        },
      });
    }

    // Log the attempt
    DevLogger.log('DataLake API: Starting order report', {
      action,
      coin,
      attempt: retryCount + 1,
      maxAttempts: MAX_RETRIES + 1,
      hasStopLoss: !!sl_price,
      hasTakeProfit: !!tp_price,
      timestamp: new Date().toISOString(),
    });

    const apiCallStartTime = performance.now();

    try {
      // Ensure messenger is available
      if (!context.messenger) {
        throw new Error('Messenger not available in ServiceContext');
      }

      const token = await context.messenger.call(
        'AuthenticationController:getBearerToken',
      );
      const evmAccount = getEvmAccountFromSelectedAccountGroup();

      if (!evmAccount || !token) {
        DevLogger.log('DataLake API: Missing requirements', {
          hasAccount: !!evmAccount,
          hasToken: !!token,
          action,
          coin,
        });
        return { success: false, error: 'No account or token available' };
      }

      const response = await fetch(DATA_LAKE_API_CONFIG.ORDERS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: evmAccount.address,
          coin,
          sl_price,
          tp_price,
        }),
      });

      if (!response.ok) {
        throw new Error(`DataLake API error: ${response.status}`);
      }

      // Consume response body (might be empty for 201, but good to check)
      const responseBody = await response.text();

      const apiCallDuration = performance.now() - apiCallStartTime;

      // Add measurement to trace if span exists
      if (traceSpan) {
        setMeasurement(
          PerpsMeasurementName.PERPS_DATA_LAKE_API_CALL,
          apiCallDuration,
          'millisecond',
          traceSpan,
        );
      }

      // Success logging
      DevLogger.log('DataLake API: Order reported successfully', {
        action,
        coin,
        status: response.status,
        attempt: retryCount + 1,
        responseBody: responseBody || 'empty',
        duration: `${apiCallDuration.toFixed(0)}ms`,
      });

      // End trace on success
      endTrace({
        name: TraceName.PerpsDataLakeReport,
        id: traceId,
        data: {
          success: true,
          retries: retryCount,
        },
      });

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      Logger.error(
        ensureError(error),
        this.getErrorContext('reportOrder', {
          action,
          coin,
          retryCount,
          willRetry: retryCount < MAX_RETRIES,
        }),
      );

      // Retry logic
      if (retryCount < MAX_RETRIES) {
        const retryDelay = RETRY_DELAY_MS * Math.pow(2, retryCount);
        DevLogger.log('DataLake API: Scheduling retry', {
          retryIn: `${retryDelay}ms`,
          nextAttempt: retryCount + 2,
          action,
          coin,
        });

        setTimeout(() => {
          this.reportOrder({
            action,
            coin,
            sl_price,
            tp_price,
            isTestnet,
            context,
            retryCount: retryCount + 1,
            _traceId: traceId,
          }).catch((err) => {
            Logger.error(
              ensureError(err),
              this.getErrorContext('reportOrder', {
                operation: 'retry',
                retryCount: retryCount + 1,
                action,
                coin,
              }),
            );
          });
        }, retryDelay);

        return { success: false, error: errorMessage };
      }

      endTrace({
        name: TraceName.PerpsDataLakeReport,
        id: traceId,
        data: {
          success: false,
          error: errorMessage,
          totalRetries: retryCount,
        },
      });

      Logger.error(
        ensureError(error),
        this.getErrorContext('reportOrder', {
          operation: 'finalFailure',
          action,
          coin,
          retryCount,
        }),
      );

      return { success: false, error: errorMessage };
    }
  }
}
