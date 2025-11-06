import {
  ExchangeClient,
  InfoClient,
  SubscriptionClient,
  WebSocketTransport,
} from '@nktkas/hyperliquid';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import {
  getWebSocketEndpoint,
  HYPERLIQUID_TRANSPORT_CONFIG,
} from '../constants/hyperLiquidConfig';
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
  private transport?: WebSocketTransport;
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
      this.transport = this.createTransport();

      // Wallet adapter implements AbstractViemJsonRpcAccount interface with signTypedData method
      this.exchangeClient = new ExchangeClient({
        wallet: wallet as any, // eslint-disable-line @typescript-eslint/no-explicit-any -- Type widening for SDK compatibility
        transport: this.transport,
      });

      this.infoClient = new InfoClient({ transport: this.transport });
      this.subscriptionClient = new SubscriptionClient({
        transport: this.transport,
      });

      this.connectionState = WebSocketConnectionState.CONNECTED;

      DevLogger.log('HyperLiquid SDK clients initialized', {
        testnet: this.isTestnet,
        endpoint: getWebSocketEndpoint(this.isTestnet),
        timestamp: new Date().toISOString(),
        connectionState: this.connectionState,
      });
    } catch (error) {
      this.connectionState = WebSocketConnectionState.DISCONNECTED;
      DevLogger.log('Failed to initialize HyperLiquid SDK clients:', error);
      throw error;
    }
  }

  /**
   * Create WebSocket transport with configuration
   */
  private createTransport(): WebSocketTransport {
    const wsUrl = getWebSocketEndpoint(this.isTestnet);

    DevLogger.log('HyperLiquid: Creating WebSocket transport', {
      endpoint: wsUrl,
      isTestnet: this.isTestnet,
      timestamp: new Date().toISOString(),
    });

    return new WebSocketTransport({
      url: wsUrl,
      ...HYPERLIQUID_TRANSPORT_CONFIG,
      reconnect: {
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
   * @returns Promise<CandleData | null>
   */
  public async fetchHistoricalCandles(
    coin: string,
    interval: ValidCandleInterval,
    limit: number = 100,
  ): Promise<CandleData | null> {
    this.ensureInitialized();

    try {
      // Calculate start and end times based on interval and limit
      const now = Date.now();
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

    // 1. Fetch initial historical data
    this.fetchHistoricalCandles(coin, interval)
      .then((initialData) => {
        currentCandleData = initialData;
        if (currentCandleData) {
          callback(currentCandleData);
        }

        // 2. Subscribe to WebSocket for new candles
        const subscription = subscriptionClient.candle(
          { coin, interval },
          (candleEvent) => {
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
                candles[candles.length - 1] = newCandle;
              } else {
                // New candle (completed candle)
                candles.push(newCandle);
              }
            }

            callback(currentCandleData);
          },
        );

        // Store cleanup function
        subscription
          .then((sub) => {
            wsUnsubscribe = () => sub.unsubscribe();
          })
          .catch((error) => {
            DevLogger.log('Error subscribing to candles:', error);
            throw error;
          });
      })
      .catch((error) => {
        DevLogger.log('Error fetching initial candle data:', error);
        throw error;
      });

    // Return cleanup function
    return () => {
      if (wsUnsubscribe) {
        wsUnsubscribe();
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
        endpoint: getWebSocketEndpoint(this.isTestnet),
        timestamp: new Date().toISOString(),
        connectionState: this.connectionState,
      });

      // Close the WebSocket connection via transport
      if (this.transport) {
        try {
          await this.transport.close();
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
      this.transport = undefined;

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
