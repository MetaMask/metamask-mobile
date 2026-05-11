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
 * 1. Unified Account enablement (one-time, replaces deprecated DEX abstraction)
 * 2. Builder Fee approval (required for trading)
 * 3. Referral code setup (one-time per account)
 *
 * Cache Structure:
 * - Key: `network:userAddress[:scope]` (e.g., "mainnet:0x123...")
 * - Scope is optional and separates readiness state by target.
 * - Builder fee approval uses the builder address as scope so default and VIP
 * builders do not share approval cache state.
 * - Value: { unifiedAccount, builderFee, referral, timestamp }
 *
 * Lifecycle:
 * - Cache persists throughout app session
 * - Individual entries can be cleared per user/network
 * - Full cache can be cleared on app restart or explicit user action
 */

type SigningOperationState = {
  attempted: boolean; // Whether we've attempted this operation
  success: boolean; // Whether it succeeded (only valid if attempted=true)
};

type PerpsSigningCacheEntry = {
  unifiedAccount: SigningOperationState;
  builderFee: SigningOperationState;
  referral: SigningOperationState;
  timestamp: number; // When this entry was last updated
};

// Legacy interface for backward compatibility
type TradingReadinessCacheEntry = {
  attempted: boolean;
  enabled: boolean;
  timestamp: number;
};

class PerpsSigningCacheManager {
  static #instance: PerpsSigningCacheManager;

  readonly #cache: Map<string, PerpsSigningCacheEntry> = new Map();

  // Global in-flight locks to prevent concurrent signing attempts across providers.
  // Key: operationType:network:userAddress[:scope], where scope is typically
  // the builder address for builder fee approval.
  // Value: Promise that resolves when operation completes.
  readonly #inFlightOperations: Map<string, Promise<void>> = new Map();

  // Singleton: use getInstance() instead of new
  protected constructor() {
    // Protected constructor for singleton
  }

  public static getInstance(): PerpsSigningCacheManager {
    PerpsSigningCacheManager.#instance ??= new PerpsSigningCacheManager();
    return PerpsSigningCacheManager.#instance;
  }

  // ===== In-Flight Lock Methods =====

