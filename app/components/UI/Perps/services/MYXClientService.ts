/**
 * MYXClientService
 *
 * Service for managing MYX SDK client lifecycle.
 * Handles initialization, transport creation, and client lifecycle management.
 *
 * Key differences from HyperLiquidClientService:
 * - Uses @myx-trade/sdk instead of @nktkas/hyperliquid
 * - Multi-pool model requires pool discovery before trading
 * - USDT collateral on BNB chain (vs USDC on Arbitrum)
 * - Separate HTTP and WebSocket handling
 */

import { MyxClient } from '@myx-trade/sdk';
import { ensureError } from '../../../../util/errorUtils';
import { getMYXChainId, MYX_TRANSPORT_CONFIG } from '../constants/myxConfig';
import type {
  IPerpsPlatformDependencies,
  SubscribeCandlesParams,
} from '../controllers/types';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';
import type {
  MYXNetwork,
  MYXPoolSymbol,
  MYXTicker,
  MYXAccountInfo,
  MYXPosition,
  MYXOrder,
  MYXPlaceOrderParams,
  MYXPositionTpSlParams,
} from '../types/myx-types';
import type { CandleData } from '../types/perps-types';
import {
  calculateCandleCount,
  type CandlePeriod,
} from '../constants/chartConfig';

// ============================================================================
// Types
// ============================================================================

/**
 * MYX Client Configuration
 */
export interface MYXClientConfig {
  chainId: number;
  brokerAddress: string;
  isTestnet: boolean;
}

/**
 * Connection states for WebSocket management
 */
export enum MYXConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
}

/**
 * Signer interface compatible with MYX SDK
 * The MYX SDK expects an ethers.Signer-like interface
 */
export interface MYXSignerAdapter {
  getAddress(): Promise<string>;
  signMessage(message: string | Uint8Array): Promise<string>;
  signTypedData(
    domain: Record<string, unknown>,
    types: Record<string, unknown[]>,
    value: Record<string, unknown>,
  ): Promise<string>;
}

// ============================================================================
// MYXClientService
// ============================================================================

/**
 * Service for managing MYX SDK clients
 * Handles initialization, transport creation, and client lifecycle
 */
export class MYXClientService {
  // Client instance using SDK type
  private myxClient?: MyxClient;

  // Configuration
  private config: MYXClientConfig;
  private isTestnet: boolean;

  // Connection state
  private connectionState: MYXConnectionState = MYXConnectionState.DISCONNECTED;
  private disconnectionPromise: Promise<void> | null = null;

  // Health check monitoring
  private healthCheckInterval?: ReturnType<typeof setInterval>;
  private healthCheckTimeout?: ReturnType<typeof setTimeout>;
  private isHealthCheckRunning = false;
  private onReconnectCallback?: () => Promise<void>;

  // Pool cache (MYX uses Multi-Pool Model)
  private poolsCache: MYXPoolSymbol[] = [];
  private poolsCacheTimestamp = 0;
  private readonly POOLS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  // Authentication token cache for WebSocket
  private accessToken: { token: string; expireAt: number } | null = null;
  private readonly TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
  private signer: MYXSignerAdapter | null = null;

  // Platform dependencies for logging
  private readonly deps: IPerpsPlatformDependencies;

  constructor(
    deps: IPerpsPlatformDependencies,
    options: { isTestnet?: boolean; brokerAddress?: string } = {},
  ) {
    this.deps = deps;
    this.isTestnet = options.isTestnet ?? false;

    this.config = {
      chainId: parseInt(getMYXChainId(this.isTestnet), 10),
      brokerAddress: options.brokerAddress || '',
      isTestnet: this.isTestnet,
    };
  }

  // ============================================================================
  // Error Context Helper
  // ============================================================================

