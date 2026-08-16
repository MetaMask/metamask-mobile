import { Hex } from "@metamask/utils";
import { ExchangeClient, InfoClient, SubscriptionClient, WebSocketTransport } from "@nktkas/hyperliquid";
import type { HistoricalOrdersResponse } from "@nktkas/hyperliquid";
import { CandlePeriod } from "../constants/chartConfig.mjs";
import type { HyperLiquidNetwork } from "../types/config.mjs";
import { WebSocketConnectionState } from "../types/index.mjs";
import type { SubscribeCandlesParams, PerpsPlatformDependencies } from "../types/index.mjs";
import type { CandleData } from "../types/perps-types.mjs";
/**
 * Valid time intervals for historical candle data
 * Uses CandlePeriod enum for type safety
 */
export type ValidCandleInterval = CandlePeriod;
/**
 * Wallet interface for HyperLiquid SDK operations.
 * Extracted for reuse across initialize(), toggleTestnet(), and ensureSubscriptionClient() methods.
 */
export type HyperLiquidWalletParams = {
    signTypedData: (params: {
        domain: {
            name: string;
            version: string;
            chainId: number;
            verifyingContract: Hex;
        };
        types: {
            [key: string]: {
                name: string;
                type: string;
            }[];
        };
        primaryType: string;
        message: Record<string, unknown>;
    }) => Promise<Hex>;
    getChainId?: () => Promise<number>;
};
export { WebSocketConnectionState } from "../types/index.mjs";
/**
 * Service for managing HyperLiquid SDK clients
 * Handles initialization, transport creation, and client lifecycle
 */
