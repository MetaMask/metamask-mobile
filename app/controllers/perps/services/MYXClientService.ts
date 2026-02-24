/**
 * MYXClientService
 *
 * Stage 1 service for fetching MYX market data using the @myx-trade/sdk.
 * Handles market listing, ticker fetching, and price polling.
 *
 * Uses MyxClient SDK for API calls.
 * Trading functionality will be added in Stage 3.
 */

import { MyxClient } from '@myx-trade/sdk';

import {
  MYX_PRICE_POLLING_INTERVAL_MS,
  getMYXChainId,
} from '../constants/myxConfig';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';
import type { PerpsPlatformDependencies } from '../types';
import type { MYXPoolSymbol, MYXTicker } from '../types/myx-types';
import { ensureError } from '../utils/errorUtils';

// ============================================================================
// Types
// ============================================================================

/**
 * MYX Client Configuration
 */
export type MYXClientConfig = {
  isTestnet: boolean;
};

/**
 * Price polling callback type
 */
export type PricePollingCallback = (tickers: MYXTicker[]) => void;

// ============================================================================
// MYXClientService
// ============================================================================

/**
 * Service for managing MYX SDK client interactions
 * Stage 1: Read-only operations (markets, prices)
 */
export class MYXClientService {
  // SDK Client
  readonly #myxClient: MyxClient;

  // Configuration
  readonly #isTestnet: boolean;

  readonly #chainId: number;

  // Price polling (sequential using setTimeout to prevent request pileup)
  #pricePollingTimeout?: ReturnType<typeof setTimeout>;

  #pollingSymbols: string[] = [];

  #pollingCallback?: PricePollingCallback;

  // Caches
  #marketsCache: MYXPoolSymbol[] = [];

  #marketsCacheTimestamp = 0;

  readonly #marketsCacheTtlMs = 5 * 60 * 1000; // 5 minutes

  // Platform dependencies
  readonly #deps: PerpsPlatformDependencies;

  constructor(deps: PerpsPlatformDependencies, config: MYXClientConfig) {
    this.#deps = deps;

    this.#isTestnet = config.isTestnet;
    this.#chainId = getMYXChainId(this.#isTestnet ? 'testnet' : 'mainnet');

    // Initialize MyxClient
    this.#myxClient = new MyxClient({
      chainId: this.#chainId,
      brokerAddress: '0x0000000000000000000000000000000000000000', // Not needed for read-only
      isTestnet: this.#isTestnet,
      isBetaMode: this.#isTestnet, // Use beta API for testnet
    });

    this.#deps.debugLogger.log('[MYXClientService] Initialized with SDK', {
      isTestnet: this.#isTestnet,
      chainId: this.#chainId,
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
