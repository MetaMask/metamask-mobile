import {
  ExchangeClient,
  InfoClient,
  SubscriptionClient,
  WebSocketTransport,
} from '@deeeed/hyperliquid-node20';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import {
  getWebSocketEndpoint,
  HYPERLIQUID_TRANSPORT_CONFIG,
} from '../constants/hyperLiquidConfig';
import type { HyperLiquidNetwork } from '../types/config';
import { strings } from '../../../../../locales/i18n';
import type { CandleData } from '../types';

import { CandlePeriod } from '../constants/chartConfig';

/**
 * Valid time intervals for historical candle data
 * Uses CandlePeriod enum for type safety
 */
export type ValidCandleInterval = CandlePeriod;

/**
 * Service for managing HyperLiquid SDK clients
 * Handles initialization, transport creation, and client lifecycle
 */
export class HyperLiquidClientService {
  private exchangeClient?: ExchangeClient;
  private infoClient?: InfoClient;
  private subscriptionClient?: SubscriptionClient;
  private transport?: WebSocketTransport;
  private isTestnet: boolean;

  constructor(options: { isTestnet?: boolean } = {}) {
    this.isTestnet = options.isTestnet || false;
  }

  /**
   * Initialize all HyperLiquid SDK clients
   */
  public initialize(wallet: {
    request: (args: { method: string; params: unknown[] }) => Promise<unknown>;
  }): void {
    try {
      this.transport = this.createTransport();

      this.exchangeClient = new ExchangeClient({
        wallet,
        transport: this.transport,
        isTestnet: this.isTestnet,
      });

      this.infoClient = new InfoClient({ transport: this.transport });
      this.subscriptionClient = new SubscriptionClient({
        transport: this.transport,
      });

      DevLogger.log('HyperLiquid SDK clients initialized', {
        testnet: this.isTestnet,
        endpoint: getWebSocketEndpoint(this.isTestnet),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
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
    });
  }

  /**
   * Toggle testnet mode and reinitialize clients
   */
  public async toggleTestnet(wallet: {
    request: (args: { method: string; params: unknown[] }) => Promise<unknown>;
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
    request: (args: { method: string; params: unknown[] }) => Promise<unknown>;
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
  public getSubscriptionClient(): SubscriptionClient | undefined {
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
    try {
      DevLogger.log('HyperLiquid: Disconnecting SDK clients', {
        isTestnet: this.isTestnet,
        endpoint: getWebSocketEndpoint(this.isTestnet),
        timestamp: new Date().toISOString(),
      });

      // Properly close the WebSocket connection using SDK's AsyncDisposable
      if (this.subscriptionClient) {
        try {
          await this.subscriptionClient[Symbol.asyncDispose]();
          DevLogger.log(
            'HyperLiquid: Properly closed WebSocket connection via asyncDispose',
            {
              timestamp: new Date().toISOString(),
            },
          );
        } catch (error) {
          DevLogger.log('HyperLiquid: Error closing WebSocket connection', {
            error:
              error instanceof Error
                ? error.message
                : strings('perps.errors.unknownError'),
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Clear client references
      this.subscriptionClient = undefined;
      this.exchangeClient = undefined;
      this.infoClient = undefined;
      this.transport = undefined;

      DevLogger.log('HyperLiquid: SDK clients fully disconnected', {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      DevLogger.log('HyperLiquid: Error during client disconnect:', error);
      throw error;
    }
  }
}