  /**
   * Get error context for Sentry logging
   */
  private getErrorContext(
    method: string,
    extra?: Record<string, unknown>,
  ): {
    tags?: Record<string, string | number>;
    context?: { name: string; data: Record<string, unknown> };
    extras?: Record<string, unknown>;
  } {
    return {
      tags: {
        feature: PERPS_CONSTANTS.FEATURE_NAME,
        service: 'MYXClientService',
        network: this.isTestnet ? 'testnet' : 'mainnet',
      },
      context: {
        name: `MYXClientService.${method}`,
        data: {
          chainId: this.config.chainId,
          ...extra,
        },
      },
    };
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the MYX SDK client
   *
   * @param signer - Signer adapter for transaction signing
   */
  public async initialize(signer: MYXSignerAdapter): Promise<void> {
    try {
      this.connectionState = MYXConnectionState.CONNECTING;
      this.signer = signer;

      // Initialize real MYX SDK client
      // MYX SDK expects ethers.Signer but only uses a subset of methods
      // Cast to any to bypass strict type checking - our adapter implements required methods
      this.myxClient = new MyxClient({
        chainId: this.config.chainId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signer: signer as any,
        brokerAddress: this.config.brokerAddress,
        isTestnet: this.isTestnet,
        isBetaMode: false,
        socketConfig: {
          initialReconnectDelay:
            MYX_TRANSPORT_CONFIG.reconnect.reconnectInterval,
          maxReconnectAttempts: MYX_TRANSPORT_CONFIG.reconnect.maxRetries,
        },
        getAccessToken: () => this.generateAccessToken(),
      });

      this.connectionState = MYXConnectionState.CONNECTED;

      this.deps.debugLogger.log('[MYXClientService] SDK client initialized', {
        testnet: this.isTestnet,
        chainId: this.config.chainId,
        timestamp: new Date().toISOString(),
      });

      this.startHealthCheckMonitoring();
      await this.refreshPoolsCache();

      // Connect and authenticate WebSocket for private subscriptions
      await this.connectAndAuthenticateWebSocket();
    } catch (error) {
      const errorInstance = ensureError(error);
      this.connectionState = MYXConnectionState.DISCONNECTED;

      this.deps.logger.error(errorInstance, {
        tags: {
          feature: PERPS_CONSTANTS.FEATURE_NAME,
          service: 'MYXClientService',
          network: this.isTestnet ? 'testnet' : 'mainnet',
        },
        context: {
          name: 'sdk_initialization',
          data: {
            operation: 'initialize',
            isTestnet: this.isTestnet,
            chainId: this.config.chainId,
          },
        },
      });

      throw error;
    }
  }

  /**
   * Generate access token for WebSocket authentication
   * Uses wallet signature for authentication (signature-based auth)
   *
   * Note: SDK docs show wrapped format { code, msg, data: {...} } but actual SDK code
   * at line 12848 does `return response.accessToken` - expects simple format
   */
  private async generateAccessToken(): Promise<
    { accessToken: string; expireAt: number } | undefined
  > {
    const now = Date.now();

    // Return cached token if still valid (with 5-minute buffer)
    if (this.accessToken && this.accessToken.expireAt > now + 5 * 60 * 1000) {
      return {
        accessToken: this.accessToken.token,
        expireAt: this.accessToken.expireAt,
      };
    }

    if (!this.signer) {
      this.deps.debugLogger.log(
        '[MYXClientService] No signer available for token generation',
      );
      return undefined;
    }

    try {
      const address = await this.signer.getAddress();
      const timestamp = now;
      const expireAt = timestamp + this.TOKEN_TTL_MS;

      // MYX authentication message format (signature-based auth)
      const message = `MYX Authentication\nAddress: ${address}\nTimestamp: ${timestamp}\nExpires: ${expireAt}`;
      const signature = await this.signer.signMessage(message);

      // Cache the token
      this.accessToken = {
        token: signature,
        expireAt,
      };

      this.deps.debugLogger.log('[MYXClientService] Generated access token', {
        address,
        expiresIn: Math.round(this.TOKEN_TTL_MS / 60000) + ' minutes',
      });

      return {
        accessToken: signature,
        expireAt,
      };
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('generateAccessToken'),
      );
      return undefined;
    }
  }

  // ============================================================================
  // Client Accessors
  // ============================================================================

  /**
   * Check if the client is properly initialized
   */
  public isInitialized(): boolean {
    return !!this.myxClient;
  }

