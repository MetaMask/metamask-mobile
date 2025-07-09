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
      throw new Error('HyperLiquid SDK clients not properly initialized');
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
      throw new Error('ExchangeClient not available after initialization');
    }
    return this.exchangeClient;
  }

  /**
   * Get the info client
   */
  public getInfoClient(): InfoClient {
    this.ensureInitialized();
    if (!this.infoClient) {
      throw new Error('InfoClient not available after initialization');
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
            error: error instanceof Error ? error.message : 'Unknown error',
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