export declare class HyperLiquidClientService {
    #private;
    constructor(deps: PerpsPlatformDependencies, options?: {
        isTestnet?: boolean;
    });
    /**
     * Initialize all HyperLiquid SDK clients
     *
     * IMPORTANT: This method awaits transport.ready() to ensure the WebSocket is
     * in OPEN state before marking initialization complete. This prevents race
     * conditions where subscriptions are attempted before the WebSocket handshake
     * completes (which would cause "subscribe error: undefined" errors).
     *
     * @param wallet - The wallet parameters for signing typed data.
     */
    initialize(wallet: HyperLiquidWalletParams): Promise<void>;
    /**
     * Toggle testnet mode and reinitialize clients
     *
     * @param wallet - The wallet parameters for signing typed data.
     * @returns The new network name after toggling.
     */
    toggleTestnet(wallet: HyperLiquidWalletParams): Promise<HyperLiquidNetwork>;
    /**
     * Check if clients are properly initialized
     *
     * @returns True if all SDK clients are initialized.
     */
    isInitialized(): boolean;
    /**
     * Ensure clients are initialized, throw if not
     */
    ensureInitialized(): void;
    /**
     * Recreate subscription client if needed (for reconnection scenarios)
     *
     * @param wallet - The wallet parameters for signing typed data.
     */
    ensureSubscriptionClient(wallet: HyperLiquidWalletParams): Promise<void>;
    /**
     * Get the exchange client
     *
     * @returns The initialized ExchangeClient instance.
     */
    getExchangeClient(): ExchangeClient;
    /**
     * Get the info client
     *
     * @param options - The options for selecting the transport.
     * @param options.useHttp - Force HTTP transport instead of WebSocket (default: false).
     * @returns InfoClient instance with the selected transport.
     */
    getInfoClient(options?: {
        useHttp?: boolean;
    }): InfoClient;
    /**
     * Get the subscription client
     *
     * @returns The SubscriptionClient instance, or undefined if not initialized.
     */
    getSubscriptionClient(): SubscriptionClient<{
        transport: WebSocketTransport;
    }> | undefined;
    /**
     * Ensures the WebSocket transport is in OPEN state and ready for subscriptions.
     * This MUST be called before any subscription operations to prevent race conditions.
     *
     * The SDK's `transport.ready()` method:
     * - Returns immediately if WebSocket is already in OPEN state
     * - Waits for the "open" event if WebSocket is in CONNECTING state
     * - Supports AbortSignal for timeout/cancellation
     *
     * @param options - The options for transport readiness check.
     * @param options.timeoutMs - Maximum time to wait for transport ready (default 5000ms).
     * @throws Error if transport not ready within timeout or subscription client unavailable.
     */
    ensureTransportReady(options?: {
        timeoutMs?: number;
    }): Promise<void>;
    /**
     * Get current network state
     *
     * @returns The current HyperLiquid network (mainnet or testnet).
     */
    getNetwork(): HyperLiquidNetwork;
    /**
     * Check if running on testnet
     *
     * @returns True if the service is in testnet mode.
     */
    isTestnetMode(): boolean;
    /**
     * Update testnet mode
     *
     * @param isTestnet - Whether to enable testnet mode.
     */
    setTestnetMode(isTestnet: boolean): void;
    /**
     * Fetch historical candle data using the HyperLiquid SDK
     *
     * @param options - The candle fetch configuration.
     * @param options.symbol - The asset symbol (e.g., "BTC", "ETH").
     * @param options.interval - The candle interval (e.g., "1m", "5m", "15m", "1h", "1d").
     * @param options.limit - Number of candles to fetch (default: 100).
     * @param options.endTime - End timestamp in milliseconds (default: now).
     * @param options.signal - Optional AbortSignal to cancel the fetch.
     * @returns The historical candle data, or null if no data is available.
     */
    fetchHistoricalCandles(options: {
        symbol: string;
        interval: ValidCandleInterval;
        limit?: number;
        endTime?: number;
        signal?: AbortSignal;
    }): Promise<CandleData | null>;
    /**
     * Fetch the user's historical orders via the HyperLiquid SDK, coalesced
     * across concurrent callers and cached for {@link PERFORMANCE_CONFIG.PerpsRestCoalesceTtlMs}.
     *
     * Both getOrders (service layer) and the getUserFills enrichment sidecar
     * (fills→order-type resolution for TP/SL pills in activity) hit the same
     * `historicalOrders` info-post. Routing both through this wrapper means the
     * enrichment path rides the same cache as an explicit activity-page fetch,
     * so rapid market switching never fires redundant HL traffic.
     *
     * Pass `forceRefresh: true` to bypass the coalesce cache end-to-end
     * (hooks → controller → MarketDataService → provider → this method), which
     * is required for pull-to-refresh to fetch fresh data from the network.
     *
     * @param userAddress - The user's 0x address to query.
     * @param options - Optional cache-control options.
     * @param options.forceRefresh - When true, bypasses the coalesce cache.
     * @returns Array of historical orders, empty array on SDK null.
     */
    fetchHistoricalOrders(userAddress: Hex, options?: {
        forceRefresh?: boolean;
    }): Promise<HistoricalOrdersResponse>;
    /**
     * Subscribe to candle updates via WebSocket
     *
     * @param root0 - The subscription parameters.
     * @param root0.symbol - The asset symbol (e.g., "BTC", "ETH").
     * @param root0.interval - The candle interval (e.g., "1m", "5m", "15m").
     * @param root0.duration - Optional time duration for calculating initial fetch size.
     * @param root0.callback - Function called with updated candle data.
     * @param root0.onError - Optional function called if subscription initialization fails.
     * @returns Cleanup function to unsubscribe.
     */
    subscribeToCandles({ symbol, interval, duration, callback, onError, }: SubscribeCandlesParams): () => void;
    /**
     * Disconnect and cleanup all clients
     *
     * @returns A promise that resolves when disconnection is complete.
     */
    disconnect(): Promise<void>;
    /**
     * Get current WebSocket connection state
     *
     * @returns The current WebSocket connection state.
     */
    getConnectionState(): WebSocketConnectionState;
    /**
     * Check if WebSocket is fully disconnected
     *
     * @returns True if the WebSocket is in disconnected state.
     */
    isDisconnected(): boolean;
    /**
     * Set callback to be invoked when reconnection is needed
     * This allows the service to notify external components (like PerpsConnectionManager)
     * when a connection drop is detected
     *
     * @param callback - The async callback to invoke when reconnection is needed.
     */
    setOnReconnectCallback(callback: () => Promise<void>): void;
    /**
     * Set callback for WebSocket termination events
     * Called when the SDK exhausts all reconnection attempts
     *
     * @param callback - The callback to invoke on termination, or null to clear.
     */
    setOnTerminateCallback(callback: ((error: Error) => void) | null): void;
    /**
     * Subscribe to connection state changes.
     * The listener will be called immediately with the current state and whenever the state changes.
     *
     * @param listener - Callback function that receives the new connection state and reconnection attempt
     * @returns Unsubscribe function to remove the listener
     */
    subscribeToConnectionState(listener: (state: WebSocketConnectionState, reconnectionAttempt: number) => void): () => void;
    /**
     * Manually trigger a reconnection attempt.
     * This is exposed for UI retry buttons when user wants to force reconnection.
     * Resets the reconnection attempt counter to allow retrying after max attempts.
     */
    reconnect(): Promise<void>;
}
//# sourceMappingURL=HyperLiquidClientService.d.mts.map