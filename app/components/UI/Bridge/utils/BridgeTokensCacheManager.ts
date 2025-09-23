import { Hex, CaipChainId } from '@metamask/utils';
import StorageWrapper from '../../../../store/storage-wrapper';
import Logger from '../../../../util/Logger';
import { BridgeToken } from '../types';

interface CachedBridgeTokens {
  tokens: Record<string, BridgeToken>;
  timestamp: number;
  chainId: Hex | CaipChainId;
}

interface BridgeTokensCacheConfig {
  /** Cache TTL in milliseconds. Default: 30 minutes */
  ttlMs?: number;
  /** Storage key prefix. Default: 'bridge_tokens_cache' */
  storagePrefix?: string;
}

/**
 * Cache manager for Bridge API tokens with persistent storage and TTL
 * Implements:
 * - Persistent storage using StorageWrapper (MMKV)
 * - Time-based cache invalidation
 * - Progressive loading (return cached data immediately, fetch fresh in background)
 * - Error handling and fallback to fresh fetch
 */
export class BridgeTokensCacheManager {
  private readonly ttlMs: number;
  private readonly storagePrefix: string;

  constructor(config: BridgeTokensCacheConfig = {}) {
    this.ttlMs = config.ttlMs ?? 30 * 60 * 1000; // 30 minutes default
    this.storagePrefix = config.storagePrefix ?? 'bridge_tokens_cache';
  }

  /**
   * Get cache key for a specific chain
   */
  private getCacheKey(chainId: Hex | CaipChainId): string {
    return `${this.storagePrefix}_${chainId}`;
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.ttlMs;
  }

  /**
   * Get cached tokens for a chain
   * Returns cached data immediately if valid, undefined if invalid or not found
   */
  async getCachedTokens(
    chainId: Hex | CaipChainId,
  ): Promise<Record<string, BridgeToken> | undefined> {
    try {
      const cacheKey = this.getCacheKey(chainId);
      const cachedDataStr = await StorageWrapper.getItem(cacheKey);

      if (!cachedDataStr) {
        return undefined;
      }

      const cachedData: CachedBridgeTokens = JSON.parse(cachedDataStr);

      // Verify cache structure and validity
      if (
        !cachedData.tokens ||
        !cachedData.timestamp ||
        cachedData.chainId !== chainId
      ) {
        await this.removeCachedTokens(chainId);
        return undefined;
      }

      if (!this.isCacheValid(cachedData.timestamp)) {
        await this.removeCachedTokens(chainId);
        return undefined;
      }

      // Additional validation: ensure tokens actually belong to this chain
      if (!this.validateTokensForChain(cachedData.tokens, chainId)) {
        await this.removeCachedTokens(chainId);
        return undefined;
      }

      return cachedData.tokens;
    } catch (error) {
      Logger.error(
        error as Error,
        `BridgeTokensCacheManager: Error reading cache for chainId ${chainId}`,
      );
      return undefined;
    }
  }

  /**
   * Cache tokens for a chain
   */
  async setCachedTokens(
    chainId: Hex | CaipChainId,
    tokens: Record<string, BridgeToken>,
  ): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(chainId);
      const cacheData: CachedBridgeTokens = {
        tokens,
        timestamp: Date.now(),
        chainId,
      };

      await StorageWrapper.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      Logger.error(
        error as Error,
        `BridgeTokensCacheManager: Error writing cache for chainId ${chainId}`,
      );
    }
  }

  /**
   * Remove cached tokens for a chain
   */
  async removeCachedTokens(chainId: Hex | CaipChainId): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(chainId);
      await StorageWrapper.removeItem(cacheKey);
    } catch (error) {
      Logger.error(
        error as Error,
        `BridgeTokensCacheManager: Error removing cache for chainId ${chainId}`,
      );
    }
  }

  /**
   * Check if we have valid cached data for a chain
   */
  async hasCachedTokens(chainId: Hex | CaipChainId): Promise<boolean> {
    const cached = await this.getCachedTokens(chainId);
    return cached !== undefined;
  }

  /**
   * Validate that cached tokens actually belong to the expected chain
   * This provides an additional safeguard against race conditions
   */
  private validateTokensForChain(
    tokens: Record<string, BridgeToken>,
    expectedChainId: Hex | CaipChainId,
  ): boolean {
    // Check a few tokens to ensure they match the expected chain
    const tokenEntries = Object.entries(tokens);
    if (tokenEntries.length === 0) return true;

    // Sample first few tokens to verify chain consistency
    const samplesToCheck = Math.min(3, tokenEntries.length);
    for (let i = 0; i < samplesToCheck; i++) {
      const [, token] = tokenEntries[i];
      if (token.chainId !== expectedChainId) {
        return false;
      }
    }
    return true;
  }
}

// Singleton instance for app-wide use
export const bridgeTokensCacheManager = new BridgeTokensCacheManager({
  ttlMs: 30 * 60 * 1000, // 30 minutes
});
