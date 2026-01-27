import {
  ExchangeClient,
  HttpTransport,
  InfoClient,
  SubscriptionClient,
  WebSocketTransport,
} from '@nktkas/hyperliquid';
import { HYPERLIQUID_TRANSPORT_CONFIG } from '../constants/hyperLiquidConfig';
import type { HyperLiquidNetwork } from '../types/config';
import { PERPS_ERROR_CODES } from '../controllers/perpsErrorCodes';
import type { CandleData } from '../types/perps-types';

import { CandlePeriod, calculateCandleCount } from '../constants/chartConfig';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';
import { ensureError } from '../../../../util/errorUtils';
import type {
  SubscribeCandlesParams,
  PerpsPlatformDependencies,
} from '../controllers/types';
import { Hex } from '@metamask/utils';

/**
 * Valid time intervals for historical candle data
 * Uses CandlePeriod enum for type safety
 */
export type ValidCandleInterval = CandlePeriod;

/**
 * Connection states for WebSocket management
 */
export enum WebSocketConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
}

/**
 * Service for managing HyperLiquid SDK clients
 * Handles initialization, transport creation, and client lifecycle
 */
export class HyperLiquidClientService {
  private exchangeClient?: ExchangeClient;
  private infoClient?: InfoClient; // WebSocket transport (default)
  private infoClientHttp?: InfoClient; // HTTP transport (fallback)
  private subscriptionClient?: SubscriptionClient<{
    transport: WebSocketTransport;
  }>;
  private wsTransport?: WebSocketTransport;
  private httpTransport?: HttpTransport;
  private isTestnet: boolean;
  private connectionState: WebSocketConnectionState =
    WebSocketConnectionState.DISCONNECTED;
  private disconnectionPromise: Promise<void> | null = null;
  // Callback for SDK terminate event (fired when all reconnection attempts exhausted)
  private onTerminateCallback: ((error: Error) => void) | null = null;
  private onReconnectCallback?: () => Promise<void>;
  // Reconnection attempt counter
  private reconnectionAttempt = 0;
  // Connection state change listeners for event-based notifications
  private readonly connectionStateListeners: Set<
    (state: WebSocketConnectionState, reconnectionAttempt: number) => void
  > = new Set();
  // Timeout reference for reconnection retry, tracked to enable cancellation on disconnect
  private reconnectionRetryTimeout: ReturnType<typeof setTimeout> | null = null;

  // Platform dependencies for logging
  private readonly deps: PerpsPlatformDependencies;

  constructor(
    deps: PerpsPlatformDependencies,
    options: { isTestnet?: boolean } = {},
  ) {
    this.deps = deps;
    this.isTestnet = options.isTestnet || false;
  }