  /**
   * Ensure clients are initialized, throw if not
   */
  public ensureInitialized(): void {
    if (!this.isInitialized()) {
      throw new Error('MYX client not initialized');
    }
  }

  /**
   * Get the MYX client instance
   * @throws Error if client is not initialized
   */
  public getClient(): MyxClient {
    this.ensureInitialized();
    // Safe to assert non-null after ensureInitialized() check
    return this.myxClient as MyxClient;
  }

  /**
   * Get the order module
   */
  public getOrderClient(): MyxClient['order'] {
    return this.getClient().order;
  }

  /**
   * Get the position module
   */
  public getPositionClient(): MyxClient['position'] {
    return this.getClient().position;
  }

  /**
   * Get the markets module
   */
  public getMarketsClient(): MyxClient['markets'] {
    return this.getClient().markets;
  }

  /**
   * Get the account module
   */
  public getAccountClient(): MyxClient['account'] {
    return this.getClient().account;
  }

  /**
   * Get the utils module
   */
  public getUtilsClient(): MyxClient['utils'] {
    return this.getClient().utils;
  }

  /**
   * Get the subscription module
   */
  public getSubscriptionClient(): MyxClient['subscription'] {
    return this.getClient().subscription;
  }

  // ============================================================================
  // WebSocket Authentication
  // ============================================================================

