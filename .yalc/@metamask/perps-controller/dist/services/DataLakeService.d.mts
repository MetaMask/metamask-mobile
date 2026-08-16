import type { PerpsPlatformDependencies } from "../types/index.mjs";
import type { PerpsControllerMessengerBase } from "../types/messenger.mjs";
import type { ServiceContext } from "./ServiceContext.mjs";
/**
 * DataLakeService
 *
 * Handles reporting order events to external Data Lake API.
 * Implements exponential backoff retry logic and performance tracing.
 * Stateless service that operates purely on external API calls.
 *
 * Instance-based service with constructor injection of platform dependencies.
 */
export declare class DataLakeService {
    #private;
    /**
     * Create a new DataLakeService instance
     *
     * @param deps - Platform dependencies for logging, metrics, etc.
     * @param messenger - Controller messenger for cross-controller communication.
     */
    constructor(deps: PerpsPlatformDependencies, messenger: PerpsControllerMessengerBase);
    /**
     * Report order events to data lake API with retry (non-blocking)
     * Implements exponential backoff retry logic (max 3 retries)
     *
     * @param options - Configuration object
     * @param options.action - Order action ('open' or 'close')
     * @param options.symbol - Market symbol
     * @param options.slPrice - Optional stop loss price.
     * @param options.tpPrice - Optional take profit price.
     * @param options.isTestnet - Whether this is a testnet operation (skips API call)
     * @param options.context - ServiceContext for dependencies (messenger, tracing)
     * @param options.retryCount - Internal retry counter (managed by service)
     * @param options._traceId - Internal trace ID (managed by service)
     * @returns Result object with success flag and optional error message
     */
    reportOrder(options: {
        action: 'open' | 'close';
        symbol: string;
        slPrice?: number;
        tpPrice?: number;
        isTestnet: boolean;
        context: ServiceContext;
        retryCount?: number;
        _traceId?: string;
    }): Promise<{
        success: boolean;
        error?: string;
    }>;
}
//# sourceMappingURL=DataLakeService.d.mts.map