  /**
   * Initialize all HyperLiquid SDK clients
   *
   * IMPORTANT: This method awaits transport.ready() to ensure the WebSocket is
   * in OPEN state before marking initialization complete. This prevents race
   * conditions where subscriptions are attempted before the WebSocket handshake
   * completes (which would cause "subscribe error: undefined" errors).
   */
  public async initialize(wallet: {
    signTypedData: (params: {
      domain: {
        name: string;
        version: string;
        chainId: number;
        verifyingContract: Hex;
      };
      types: {
        [key: string]: { name: string; type: string }[];
      };
      primaryType: string;
      message: Record<string, unknown>;
    }) => Promise<Hex>;
    getChainId?: () => Promise<number>;
  }): Promise<void> {
    try {
      this.updateConnectionState(WebSocketConnectionState.CONNECTING);
      this.createTransports();

      // Ensure transports are created
      if (!this.httpTransport || !this.wsTransport) {
        throw new Error('Failed to create transports');
      }

      // Wallet adapter implements AbstractViemJsonRpcAccount interface with signTypedData method
      // ExchangeClient uses HTTP transport for write operations (orders, approvals, etc.)
      this.exchangeClient = new ExchangeClient({
        wallet: wallet as any, // eslint-disable-line @typescript-eslint/no-explicit-any -- Type widening for SDK compatibility
        transport: this.httpTransport,
      });

      // InfoClient with WebSocket transport (default) - multiplexed requests over single connection
      this.infoClient = new InfoClient({ transport: this.wsTransport });

      // InfoClient with HTTP transport (fallback) - for specific calls if WebSocket has issues
      this.infoClientHttp = new InfoClient({ transport: this.httpTransport });

      // SubscriptionClient uses WebSocket transport for real-time pub/sub (price feeds, position updates)
      this.subscriptionClient = new SubscriptionClient({
        transport: this.wsTransport,
      });

      // Wait for WebSocket to actually be ready before setting CONNECTED
      // This ensures we have a real connection, not just client objects
      await this.wsTransport.ready();

      this.updateConnectionState(WebSocketConnectionState.CONNECTED);

      this.deps.debugLogger.log('HyperLiquid SDK clients initialized', {
        testnet: this.isTestnet,
        timestamp: new Date().toISOString(),
        connectionState: this.connectionState,
        note: 'Using WebSocket for InfoClient (default), HTTP fallback available',
      });
    } catch (error) {
      // Cleanup on failure to prevent leaks and ensure isInitialized() returns false
      // Clear clients first, then transports
      this.subscriptionClient = undefined;
      this.infoClient = undefined;
      this.infoClientHttp = undefined;
      this.exchangeClient = undefined;

      // Close WebSocket transport to release resources and event listeners
      if (this.wsTransport) {
        try {
          await this.wsTransport.close();
        } catch {
          // Ignore cleanup errors
        }
        this.wsTransport = undefined;
      }
      this.httpTransport = undefined;

      const errorInstance = ensureError(error);
      this.updateConnectionState(WebSocketConnectionState.DISCONNECTED);

      // Log to Sentry: initialization failure blocks all Perps functionality
      this.deps.logger.error(errorInstance, {
        tags: {
          feature: PERPS_CONSTANTS.FeatureName,
          service: 'HyperLiquidClientService',
          network: this.isTestnet ? 'testnet' : 'mainnet',
        },
        context: {
          name: 'sdk_initialization',
          data: {
            operation: 'initialize',
            isTestnet: this.isTestnet,
          },
        },
      });

      throw error;
    }
  }

  /**
   * Create HTTP and WebSocket transports
   * - HTTP for InfoClient and ExchangeClient (request/response operations)
   * - WebSocket for SubscriptionClient (real-time pub/sub)
   *
   * Both transports use SDK's built-in endpoint resolution via isTestnet flag
   */
  private createTransports(): WebSocketTransport {
    // Prevent duplicate transport creation and listener accumulation
    // This guards against re-entry if initialize() is called multiple times
    // (e.g., after a failed initialization attempt that didn't properly clean up)
    if (this.wsTransport && this.httpTransport) {
      this.deps.debugLogger.log(
        'HyperLiquid: Transports already exist, skipping creation',
      );
      return this.wsTransport;
    }

    this.deps.debugLogger.log('HyperLiquid: Creating transports', {
      isTestnet: this.isTestnet,
      timestamp: new Date().toISOString(),
      note: 'SDK will auto-select endpoints based on isTestnet flag',
    });

    // HTTP transport for request/response operations (InfoClient, ExchangeClient)
    // SDK automatically selects: mainnet (https://api.hyperliquid.xyz) or testnet (https://api.hyperliquid-testnet.xyz)
    this.httpTransport = new HttpTransport({
      isTestnet: this.isTestnet,
      timeout: HYPERLIQUID_TRANSPORT_CONFIG.timeout,
    });

    // WebSocket transport for real-time subscriptions (SubscriptionClient)
    // SDK automatically selects: mainnet (wss://api.hyperliquid.xyz/ws) or testnet (wss://api.hyperliquid-testnet.xyz/ws)
    this.wsTransport = new WebSocketTransport({
      isTestnet: this.isTestnet,
      ...HYPERLIQUID_TRANSPORT_CONFIG,
      reconnect: {
        ...HYPERLIQUID_TRANSPORT_CONFIG.reconnect,
        WebSocket, // Use React Native's global WebSocket
      },
    });

    // Listen for WebSocket termination (fired when SDK exhausts all reconnection attempts)
    this.wsTransport.socket.addEventListener('terminate', (event: Event) => {
      const customEvent = event as CustomEvent;
      this.deps.debugLogger.log('HyperLiquid: WebSocket terminated', {
        reason: customEvent.detail?.code,
        timestamp: new Date().toISOString(),
      });

      this.updateConnectionState(WebSocketConnectionState.DISCONNECTED);

      if (this.onTerminateCallback) {
        const error =
          customEvent.detail instanceof Error
            ? customEvent.detail
            : new Error(
                `WebSocket terminated: ${customEvent.detail?.code || 'unknown'}`,
              );
        this.onTerminateCallback(error);
      }
    });

    return this.wsTransport;
  }