  /**
   * Connect and authenticate WebSocket for private subscriptions.
   * Must be called before subscribing to private channels (orders, positions).
   *
   * The MYX SDK requires explicit auth() call after WebSocket connection
   * to enable private subscriptions. Without this, getAccessToken is never invoked.
   */
  public async connectAndAuthenticateWebSocket(): Promise<boolean> {
    try {
      const subscriptionClient = this.getSubscriptionClient();

      // Connect if not already connected
      if (!subscriptionClient.isConnected) {
        this.deps.debugLogger.log('[MYXClientService] Connecting WebSocket...');
        subscriptionClient.connect();

        // Wait for connection
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error('WebSocket connection timeout')),
            10000,
          );
          subscriptionClient.on('open', () => {
            clearTimeout(timeout);
            this.deps.debugLogger.log('[MYXClientService] WebSocket connected');
            resolve();
          });
          subscriptionClient.on('error', (err: Error) => {
            clearTimeout(timeout);
            reject(err);
          });
        });
      }

      // Authenticate for private subscriptions - this triggers the getAccessToken callback
      this.deps.debugLogger.log(
        '[MYXClientService] Authenticating WebSocket...',
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (subscriptionClient as any).auth();
      this.deps.debugLogger.log(
        '[MYXClientService] WebSocket authenticated successfully',
      );

      return true;
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('connectAndAuthenticateWebSocket'),
      );
      return false;
    }
  }

  // ============================================================================
  // Network Management
  // ============================================================================

  /**
   * Get current network state
   */
  public getNetwork(): MYXNetwork {
    return this.isTestnet ? 'testnet' : 'mainnet';
  }

  /**
   * Check if running on testnet
   */
  public isTestnetMode(): boolean {
    return this.isTestnet;
  }

  /**
   * Get current chain ID
   */
  public getChainId(): number {
    return this.config.chainId;
  }

  /**
   * Toggle testnet mode
   */
  public async toggleTestnet(signer: MYXSignerAdapter): Promise<MYXNetwork> {
    this.isTestnet = !this.isTestnet;
    this.config.chainId = parseInt(getMYXChainId(this.isTestnet), 10);

    // Re-initialize with new network
    await this.initialize(signer);

    return this.getNetwork();
  }

  /**
   * Update chain ID (for multi-chain support)
   */
  public updateChainId(chainId: number, brokerAddress?: string): void {
    this.config.chainId = chainId;
    if (brokerAddress) {
      this.config.brokerAddress = brokerAddress;
    }

    // Update client if initialized
    if (this.myxClient?.updateClientChainId) {
      this.myxClient.updateClientChainId(
        chainId,
        brokerAddress || this.config.brokerAddress,
      );
    }
  }

  // ============================================================================
  // Pool Management (Multi-Pool Model)
  // ============================================================================

  /**
   * Get all available pools (with caching)
   */
  public async getPools(forceRefresh = false): Promise<MYXPoolSymbol[]> {
    const now = Date.now();
    if (
      !forceRefresh &&
      this.poolsCache.length > 0 &&
      now - this.poolsCacheTimestamp < this.POOLS_CACHE_TTL_MS
    ) {
      return this.poolsCache;
    }

    return this.refreshPoolsCache();
  }

  /**
   * Refresh the pools cache
   */
  private async refreshPoolsCache(): Promise<MYXPoolSymbol[]> {
    try {
      const marketsClient = this.getMarketsClient();
      const pools = await marketsClient.getPoolSymbolAll();

      this.poolsCache = pools || [];
      this.poolsCacheTimestamp = Date.now();

      this.deps.debugLogger.log('[MYXClientService] Pools cache refreshed', {
        count: this.poolsCache.length,
      });

      return this.poolsCache;
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('refreshPoolsCache'),
      );
      return this.poolsCache; // Return stale cache on error
    }
  }

  /**
   * Get pool ID for a symbol
   * Returns the first pool ID if multiple exist (TODO: implement liquidity ranking)
   */
  public async getPoolIdForSymbol(symbol: string): Promise<string | undefined> {
    const pools = await this.getPools();
    const pool = pools.find((p) => p.baseSymbol === symbol);
    return pool?.poolId;
  }

  /**
   * Get all pool IDs for a symbol (Multi-Pool Model)
   */
  public async getPoolIdsForSymbol(symbol: string): Promise<string[]> {
    const pools = await this.getPools();
    return pools.filter((p) => p.baseSymbol === symbol).map((p) => p.poolId);
  }

  /**
   * Get globalId for a symbol (used by WebSocket subscriptions)
   * Note: PoolSymbolAllResponse doesn't have globalId, need to get from MarketPool
   */
  public async getGlobalIdForSymbol(
    symbol: string,
  ): Promise<number | undefined> {
    const pools = await this.getPools();
    const pool = pools.find((p) => p.baseSymbol === symbol);
    if (!pool) return undefined;

    // PoolSymbolAllResponse doesn't have globalId directly
    // Need to get full pool details from markets API
    // TODO: Get globalId from MarketPool via separate API call
    // For now, return undefined until proper API integration is available
    return undefined;
  }

  /**
   * Get symbol for a poolId (reverse lookup)
   */
  public async getSymbolForPoolId(poolId: string): Promise<string | undefined> {
    const pools = await this.getPools();
    const pool = pools.find((p) => p.poolId === poolId);
    return pool?.baseSymbol;
  }

  /**
   * Get account info for a specific pool
   */
  public async getAccountInfo(
    address: string,
    poolId: string,
  ): Promise<MYXAccountInfo | null> {
    try {
      const accountClient = this.getAccountClient();
      // SDK signature: getAccountInfo(chainId: number, address: string, poolId: string)
      const result = await accountClient.getAccountInfo(
        this.config.chainId,
        address,
        poolId,
      );
      if (result?.code === 0 && result?.data) {
        return result.data as unknown as MYXAccountInfo;
      }
      return null;
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('getAccountInfo', { address, poolId }),
      );
      return null;
    }
  }

  /**
   * Get all positions for an address
   */
  public async getPositions(address: string): Promise<MYXPosition[]> {
    try {
      const positionClient = this.getPositionClient();
      // SDK signature: listPositions(address: string)
      const result = await positionClient.listPositions(address);
      if (result?.code === 0 && result?.data) {
        return result.data as unknown as MYXPosition[];
      }
      if (Array.isArray(result)) {
        return result as unknown as MYXPosition[];
      }
      return [];
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('getPositions', { address }),
      );
      return [];
    }
  }

  /**
   * Get open orders for an address
   */
  public async getOpenOrders(address: string): Promise<MYXOrder[]> {
    try {
      const orderClient = this.getOrderClient();
      // SDK signature: getOrders(address: string)
      const result = await orderClient.getOrders(address);
      if (result?.code === 0 && result?.data) {
        return result.data as unknown as MYXOrder[];
      }
      if (Array.isArray(result)) {
        return result as unknown as MYXOrder[];
      }
      return [];
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('getOpenOrders', { address }),
      );
      return [];
    }
  }

  // ============================================================================
  // Trading Operations
  // ============================================================================

  /**
   * Set testnet mode
   * Used by toggleTestnet in MYXProvider
   */
  public setTestnetMode(isTestnet: boolean): void {
    this.isTestnet = isTestnet;
    this.config.chainId = parseInt(getMYXChainId(isTestnet), 10);
    this.config.isTestnet = isTestnet;

    this.deps.debugLogger.log('[MYXClientService] Testnet mode updated', {
      isTestnet,
      chainId: this.config.chainId,
    });
  }

  /**
   * Create an increase position order (open or add to existing position)
   */
  public async createIncreaseOrder(
    params: MYXPlaceOrderParams,
  ): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      this.ensureInitialized();
      const orderClient = this.getOrderClient();
      // SDK signature: createIncreaseOrder(params, tradingFee, marketId)
      // We need to get tradingFee and marketId from somewhere
      const tradingFee = '0'; // TODO: Calculate actual trading fee
      const marketId = params.poolId; // Use poolId as marketId fallback
      const result = await orderClient.createIncreaseOrder(
        params,
        tradingFee,
        marketId,
      );

      if (result?.code === 0) {
        return {
          success: true,
          orderId: (result.data as { transactionHash?: string })
            ?.transactionHash,
        };
      }

      return {
        success: false,
        error: result?.message || 'Failed to create increase order',
      };
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('createIncreaseOrder', { poolId: params.poolId }),
      );
      return {
        success: false,
        error: ensureError(error).message,
      };
    }
  }

  /**
   * Create a decrease position order (close or reduce existing position)
   */
  public async createDecreaseOrder(
    params: MYXPlaceOrderParams,
  ): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      this.ensureInitialized();
      const orderClient = this.getOrderClient();
      // SDK signature: createDecreaseOrder(params)
      const result = await orderClient.createDecreaseOrder(params);

      if (result?.code === 0) {
        return {
          success: true,
          orderId: (result.data as { transactionHash?: string })
            ?.transactionHash,
        };
      }

      return {
        success: false,
        error: result?.message || 'Failed to create decrease order',
      };
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('createDecreaseOrder', { poolId: params.poolId }),
      );
      return {
        success: false,
        error: ensureError(error).message,
      };
    }
  }

  /**
   * Update an existing order's TP/SL
   * Note: SDK uses updateOrderTpSl method
   */
  public async updateOrder(params: {
    orderId: string;
    size?: string;
    price?: string;
    tpSize?: string;
    tpPrice?: string;
    slSize?: string;
    slPrice?: string;
    executionFeeToken?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      this.ensureInitialized();

      // SDK signature: updateOrderTpSl(params, quoteAddress, chainId, address, marketId)
      // For now, we only support TP/SL updates
      const updateParams = {
        orderId: params.orderId,
        tpSize: params.tpSize || '',
        tpPrice: params.tpPrice || '',
        slSize: params.slSize || '',
        slPrice: params.slPrice || '',
      };

      // Note: Full update requires additional context we don't have here
      // The SDK's updateOrderTpSl needs more params than we have
      // For now, return success as this is a placeholder
      this.deps.debugLogger.log('[MYXClientService] updateOrder called', {
        params: updateParams,
      });

      return {
        success: true,
      };
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('updateOrder', { orderId: params.orderId }),
      );
      return {
        success: false,
        error: ensureError(error).message,
      };
    }
  }

  /**
   * Cancel a single order
   */
  public async cancelOrder(
    orderId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.ensureInitialized();
      const orderClient = this.getOrderClient();
      // SDK signature: cancelOrder(orderId: string, chainId: ChainId)
      const result = await orderClient.cancelOrder(
        orderId,
        this.config.chainId,
      );

      if (result?.code === 0) {
        return {
          success: true,
        };
      }

      return {
        success: false,
        error: result?.message,
      };
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('cancelOrder', { orderId }),
      );
      return {
        success: false,
        error: ensureError(error).message,
      };
    }
  }

  /**
   * Create TP/SL orders for an existing position
   */
  public async createPositionTpSlOrder(
    params: MYXPositionTpSlParams,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.ensureInitialized();
      const orderClient = this.getOrderClient();

      const result = await orderClient.createPositionTpSlOrder(params);

      return {
        success: result?.code === 0,
        error: result?.message,
      };
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('createPositionTpSlOrder', {
          positionId: params.positionId,
        }),
      );
      return {
        success: false,
        error: ensureError(error).message,
      };
    }
  }

  /**
   * Adjust collateral (add or remove margin) for a position
   */
  public async adjustCollateral(params: {
    userAddress: string;
    poolId: string;
    positionId?: string;
    amount: string;
    isAdd: boolean;
    quoteToken?: string;
    poolOracleType?: number;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      this.ensureInitialized();
      const positionClient = this.getPositionClient();

      // SDK signature: adjustCollateral({ poolId, positionId, adjustAmount, quoteToken, poolOracleType, chainId, address })
      // Amount should be positive for add, negative for remove (or use adjustAmount convention)
      const adjustAmount = params.isAdd ? params.amount : `-${params.amount}`;

      const result = await positionClient.adjustCollateral({
        poolId: params.poolId,
        positionId: params.positionId || '0',
        adjustAmount,
        quoteToken: params.quoteToken || '', // Quote token address
        poolOracleType: params.poolOracleType || 1, // Default to Chainlink
        chainId: this.config.chainId,
        address: params.userAddress,
      });

      if (result?.code === 0) {
        return {
          success: true,
        };
      }

      return {
        success: false,
        error: result?.message,
      };
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('adjustCollateral', {
          poolId: params.poolId,
          positionId: params.positionId,
        }),
      );
      return {
        success: false,
        error: ensureError(error).message,
      };
    }
  }

  /**
   * Withdraw funds from MYX
   */
  public async withdraw(params: {
    userAddress: string;
    amount: string;
    destinationAddress: string;
    poolId?: string;
    isQuoteToken?: boolean;
  }): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      this.ensureInitialized();
      const accountClient = this.getAccountClient();

      // SDK signature: withdraw({ chainId, receiver, amount, poolId, isQuoteToken })
      const result = await accountClient.withdraw({
        chainId: this.config.chainId,
        receiver: params.destinationAddress,
        amount: params.amount,
        poolId: params.poolId || '', // Pool to withdraw from
        isQuoteToken: params.isQuoteToken ?? true, // Default to quote token (USDT)
      });

      if (result?.code === 0) {
        return {
          success: true,
          txHash: (result.data as { hash?: string })?.hash,
        };
      }

      return {
        success: false,
        error: result?.message || 'Withdrawal failed',
      };
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('withdraw', {
          amount: params.amount,
          poolId: params.poolId,
        }),
      );
      return {
        success: false,
        error: ensureError(error).message,
      };
    }
  }

  // ============================================================================
  // Market Data
  // ============================================================================

  /**
   * Get tickers for multiple pools
   */
  public async getTickers(poolIds: string[]): Promise<MYXTicker[]> {
    try {
      const marketsClient = this.getMarketsClient();
      const result = await marketsClient.getTickerList({
        chainId: this.config.chainId,
        poolIds,
      });
      return result || [];
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('getTickers', { poolIds }),
      );
      return [];
    }
  }

  /**
   * Fetch historical candle data
   */
  public async fetchHistoricalCandles(
    poolId: string,
    interval: CandlePeriod,
    limit = 100,
    endTime?: number,
  ): Promise<CandleData | null> {
    this.ensureInitialized();

    try {
      const marketsClient = this.getMarketsClient();

      // Map our interval format to MYX format (KlineResolution type)
      const myxInterval = this.mapIntervalToMYX(
        interval,
      ) as import('@myx-trade/sdk').KlineResolution;

      const data = await marketsClient.getKlineList({
        poolId,
        chainId: this.config.chainId,
        interval: myxInterval,
        limit,
        endTime: endTime ?? Date.now(),
      });

      if (Array.isArray(data) && data.length > 0) {
        const candles = data.map((candle) => ({
          time: candle.time,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: '0', // KlineDataItemType doesn't have volume
        }));

        // Get symbol from pool ID
        const pools = await this.getPools();
        const pool = pools.find((p) => p.poolId === poolId);
        const coin = pool?.baseSymbol || poolId;

        return {
          coin,
          interval,
          candles,
        };
      }

      return {
        coin: poolId,
        interval,
        candles: [],
      };
    } catch (error) {
      this.deps.logger.error(ensureError(error), {
        tags: {
          feature: PERPS_CONSTANTS.FEATURE_NAME,
          service: 'MYXClientService',
          network: this.isTestnet ? 'testnet' : 'mainnet',
        },
        context: {
          name: 'historical_candles_api',
          data: {
            operation: 'fetchHistoricalCandles',
            poolId,
            interval,
            limit,
          },
        },
      });

      throw error;
    }
  }

  /**
   * Subscribe to candle updates via WebSocket
   */
  public subscribeToCandles({
    coin,
    interval,
    duration,
    callback,
    onError,
  }: SubscribeCandlesParams): () => void {
    this.ensureInitialized();

    let currentCandleData: CandleData | null = null;
    let isUnsubscribed = false;

    const initialLimit = duration
      ? Math.min(calculateCandleCount(duration, interval), 500)
      : 100;

    // First get pool ID for the coin
    this.getPoolIdForSymbol(coin)
      .then(async (poolId) => {
        if (!poolId || isUnsubscribed) {
          return;
        }

        // Fetch initial historical data
        const initialData = await this.fetchHistoricalCandles(
          poolId,
          interval,
          initialLimit,
        );

        if (isUnsubscribed) {
          return;
        }

        currentCandleData = initialData;
        if (currentCandleData) {
          callback(currentCandleData);
        }

        // Subscribe to WebSocket updates
        const subscriptionClient = this.getSubscriptionClient();
        const pools = await this.getPools();
        const pool = pools.find((p) => p.poolId === poolId);

        if (!pool || isUnsubscribed) {
          return;
        }

        const myxInterval = this.mapIntervalToMYX(
          interval,
        ) as import('@myx-trade/sdk').KlineResolution;

        // Get globalId from MarketPool - for now we need to skip if not available
        // TODO: Implement proper globalId resolution
        const globalId = await this.getGlobalIdForSymbol(coin);
        if (!globalId) {
          this.deps.debugLogger.log(
            '[MYXClientService] No globalId available for WebSocket subscription',
            { coin },
          );
          return;
        }

        const klineCallback: import('@myx-trade/sdk').OnKlineCallback = (
          data,
        ) => {
          if (isUnsubscribed) {
            return;
          }

          const newCandle = {
            time: data.data.t,
            open: data.data.o,
            high: data.data.h,
            low: data.data.l,
            close: data.data.c,
            volume: data.data.v,
          };

          if (!currentCandleData) {
            currentCandleData = {
              coin,
              interval,
              candles: [newCandle],
            };
          } else {
            const candles = currentCandleData.candles;
            const lastCandle = candles[candles.length - 1];

            if (lastCandle && lastCandle.time === newCandle.time) {
              currentCandleData = {
                ...currentCandleData,
                candles: [...candles.slice(0, -1), newCandle],
              };
            } else {
              currentCandleData = {
                ...currentCandleData,
                candles: [...candles, newCandle],
              };
            }
          }

          callback(currentCandleData);
        };

        subscriptionClient.subscribeKline(globalId, myxInterval, klineCallback);
      })
      .catch((error) => {
        onError?.(ensureError(error));
      });

    return () => {
      isUnsubscribed = true;
      // Note: MYX SDK cleanup handled internally
    };
  }

  /**
   * Map internal interval format to MYX format
   */
  private mapIntervalToMYX(interval: CandlePeriod): string {
    // CandlePeriod values are already MYX-compatible ('1m', '5m', '1h', etc.)
    return interval;
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Get current connection state
   */
  public getConnectionState(): MYXConnectionState {
    return this.connectionState;
  }

  /**
   * Check if WebSocket is fully disconnected
   */
  public isDisconnected(): boolean {
    return this.connectionState === MYXConnectionState.DISCONNECTED;
  }

  /**
   * Set callback for reconnection events
   */
  public setOnReconnectCallback(callback: () => Promise<void>): void {
    this.onReconnectCallback = callback;
  }

  /**
   * Disconnect and cleanup
   */
  public async disconnect(): Promise<void> {
    if (this.disconnectionPromise) {
      return this.disconnectionPromise;
    }

    if (this.connectionState === MYXConnectionState.DISCONNECTED) {
      return;
    }

    this.disconnectionPromise = this.performDisconnection();

    try {
      await this.disconnectionPromise;
    } finally {
      this.disconnectionPromise = null;
    }
  }

  private async performDisconnection(): Promise<void> {
    try {
      this.connectionState = MYXConnectionState.DISCONNECTING;

      this.deps.debugLogger.log('[MYXClientService] Disconnecting', {
        isTestnet: this.isTestnet,
        timestamp: new Date().toISOString(),
      });

      this.stopHealthCheckMonitoring();
      this.onReconnectCallback = undefined;

      // Disconnect WebSocket subscription if active
      if (this.myxClient?.subscription?.disconnect) {
        try {
          this.myxClient.subscription.disconnect();
        } catch (error) {
          this.deps.logger.error(
            ensureError(error),
            this.getErrorContext('performDisconnection.subscription'),
          );
        }
      }

      this.myxClient = undefined;
      this.poolsCache = [];
      this.poolsCacheTimestamp = 0;

      // Clear authentication state
      this.accessToken = null;
      this.signer = null;

      this.connectionState = MYXConnectionState.DISCONNECTED;

      this.deps.debugLogger.log('[MYXClientService] Fully disconnected', {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.connectionState = MYXConnectionState.DISCONNECTED;
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('performDisconnection'),
      );
      throw error;
    }
  }

  // ============================================================================
  // Health Check Monitoring
  // ============================================================================

  private startHealthCheckMonitoring(): void {
    this.stopHealthCheckMonitoring();

    const HEALTH_CHECK_INTERVAL_MS = 5_000;

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck().catch(() => {
        // Ignore errors
      });
    }, HEALTH_CHECK_INTERVAL_MS);
  }

  private stopHealthCheckMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
    if (this.healthCheckTimeout) {
      clearTimeout(this.healthCheckTimeout);
      this.healthCheckTimeout = undefined;
    }
    this.isHealthCheckRunning = false;
  }

  private async performHealthCheck(): Promise<void> {
    if (
      this.isHealthCheckRunning ||
      this.connectionState !== MYXConnectionState.CONNECTED ||
      !this.myxClient
    ) {
      return;
    }

    this.isHealthCheckRunning = true;

    try {
      // Check WebSocket connection status
      const subscriptionClient = this.getSubscriptionClient();
      const isConnected = subscriptionClient?.isConnected;

      if (!isConnected) {
        await this.handleConnectionDrop();
      }
    } finally {
      this.isHealthCheckRunning = false;
    }
  }

  private async handleConnectionDrop(): Promise<void> {
    if (this.connectionState === MYXConnectionState.CONNECTING) {
      return;
    }

    try {
      this.connectionState = MYXConnectionState.CONNECTING;

      this.deps.debugLogger.log(
        '[MYXClientService] Connection drop detected, reconnecting',
      );

      // Attempt to reconnect WebSocket
      const subscriptionClient = this.getSubscriptionClient();
      if (subscriptionClient?.reconnect) {
        subscriptionClient.reconnect();
      }

      // Re-authenticate after reconnection for private subscriptions
      await this.connectAndAuthenticateWebSocket();

      this.connectionState = MYXConnectionState.CONNECTED;

      // Notify callback to restore subscriptions
      if (this.onReconnectCallback) {
        await this.onReconnectCallback();
      }
    } catch {
      this.connectionState = MYXConnectionState.DISCONNECTED;
      this.stopHealthCheckMonitoring();
    }
  }
}
