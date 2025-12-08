import Logger from '../../../../../util/Logger';
import { ensureError } from '../../utils/perpsErrorHandler';
import type { ServiceContext } from './ServiceContext';
import type { IPerpsProvider, WithdrawParams, WithdrawResult } from '../types';
import type { TransactionStatus } from '../../types/transactionTypes';
import { v4 as uuidv4 } from 'uuid';
import {
  trace,
  TraceName,
  TraceOperation,
  endTrace,
} from '../../../../../util/trace';
import performance from 'react-native-performance';
import { MetricsEventBuilder } from '../../../../../core/Analytics/MetricsEventBuilder';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { USDC_SYMBOL } from '../../constants/hyperLiquidConfig';
import { PERPS_ERROR_CODES } from '../perpsErrorCodes';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';

/**
 * AccountService
 *
 * Handles account operations (deposits, withdrawals).
 * Stateless service that delegates to provider.
 * Controller handles state updates and analytics.
 */
export class AccountService {
  /**
   * Error context helper for consistent logging
   */
  private static getErrorContext(
    method: string,
    additionalContext?: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      controller: 'AccountService',
      method,
      ...additionalContext,
    };
  }

  /**
   * Withdraw funds with full orchestration
   * Handles tracing, state management, analytics, and account refresh
   */
  static async withdraw(options: {
    provider: IPerpsProvider;
    params: WithdrawParams;
    context: ServiceContext;
    refreshAccountState: () => Promise<void>;
  }): Promise<WithdrawResult> {
    const { provider, params, context, refreshAccountState } = options;

    const traceId = uuidv4();
    const startTime = performance.now();
    let traceData:
      | {
          success: boolean;
          error?: string;
          txHash?: string;
          withdrawalId?: string;
        }
      | undefined;

    // Generate withdrawal request ID for tracking
    const currentWithdrawalId = `withdraw-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 11)}`;

    try {
      trace({
        name: TraceName.PerpsWithdraw,
        id: traceId,
        op: TraceOperation.PerpsOperation,
        tags: {
          assetId: params.assetId || '',
          provider: context.tracingContext.provider,
          isTestnet: context.tracingContext.isTestnet,
        },
      });

      DevLogger.log('AccountService: STARTING WITHDRAWAL', {
        params,
        timestamp: new Date().toISOString(),
        assetId: params.assetId,
        amount: params.amount,
        destination: params.destination,
        activeProvider: context.tracingContext.provider,
        isTestnet: context.tracingContext.isTestnet,
      });

      // Set withdrawal in progress
      if (context.stateManager) {
        context.stateManager.update((state) => {
          state.withdrawInProgress = true;

          // Calculate net amount after fees
          const grossAmount = parseFloat(params.amount);
          const feeAmount = 1.0; // HyperLiquid withdrawal fee is $1 USDC
          const netAmount = Math.max(0, grossAmount - feeAmount);

          // Add withdrawal request to tracking
          const withdrawalRequest = {
            id: currentWithdrawalId,
            timestamp: Date.now(),
            amount: netAmount.toString(), // Use net amount (after fees)
            asset: USDC_SYMBOL,
            success: false, // Will be updated when transaction completes
            txHash: undefined,
            status: 'pending' as TransactionStatus,
            destination: params.destination,
            transactionId: undefined, // Will be set to withdrawalId when available
          };

          state.withdrawalRequests.unshift(withdrawalRequest);
        });
      }

      DevLogger.log('AccountService: DELEGATING TO PROVIDER', {
        provider: context.tracingContext.provider,
        providerReady: !!provider,
      });

      // Execute withdrawal
      const result = await provider.withdraw(params);

      DevLogger.log('AccountService: WITHDRAWAL RESULT', {
        success: result.success,
        error: result.error,
        txHash: result.txHash,
        timestamp: new Date().toISOString(),
      });

      // Update state based on result
      if (result.success) {
        if (context.stateManager) {
          context.stateManager.update((state) => {
            state.lastError = null;
            state.lastUpdateTimestamp = Date.now();
            state.withdrawInProgress = false;
            state.lastWithdrawResult = {
              success: true,
              txHash: result.txHash || '',
              amount: params.amount,
              asset: USDC_SYMBOL,
              timestamp: Date.now(),
              error: '',
            };

            // Update the withdrawal request by request ID
            if (state.withdrawalRequests.length > 0) {
              const requestToUpdate = state.withdrawalRequests.find(
                (req) => req.id === currentWithdrawalId,
              );
              if (requestToUpdate) {
                if (result.txHash) {
                  requestToUpdate.status = 'completed' as TransactionStatus;
                  requestToUpdate.success = true;
                  requestToUpdate.txHash = result.txHash;
                } else {
                  requestToUpdate.status = 'bridging' as TransactionStatus;
                  requestToUpdate.success = true;
                }
                if (result.withdrawalId) {
                  requestToUpdate.withdrawalId = result.withdrawalId;
                }
              }
            }
          });
        }

        DevLogger.log('AccountService: WITHDRAWAL SUCCESSFUL', {
          txHash: result.txHash,
          amount: params.amount,
          assetId: params.assetId,
          withdrawalId: result.withdrawalId,
        });

        // Track withdrawal transaction executed
        const completionDuration = performance.now() - startTime;
        const eventBuilder = MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.PERPS_WITHDRAWAL_TRANSACTION,
        ).addProperties({
          [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.EXECUTED,
          [PerpsEventProperties.WITHDRAWAL_AMOUNT]: parseFloat(params.amount),
          [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
        });
        context.analytics.trackEvent(eventBuilder.build());

        // Trigger account state refresh after withdrawal
        refreshAccountState().catch((error) => {
          Logger.error(
            ensureError(error),
            this.getErrorContext('withdraw', {
              operation: 'refreshAccountState',
            }),
          );
        });

        traceData = {
          success: true,
          txHash: result.txHash || '',
          withdrawalId: result.withdrawalId || '',
        };

        return result;
      }

      // Handle failure
      if (context.stateManager) {
        context.stateManager.update((state) => {
          state.lastError = result.error || PERPS_ERROR_CODES.WITHDRAW_FAILED;
          state.lastUpdateTimestamp = Date.now();
          state.withdrawInProgress = false;
          state.lastWithdrawResult = {
            success: false,
            error: result.error || PERPS_ERROR_CODES.WITHDRAW_FAILED,
            amount: params.amount,
            asset: USDC_SYMBOL,
            timestamp: Date.now(),
            txHash: '',
          };

          // Update the withdrawal request by request ID
          if (state.withdrawalRequests.length > 0) {
            const requestToUpdate = state.withdrawalRequests.find(
              (req) => req.id === currentWithdrawalId,
            );
            if (requestToUpdate) {
              requestToUpdate.status = 'failed' as TransactionStatus;
              requestToUpdate.success = false;
            }
          }
        });
      }

      DevLogger.log('AccountService: WITHDRAWAL FAILED', {
        error: result.error,
        params,
      });

      // Track withdrawal transaction failed
      const completionDuration = performance.now() - startTime;
      const eventBuilder = MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.PERPS_WITHDRAWAL_TRANSACTION,
      ).addProperties({
        [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.FAILED,
        [PerpsEventProperties.WITHDRAWAL_AMOUNT]: parseFloat(params.amount),
        [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
        [PerpsEventProperties.ERROR_MESSAGE]: result.error || 'Unknown error',
      });
      context.analytics.trackEvent(eventBuilder.build());

      traceData = {
        success: false,
        error: result.error || 'Unknown error',
      };

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : PERPS_ERROR_CODES.WITHDRAW_FAILED;

      Logger.error(
        ensureError(error),
        this.getErrorContext('withdraw', {
          assetId: params.assetId,
          amount: params.amount,
        }),
      );

      if (context.stateManager) {
        context.stateManager.update((state) => {
          state.lastError = errorMessage;
          state.lastUpdateTimestamp = Date.now();
          state.withdrawInProgress = false;
          state.lastWithdrawResult = {
            success: false,
            error: errorMessage,
            amount: '0',
            asset: USDC_SYMBOL,
            timestamp: Date.now(),
            txHash: '',
          };

          // Update the withdrawal request by request ID
          if (state.withdrawalRequests.length > 0) {
            const requestToUpdate = state.withdrawalRequests.find(
              (req) => req.id === currentWithdrawalId,
            );
            if (requestToUpdate) {
              requestToUpdate.status = 'failed' as TransactionStatus;
              requestToUpdate.success = false;
            }
          }
        });
      }

      // Track withdrawal transaction failed (catch block)
      const completionDuration = performance.now() - startTime;

      const eventBuilder = MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.PERPS_WITHDRAWAL_TRANSACTION,
      ).addProperties({
        [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.FAILED,
        [PerpsEventProperties.WITHDRAWAL_AMOUNT]: params.amount,
        [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
        [PerpsEventProperties.ERROR_MESSAGE]: errorMessage,
      });
      context.analytics.trackEvent(eventBuilder.build());

      traceData = {
        success: false,
        error: errorMessage,
      };

      return { success: false, error: errorMessage };
    } finally {
      endTrace({
        name: TraceName.PerpsWithdraw,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Validate withdrawal parameters
   */
  static async validateWithdrawal(options: {
    provider: IPerpsProvider;
    params: WithdrawParams;
  }): Promise<{ isValid: boolean; error?: string }> {
    const { provider, params } = options;

    try {
      return await provider.validateWithdrawal(params);
    } catch (error) {
      Logger.error(
        ensureError(error),
        this.getErrorContext('validateWithdrawal', { params }),
      );
      throw error;
    }
  }
}