  /**
   * Check if an operation is currently in-flight for this user/network
   *
   * @param operationType - The type of operation being performed.
   * @param network - The network environment.
   * @param userAddress - The user's wallet address.
   * @param scope - Optional cache discriminator appended to the key. Used for
   * builder fee approval to keep approvals for different builder addresses
   * independent.
   * @returns The in-flight operation promise, if another caller is already
   * performing the same operation for this key.
   */
  public isInFlight(
    operationType: 'unifiedAccount' | 'builderFee' | 'referral',
    network: 'mainnet' | 'testnet',
    userAddress: string,
    scope?: string,
  ): Promise<void> | undefined {
    const key = this.#getOperationKey(
      operationType,
      network,
      userAddress,
      scope,
    );
    return this.#inFlightOperations.get(key);
  }

  /**
   * Set an operation as in-flight
   * Returns a function to call when operation completes
   *
   * @param operationType - The type of operation being performed.
   * @param network - The network environment.
   * @param userAddress - The user's wallet address.
   * @param scope - Optional cache discriminator appended to the key. Used for
   * builder fee approval to keep approvals for different builder addresses
   * independent.
   * @returns A cleanup function that clears the lock and resolves waiters.
   */
  public setInFlight(
    operationType: 'unifiedAccount' | 'builderFee' | 'referral',
    network: 'mainnet' | 'testnet',
    userAddress: string,
    scope?: string,
  ): () => void {
    const key = this.#getOperationKey(
      operationType,
      network,
      userAddress,
      scope,
    );
    let resolvePromise: () => void;
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    this.#inFlightOperations.set(key, promise);
    return () => {
      this.#inFlightOperations.delete(key);
      resolvePromise();
    };
  }

  #getOperationKey(
    operationType: 'unifiedAccount' | 'builderFee' | 'referral',
    network: 'mainnet' | 'testnet',
    userAddress: string,
    scope?: string,
  ): string {
    const baseKey = `${operationType}:${network}:${userAddress.toLowerCase()}`;
    return scope ? `${baseKey}:${scope.toLowerCase()}` : baseKey;
  }

  #getCacheKey(
    network: 'mainnet' | 'testnet',
    userAddress: string,
    scope?: string,
  ): string {
    const baseKey = `${network}:${userAddress.toLowerCase()}`;
    return scope ? `${baseKey}:${scope.toLowerCase()}` : baseKey;
  }

  #getOrCreateEntry(
    network: 'mainnet' | 'testnet',
    userAddress: string,
    scope?: string,
  ): PerpsSigningCacheEntry {
    const key = this.#getCacheKey(network, userAddress, scope);
    let entry = this.#cache.get(key);
    if (!entry) {
      entry = {
        unifiedAccount: { attempted: false, success: false },
        builderFee: { attempted: false, success: false },
        referral: { attempted: false, success: false },
        timestamp: Date.now(),
      };
      this.#cache.set(key, entry);
    }
    return entry;
  }

  // ===== Unified Account Methods =====

  /**
   * Get unified account cache entry (legacy compatibility)
   *
   * @param network - The network environment.
   * @param userAddress - The user's wallet address.
   * @returns Cached unified account readiness, if present.
   */
  public get(
    network: 'mainnet' | 'testnet',
    userAddress: string,
  ): TradingReadinessCacheEntry | undefined {
    const key = this.#getCacheKey(network, userAddress);
    const entry = this.#cache.get(key);
    if (!entry) {
      return undefined;
    }
    return {
      attempted: entry.unifiedAccount.attempted,
      enabled: entry.unifiedAccount.success,
      timestamp: entry.timestamp,
    };
  }

  /**
   * Set unified account cache entry (legacy compatibility)
   *
   * @param network - The network environment.
   * @param userAddress - The user's wallet address.
   * @param data - The unified account readiness state to cache.
   * @param data.attempted - Whether the operation was attempted.
   * @param data.enabled - Whether unified account setup is enabled.
   */
  public set(
    network: 'mainnet' | 'testnet',
    userAddress: string,
    data: { attempted: boolean; enabled: boolean },
  ): void {
    const entry = this.#getOrCreateEntry(network, userAddress);
    entry.unifiedAccount = { attempted: data.attempted, success: data.enabled };
    entry.timestamp = Date.now();
  }

  // ===== Builder Fee Methods =====

  /**
   * Check if builder fee approval was attempted
   *
   * @param network - The network environment.
   * @param userAddress - The user's wallet address.
   * @param builderAddress - Optional builder address used as cache scope. This
   * keeps default and VIP builder approvals from sharing state.
   * @returns Cached builder fee approval state, if present.
   */
  public getBuilderFee(
    network: 'mainnet' | 'testnet',
    userAddress: string,
    builderAddress?: string,
  ): SigningOperationState | undefined {
    const key = this.#getCacheKey(network, userAddress, builderAddress);
    const entry = this.#cache.get(key);
    return entry?.builderFee;
  }

  /**
   * Set builder fee approval state
   *
   * @param network - The network environment.
   * @param userAddress - The user's wallet address.
   * @param state - The builder fee approval state to cache.
   * @param builderAddress - Optional builder address used as cache scope. This
   * keeps default and VIP builder approvals from sharing state.
   */
  public setBuilderFee(
    network: 'mainnet' | 'testnet',
    userAddress: string,
    state: SigningOperationState,
    builderAddress?: string,
  ): void {
    const entry = this.#getOrCreateEntry(network, userAddress, builderAddress);
    entry.builderFee = state;
    entry.timestamp = Date.now();
  }

  // ===== Referral Methods =====

  /**
   * Check if referral setup was attempted
   *
   * @param network - The network environment.
   * @param userAddress - The user's wallet address.
   * @returns Cached referral setup state, if present.
   */
  public getReferral(
    network: 'mainnet' | 'testnet',
    userAddress: string,
  ): SigningOperationState | undefined {
    const key = this.#getCacheKey(network, userAddress);
    const entry = this.#cache.get(key);
    return entry?.referral;
  }

  /**
   * Set referral setup state
   *
   * @param network - The network environment.
   * @param userAddress - The user's wallet address.
   * @param state - The referral setup state to cache.
   */
  public setReferral(
    network: 'mainnet' | 'testnet',
    userAddress: string,
    state: SigningOperationState,
  ): void {
    const entry = this.#getOrCreateEntry(network, userAddress);
    entry.referral = state;
    entry.timestamp = Date.now();
  }

  // ===== General Methods =====

  /**
   * Clear only unified account state for a specific network and user address
   * This preserves builder fee and referral states
   *
   * @param network - The network environment.
   * @param userAddress - The user's wallet address.
   */
  public clearUnifiedAccount(
    network: 'mainnet' | 'testnet',
    userAddress: string,
  ): void {
    const key = this.#getCacheKey(network, userAddress);
    const entry = this.#cache.get(key);
    if (entry) {
      entry.unifiedAccount = { attempted: false, success: false };
      entry.timestamp = Date.now();
    }
  }

  /**
   * Clear only builder fee state for a specific network and user address
   * This preserves unified account and referral states
   *
   * @param network - The network environment.
   * @param userAddress - The user's wallet address.
   * @param builderAddress - Optional builder address used as cache scope. Pass
   * the same builder address used for get/set to clear that scoped approval.
   */
  public clearBuilderFee(
    network: 'mainnet' | 'testnet',
    userAddress: string,
    builderAddress?: string,
  ): void {
    const key = this.#getCacheKey(network, userAddress, builderAddress);
    const entry = this.#cache.get(key);
    if (entry) {
      entry.builderFee = { attempted: false, success: false };
      entry.timestamp = Date.now();
    }
  }

  /**
   * Clear only referral state for a specific network and user address
   * This preserves unified account and builder fee states
   *
   * @param network - The network environment.
   * @param userAddress - The user's wallet address.
   */
  public clearReferral(
    network: 'mainnet' | 'testnet',
    userAddress: string,
  ): void {
    const key = this.#getCacheKey(network, userAddress);
    const entry = this.#cache.get(key);
    if (entry) {
      entry.referral = { attempted: false, success: false };
      entry.timestamp = Date.now();
    }
  }

  /**
   * Clear the unscoped cache entry for a specific network and user address
   * WARNING: This clears ALL signing operation states (unifiedAccount, builderFee, referral)
   * on that unscoped entry. Builder-address-scoped entries are separate keys.
   *
   * @param network - The network environment.
   * @param userAddress - The user's wallet address.
   */
  public clear(network: 'mainnet' | 'testnet', userAddress: string): void {
    const key = this.#getCacheKey(network, userAddress);
    this.#cache.delete(key);
  }

  /**
   * Clear all cache entries
   * WARNING: This clears ALL signing operation states for ALL users
   */
  public clearAll(): void {
    this.#cache.clear();
  }

  /**
   * Get all cache entries (for debugging)
   *
   * @returns A copy of the current signing cache.
   */
  public getAll(): Map<string, PerpsSigningCacheEntry> {
    return new Map(this.#cache);
  }

  /**
   * Get cache size (for debugging)
   *
   * @returns Number of cache entries.
   */
  public size(): number {
    return this.#cache.size;
  }

  /**
   * Get full cache state for debugging
   *
   * @returns Human-readable cache contents, or `(empty)` when there are no entries.
   */
  public debugState(): string {
    const entries: string[] = [];
    this.#cache.forEach((entry, key) => {
      entries.push(
        `${key}: unified=${entry.unifiedAccount.attempted}/${entry.unifiedAccount.success}, ` +
          `builder=${entry.builderFee.attempted}/${entry.builderFee.success}, ` +
          `referral=${entry.referral.attempted}/${entry.referral.success}`,
      );
    });
    return entries.join('\n') || '(empty)';
  }
}

// Export singleton instance with backward-compatible name
export const TradingReadinessCache = PerpsSigningCacheManager.getInstance();

// Export with new name for clarity
export const PerpsSigningCache = PerpsSigningCacheManager.getInstance();
