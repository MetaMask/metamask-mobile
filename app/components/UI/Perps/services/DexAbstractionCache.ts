/**
 * Global singleton cache for Perps signing operations
 *
 * This cache persists across provider reconnections to prevent repeated
 * signing requests for hardware wallets. Critical for preventing QR popup spam.
 *
 * Cache is intentionally kept separate from provider instances because providers
 * are recreated on account/network changes, which would reset instance-level caches.
 *
 * Tracks three signing operations:
 * 1. DEX Abstraction enablement (one-time, irreversible)
 * 2. Builder Fee approval (required for trading)
 * 3. Referral code setup (one-time per account)
 *
 * Cache Structure:
 * - Key: `network:userAddress` (e.g., "mainnet:0x123...")
 * - Value: { dexAbstraction, builderFee, referral, timestamp }
 *
 * Lifecycle:
 * - Cache persists throughout app session
 * - Individual entries can be cleared per user/network
 * - Full cache can be cleared on app restart or explicit user action
 */

interface SigningOperationState {
  attempted: boolean; // Whether we've attempted this operation
  success: boolean; // Whether it succeeded (only valid if attempted=true)
}

interface PerpsSigningCacheEntry {
  dexAbstraction: SigningOperationState;
  builderFee: SigningOperationState;
  referral: SigningOperationState;
  timestamp: number; // When this entry was last updated
}

// Legacy interface for backward compatibility
interface DexAbstractionCacheEntry {
  attempted: boolean;
  enabled: boolean;
  timestamp: number;
}

class PerpsSigningCacheManager {
  private static instance: PerpsSigningCacheManager;
  private cache: Map<string, PerpsSigningCacheEntry> = new Map();

  // Global in-flight locks to prevent concurrent signing attempts across providers
  // Key: operationType:network:userAddress, Value: Promise that resolves when operation completes
  private inFlightOperations: Map<string, Promise<void>> = new Map();

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): PerpsSigningCacheManager {
    if (!PerpsSigningCacheManager.instance) {
      PerpsSigningCacheManager.instance = new PerpsSigningCacheManager();
    }
    return PerpsSigningCacheManager.instance;
  }

  // ===== In-Flight Lock Methods =====

  /**
   * Check if an operation is currently in-flight for this user/network
   */
  public isInFlight(
    operationType: 'dexAbstraction' | 'builderFee' | 'referral',
    network: 'mainnet' | 'testnet',
    userAddress: string,
  ): Promise<void> | undefined {
    const key = `${operationType}:${network}:${userAddress.toLowerCase()}`;
    return this.inFlightOperations.get(key);
  }

  /**
   * Set an operation as in-flight
   * Returns a function to call when operation completes
   */
  public setInFlight(
    operationType: 'dexAbstraction' | 'builderFee' | 'referral',
    network: 'mainnet' | 'testnet',
    userAddress: string,
  ): () => void {
    const key = `${operationType}:${network}:${userAddress.toLowerCase()}`;
    let resolvePromise: () => void;
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    this.inFlightOperations.set(key, promise);
    return () => {
      this.inFlightOperations.delete(key);
      resolvePromise();
    };
  }

  private getCacheKey(
    network: 'mainnet' | 'testnet',
    userAddress: string,
  ): string {
    return `${network}:${userAddress.toLowerCase()}`;
  }

  private getOrCreateEntry(
    network: 'mainnet' | 'testnet',
    userAddress: string,
  ): PerpsSigningCacheEntry {
    const key = this.getCacheKey(network, userAddress);
    let entry = this.cache.get(key);
    if (!entry) {
      entry = {
        dexAbstraction: { attempted: false, success: false },
        builderFee: { attempted: false, success: false },
        referral: { attempted: false, success: false },
        timestamp: Date.now(),
      };
      this.cache.set(key, entry);
    }
    return entry;
  }

  // ===== DEX Abstraction Methods =====

  /**
   * Get DEX abstraction cache entry (legacy compatibility)
   */
  public get(
    network: 'mainnet' | 'testnet',
    userAddress: string,
  ): DexAbstractionCacheEntry | undefined {
    const key = this.getCacheKey(network, userAddress);
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    return {
      attempted: entry.dexAbstraction.attempted,
      enabled: entry.dexAbstraction.success,
      timestamp: entry.timestamp,
    };
  }

  /**
   * Set DEX abstraction cache entry (legacy compatibility)
   */
  public set(
    network: 'mainnet' | 'testnet',
    userAddress: string,
    data: { attempted: boolean; enabled: boolean },
  ): void {
    const entry = this.getOrCreateEntry(network, userAddress);
    entry.dexAbstraction = { attempted: data.attempted, success: data.enabled };
    entry.timestamp = Date.now();
  }

  // ===== Builder Fee Methods =====

  /**
   * Check if builder fee approval was attempted
   */
  public getBuilderFee(
    network: 'mainnet' | 'testnet',
    userAddress: string,
  ): SigningOperationState | undefined {
    const key = this.getCacheKey(network, userAddress);
    const entry = this.cache.get(key);
    return entry?.builderFee;
  }

  /**
   * Set builder fee approval state
   */
  public setBuilderFee(
    network: 'mainnet' | 'testnet',
    userAddress: string,
    state: SigningOperationState,
  ): void {
    const entry = this.getOrCreateEntry(network, userAddress);
    entry.builderFee = state;
    entry.timestamp = Date.now();
  }

  // ===== Referral Methods =====

  /**
   * Check if referral setup was attempted
   */
  public getReferral(
    network: 'mainnet' | 'testnet',
    userAddress: string,
  ): SigningOperationState | undefined {
    const key = this.getCacheKey(network, userAddress);
    const entry = this.cache.get(key);
    return entry?.referral;
  }

  /**
   * Set referral setup state
   */
  public setReferral(
    network: 'mainnet' | 'testnet',
    userAddress: string,
    state: SigningOperationState,
  ): void {
    const entry = this.getOrCreateEntry(network, userAddress);
    entry.referral = state;
    entry.timestamp = Date.now();
  }

  // ===== General Methods =====

  /**
   * Clear cache entry for a specific network and user address
   */
  public clear(network: 'mainnet' | 'testnet', userAddress: string): void {
    const key = this.getCacheKey(network, userAddress);
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  public clearAll(): void {
    this.cache.clear();
  }

  /**
   * Get all cache entries (for debugging)
   */
  public getAll(): Map<string, PerpsSigningCacheEntry> {
    return new Map(this.cache);
  }

  /**
   * Get cache size (for debugging)
   */
  public size(): number {
    return this.cache.size;
  }

  /**
   * Get full cache state for debugging
   */
  public debugState(): string {
    const entries: string[] = [];
    this.cache.forEach((entry, key) => {
      entries.push(
        `${key}: dex=${entry.dexAbstraction.attempted}/${entry.dexAbstraction.success}, ` +
          `builder=${entry.builderFee.attempted}/${entry.builderFee.success}, ` +
          `referral=${entry.referral.attempted}/${entry.referral.success}`,
      );
    });
    return entries.join('\n') || '(empty)';
  }
}

// Export singleton instance with backward-compatible name
export const DexAbstractionCache = PerpsSigningCacheManager.getInstance();

// Export with new name for clarity
export const PerpsSigningCache = PerpsSigningCacheManager.getInstance();
