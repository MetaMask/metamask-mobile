import {
  ExchangeClient,
  HttpTransport,
  InfoClient,
  SubscriptionClient,
  WebSocketTransport,
} from '@nktkas/hyperliquid';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { HYPERLIQUID_TRANSPORT_CONFIG } from '../constants/hyperLiquidConfig';
import type { HyperLiquidNetwork } from '../types/config';
import { strings } from '../../../../../locales/i18n';
import type { CandleData } from '../types/perps-types';

import { CandlePeriod } from '../constants/chartConfig';
import { ensureError } from '../utils/perpsErrorHandler';
import Logger from '../../../../util/Logger';
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
  private infoClient?: InfoClient;
  private subscriptionClient?: SubscriptionClient<WebSocketTransport>;
  private wsTransport?: WebSocketTransport;
  private httpTransport?: HttpTransport;
  private isTestnet: boolean;
  private connectionState: WebSocketConnectionState =
    WebSocketConnectionState.DISCONNECTED;
  private disconnectionPromise: Promise<void> | null = null;

  constructor(options: { isTestnet?: boolean } = {}) {
    this.isTestnet = options.isTestnet || false;
  }

  /**
   * Initialize all HyperLiquid SDK clients
   */
  public initialize(wallet: {
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
  }): void {
    try {
      this.connectionState = WebSocketConnectionState.CONNECTING;
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

      // InfoClient uses HTTP transport for read operations (queries, metadata, etc.)
      this.infoClient = new InfoClient({ transport: this.httpTransport });

      // SubscriptionClient uses WebSocket transport for real-time pub/sub (price feeds, position updates)
      this.subscriptionClient = new SubscriptionClient({
        transport: this.wsTransport,
      });

      this.connectionState = WebSocketConnectionState.CONNECTED;

      DevLogger.log('HyperLiquid SDK clients initialized', {
        testnet: this.isTestnet,
        timestamp: new Date().toISOString(),
        connectionState: this.connectionState,
        note: 'Using HTTP for InfoClient/ExchangeClient, WebSocket for SubscriptionClient',
      });
    } catch (error) {
      this.connectionState = WebSocketConnectionState.DISCONNECTED;
      DevLogger.log('Failed to initialize HyperLiquid SDK clients:', error);
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
  private createTransports(): void {
    DevLogger.log('HyperLiquid: Creating transports', {
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
    this.initialize(wallet);
    return this.isTestnet ? 'testnet' : 'mainnet';
  }

  /**
   * Check if clients are properly initialized
   */
  public isInitialized(): boolean {
    return !!(
      this.exchangeClient &&
      this.infoClient &&
      this.subscriptionClient
    );
  }

  /**
   * Ensure clients are initialized, throw if not
   */
  public ensureInitialized(): void {
    if (!this.isInitialized()) {
      throw new Error(strings('perps.errors.clientNotInitialized'));
    }
  }

  /**
   * Recreate subscription client if needed (for reconnection scenarios)
   */
  public ensureSubscriptionClient(wallet: {
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
  }): void {
    if (!this.subscriptionClient) {
      DevLogger.log(
        'HyperLiquid: Recreating subscription client after disconnect',
      );
      this.initialize(wallet);
    }
  }

  /**
   * Get the exchange client
   */
  public getExchangeClient(): ExchangeClient {
    this.ensureInitialized();
    if (!this.exchangeClient) {
      throw new Error(strings('perps.errors.exchangeClientNotAvailable'));
    }
    return this.exchangeClient;
  }

  /**
   * Get the info client
   */
  public getInfoClient(): InfoClient {
    this.ensureInitialized();
    if (!this.infoClient) {
      throw new Error(strings('perps.errors.infoClientNotAvailable'));
    }
    return this.infoClient;
  }

  /**
   * Get the subscription client
   */
  public getSubscriptionClient():
    | SubscriptionClient<WebSocketTransport>
    | undefined {
    if (!this.subscriptionClient) {
      DevLogger.log('SubscriptionClient not initialized');
      return undefined;
    }
    return this.subscriptionClient;
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
   * @param coin - The coin symbol (e.g., "BTC", "ETH")
   * @param interval - The interval (e.g., "1m", "5m", "15m", "30m", "1h", "2h", "4h", "8h", "12h", "1d", "3d", "1w", "1M")
   * @param limit - Number of candles to fetch (default: 100)
   * @param endTime - End timestamp in milliseconds (default: now). Used for fetching historical data before a specific time.
   * @returns Promise<CandleData | null>
   */
  public async fetchHistoricalCandles(
    coin: string,
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
      const infoClient = this.getInfoClient();
      const data = await infoClient.candleSnapshot({
        coin,
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
          coin,
          interval,
          candles,
        };
      }

      return {
        coin,
        interval,
        candles: [],
      };
    } catch (error) {
      DevLogger.log('Error fetching historical candles:', error);
      throw error;
    }
  }

  /**
   * Subscribe to candle updates via WebSocket
   * @param coin - The coin symbol (e.g., "BTC", "ETH")
   * @param interval - The interval (e.g., "1m", "5m", "15m", etc.)
   * @param callback - Function called with updated candle data
   * @returns Cleanup function to unsubscribe
   */
  public subscribeToCandles({
    coin,
    interval,
    callback,
  }: {
    coin: string;
    interval: ValidCandleInterval;
    callback: (data: CandleData) => void;
  }): () => void {
    this.ensureInitialized();

    const subscriptionClient = this.getSubscriptionClient();
    if (!subscriptionClient) {
      throw new Error(strings('perps.errors.subscriptionClientNotAvailable'));
    }

    let currentCandleData: CandleData | null = null;
    let wsUnsubscribe: (() => void) | null = null;
    let isUnsubscribed = false;

    // 1. Fetch initial historical data
    this.fetchHistoricalCandles(coin, interval)
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
        const subscription = subscriptionClient.candle(
          { coin, interval },
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
                coin,
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
            DevLogger.log('Error subscribing to candles:', error);
            // Don't throw - would create unhandled rejection since function already returned
          });
      })
      .catch((error) => {
        DevLogger.log('Error fetching initial candle data:', error);
        // Don't throw - would create unhandled rejection since function already returned
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
      this.connectionState = WebSocketConnectionState.DISCONNECTING;

      DevLogger.log('HyperLiquid: Disconnecting SDK clients', {
        isTestnet: this.isTestnet,
        timestamp: new Date().toISOString(),
        connectionState: this.connectionState,
      });

      // Close WebSocket transport only (HTTP is stateless)
      if (this.wsTransport) {
        try {
          await this.wsTransport.close();
          DevLogger.log('HyperLiquid: Closed WebSocket transport', {
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          Logger.error(ensureError(error), {
            context: 'HyperLiquidClientService.performDisconnection',
          });
        }
      }

      // Clear client references
      this.subscriptionClient = undefined;
      this.exchangeClient = undefined;
      this.infoClient = undefined;
      this.wsTransport = undefined;
      this.httpTransport = undefined;

      this.connectionState = WebSocketConnectionState.DISCONNECTED;

      DevLogger.log('HyperLiquid: SDK clients fully disconnected', {
        timestamp: new Date().toISOString(),
        connectionState: this.connectionState,
      });
    } catch (error) {
      this.connectionState = WebSocketConnectionState.DISCONNECTED;
      Logger.error(ensureError(error), {
        context: 'HyperLiquidClientService.performDisconnection',
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
}
