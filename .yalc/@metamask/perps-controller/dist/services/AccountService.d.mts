import type { PerpsProvider, WithdrawParams, WithdrawResult, PerpsPlatformDependencies } from "../types/index.mjs";
import type { PerpsControllerMessengerBase } from "../types/messenger.mjs";
import type { ServiceContext } from "./ServiceContext.mjs";
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
export declare class AccountService {
    #private;
    /**
     * Create a new AccountService instance
     *
     * @param deps - Platform dependencies for logging, metrics, etc.
     * @param messenger - Controller messenger for cross-controller communication.
     */
    constructor(deps: PerpsPlatformDependencies, messenger: PerpsControllerMessengerBase);
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
    withdraw(options: {
        provider: PerpsProvider;
        params: WithdrawParams;
        context: ServiceContext;
        refreshAccountState: () => Promise<void>;
    }): Promise<WithdrawResult>;
    /**
     * Validate withdrawal parameters
     *
     * @param options - The validation configuration.
     * @param options.provider - The perps provider to validate against.
     * @param options.params - The withdrawal parameters to validate.
     * @returns An object indicating whether the withdrawal is valid, with an optional error message.
     */
    validateWithdrawal(options: {
        provider: PerpsProvider;
        params: WithdrawParams;
    }): Promise<{
        isValid: boolean;
        error?: string;
    }>;
}
//# sourceMappingURL=AccountService.d.mts.map