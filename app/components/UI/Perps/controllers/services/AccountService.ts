import { ensureError } from '../../../../../util/errorUtils';
import type { ServiceContext } from './ServiceContext';
import {
  PerpsAnalyticsEvent,
  PerpsTraceNames,
  PerpsTraceOperations,
  type PerpsProvider,
  type WithdrawParams,
  type WithdrawResult,
  type PerpsPlatformDependencies,
} from '../types';
import type { TransactionStatus } from '../../types/transactionTypes';
import { v4 as uuidv4 } from 'uuid';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { USDC_SYMBOL } from '../../constants/hyperLiquidConfig';
import { PERPS_ERROR_CODES } from '../perpsErrorCodes';

/**
 * AccountService
 *
 * Handles account operations (deposits, withdrawals).
 * Stateless service that delegates to provider.
 * Controller handles state updates and analytics.
 *
 * Instance-based service with constructor injection of platform dependencies.
 */
export class AccountService {
  private readonly deps: PerpsPlatformDependencies;

  /**
   * Create a new AccountService instance
   * @param deps - Platform dependencies for logging, metrics, etc.
   */
  constructor(deps: PerpsPlatformDependencies) {
    this.deps = deps;
  }

  /**
   * Withdraw funds with full orchestration
   * Handles tracing, state management, analytics, and account refresh
   */
  async withdraw(options: {
    provider: PerpsProvider;
    params: WithdrawParams;
    context: ServiceContext;
    refreshAccountState: () => Promise<void>;
  }): Promise<WithdrawResult> {
    const { provider, params, context, refreshAccountState } = options;

    const traceId = uuidv4();
    const startTime = this.deps.performance.now();
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
      this.deps.tracer.trace({
        name: PerpsTraceNames.Withdraw,
        id: traceId,
        op: PerpsTraceOperations.Operation,
        tags: {
          assetId: params.assetId || '',
          provider: context.tracingContext.provider,
          isTestnet: String(context.tracingContext.isTestnet),
        },
      });

      this.deps.debugLogger.log('AccountService: STARTING WITHDRAWAL', {
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

          // Get current account address via controllers.accounts
          const evmAccount =
            this.deps.controllers.accounts.getSelectedEvmAccount();
          const accountAddress = evmAccount?.address || 'unknown';

          this.deps.debugLogger.log(
            'AccountService: Creating withdrawal request',
            {
              accountAddress,
              hasEvmAccount: !!evmAccount,
              evmAccountAddress: evmAccount?.address,
              amount: netAmount.toString(),
            },
          );

          // Add withdrawal request to tracking
          const withdrawalRequest = {
            id: currentWithdrawalId,
            timestamp: Date.now(),
            amount: netAmount.toString(), // Use net amount (after fees)
            asset: USDC_SYMBOL,
            accountAddress, // Track which account initiated withdrawal
            success: false, // Will be updated when transaction completes
            txHash: undefined,
            status: 'pending' as TransactionStatus,
            destination: params.destination,
            transactionId: undefined, // Will be set to withdrawalId when available
          };

          state.withdrawalRequests.unshift(withdrawalRequest);
        });
      }

      this.deps.debugLogger.log('AccountService: DELEGATING TO PROVIDER', {
        provider: context.tracingContext.provider,
        providerReady: !!provider,
      });

      // Execute withdrawal
      const result = await provider.withdraw(params);

      this.deps.debugLogger.log('AccountService: WITHDRAWAL RESULT', {
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

        this.deps.debugLogger.log('AccountService: WITHDRAWAL SUCCESSFUL', {
          txHash: result.txHash,
          amount: params.amount,
          assetId: params.assetId,
          withdrawalId: result.withdrawalId,
        });

        // Track withdrawal transaction executed
        const completionDuration = this.deps.performance.now() - startTime;
        this.deps.metrics.trackPerpsEvent(
          PerpsAnalyticsEvent.WithdrawalTransaction,
          {
            [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.EXECUTED,
            [PerpsEventProperties.WITHDRAWAL_AMOUNT]: parseFloat(params.amount),
            [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
          },
        );

        // Trigger account state refresh after withdrawal
        refreshAccountState().catch((refreshError) => {
          this.deps.logger.error(ensureError(refreshError), {
            context: {
              name: 'AccountService.withdraw',
              data: { operation: 'refreshAccountState' },
            },
          });
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

      this.deps.debugLogger.log('AccountService: WITHDRAWAL FAILED', {
        error: result.error,
        params,
      });

      // Track withdrawal transaction failed
      const completionDuration = this.deps.performance.now() - startTime;
      this.deps.metrics.trackPerpsEvent(
        PerpsAnalyticsEvent.WithdrawalTransaction,
        {
          [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.FAILED,
          [PerpsEventProperties.WITHDRAWAL_AMOUNT]: parseFloat(params.amount),
          [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
          [PerpsEventProperties.ERROR_MESSAGE]: result.error || 'Unknown error',
        },
      );

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

      this.deps.logger.error(ensureError(error), {
        context: {
          name: 'AccountService.withdraw',
          data: { assetId: params.assetId, amount: params.amount },
        },
      });

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
      const completionDuration = this.deps.performance.now() - startTime;
      this.deps.metrics.trackPerpsEvent(
        PerpsAnalyticsEvent.WithdrawalTransaction,
        {
          [PerpsEventProperties.STATUS]: PerpsEventValues.STATUS.FAILED,
          [PerpsEventProperties.WITHDRAWAL_AMOUNT]: params.amount,
          [PerpsEventProperties.COMPLETION_DURATION]: completionDuration,
          [PerpsEventProperties.ERROR_MESSAGE]: errorMessage,
        },
      );

      traceData = {
        success: false,
        error: errorMessage,
      };

      return { success: false, error: errorMessage };
    } finally {
      this.deps.tracer.endTrace({
        name: PerpsTraceNames.Withdraw,
        id: traceId,
        data: traceData,
      });
    }
  }

  /**
   * Validate withdrawal parameters
   */
  async validateWithdrawal(options: {
    provider: PerpsProvider;
    params: WithdrawParams;
  }): Promise<{ isValid: boolean; error?: string }> {
    const { provider, params } = options;

    try {
      return await provider.validateWithdrawal(params);
    } catch (error) {
      this.deps.logger.error(ensureError(error), {
        context: {
          name: 'AccountService.validateWithdrawal',
          data: { params },
        },
      });
      throw error;
    }
  }
}
