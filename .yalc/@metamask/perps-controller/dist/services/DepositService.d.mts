import type { Hex } from "@metamask/utils";
import type { PerpsProvider, PerpsPlatformDependencies, PerpsTransactionParams } from "../types/index.mjs";
import type { PerpsControllerMessengerBase } from "../types/messenger.mjs";
/**
 * DepositService
 *
 * Handles deposit transaction preparation and validation.
 * Stateless service that prepares transaction data for TransactionController.
 * Controller handles TransactionController integration and promise lifecycle.
 *
 * Instance-based service with constructor injection of platform dependencies
 * and messenger for inter-controller communication.
 */
export declare class DepositService {
    #private;
    /**
     * Create a new DepositService instance
     *
     * @param deps - Platform dependencies for logging, metrics, etc.
     * @param messenger - Controller messenger for cross-controller communication.
     */
    constructor(deps: PerpsPlatformDependencies, messenger: PerpsControllerMessengerBase);
    /**
     * Prepare deposit transaction for confirmation
     * Extracts transaction construction logic from controller
     *
     * @param options - Configuration object
     * @param options.provider - Active provider instance
     * @returns Transaction data ready for TransactionController.addTransaction
     */
    prepareTransaction(options: {
        provider: PerpsProvider;
    }): Promise<{
        transaction: PerpsTransactionParams;
        assetChainId: Hex;
        currentDepositId: string;
    }>;
}
//# sourceMappingURL=DepositService.d.mts.map