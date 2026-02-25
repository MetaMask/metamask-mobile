/**
 * MYXClientService
 *
 * Service for managing MYX SDK client interactions.
 * Handles market listing, ticker fetching, price polling, authentication,
 * and authenticated reads (positions, orders, account info).
 *
 * Uses MyxClient SDK for API calls.
 */

import type {
  KlineDataItemType,
  KlineResolution,
  KlineDataResponse,
} from '@myx-trade/sdk';
import { MyxClient } from '@myx-trade/sdk';

import {
  MYX_PRICE_POLLING_INTERVAL_MS,
  getMYXChainId,
  getMYXHttpEndpoint,
} from '../constants/myxConfig';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';
import type { PerpsPlatformDependencies } from '../types';
import type {
  MYXAuthConfig,
  MYXPoolSymbol,
  MYXTicker,
  MYXPositionType,
  MYXHistoryOrderItem,
  MYXPositionHistoryItem,
  MYXTradeFlowItem,
  MYXGetHistoryOrdersParams,
} from '../types/myx-types';
import { ensureError } from '../utils/errorUtils';

// ============================================================================
// Types
// ============================================================================

/**
 * MYX Client Configuration
 */
export type MYXClientConfig = {
  isTestnet: boolean;
  authConfig?: MYXAuthConfig;
};

/**
 * Price polling callback type
 */
export type PricePollingCallback = (tickers: MYXTicker[]) => void;

// ============================================================================
// MYXClientService
// ============================================================================

/**
 * Service for managing MYX SDK client interactions.
 * Handles markets, prices, authentication, and authenticated reads.
 */
export class MYXClientService {
  // SDK Client
  readonly #myxClient: MyxClient;

  // Configuration
  readonly #isTestnet: boolean;

  readonly #chainId: number;

  readonly #network: 'testnet' | 'mainnet';

  // Auth config (passed at construction, not from runtime env vars)
  readonly #authConfig: MYXAuthConfig;

  // Auth state
  #authenticated = false;

  #authenticating: Promise<void> | null = null;

  // Price polling (sequential using setTimeout to prevent request pileup)
  #pricePollingTimeout?: ReturnType<typeof setTimeout>;

  #pollingSymbols: string[] = [];

  #pollingCallback?: PricePollingCallback;

  // Caches
  #marketsCache: MYXPoolSymbol[] = [];

  #marketsCacheTimestamp = 0;

  readonly #marketsCacheTtlMs = 5 * 60 * 1000; // 5 minutes

  // globalId cache: poolId → globalId (for WS subscriptions)
  readonly #globalIdCache: Map<string, number> = new Map();

  // Platform dependencies
  readonly #deps: PerpsPlatformDependencies;

  constructor(deps: PerpsPlatformDependencies, config: MYXClientConfig) {
    this.#deps = deps;

    this.#isTestnet = config.isTestnet;
    this.#network = this.#isTestnet ? 'testnet' : 'mainnet';
    this.#chainId = getMYXChainId(this.#network);

    // Store auth config (from init file's babel-transformed process.env.X)
    this.#authConfig = config.authConfig ?? {
      appId: '',
      apiSecret: '',
      brokerAddress: '',
    };

    const brokerAddress =
      this.#authConfig.brokerAddress ||
      '0x0000000000000000000000000000000000000000';