  /**
   * Toggle testnet mode and reinitialize clients
   */
  public async toggleTestnet(wallet: {
    signTypedData: (params: {
      domain: {
        name: string;
        version: string;
        chainId: number;
        verifyingContract: Hex;
      };
      types: {
        [key: string]: { name: string; type: string }[];
      };
      primaryType: string;
      message: Record<string, unknown>;
    }) => Promise<Hex>;
    getChainId?: () => Promise<number>;
  }): Promise<HyperLiquidNetwork> {
    this.isTestnet = !this.isTestnet;
    await this.initialize(wallet);
    return this.isTestnet ? 'testnet' : 'mainnet';
  }

  /**
   * Check if clients are properly initialized
   */
  public isInitialized(): boolean {
    return !!(
      this.exchangeClient &&
      this.infoClient &&
      this.infoClientHttp &&
      this.subscriptionClient
    );
  }

  /**
   * Ensure clients are initialized, throw if not
   */
  public ensureInitialized(): void {
    if (!this.isInitialized()) {
      throw new Error(PERPS_ERROR_CODES.CLIENT_NOT_INITIALIZED);
    }
  }

  /**
   * Recreate subscription client if needed (for reconnection scenarios)
   */
  public async ensureSubscriptionClient(wallet: {
    signTypedData: (params: {
      domain: {
        name: string;
        version: string;
        chainId: number;
        verifyingContract: Hex;
      };
      types: {
        [key: string]: { name: string; type: string }[];
      };
      primaryType: string;
      message: Record<string, unknown>;
    }) => Promise<Hex>;
    getChainId?: () => Promise<number>;
  }): Promise<void> {
    if (!this.subscriptionClient) {
      this.deps.debugLogger.log(
        'HyperLiquid: Recreating subscription client after disconnect',
      );
      await this.initialize(wallet);
    }
  }

  /**
   * Get the exchange client
   */
  public getExchangeClient(): ExchangeClient {
    this.ensureInitialized();
    if (!this.exchangeClient) {
      throw new Error(PERPS_ERROR_CODES.EXCHANGE_CLIENT_NOT_AVAILABLE);
    }
    return this.exchangeClient;
  }

  /**
   * Get the info client
   * @param options.useHttp - Force HTTP transport instead of WebSocket (default: false)
   * @returns InfoClient instance with the selected transport
   */
  public getInfoClient(options?: { useHttp?: boolean }): InfoClient {
    this.ensureInitialized();

    if (options?.useHttp) {
      if (!this.infoClientHttp) {
        throw new Error(PERPS_ERROR_CODES.INFO_CLIENT_NOT_AVAILABLE);
      }
      return this.infoClientHttp;
    }

    if (!this.infoClient) {
      throw new Error(PERPS_ERROR_CODES.INFO_CLIENT_NOT_AVAILABLE);
    }
    return this.infoClient;
  }

  /**
   * Get the subscription client
   */
  public getSubscriptionClient():
    | SubscriptionClient<{ transport: WebSocketTransport }>
    | undefined {
    if (!this.subscriptionClient) {
      this.deps.debugLogger.log('SubscriptionClient not initialized');
      return undefined;
    }
    return this.subscriptionClient;
  }

