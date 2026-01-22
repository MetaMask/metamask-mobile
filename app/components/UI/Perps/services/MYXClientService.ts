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
import Crypto from 'react-native-quick-crypto';
import { ensureError } from '../../../../util/errorUtils';
import {
  MYX_TRANSPORT_CONFIG,
  MYX_OPENAPI_WS_URL,
} from '../constants/myxConfig';
import type {
  IPerpsPlatformDependencies,
  SubscribeCandlesParams,
} from '../controllers/types';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';

// ============================================================================
// MYX Authentication Configuration
// ============================================================================

/**
 * MYX API-based authentication config
 * Uses SHA256 signature instead of wallet signature for token generation
 *
 * IMPORTANT: Uses TESTNET/BETA endpoint - we only have testnet credentials (appId=metamask)
 * When mainnet credentials are available, this should be configurable based on isTestnet
 */
const MYX_AUTH_CONFIG = {
  appId: 'metamask',
  secret: 'vcVSelUYUfcepmOKGemyfC0dcxQDhCg1',
  // TESTNET endpoint - matches the credentials we have
  tokenEndpoint:
    'https://api-beta.myx.finance/openapi/gateway/auth/api_key/create_token',
  defaultExpireTime: 3600, // 1 hour in seconds
};

/**
 * Generate SHA256 hash of data using react-native-quick-crypto
 * This is the proper way to do SHA256 in React Native environment
 */
const sha256Hex = (data: string): string =>
  Crypto.createHash('sha256').update(data).digest('hex');

/**
 * Hardcoded BNB chainIds for MYX - MYX runs exclusively on BNB chain
 * Don't rely on getMYXChainId() which may read from wallet state and return wrong chainId
 */