    // Initialize MyxClient with broker address
    this.#myxClient = new MyxClient({
      chainId: this.#chainId,
      brokerAddress,
      isTestnet: this.#isTestnet,
      isBetaMode: this.#isTestnet, // Use beta API for testnet
    });

    this.#deps.debugLogger.log('[MYXClientService] Initialized with SDK', {
      isTestnet: this.#isTestnet,
      chainId: this.#chainId,
      brokerAddress:
        brokerAddress === '0x0000000000000000000000000000000000000000'
          ? 'zero (not configured)'
          : 'configured',
    });
  }

  // ============================================================================
  // Error Context Helper
  // ============================================================================

  #getErrorContext(
    method: string,
    extra?: Record<string, unknown>,
  ): {
    tags?: Record<string, string | number>;
    context?: { name: string; data: Record<string, unknown> };
  } {
    return {
      tags: {
        feature: PERPS_CONSTANTS.FeatureName,
        service: 'MYXClientService',
        network: this.#isTestnet ? 'testnet' : 'mainnet',
      },
      context: {
        name: `MYXClientService.${method}`,
        data: {
          chainId: this.#chainId,
          ...extra,
        },
      },
    };
  }

  // ============================================================================
  // Market Operations
  // ============================================================================

  /**
   * Get all available markets/pools
   * Uses SDK markets.getPoolSymbolAll()
   *
   * @returns The array of available MYX pool symbols.
   */
  async getMarkets(): Promise<MYXPoolSymbol[]> {
    // Return cache if valid
    const now = Date.now();
    if (
      this.#marketsCache.length > 0 &&
      now - this.#marketsCacheTimestamp < this.#marketsCacheTtlMs
    ) {
      return this.#marketsCache;
    }

    try {
      this.#deps.debugLogger.log('[MYXClientService] Fetching markets via SDK');

      const pools = await this.#myxClient.markets.getPoolSymbolAll();

      // Update cache
      this.#marketsCache = pools || [];
      this.#marketsCacheTimestamp = Date.now();

      this.#deps.debugLogger.log('[MYXClientService] Markets fetched', {
        count: this.#marketsCache.length,
      });

      return this.#marketsCache;
    } catch (caughtError) {
      const wrappedError = ensureError(
        caughtError,
        'MYXClientService.getMarkets',
      );
      this.#deps.logger.error(
        wrappedError,
        this.#getErrorContext('getMarkets'),
      );

      // Return stale cache if available
      if (this.#marketsCache.length > 0) {
        this.#deps.debugLogger.log(
          '[MYXClientService] Returning stale cache after error',
        );
        return this.#marketsCache;
      }

      throw wrappedError;
    }
  }

  /**
   * Get tickers for specific symbols/pools
   * Uses SDK markets.getTickerList()
   *
   * @param poolIds - The array of pool identifiers to fetch tickers for.
   * @returns The array of ticker data for the specified pools.
   */
  async getTickers(poolIds: string[]): Promise<MYXTicker[]> {
    if (poolIds.length === 0) {
      return [];
    }

    try {
      this.#deps.debugLogger.log(
        '[MYXClientService] Fetching tickers via SDK',
        {
          poolIds: poolIds.length,
        },
      );

      const tickers = await this.#myxClient.markets.getTickerList({
        chainId: this.#chainId,
        poolIds,
      });

      return tickers || [];
    } catch (caughtError) {
      const wrappedError = ensureError(
        caughtError,
        'MYXClientService.getTickers',
      );
      this.#deps.logger.error(
        wrappedError,
        this.#getErrorContext('getTickers', { poolIds }),
      );
      throw wrappedError;
    }
  }

  /**
   * Get all tickers (for all available markets)
   *
   * @returns The array of ticker data for all available markets.
   */
  async getAllTickers(): Promise<MYXTicker[]> {
    try {
      this.#deps.debugLogger.log(
        '[MYXClientService] Fetching all tickers via SDK',
      );

      // Get all pools first, then fetch tickers for them
      const pools = await this.getMarkets();
      const poolIds = pools.map((pool) => pool.poolId);

      if (poolIds.length === 0) {
        return [];
      }

      return this.getTickers(poolIds);
    } catch (caughtError) {
      const wrappedError = ensureError(
        caughtError,
        'MYXClientService.getAllTickers',
      );
      this.#deps.logger.error(
        wrappedError,
        this.#getErrorContext('getAllTickers'),
      );
      throw wrappedError;
    }
  }

  // ============================================================================
  // Price Polling
  // ============================================================================

  /**
   * Start polling for price updates.
   * Uses sequential setTimeout to prevent request pileup — the next poll
   * is only scheduled after the current one completes (or fails).
   *
   * @param poolIds - The array of pool identifiers to poll prices for.
   * @param callback - The callback invoked with updated ticker data on each poll.
   */
  startPricePolling(poolIds: string[], callback: PricePollingCallback): void {
    // Stop existing polling
    this.stopPricePolling();

    this.#pollingSymbols = poolIds;
    this.#pollingCallback = callback;

    // Fetch immediately, then schedule subsequent polls
    this.#pollPrices().catch(() => {
      // Error handling is done inside #pollPrices
    });

    this.#deps.debugLogger.log('[MYXClientService] Started price polling', {
      symbols: poolIds.length,
      intervalMs: MYX_PRICE_POLLING_INTERVAL_MS,
    });
  }

  /**
   * Stop price polling
   */
  stopPricePolling(): void {
    if (this.#pricePollingTimeout) {
      clearTimeout(this.#pricePollingTimeout);
      this.#pricePollingTimeout = undefined;
    }
    this.#pollingSymbols = [];
    this.#pollingCallback = undefined;

    this.#deps.debugLogger.log('[MYXClientService] Stopped price polling');
  }

  /**
   * Execute a single price poll, then schedule the next one.
   * Sequential pattern ensures no request pileup if polls take longer than the interval.
   */
  async #pollPrices(): Promise<void> {
    if (!this.#pollingCallback || this.#pollingSymbols.length === 0) {
      return;
    }

    try {
      const tickers = await this.getTickers(this.#pollingSymbols);
      // Re-check: polling may have been stopped during the await
      // (TS narrows after early return but can't track mutations across await)
      const callback = this.#pollingCallback;
      if (callback) {
        callback(tickers);
      }
    } catch (caughtError) {
      const wrappedError = ensureError(
        caughtError,
        'MYXClientService.pollPrices',
      );
      this.#deps.debugLogger.log('[MYXClientService] Price poll failed', {
        error: wrappedError.message,
      });
      // Don't propagate error - polling continues
    } finally {
      this.#scheduleNextPoll();
    }
  }

  /**
   * Schedule the next poll after the configured interval
   */
  #scheduleNextPoll(): void {
    // Only schedule if polling is still active
    if (!this.#pollingCallback || this.#pollingSymbols.length === 0) {
      return;
    }

    this.#pricePollingTimeout = setTimeout(() => {
      this.#pollPrices().catch(() => {
        // Error handling is done inside #pollPrices
      });
    }, MYX_PRICE_POLLING_INTERVAL_MS);
  }

  // ============================================================================
  // Authentication
  // ============================================================================

  /**
   * Authenticate the MYX client with signer and access token.
   * Uses promise dedup to prevent concurrent auth attempts.
   *
   * @param signer - ethers v6 Signer-like object
   * @param walletClient - viem WalletClient-like object
   * @param address - User wallet address for token generation
   */
  async authenticate(
    signer: unknown,
    walletClient: unknown,
    address: string,
  ): Promise<void> {
    if (this.#authenticated) {
      return;
    }

    // Dedup concurrent auth calls
    if (this.#authenticating) {
      await this.#authenticating;
      return;
    }

    this.#authenticating = this.#doAuthenticate(signer, walletClient, address);
    try {
      await this.#authenticating;
    } finally {
      this.#authenticating = null;
    }
  }

  async #doAuthenticate(
    signer: unknown,
    walletClient: unknown,
    address: string,
  ): Promise<void> {
    try {
      this.#deps.debugLogger.log('[MYXClientService] Authenticating...', {
        address: `${address.slice(0, 6)}...${address.slice(-4)}`,
      });

      // Create getAccessToken callback for the SDK.
      // The SDK calls this when it needs a fresh token.
      // Must return {accessToken, expireAt} or undefined.
      const getAccessToken = async (): Promise<
        { accessToken: string; expireAt: number } | undefined
      > => {
        try {
          return await this.#generateAccessToken(address);
        } catch (tokenError) {
          this.#deps.debugLogger.log(
            '[MYXClientService] Token generation failed',
            { error: String(tokenError) },
          );
          return undefined;
        }
      };

      // Call SDK auth with signer, walletClient, and getAccessToken
      this.#myxClient.auth({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signer: signer as any,
        getAccessToken,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        walletClient: walletClient as any,
      });

      this.#authenticated = true;

      this.#deps.debugLogger.log(
        '[MYXClientService] Authentication successful',
      );
    } catch (caughtError) {
      const wrappedError = ensureError(
        caughtError,
        'MYXClientService.authenticate',
      );
      this.#deps.logger.error(
        wrappedError,
        this.#getErrorContext('authenticate'),
      );
      throw wrappedError;
    }
  }

  // ============================================================================
  // Token Generation (moved from myxConfig.ts)
  // ============================================================================

  /**
   * Compute SHA-256 hex digest using the Web Crypto API (available in React Native).
   *
   * @param input - The string to hash.
   * @returns Hex-encoded SHA-256 digest.
   */
  async #sha256Hex(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await globalThis.crypto.subtle.digest(
      'SHA-256',
      data.buffer as ArrayBuffer,
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate MYX access token via Token API.
   * Token = SHA256({appId}&{timestamp}&{expireTime}&{address}&{secret})
   *
   * @param address - User wallet address.
   * @returns Access token response with token string and expiry.
   */
  async #generateAccessToken(
    address: string,
  ): Promise<{ accessToken: string; expireAt: number }> {
    const { appId, apiSecret } = this.#authConfig;

    if (!appId || !apiSecret) {
      throw new Error(
        `MYX credentials not configured for ${this.#network}. Ensure MM_PERPS_MYX_APP_ID and MM_PERPS_MYX_API_SECRET are set in .js.env`,
      );
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const expireTime = timestamp + 86400; // 24 hours
    const signString = `${appId}&${timestamp}&${expireTime}&${address}&${apiSecret}`;
    const signature = await this.#sha256Hex(signString);

    // GET request with query params (per SDK integration guide)
    const params = new URLSearchParams({
      appId,
      timestamp: String(timestamp),
      expireTime: String(expireTime),
      allowAccount: address,
      signature,
    });

    const tokenApiUrl = `${getMYXHttpEndpoint(this.#network)}/openapi/gateway/auth/api_key/create_token`;

    const response = await fetch(`${tokenApiUrl}?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`MYX token API request failed: ${response.status}`);
    }

    const result = (await response.json()) as {
      code: number;
      data?: { accessToken: string; expireAt: number };
      message?: string;
    };

    if (
      (result.code !== 9200 && result.code !== 0) ||
      !result.data?.accessToken
    ) {
      throw new Error(
        `MYX token API error: code=${result.code} message=${result.message ?? 'unknown'}`,
      );
    }

    return {
      accessToken: result.data.accessToken,
      expireAt: result.data.expireAt,
    };
  }

  /**
   * Check if the client is authenticated.
   *
   * @returns True if the client has been authenticated.
   */
  isAuthenticated(): boolean {
    return this.#authenticated;
  }

  // ============================================================================
  // Authenticated Read Operations
  // ============================================================================

  /**
   * List positions for the given address.
   *
   * @param address - User wallet address.
   * @returns SDK response with position data.
   */
  async listPositions(
    address: string,
  ): Promise<{ code: number; data?: MYXPositionType[] }> {
    try {
      this.#deps.debugLogger.log('[MYXClientService] Listing positions');
      const result = await this.#myxClient.position.listPositions(address);
      return result as { code: number; data?: MYXPositionType[] };
    } catch (caughtError) {
      const wrappedError = ensureError(
        caughtError,
        'MYXClientService.listPositions',
      );
      this.#deps.logger.error(
        wrappedError,
        this.#getErrorContext('listPositions'),
      );
      throw wrappedError;
    }
  }

  /**
   * Get open orders for the given address.
   *
   * @param address - User wallet address.
   * @returns SDK response with order data.
   */
  async getOrders(
    address: string,
  ): Promise<{ code: number; data?: MYXPositionType[] }> {
    try {
      this.#deps.debugLogger.log('[MYXClientService] Getting orders');
      const result = await this.#myxClient.order.getOrders(address);
      return result as { code: number; data?: MYXPositionType[] };
    } catch (caughtError) {
      const wrappedError = ensureError(
        caughtError,
        'MYXClientService.getOrders',
      );
      this.#deps.logger.error(wrappedError, this.#getErrorContext('getOrders'));
      throw wrappedError;
    }
  }

  /**
   * Get order history.
   *
   * @param params - History query parameters (limit, chainId, poolId).
   * @param address - User wallet address.
   * @returns SDK response with historical order data.
   */
  async getOrderHistory(
    params: MYXGetHistoryOrdersParams,
    address: string,
  ): Promise<{ code: number; data: MYXHistoryOrderItem[] }> {
    try {
      this.#deps.debugLogger.log('[MYXClientService] Getting order history');
      const result = await this.#myxClient.order.getOrderHistory(
        params,
        address,
      );
      return result as { code: number; data: MYXHistoryOrderItem[] };
    } catch (caughtError) {
      const wrappedError = ensureError(
        caughtError,
        'MYXClientService.getOrderHistory',
      );
      this.#deps.logger.error(
        wrappedError,
        this.#getErrorContext('getOrderHistory'),
      );
      throw wrappedError;
    }
  }

  /**
   * Get position history.
   *
   * @param params - History query parameters (limit, chainId, poolId).
   * @param address - User wallet address.
   * @returns SDK response with historical position data.
   */
  async getPositionHistory(
    params: MYXGetHistoryOrdersParams,
    address: string,
  ): Promise<{ code: number; data: MYXPositionHistoryItem[] }> {
    try {
      this.#deps.debugLogger.log('[MYXClientService] Getting position history');
      const result = await this.#myxClient.position.getPositionHistory(
        params,
        address,
      );
      return result as { code: number; data: MYXPositionHistoryItem[] };
    } catch (caughtError) {
      const wrappedError = ensureError(
        caughtError,
        'MYXClientService.getPositionHistory',
      );
      this.#deps.logger.error(
        wrappedError,
        this.#getErrorContext('getPositionHistory'),
      );
      throw wrappedError;
    }
  }

  /**
   * Get account info for a specific pool.
   *
   * @param chainId - Chain ID for the query.
   * @param address - User wallet address.
   * @param poolId - Pool identifier.
   * @returns SDK response with account info data.
   */
  async getAccountInfo(
    chainId: number,
    address: string,
    poolId: string,
  ): Promise<{ code: number; data?: Record<string, unknown> }> {
    try {
      this.#deps.debugLogger.log('[MYXClientService] Getting account info', {
        poolId,
      });
      const result = await this.#myxClient.account.getAccountInfo(
        chainId,
        address,
        poolId,
      );
      return result as { code: number; data?: Record<string, unknown> };
    } catch (caughtError) {
      const wrappedError = ensureError(
        caughtError,
        'MYXClientService.getAccountInfo',
      );
      this.#deps.logger.error(
        wrappedError,
        this.#getErrorContext('getAccountInfo'),
      );
      throw wrappedError;
    }
  }

  /**
   * Get wallet USDT balance.
   *
   * @param chainId - Chain ID for the query.
   * @param address - User wallet address.
   * @returns SDK response with balance data.
   */
  async getWalletQuoteTokenBalance(
    chainId: number,
    address: string,
  ): Promise<{ code: number; data: string }> {
    try {
      this.#deps.debugLogger.log('[MYXClientService] Getting wallet balance');
      const result = await this.#myxClient.account.getWalletQuoteTokenBalance(
        chainId,
        address,
      );
      return result as { code: number; data: string };
    } catch (caughtError) {
      const wrappedError = ensureError(
        caughtError,
        'MYXClientService.getWalletQuoteTokenBalance',
      );
      this.#deps.logger.error(
        wrappedError,
        this.#getErrorContext('getWalletQuoteTokenBalance'),
      );
      throw wrappedError;
    }
  }

  /**
   * Get trade flow (deposits, withdrawals, funding, etc.).
   *
   * @param params - History query parameters (limit, chainId, poolId).
   * @param address - User wallet address.
   * @returns SDK response with trade flow data.
   */
  async getTradeFlow(
    params: MYXGetHistoryOrdersParams,
    address: string,
  ): Promise<{ code: number; data: MYXTradeFlowItem[] }> {
    try {
      this.#deps.debugLogger.log('[MYXClientService] Getting trade flow');
      const result = await this.#myxClient.account.getTradeFlow(
        params,
        address,
      );
      return result as { code: number; data: MYXTradeFlowItem[] };
    } catch (caughtError) {
      const wrappedError = ensureError(
        caughtError,
        'MYXClientService.getTradeFlow',
      );
      this.#deps.logger.error(
        wrappedError,
        this.#getErrorContext('getTradeFlow'),
      );
      throw wrappedError;
    }
  }

  /**
   * Get chain ID.
   *
   * @returns The numeric chain ID.
   */
  getChainId(): number {
    return this.#chainId;
  }

  /**
   * Get network.
   *
   * @returns The network identifier string.
   */
  getNetwork(): 'testnet' | 'mainnet' {
    return this.#network;
  }

  // ============================================================================
  // Kline (Candle) Data
  // ============================================================================

  /**
   * Get kline (candle) data for a pool.
   *
   * @param params - Kline query parameters.
   * @param params.poolId - Pool identifier.
   * @param params.interval - Kline resolution ('1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M').
   * @param params.limit - Number of candles to fetch.
   * @param params.endTime - Optional end time (unix seconds).
   * @returns Array of kline data items.
   */
  async getKlineData(params: {
    poolId: string;
    interval: KlineResolution;
    limit: number;
    endTime?: number;
  }): Promise<KlineDataItemType[]> {
    try {
      this.#deps.debugLogger.log('[MYXClientService] Fetching kline data', {
        poolId: params.poolId,
        interval: params.interval,
        limit: params.limit,
      });

      const result = await this.#myxClient.markets.getKlineList({
        poolId: params.poolId,
        chainId: this.#chainId,
        interval: params.interval,
        limit: params.limit,
        endTime: params.endTime ?? Math.floor(Date.now() / 1000),
      });

      return result || [];
    } catch (caughtError) {
      const wrappedError = ensureError(
        caughtError,
        'MYXClientService.getKlineData',
      );
      this.#deps.logger.error(
        wrappedError,
        this.#getErrorContext('getKlineData', {
          poolId: params.poolId,
          interval: params.interval,
        }),
      );
      throw wrappedError;
    }
  }

  // ============================================================================
  // Market Detail / Global ID
  // ============================================================================

  /**
   * Get the globalId for a pool. Required for WebSocket subscriptions.
   * Fetches via getMarketDetail and caches the result.
   *
   * @param poolId - Pool identifier.
   * @returns The numeric globalId for WebSocket subscriptions.
   */
  async getGlobalId(poolId: string): Promise<number> {
    const cached = this.#globalIdCache.get(poolId);
    if (cached !== undefined) {
      return cached;
    }

    try {
      this.#deps.debugLogger.log(
        '[MYXClientService] Fetching globalId via getMarketDetail',
        { poolId },
      );

      const detail = await this.#myxClient.markets.getMarketDetail({
        chainId: this.#chainId,
        poolId,
      });

      const { globalId } = detail;
      this.#globalIdCache.set(poolId, globalId);

      this.#deps.debugLogger.log('[MYXClientService] globalId cached', {
        poolId,
        globalId,
      });

      return globalId;
    } catch (caughtError) {
      const wrappedError = ensureError(
        caughtError,
        'MYXClientService.getGlobalId',
      );
      this.#deps.logger.error(
        wrappedError,
        this.#getErrorContext('getGlobalId', { poolId }),
      );
      throw wrappedError;
    }
  }

  // ============================================================================
  // Kline WebSocket Subscriptions
  // ============================================================================

  /**
   * Subscribe to live kline (candle) updates via WebSocket.
   * The SDK's SubScription manages WS connection internally.
   *
   * @param globalId - Market globalId (from getGlobalId).
   * @param resolution - Kline resolution.
   * @param callback - Called on each WS kline update.
   */
  subscribeToKline(
    globalId: number,
    resolution: KlineResolution,
    callback: (data: KlineDataResponse) => void,
  ): void {
    this.#deps.debugLogger.log('[MYXClientService] Subscribing to kline WS', {
      globalId,
      resolution,
    });
    this.#myxClient.subscription.subscribeKline(globalId, resolution, callback);
  }

  /**
   * Unsubscribe from live kline updates.
   *
   * @param globalId - Market globalId.
   * @param resolution - Kline resolution.
   * @param callback - The same callback reference passed to subscribeToKline.
   */
  unsubscribeFromKline(
    globalId: number,
    resolution: KlineResolution,
    callback: (data: KlineDataResponse) => void,
  ): void {
    this.#deps.debugLogger.log(
      '[MYXClientService] Unsubscribing from kline WS',
      { globalId, resolution },
    );
    this.#myxClient.subscription.unsubscribeKline(
      globalId,
      resolution,
      callback,
    );
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  /**
   * Health check — attempts a lightweight REST call (getTickerList with empty poolIds)
   * to verify the MYX API is reachable.
   *
   * @param timeoutMs - The timeout in milliseconds for the ping request.
   */
  async ping(timeoutMs = 5000): Promise<void> {
    this.#deps.debugLogger.log(
      '[MYXClientService] Ping - checking REST health',
    );

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error('MYX ping timeout')),
        timeoutMs,
      );
    });

    try {
      await Promise.race([
        this.#myxClient.markets.getTickerList({
          chainId: this.#chainId,
          poolIds: [],
        }),
        timeoutPromise,
      ]);
    } catch (caughtError) {
      const wrappedError = ensureError(caughtError, 'MYXClientService.ping');
      this.#deps.debugLogger.log('[MYXClientService] Ping failed', {
        error: wrappedError.message,
      });
      throw wrappedError;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.stopPricePolling();
    this.#marketsCache = [];
    this.#marketsCacheTimestamp = 0;
    this.#globalIdCache.clear();
    this.#authenticated = false;
    this.#authenticating = null;

    this.#deps.debugLogger.log('[MYXClientService] Disconnected');
  }

  /**
   * Get current network mode
   *
   * @returns True if the service is in testnet mode.
   */
  getIsTestnet(): boolean {
    return this.#isTestnet;
  }
}
