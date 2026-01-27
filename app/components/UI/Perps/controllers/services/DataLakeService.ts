import { v4 as uuidv4 } from 'uuid';
import { ensureError } from '../../../../../util/errorUtils';
import { PerpsMeasurementName } from '../../constants/performanceMetrics';
import { DATA_LAKE_API_CONFIG } from '../../constants/perpsConfig';
import type { ServiceContext } from './ServiceContext';
import {
  PerpsTraceNames,
  PerpsTraceOperations,
  type PerpsPlatformDependencies,
} from '../types';

/**
 * DataLakeService
 *
 * Handles reporting order events to external Data Lake API.
 * Implements exponential backoff retry logic and performance tracing.
 * Stateless service that operates purely on external API calls.
 *
 * Instance-based service with constructor injection of platform dependencies.
 */
export class DataLakeService {
  private readonly deps: PerpsPlatformDependencies;

  /**
   * Create a new DataLakeService instance
   * @param deps - Platform dependencies for logging, metrics, etc.
   */
  constructor(deps: PerpsPlatformDependencies) {
    this.deps = deps;
  }

  /**
   * Error context helper for consistent logging
   */
  private getErrorContext(
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
   * @param options.symbol - Market symbol
   * @param options.sl_price - Optional stop loss price
   * @param options.tp_price - Optional take profit price
   * @param options.isTestnet - Whether this is a testnet operation (skips API call)
   * @param options.context - ServiceContext for dependencies (messenger, tracing)
   * @param options.retryCount - Internal retry counter (managed by service)
   * @param options._traceId - Internal trace ID (managed by service)
   * @returns Result object with success flag and optional error message
   */
  async reportOrder(options: {
    action: 'open' | 'close';
    symbol: string;
    sl_price?: number;
    tp_price?: number;
    isTestnet: boolean;
    context: ServiceContext;
    retryCount?: number;
    _traceId?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const {
      action,
      symbol,
      sl_price,
      tp_price,
      isTestnet,
      context,
      retryCount = 0,
      _traceId,
    } = options;

    // Skip data lake reporting for testnet as the API doesn't handle testnet data
    if (isTestnet) {
      this.deps.debugLogger.log('DataLake API: Skipping for testnet', {
        action,
        symbol,
        network: 'testnet',
      });
      return { success: true, error: 'Skipped for testnet' };
    }

    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1000;

    // Generate trace ID once on first call
    const traceId = _traceId || uuidv4();

    // Start trace only on first attempt
    if (retryCount === 0) {
      this.deps.tracer.trace({
        name: PerpsTraceNames.DataLakeReport,
        op: PerpsTraceOperations.Operation,
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
    this.deps.debugLogger.log('DataLake API: Starting order report', {
      action,
      symbol,
      attempt: retryCount + 1,
      maxAttempts: MAX_RETRIES + 1,
      hasStopLoss: !!sl_price,
      hasTakeProfit: !!tp_price,
      timestamp: new Date().toISOString(),
    });

    const apiCallStartTime = this.deps.performance.now();

    try {
      // Ensure messenger is available
      if (!context.messenger) {
        throw new Error('Messenger not available in ServiceContext');
      }

      const token = await context.messenger.call(
        'AuthenticationController:getBearerToken',
      );
      const evmAccount = this.deps.controllers.accounts.getSelectedEvmAccount();

      if (!evmAccount || !token) {
        this.deps.debugLogger.log('DataLake API: Missing requirements', {
          hasAccount: !!evmAccount,
          hasToken: !!token,
          action,
          symbol,
        });
        return { success: false, error: 'No account or token available' };
      }

      const response = await fetch(DATA_LAKE_API_CONFIG.OrdersEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: evmAccount.address,
          symbol,
          sl_price,
          tp_price,
        }),
      });

      if (!response.ok) {
        throw new Error(`DataLake API error: ${response.status}`);
      }

      // Consume response body (might be empty for 201, but good to check)
      const responseBody = await response.text();

      const apiCallDuration = this.deps.performance.now() - apiCallStartTime;

      // Record measurement
      this.deps.tracer.setMeasurement(
        PerpsMeasurementName.PERPS_DATA_LAKE_API_CALL,
        apiCallDuration,
        'millisecond',
      );

      // Success logging
      this.deps.debugLogger.log('DataLake API: Order reported successfully', {
        action,
        symbol,
        status: response.status,
        attempt: retryCount + 1,
        responseBody: responseBody || 'empty',
        duration: `${apiCallDuration.toFixed(0)}ms`,
      });

      // End trace on success
      this.deps.tracer.endTrace({
        name: PerpsTraceNames.DataLakeReport,
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

      this.deps.logger.error(ensureError(error), {
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
        this.deps.debugLogger.log('DataLake API: Scheduling retry', {
          retryIn: `${retryDelay}ms`,
          nextAttempt: retryCount + 2,
          action,
          symbol,
        });

        setTimeout(() => {
          this.reportOrder({
            action,
            symbol,
            sl_price,
            tp_price,
            isTestnet,
            context,
            retryCount: retryCount + 1,
            _traceId: traceId,
          }).catch((err) => {
            this.deps.logger.error(ensureError(err), {
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

      this.deps.tracer.endTrace({
        name: PerpsTraceNames.DataLakeReport,
        id: traceId,
        data: {
          success: false,
          error: errorMessage,
          totalRetries: retryCount,
        },
      });

      this.deps.logger.error(ensureError(error), {
        context: {
          name: 'DataLakeService.reportOrder',
          data: { operation: 'finalFailure', action, symbol, retryCount },
        },
      });

      return { success: false, error: errorMessage };
    }
  }
}