  /**
   * Ensures the WebSocket transport is in OPEN state and ready for subscriptions.
   * This MUST be called before any subscription operations to prevent race conditions.
   *
   * The SDK's `transport.ready()` method:
   * - Returns immediately if WebSocket is already in OPEN state
   * - Waits for the "open" event if WebSocket is in CONNECTING state
   * - Supports AbortSignal for timeout/cancellation
   *
   * @param timeoutMs - Maximum time to wait for transport ready (default 5000ms)
   * @throws Error if transport not ready within timeout or subscription client unavailable
   */
  public async ensureTransportReady(timeoutMs: number = 5000): Promise<void> {
    const subscriptionClient = this.getSubscriptionClient();
    if (!subscriptionClient) {
      throw new Error('Subscription client not initialized');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      await subscriptionClient.config_.transport.ready(controller.signal);
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(
          `WebSocket transport ready timeout after ${timeoutMs}ms`,
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get current network state
   */
  public getNetwork(): HyperLiquidNetwork {
    return this.isTestnet ? 'testnet' : 'mainnet';
  }

  /**
   * Check if running on testnet
   */
  public isTestnetMode(): boolean {
    return this.isTestnet;
  }

  /**
   * Update testnet mode
   */
  public setTestnetMode(isTestnet: boolean): void {
    this.isTestnet = isTestnet;
  }

  /**
   * Fetch historical candle data using the HyperLiquid SDK
   * @param symbol - The asset symbol (e.g., "BTC", "ETH")
   * @param interval - The interval (e.g., "1m", "5m", "15m", "30m", "1h", "2h", "4h", "8h", "12h", "1d", "3d", "1w", "1M")
   * @param limit - Number of candles to fetch (default: 100)
   * @param endTime - End timestamp in milliseconds (default: now). Used for fetching historical data before a specific time.
   * @returns Promise<CandleData | null>
   */
  public async fetchHistoricalCandles(
    symbol: string,
    interval: ValidCandleInterval,
    limit: number = 100,
    endTime?: number,
  ): Promise<CandleData | null> {
    this.ensureInitialized();

    try {
      // Calculate start and end times based on interval and limit
      const now = endTime ?? Date.now();
      const intervalMs = this.getIntervalMilliseconds(interval);
      const startTime = now - limit * intervalMs;

      // Use the SDK's InfoClient to fetch candle data
      // HyperLiquid SDK uses 'coin' terminology
      const infoClient = this.getInfoClient();
      const data = await infoClient.candleSnapshot({
        coin: symbol, // Map to HyperLiquid SDK's 'coin' parameter
        interval,
        startTime,
        endTime: now,
      });

      // Transform API response to match expected format
      if (Array.isArray(data) && data.length > 0) {
        const candles = data.map((candle) => ({
          time: candle.t, // open time
          open: candle.o.toString(),
          high: candle.h.toString(),
          low: candle.l.toString(),
          close: candle.c.toString(),
          volume: candle.v.toString(),
        }));

        return {
          symbol,
          interval,
          candles,
        };
      }

      return {
        symbol,
        interval,
        candles: [],
      };
    } catch (error) {
      const errorInstance = ensureError(error);

      // Log to Sentry: prevents initial chart data load
      this.deps.logger.error(errorInstance, {
        tags: {
          feature: PERPS_CONSTANTS.FeatureName,
          service: 'HyperLiquidClientService',
          network: this.isTestnet ? 'testnet' : 'mainnet',
        },
        context: {
          name: 'historical_candles_api',
          data: {
            operation: 'fetchHistoricalCandles',
            symbol,
            interval,
            limit,
            hasEndTime: endTime !== undefined,
          },
        },
      });

      throw error;
    }
  }

  /**
   * Subscribe to candle updates via WebSocket
   * @param symbol - The asset symbol (e.g., "BTC", "ETH")
   * @param interval - The interval (e.g., "1m", "5m", "15m", etc.)
   * @param duration - Optional time duration for calculating initial fetch size
   * @param callback - Function called with updated candle data
   * @param onError - Optional function called if subscription initialization fails
   * @returns Cleanup function to unsubscribe
   */
  public subscribeToCandles({
    symbol,
    interval,
    duration,
    callback,
    onError,
  }: SubscribeCandlesParams): () => void {
    this.ensureInitialized();

    const subscriptionClient = this.getSubscriptionClient();
    if (!subscriptionClient) {
      throw new Error(PERPS_ERROR_CODES.SUBSCRIPTION_CLIENT_NOT_AVAILABLE);
    }

    let currentCandleData: CandleData | null = null;
    let wsUnsubscribe: (() => void) | null = null;
    let isUnsubscribed = false;

    // Calculate initial fetch size dynamically based on duration and interval
    // Match main branch behavior: up to 500 candles initially
    const initialLimit = duration
      ? Math.min(calculateCandleCount(duration, interval), 500)
      : 100; // Default to 100 if no duration provided

    // 1. Fetch initial historical data
    this.fetchHistoricalCandles(symbol, interval, initialLimit)
      .then((initialData) => {
        // Don't proceed if already unsubscribed
        if (isUnsubscribed) {
          return;
        }

        currentCandleData = initialData;
        if (currentCandleData) {
          callback(currentCandleData);
        }

        // 2. Subscribe to WebSocket for new candles
        // HyperLiquid SDK uses 'coin' terminology
        const subscription = subscriptionClient.candle(
          { coin: symbol, interval }, // Map to HyperLiquid SDK's 'coin' parameter
          (candleEvent) => {
            // Don't process events if already unsubscribed
            if (isUnsubscribed) {
              return;
            }

            // Transform SDK CandleEvent to our Candle format
            const newCandle = {
              time: candleEvent.t,
              open: candleEvent.o.toString(),
              high: candleEvent.h.toString(),
              low: candleEvent.l.toString(),
              close: candleEvent.c.toString(),
              volume: candleEvent.v.toString(),
            };

            if (!currentCandleData) {
              currentCandleData = {
                symbol,
                interval,
                candles: [newCandle],
              };
            } else {
              // Check if this is an update to the last candle or a new candle
              const candles = currentCandleData.candles;
              const lastCandle = candles[candles.length - 1];

              if (lastCandle && lastCandle.time === newCandle.time) {
                // Update existing candle (live candle update)
                // Create new array with updated last element to trigger React re-render
                currentCandleData = {
                  ...currentCandleData,
                  candles: [...candles.slice(0, -1), newCandle],
                };
              } else {
                // New candle (completed candle)
                // Create new array with added element to trigger React re-render
                currentCandleData = {
                  ...currentCandleData,
                  candles: [...candles, newCandle],
                };
              }
            }

            callback(currentCandleData);
          },
        );

        // Store cleanup function
        subscription
          .then((sub) => {
            wsUnsubscribe = () => sub.unsubscribe();
            // If already unsubscribed while waiting, clean up immediately
            if (isUnsubscribed && wsUnsubscribe) {
              wsUnsubscribe();
              wsUnsubscribe = null;
            }
          })
          .catch((error) => {
            const errorInstance = ensureError(error);

            // Log to Sentry: WebSocket subscription failure prevents live updates
            this.deps.logger.error(errorInstance, {
              tags: {
                feature: PERPS_CONSTANTS.FeatureName,
                service: 'HyperLiquidClientService',
                network: this.isTestnet ? 'testnet' : 'mainnet',
              },
              context: {
                name: 'websocket_subscription',
                data: {
                  operation: 'subscribeToCandles',
                  symbol,
                  interval,
                  phase: 'ws_subscription',
                },
              },
            });

            // Notify caller of error
            onError?.(errorInstance);
          });
      })
      .catch((error) => {
        const errorInstance = ensureError(error);

        // Log to Sentry: initial fetch failure blocks chart completely
        this.deps.logger.error(errorInstance, {
          tags: {
            feature: PERPS_CONSTANTS.FeatureName,
            service: 'HyperLiquidClientService',
            network: this.isTestnet ? 'testnet' : 'mainnet',
          },
          context: {
            name: 'initial_candles_fetch',
            data: {
              operation: 'subscribeToCandles',
              symbol,
              interval,
              phase: 'initial_fetch',
              initialLimit,
            },
          },
        });

        // Notify caller of error
        onError?.(errorInstance);
      });

    // Return cleanup function
    return () => {
      isUnsubscribed = true;
      if (wsUnsubscribe) {
        wsUnsubscribe();
        wsUnsubscribe = null;
      }
    };
  }

  /**
   * Convert interval string to milliseconds
   */
  private getIntervalMilliseconds(interval: CandlePeriod): number {
    const intervalMap: Record<CandlePeriod, number> = {
      [CandlePeriod.ONE_MINUTE]: 1 * 60 * 1000,
      [CandlePeriod.THREE_MINUTES]: 3 * 60 * 1000,
      [CandlePeriod.FIVE_MINUTES]: 5 * 60 * 1000,
      [CandlePeriod.FIFTEEN_MINUTES]: 15 * 60 * 1000,
      [CandlePeriod.THIRTY_MINUTES]: 30 * 60 * 1000,
      [CandlePeriod.ONE_HOUR]: 60 * 60 * 1000,
      [CandlePeriod.TWO_HOURS]: 2 * 60 * 60 * 1000,
      [CandlePeriod.FOUR_HOURS]: 4 * 60 * 60 * 1000,
      [CandlePeriod.EIGHT_HOURS]: 8 * 60 * 60 * 1000,
      [CandlePeriod.TWELVE_HOURS]: 12 * 60 * 60 * 1000,
      [CandlePeriod.ONE_DAY]: 24 * 60 * 60 * 1000,
      [CandlePeriod.THREE_DAYS]: 3 * 24 * 60 * 60 * 1000,
      [CandlePeriod.ONE_WEEK]: 7 * 24 * 60 * 60 * 1000,
      [CandlePeriod.ONE_MONTH]: 30 * 24 * 60 * 60 * 1000, // Approximate
    };

    return intervalMap[interval];
  }

  /**
   * Disconnect and cleanup all clients
   */
  public async disconnect(): Promise<void> {
    // Return existing promise if already disconnecting
    if (this.disconnectionPromise) {
      return this.disconnectionPromise;
    }

    // If already disconnected, return immediately
    if (this.connectionState === WebSocketConnectionState.DISCONNECTED) {
      return;
    }

    // Create and store the disconnection promise
    this.disconnectionPromise = this.performDisconnection();

    try {
      await this.disconnectionPromise;
    } finally {
      this.disconnectionPromise = null;
    }
  }

  private async performDisconnection(): Promise<void> {
    try {
      this.updateConnectionState(WebSocketConnectionState.DISCONNECTING);

      this.deps.debugLogger.log('HyperLiquid: Disconnecting SDK clients', {
        isTestnet: this.isTestnet,
        timestamp: new Date().toISOString(),
        connectionState: this.connectionState,
      });

      // Clear callbacks
      this.onReconnectCallback = undefined;
      this.onTerminateCallback = null;

      // Cancel any pending reconnection retry timeout
      if (this.reconnectionRetryTimeout) {
        clearTimeout(this.reconnectionRetryTimeout);
        this.reconnectionRetryTimeout = null;
      }

      // Clear connection state listeners to prevent stale callbacks
      this.connectionStateListeners.clear();

      // Reset reconnection flag to allow future manual retries
      // This prevents a race condition where disconnecting during an active
      // reconnection attempt could leave the flag stuck, blocking subsequent retries
      this.isReconnecting = false;

      // Close WebSocket transport only (HTTP is stateless)
      if (this.wsTransport) {
        try {
          await this.wsTransport.close();
          this.deps.debugLogger.log('HyperLiquid: Closed WebSocket transport', {
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          this.deps.logger.error(ensureError(error), {
            context: {
              name: 'HyperLiquidClientService.performDisconnection',
              data: { action: 'close_transport' },
            },
          });
        }
      }

      // Clear client references
      this.subscriptionClient = undefined;
      this.exchangeClient = undefined;
      this.infoClient = undefined;
      this.infoClientHttp = undefined;
      this.wsTransport = undefined;
      this.httpTransport = undefined;

      this.updateConnectionState(WebSocketConnectionState.DISCONNECTED);

      this.deps.debugLogger.log('HyperLiquid: SDK clients fully disconnected', {
        timestamp: new Date().toISOString(),
        connectionState: this.connectionState,
      });
    } catch (error) {
      this.updateConnectionState(WebSocketConnectionState.DISCONNECTED);
      this.deps.logger.error(ensureError(error), {
        context: {
          name: 'HyperLiquidClientService.performDisconnection',
          data: { action: 'outer_catch' },
        },
      });
      throw error;
    }
  }

  /**
   * Get current WebSocket connection state
   */
  public getConnectionState(): WebSocketConnectionState {
    return this.connectionState;
  }

  /**
   * Check if WebSocket is fully disconnected
   */
  public isDisconnected(): boolean {
    return this.connectionState === WebSocketConnectionState.DISCONNECTED;
  }

  /**
   * Set callback to be invoked when reconnection is needed
   * This allows the service to notify external components (like PerpsConnectionManager)
   * when a connection drop is detected
   */
  public setOnReconnectCallback(callback: () => Promise<void>): void {
    this.onReconnectCallback = callback;
  }

  /**
   * Set callback for WebSocket termination events
   * Called when the SDK exhausts all reconnection attempts
   */
  public setOnTerminateCallback(
    callback: ((error: Error) => void) | null,
  ): void {
    this.onTerminateCallback = callback;
  }

  /**
   * Subscribe to connection state changes.
   * The listener will be called immediately with the current state and whenever the state changes.
   *
   * @param listener - Callback function that receives the new connection state and reconnection attempt
   * @returns Unsubscribe function to remove the listener
   */
  public subscribeToConnectionState(
    listener: (
      state: WebSocketConnectionState,
      reconnectionAttempt: number,
    ) => void,
  ): () => void {
    this.connectionStateListeners.add(listener);

    // Immediately notify with current state
    // Wrap in try-catch to match notifyConnectionStateListeners behavior
    // This ensures the unsubscribe function is always returned even if listener throws
    try {
      listener(this.connectionState, this.reconnectionAttempt);
    } catch {
      // Ignore errors in listeners to prevent breaking subscription mechanism
      // If listener throws, it will be removed when unsubscribe is called
    }

    // Return unsubscribe function
    return () => {
      this.connectionStateListeners.delete(listener);
    };
  }

  /**
   * Update connection state and notify all listeners
   * Always notifies if state changes OR if we're in CONNECTING state (to update attempt count)
   */
  private updateConnectionState(newState: WebSocketConnectionState): void {
    const previousState = this.connectionState;
    const stateChanged = previousState !== newState;
    const isReconnectionAttempt =
      newState === WebSocketConnectionState.CONNECTING &&
      this.reconnectionAttempt > 0;

    this.connectionState = newState;

    // Reset reconnection attempt counter when successfully connected
    if (newState === WebSocketConnectionState.CONNECTED) {
      this.reconnectionAttempt = 0;
    }

    // Notify if state changed OR if this is a reconnection attempt (to update attempt count)
    if (stateChanged || isReconnectionAttempt) {
      this.notifyConnectionStateListeners();
    }
  }

  /**
   * Notify all connection state listeners of the current state
   */
  private notifyConnectionStateListeners(): void {
    this.connectionStateListeners.forEach((listener) => {
      try {
        listener(this.connectionState, this.reconnectionAttempt);
      } catch {
        // Ignore errors in listeners to prevent breaking other listeners
      }
    });
  }

  // Flag to prevent concurrent reconnection attempts
  private isReconnecting = false;

  // Maximum number of reconnection attempts before giving up
  private static readonly MAX_RECONNECTION_ATTEMPTS = 10;

  /**
   * Manually trigger a reconnection attempt.
   * This is exposed for UI retry buttons when user wants to force reconnection.
   * Resets the reconnection attempt counter to allow retrying after max attempts.
   */
  public async reconnect(): Promise<void> {
    this.deps.debugLogger.log('[HyperLiquidClientService] reconnect() called', {
      previousAttempt: this.reconnectionAttempt,
      currentState: this.connectionState,
    });
    // Reset attempt counter when user manually triggers retry
    this.reconnectionAttempt = 0;
    await this.handleConnectionDrop();
    this.deps.debugLogger.log(
      '[HyperLiquidClientService] reconnect() completed',
      {
        newState: this.connectionState,
      },
    );
  }

  /**
   * Handle detected connection drop
   * Recreates WebSocket transport and notifies callback to restore subscriptions
   * Will give up after MAX_RECONNECTION_ATTEMPTS and mark status as disconnected
   */
  private async handleConnectionDrop(): Promise<void> {
    // Prevent multiple simultaneous reconnection attempts
    if (this.isReconnecting) {
      return;
    }

    this.isReconnecting = true;

    // Increment reconnection attempt counter
    this.reconnectionAttempt++;

    // Check if we've exceeded max retry attempts
    if (
      this.reconnectionAttempt >
      HyperLiquidClientService.MAX_RECONNECTION_ATTEMPTS
    ) {
      this.isReconnecting = false;
      this.updateConnectionState(WebSocketConnectionState.DISCONNECTED);
      return;
    }

    try {
      this.updateConnectionState(WebSocketConnectionState.CONNECTING);

      // Close existing WebSocket transport and clear references
      // so createTransports() will create fresh ones
      if (this.wsTransport) {
        try {
          await this.wsTransport.close();
        } catch {
          // Ignore errors during close - transport may already be dead
        }
      }
      this.wsTransport = undefined;
      this.httpTransport = undefined;

      // Recreate WebSocket transport - returns the new transport for type safety
      const newWsTransport = this.createTransports();

      // Recreate clients that use WebSocket transport
      this.infoClient = new InfoClient({ transport: newWsTransport });
      this.subscriptionClient = new SubscriptionClient({
        transport: newWsTransport,
      });

      await newWsTransport.ready();

      this.deps.debugLogger.log(
        'HyperLiquid: Transport ready, restoring subscriptions',
        { timestamp: new Date().toISOString() },
      );

      // NOW safe to restore subscriptions
      if (this.onReconnectCallback) {
        await this.onReconnectCallback();
      }

      // Cancel any pending retry timeout from previous failed attempts
      if (this.reconnectionRetryTimeout) {
        clearTimeout(this.reconnectionRetryTimeout);
        this.reconnectionRetryTimeout = null;
      }

      this.updateConnectionState(WebSocketConnectionState.CONNECTED);
      this.isReconnecting = false;
    } catch {
      // Reset flag before scheduling retry so the next attempt can proceed
      this.isReconnecting = false;

      // Check if we've exceeded max retry attempts
      if (
        this.reconnectionAttempt >=
        HyperLiquidClientService.MAX_RECONNECTION_ATTEMPTS
      ) {
        this.updateConnectionState(WebSocketConnectionState.DISCONNECTED);
        return;
      }

      // Reconnection failed - schedule a retry after a delay
      // Store timeout reference so it can be cancelled on intentional disconnect
      this.reconnectionRetryTimeout = setTimeout(() => {
        this.reconnectionRetryTimeout = null; // Clear reference after execution
        // Only retry if we haven't been intentionally disconnected
        // and no manual reconnect() is already in progress
        // Note: State may be CONNECTING or DISCONNECTED (if terminate event fired during reconnect)
        if (
          (this.connectionState === WebSocketConnectionState.CONNECTING ||
            this.connectionState === WebSocketConnectionState.DISCONNECTED) &&
          !this.disconnectionPromise &&
          !this.isReconnecting
        ) {
          this.handleConnectionDrop();
        }
      }, PERPS_CONSTANTS.ReconnectionRetryDelayMs);
    }
  }
}