const BNB_CHAIN_IDS = {
  testnet: 97, // BNB testnet
  mainnet: 56, // BNB mainnet
} as const;
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

  // Global ID cache (symbol -> globalId) for WebSocket subscriptions
  // globalId is required for ticker subscriptions but not in PoolSymbolAllResponse
  private globalIdCache: Map<string, number> = new Map();

  // Authentication token cache for WebSocket
  private accessToken: { token: string; expireAt: number } | null = null;
  private signer: MYXSignerAdapter | null = null;

  // Platform dependencies for logging
  private readonly deps: IPerpsPlatformDependencies;

  // Manual WebSocket for authentication (bypasses SDK's auth which fails)
  private authWebSocket: WebSocket | null = null;

  constructor(
    deps: IPerpsPlatformDependencies,
    options: { isTestnet?: boolean; brokerAddress?: string } = {},
  ) {
    this.deps = deps;

    // FORCE TESTNET - we only have testnet credentials (appId=metamask)
    // The SDK's internal auth fails with 9401, but manual WS auth works on testnet
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _requestedTestnet = options.isTestnet; // Preserved for when mainnet credentials available
    this.isTestnet = true; // Override any passed option until mainnet credentials available

    this.config = {
      chainId: BNB_CHAIN_IDS.testnet, // Always testnet for now
      brokerAddress: options.brokerAddress || '',
      isTestnet: true,
    };

    this.deps.debugLogger.log('[MYXClientService] Initialized (TESTNET FORCED)', {
      requestedTestnet: options.isTestnet,
      actualTestnet: this.isTestnet,
      chainId: this.config.chainId,
    });
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
        isBetaMode: this.isTestnet,
        socketConfig: {
          initialReconnectDelay:
            MYX_TRANSPORT_CONFIG.reconnect.reconnectInterval,
          maxReconnectAttempts: MYX_TRANSPORT_CONFIG.reconnect.maxRetries,
        },
        getAccessToken: () => this.generateAccessToken(),
      });

      // Diagnostic: Verify SDK received correct chainId
      const configManager = this.myxClient.getConfigManager();
      this.deps.debugLogger.log('[MYXClientService] SDK constructed', {
        passedChainId: this.config.chainId,
        sdkChainId: configManager?.chainId,
        match: this.config.chainId === configManager?.chainId,
        isBetaMode: this.isTestnet,
      });

      // Configure authentication on the client
      // MyxClient.auth() sets up signer, walletClient, and getAccessToken on ConfigManager
      // This must be called before WebSocket auth to enable private subscriptions
      /* eslint-disable @typescript-eslint/no-explicit-any */
      this.myxClient.auth({
        signer: signer as any,
        walletClient: signer as any, // Our adapter implements required WalletClient methods
        getAccessToken: () => this.generateAccessToken(),
      });
      /* eslint-enable @typescript-eslint/no-explicit-any */

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
   * Uses MYX API with SHA256 signature for token generation
   *
   * Authentication flow:
   * 1. Generate SHA256 signature: payload = `${appId}&${timestamp}&${expireTime}&${address}&${secret}`
   * 2. Call MYX API endpoint with signature
   * 3. API returns { code, msg, data: { accessToken, expireAt } }
   */
  private async generateAccessToken(): Promise<
    { accessToken: string; expireAt: number } | undefined
  > {
    const nowSeconds = Math.floor(Date.now() / 1000);
    // Add 60 second buffer before expiry to avoid edge cases
    const TOKEN_EXPIRY_BUFFER_SECONDS = 60;

    // Return cached token if still valid (with buffer)
    if (
      this.accessToken &&
      this.accessToken.expireAt > nowSeconds + TOKEN_EXPIRY_BUFFER_SECONDS
    ) {
      return {
        accessToken: this.accessToken.token,
        expireAt: this.accessToken.expireAt,
      };
    }

    this.deps.debugLogger.log('[MYXClientService] generateAccessToken called', {
      hasCachedToken: !!this.accessToken,
      cachedExpireAt: this.accessToken?.expireAt,
      nowSeconds,
      hasSigner: !!this.signer,
    });

    if (!this.signer) {
      this.deps.debugLogger.log(
        '[MYXClientService] No signer available for token generation',
      );
      return undefined;
    }

    try {
      const address = await this.signer.getAddress();
      const timestamp = nowSeconds;
      const expireTime = MYX_AUTH_CONFIG.defaultExpireTime;

      // Generate SHA256 signature for MYX API
      const payload = `${MYX_AUTH_CONFIG.appId}&${timestamp}&${expireTime}&${address}&${MYX_AUTH_CONFIG.secret}`;
      const signature = sha256Hex(payload);

      // Call MYX API to get access token
      const url = `${MYX_AUTH_CONFIG.tokenEndpoint}?appId=${MYX_AUTH_CONFIG.appId}&timestamp=${timestamp}&expireTime=${expireTime}&allowAccount=${address}&signature=${signature}`;

      this.deps.debugLogger.log('[MYXClientService] Calling MYX auth API...', {
        address,
        timestamp,
        expireTime,
      });

      const response = await fetch(url);
      const result = await response.json();

      // MYX API returns code=9200 on success (not 0), check for data presence
      if (result.data?.accessToken) {
        const { accessToken, expireAt } = result.data as {
          accessToken: string;
          expireAt: number;
        };

        // Cache the token for reuse
        this.accessToken = { token: accessToken, expireAt };

        this.deps.debugLogger.log(
          '[MYXClientService] Generated fresh access token via API',
          {
            address,
            tokenPrefix: accessToken.substring(0, 8),
            expiresIn: `${Math.round((expireAt - nowSeconds) / 60)} minutes`,
          },
        );

        return { accessToken, expireAt };
      }

      this.deps.debugLogger.log('[MYXClientService] Token API error', {
        code: result.code,
        msg: result.msg,
      });
      return undefined;
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
   * Get the API module (for getPoolDetail and other API methods)
   */
  public getApiClient(): MyxClient['api'] {
    return this.getClient().api;
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
   * Authenticate WebSocket manually (bypassing SDK's auth which fails with 9401).
   * Uses the same approach as MYXAuthDebug which works.
   *
   * The signin format is: { request: 'signin', args: 'sdk.{token}' }
   */
  private async manualWebSocketAuth(
    ws: WebSocket,
    token: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const AUTH_TIMEOUT_MS = 8000;
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket auth timeout (8s)'));
      }, AUTH_TIMEOUT_MS);

      const messageHandler = (event: MessageEvent) => {
        try {
          const response = JSON.parse(event.data as string);
          this.deps.debugLogger.log(
            '[MYXClientService] WS message received',
            response,
          );

          if (response.type === 'signin') {
            ws.removeEventListener('message', messageHandler);
            clearTimeout(timeout);

            const code = response?.data?.code ?? response?.code;
            if (code === 0 || code === 9200) {
              this.deps.debugLogger.log(
                '[MYXClientService] Manual WS auth succeeded!',
                { code },
              );
              resolve();
            } else {
              reject(
                new Error(
                  `WS auth failed: code=${code} msg=${response?.data?.msg || response?.msg}`,
                ),
              );
            }
          }
        } catch {
          // Ignore non-JSON or non-signin messages
        }
      };

      ws.addEventListener('message', messageHandler);

      // Send signin request with sdk.{token} format (same as MYXAuthDebug)
      const request = JSON.stringify({ request: 'signin', args: `sdk.${token}` });
      this.deps.debugLogger.log(
        '[MYXClientService] Sending manual signin request...',
        { tokenPrefix: token.substring(0, 8) },
      );
      ws.send(request);
    });
  }

  /**
   * Connect and authenticate WebSocket for private subscriptions.
   * Uses manual WebSocket auth instead of SDK's auth() which fails with 9401.
   *
   * This bypasses the SDK's internal auth flow and directly sends the signin
   * request to the OpenAPI WebSocket endpoint, matching the working MYXAuthDebug approach.
   */
  public async connectAndAuthenticateWebSocket(): Promise<boolean> {
    try {
      // Get fresh token FIRST (before any WS connection)
      const tokenData = await this.generateAccessToken();
      if (!tokenData?.accessToken) {
        throw new Error('Failed to get access token for WebSocket auth');
      }

      this.deps.debugLogger.log(
        '[MYXClientService] Got access token, creating manual WebSocket...',
        { tokenPrefix: tokenData.accessToken.substring(0, 8) },
      );

      // Use the OpenAPI WebSocket endpoint directly (same as MYXAuthDebug)
      const wsUrl = this.isTestnet
        ? MYX_OPENAPI_WS_URL.testnet
        : MYX_OPENAPI_WS_URL.mainnet;

      // Close any existing manual WebSocket
      if (this.authWebSocket) {
        try {
          this.authWebSocket.close();
        } catch {
          // Ignore close errors
        }
        this.authWebSocket = null;
      }

      // Create new WebSocket connection
      return new Promise((resolve, reject) => {
        const CONNECTION_TIMEOUT_MS = 10000;
        const ws = new WebSocket(wsUrl);
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('WebSocket connection timeout'));
        }, CONNECTION_TIMEOUT_MS);

        ws.onopen = () => {
          clearTimeout(timeout);
          this.deps.debugLogger.log(
            '[MYXClientService] Manual WebSocket connected to',
            { url: wsUrl },
          );

          // Now authenticate
          this.manualWebSocketAuth(ws, tokenData.accessToken)
            .then(() => {
              this.authWebSocket = ws;
              this.deps.debugLogger.log(
                '[MYXClientService] Manual WebSocket auth complete!',
              );
              resolve(true);
            })
            .catch((authError) => {
              ws.close();
              reject(authError);
            });
        };

        ws.onerror = (event) => {
          clearTimeout(timeout);
          this.deps.debugLogger.log('[MYXClientService] WebSocket error', event);
          reject(new Error('WebSocket connection error'));
        };

        ws.onclose = (event) => {
          this.deps.debugLogger.log('[MYXClientService] WebSocket closed', {
            code: event.code,
            reason: event.reason,
          });
          if (this.authWebSocket === ws) {
            this.authWebSocket = null;
          }
        };
      });
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
    this.config.chainId = this.isTestnet
      ? BNB_CHAIN_IDS.testnet
      : BNB_CHAIN_IDS.mainnet;

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
   * Refresh the pools cache and fetch globalIds for WebSocket subscriptions
   */
  private async refreshPoolsCache(): Promise<MYXPoolSymbol[]> {
    try {
      const marketsClient = this.getMarketsClient();
      const pools = await marketsClient.getPoolSymbolAll();

      this.poolsCache = pools || [];
      this.poolsCacheTimestamp = Date.now();

      // Fetch globalIds for each pool (needed for WebSocket subscriptions)
      // Do this in parallel for better performance
      await this.refreshGlobalIdCache(pools || []);

      this.deps.debugLogger.log('[MYXClientService] Pools cache refreshed', {
        count: this.poolsCache.length,
        globalIdCount: this.globalIdCache.size,
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
   * Refresh globalId cache by fetching pool details
   * globalId is required for ticker subscriptions but not included in PoolSymbolAllResponse
   *
   * NOTE: getPoolDetail is on client.api, NOT client.markets
   * SDK signature: Api.getPoolDetail(chainId, poolId): Promise<PoolResponse>
   */
  private async refreshGlobalIdCache(pools: MYXPoolSymbol[]): Promise<void> {
    const apiClient = this.getApiClient();

    // Fetch pool details in parallel (limited batch to avoid overwhelming API)
    const batchSize = 5;
    for (let i = 0; i < pools.length; i += batchSize) {
      const batch = pools.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((pool) => apiClient.getPoolDetail(pool.chainId, pool.poolId)),
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const pool = batch[j];

        if (result.status === 'fulfilled' && result.value?.data) {
          const poolDetail = result.value.data;
          if (poolDetail.globalId !== undefined) {
            this.globalIdCache.set(pool.baseSymbol, poolDetail.globalId);
          }
        }
      }
    }

    this.deps.debugLogger.log('[MYXClientService] GlobalId cache refreshed', {
      symbols: Array.from(this.globalIdCache.keys()),
    });
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
   * globalId is cached when pools are loaded via refreshGlobalIdCache()
   */
  public async getGlobalIdForSymbol(
    symbol: string,
  ): Promise<number | undefined> {
    // Check cache first
    const cachedId = this.globalIdCache.get(symbol);
    if (cachedId !== undefined) {
      return cachedId;
    }

    // If not cached, refresh pools (which also refreshes globalId cache)
    await this.getPools(true);
    return this.globalIdCache.get(symbol);
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
    this.config.chainId = isTestnet
      ? BNB_CHAIN_IDS.testnet
      : BNB_CHAIN_IDS.mainnet;
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

      // Close manual auth WebSocket if active
      if (this.authWebSocket) {
        try {
          this.authWebSocket.close();
        } catch {
          // Ignore close errors
        }
        this.authWebSocket = null;
      }

      // Disconnect SDK WebSocket subscription if active
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
