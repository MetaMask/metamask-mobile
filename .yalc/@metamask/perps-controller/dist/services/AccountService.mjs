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
var _AccountService_deps, _AccountService_messenger;
import { v4 as uuidv4 } from "uuid";
import { PERPS_EVENT_PROPERTY, PERPS_EVENT_VALUE } from "../constants/eventNames.mjs";
import { USDC_SYMBOL } from "../constants/hyperLiquidConfig.mjs";
import { PERPS_CONSTANTS, WITHDRAWAL_CONSTANTS } from "../constants/perpsConfig.mjs";
import { PERPS_ERROR_CODES } from "../perpsErrorCodes.mjs";
import { PerpsAnalyticsEvent, PerpsTraceNames, PerpsTraceOperations } from "../types/index.mjs";
import { getSelectedEvmAccountFromMessenger } from "../utils/accountUtils.mjs";
import { ensureError } from "../utils/errorUtils.mjs";
/**
 * AccountService
 *
 * Handles account operations (deposits, withdrawals).
 * Stateless service that delegates to provider.
 * Controller handles state updates and analytics.
 *
 * Instance-based service with constructor injection of platform dependencies
 * and messenger for inter-controller communication.
 */
export class AccountService {
    /**
     * Create a new AccountService instance
     *
     * @param deps - Platform dependencies for logging, metrics, etc.
     * @param messenger - Controller messenger for cross-controller communication.
     */
    constructor(deps, messenger) {
        _AccountService_deps.set(this, void 0);
        _AccountService_messenger.set(this, void 0);
        __classPrivateFieldSet(this, _AccountService_deps, deps, "f");
        __classPrivateFieldSet(this, _AccountService_messenger, messenger, "f");
    }
    /**
     * Withdraw funds with full orchestration
     * Handles tracing, state management, analytics, and account refresh
     *
     * @param options - The withdrawal configuration.
     * @param options.provider - The perps provider to execute the withdrawal.
     * @param options.params - The withdrawal parameters (amount, destination, etc.).
     * @param options.context - The service context for tracing and dependencies.
     * @param options.refreshAccountState - Callback to refresh account state after withdrawal.
     * @returns The withdrawal result containing success status and transaction details.
     */
    async withdraw(options) {
        const { provider, params, context, refreshAccountState } = options;
        const traceId = uuidv4();
        const startTime = __classPrivateFieldGet(this, _AccountService_deps, "f").performance.now();
        let traceData;
        // Generate withdrawal request ID for tracking
        const currentWithdrawalId = `withdraw-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 11)}`;
        try {
            __classPrivateFieldGet(this, _AccountService_deps, "f").tracer.trace({
                name: PerpsTraceNames.Withdraw,
                id: traceId,
                op: PerpsTraceOperations.Operation,
                tags: {
                    assetId: params.assetId ?? '',
                    provider: context.tracingContext.provider,
                    isTestnet: String(context.tracingContext.isTestnet),
                },
            });
            __classPrivateFieldGet(this, _AccountService_deps, "f").debugLogger.log('AccountService: STARTING WITHDRAWAL', {
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
                    const feeAmount = WITHDRAWAL_CONSTANTS.DefaultFeeAmount;
                    const netAmount = Math.max(0, grossAmount - feeAmount);
                    // Get current account address via messenger
                    const evmAccount = getSelectedEvmAccountFromMessenger(__classPrivateFieldGet(this, _AccountService_messenger, "f"));
                    const accountAddress = evmAccount?.address ?? 'unknown';
                    __classPrivateFieldGet(this, _AccountService_deps, "f").debugLogger.log('AccountService: Creating withdrawal request', {
                        accountAddress,
                        hasEvmAccount: Boolean(evmAccount),
                        evmAccountAddress: evmAccount?.address,
                        amount: netAmount.toString(),
                    });
                    // Add withdrawal request to tracking
                    const withdrawalRequest = {
                        id: currentWithdrawalId,
                        timestamp: Date.now(),
                        amount: netAmount.toString(), // Use net amount (after fees)
                        asset: USDC_SYMBOL,
                        accountAddress, // Track which account initiated withdrawal
                        success: false, // Will be updated when transaction completes
                        txHash: undefined,
                        status: 'pending',
                        destination: params.destination,
                        transactionId: undefined, // Will be set to withdrawalId when available
                    };
                    state.withdrawalRequests.unshift(withdrawalRequest);
                });
            }
            __classPrivateFieldGet(this, _AccountService_deps, "f").debugLogger.log('AccountService: DELEGATING TO PROVIDER', {
                provider: context.tracingContext.provider,
                providerReady: Boolean(provider),
            });
            // Execute withdrawal
            const result = await provider.withdraw(params);
            __classPrivateFieldGet(this, _AccountService_deps, "f").debugLogger.log('AccountService: WITHDRAWAL RESULT', {
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
                        const withdrawalRequestIndex = state.withdrawalRequests.findIndex((req) => req.id === currentWithdrawalId);
                        if (result.txHash) {
                            // Direct completion: remove from queue and record the txHash
                            // so the polling hook won't re-match this completion.
                            // We do NOT update lastCompletedWithdrawalTimestamp here
                            // because Date.now() is local device time while the FIFO guard
                            // compares against API server timestamps — mixing domains can
                            // poison the guard.  The txHash exclusion alone prevents
                            // re-matching since the item is also spliced from the queue.
                            if (withdrawalRequestIndex !== -1) {
                                state.withdrawalRequests.splice(withdrawalRequestIndex, 1);
                            }
                            state.lastCompletedWithdrawalTxHashes.push(result.txHash);
                            const hasOtherPending = state.withdrawalRequests.some((req) => req.status === 'pending' || req.status === 'bridging');
                            state.withdrawInProgress = hasOtherPending;
                        }
                        else if (withdrawalRequestIndex !== -1) {
                            const requestToUpdate = state.withdrawalRequests[withdrawalRequestIndex];
                            // Withdrawal is bridging (no txHash yet)
                            requestToUpdate.status = 'bridging';
                            requestToUpdate.success = true;
                            if (result.withdrawalId) {
                                requestToUpdate.withdrawalId = result.withdrawalId;
                            }
                        }
                        // Set lastWithdrawResult when submission is successful (even if bridging)
                        // This triggers the "confirmed" toast telling user funds arrive in ~5 mins
                        state.lastWithdrawResult = {
                            success: true,
                            txHash: result.txHash ?? '',
                            amount: params.amount,
                            asset: USDC_SYMBOL,
                            timestamp: Date.now(),
                            error: '',
                        };
                    });
                }
                __classPrivateFieldGet(this, _AccountService_deps, "f").debugLogger.log('AccountService: WITHDRAWAL SUCCESSFUL', {
                    txHash: result.txHash,
                    amount: params.amount,
                    assetId: params.assetId,
                    withdrawalId: result.withdrawalId,
                });
                // Track withdrawal transaction executed
                const completionDuration = __classPrivateFieldGet(this, _AccountService_deps, "f").performance.now() - startTime;
                __classPrivateFieldGet(this, _AccountService_deps, "f").metrics.trackPerpsEvent(PerpsAnalyticsEvent.WithdrawalTransaction, {
                    [PERPS_EVENT_PROPERTY.STATUS]: PERPS_EVENT_VALUE.STATUS.EXECUTED,
                    [PERPS_EVENT_PROPERTY.WITHDRAWAL_AMOUNT]: parseFloat(params.amount),
                    [PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: completionDuration,
                });
                // Trigger account state refresh after withdrawal
                refreshAccountState().catch((refreshError) => {
                    __classPrivateFieldGet(this, _AccountService_deps, "f").logger.error(ensureError(refreshError, 'AccountService.withdraw'), {
                        tags: { feature: PERPS_CONSTANTS.FeatureName },
                        context: {
                            name: 'AccountService.withdraw',
                            data: { operation: 'refreshAccountState' },
                        },
                    });
                });
                // Invalidate standalone caches so external hooks (e.g., usePerpsPositionForAsset) refresh
                __classPrivateFieldGet(this, _AccountService_deps, "f").cacheInvalidator.invalidate({ cacheType: 'accountState' });
                traceData = {
                    success: true,
                    txHash: result.txHash ?? '',
                    withdrawalId: result.withdrawalId ?? '',
                };
                return result;
            }
            // Handle failure
            if (context.stateManager) {
                context.stateManager.update((state) => {
                    state.lastError = result.error ?? PERPS_ERROR_CODES.WITHDRAW_FAILED;
                    state.lastUpdateTimestamp = Date.now();
                    state.lastWithdrawResult = {
                        success: false,
                        error: result.error ?? PERPS_ERROR_CODES.WITHDRAW_FAILED,
                        amount: params.amount,
                        asset: USDC_SYMBOL,
                        timestamp: Date.now(),
                        txHash: '',
                    };
                    const withdrawalRequestIndex = state.withdrawalRequests.findIndex((req) => req.id === currentWithdrawalId);
                    if (withdrawalRequestIndex !== -1) {
                        state.withdrawalRequests.splice(withdrawalRequestIndex, 1);
                    }
                    state.withdrawInProgress = state.withdrawalRequests.some((req) => req.status === 'pending' || req.status === 'bridging');
                });
            }
            __classPrivateFieldGet(this, _AccountService_deps, "f").debugLogger.log('AccountService: WITHDRAWAL FAILED', {
                error: result.error,
                params,
            });
            // Track withdrawal transaction failed
            const completionDuration = __classPrivateFieldGet(this, _AccountService_deps, "f").performance.now() - startTime;
            __classPrivateFieldGet(this, _AccountService_deps, "f").metrics.trackPerpsEvent(PerpsAnalyticsEvent.WithdrawalTransaction, {
                [PERPS_EVENT_PROPERTY.STATUS]: PERPS_EVENT_VALUE.STATUS.FAILED,
                [PERPS_EVENT_PROPERTY.WITHDRAWAL_AMOUNT]: parseFloat(params.amount),
                [PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: completionDuration,
                [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: result.error ?? 'Unknown error',
            });
            traceData = {
                success: false,
                error: result.error ?? 'Unknown error',
            };
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : PERPS_ERROR_CODES.WITHDRAW_FAILED;
            __classPrivateFieldGet(this, _AccountService_deps, "f").logger.error(ensureError(error, 'AccountService.withdraw'), {
                tags: { feature: PERPS_CONSTANTS.FeatureName },
                context: {
                    name: 'AccountService.withdraw',
                    data: { assetId: params.assetId, amount: params.amount },
                },
            });
            if (context.stateManager) {
                context.stateManager.update((state) => {
                    state.lastError = errorMessage;
                    state.lastUpdateTimestamp = Date.now();
                    state.lastWithdrawResult = {
                        success: false,
                        error: errorMessage,
                        amount: '0',
                        asset: USDC_SYMBOL,
                        timestamp: Date.now(),
                        txHash: '',
                    };
                    const withdrawalRequestIndex = state.withdrawalRequests.findIndex((req) => req.id === currentWithdrawalId);
                    if (withdrawalRequestIndex !== -1) {
                        state.withdrawalRequests.splice(withdrawalRequestIndex, 1);
                    }
                    state.withdrawInProgress = state.withdrawalRequests.some((req) => req.status === 'pending' || req.status === 'bridging');
                });
            }
            // Track withdrawal transaction failed (catch block)
            const completionDuration = __classPrivateFieldGet(this, _AccountService_deps, "f").performance.now() - startTime;
            __classPrivateFieldGet(this, _AccountService_deps, "f").metrics.trackPerpsEvent(PerpsAnalyticsEvent.WithdrawalTransaction, {
                [PERPS_EVENT_PROPERTY.STATUS]: PERPS_EVENT_VALUE.STATUS.FAILED,
                [PERPS_EVENT_PROPERTY.WITHDRAWAL_AMOUNT]: params.amount,
                [PERPS_EVENT_PROPERTY.COMPLETION_DURATION]: completionDuration,
                [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: errorMessage,
            });
            traceData = {
                success: false,
                error: errorMessage,
            };
            return { success: false, error: errorMessage };
        }
        finally {
            __classPrivateFieldGet(this, _AccountService_deps, "f").tracer.endTrace({
                name: PerpsTraceNames.Withdraw,
                id: traceId,
                data: traceData,
            });
        }
    }
    /**
     * Validate withdrawal parameters
     *
     * @param options - The validation configuration.
     * @param options.provider - The perps provider to validate against.
     * @param options.params - The withdrawal parameters to validate.
     * @returns An object indicating whether the withdrawal is valid, with an optional error message.
     */
    async validateWithdrawal(options) {
        const { provider, params } = options;
        try {
            return await provider.validateWithdrawal(params);
        }
        catch (error) {
            __classPrivateFieldGet(this, _AccountService_deps, "f").logger.error(ensureError(error, 'AccountService.validateWithdrawal'), {
                tags: { feature: PERPS_CONSTANTS.FeatureName },
                context: {
                    name: 'AccountService.validateWithdrawal',
                    data: { params },
                },
            });
            throw error;
        }
    }
}
_AccountService_deps = new WeakMap(), _AccountService_messenger = new WeakMap();
//# sourceMappingURL=AccountService.mjs.map