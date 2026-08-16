/**
 * Global singleton cache for Perps signing operations
 *
 * This cache persists across provider reconnections to prevent repeated
 * signing requests for hardware wallets. Critical for preventing repeated
 * hardware wallet signing prompts.
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
 * - Key: `network:userAddress` (e.g., "mainnet:0x123...")
 * - Value: { unifiedAccount, builderFee, referral, timestamp }
 *
 * Lifecycle:
 * - Cache persists throughout app session
 * - Individual entries can be cleared per user/network
 * - Full cache can be cleared on app restart or explicit user action
 */
type SigningOperationState = {
    attempted: boolean;
    success: boolean;
    reason?: 'no_hl_account' | 'user_rejected' | 'transient';
};
type WalletRegistrationState = {
    known: boolean;
    registered: boolean;
};
type PerpsSigningCacheEntry = {
    unifiedAccount: SigningOperationState;
    builderFee: SigningOperationState;
    referral: SigningOperationState;
    walletRegistered: WalletRegistrationState;
    timestamp: number;
};
type TradingReadinessCacheEntry = {
    attempted: boolean;
    enabled: boolean;
    reason?: 'no_hl_account' | 'user_rejected' | 'transient';
    timestamp: number;
};
declare class PerpsSigningCacheManager {
    #private;
    protected constructor();
    static getInstance(): PerpsSigningCacheManager;
    /**
     * Check if an operation is currently in-flight for this user/network
     *
     * @param operationType - The type of operation being performed.
     * @param network - The network environment.
     * @param userAddress - The user's wallet address.
     * @returns The resulting string value.
     */
    isInFlight(operationType: 'unifiedAccount' | 'builderFee' | 'referral', network: 'mainnet' | 'testnet', userAddress: string): Promise<void> | undefined;
    /**
     * Set an operation as in-flight
     * Returns a function to call when operation completes
     *
     * @param operationType - The type of operation being performed.
     * @param network - The network environment.
     * @param userAddress - The user's wallet address.
     * @returns The resulting string value.
     */
    setInFlight(operationType: 'unifiedAccount' | 'builderFee' | 'referral', network: 'mainnet' | 'testnet', userAddress: string): () => void;
    /**
     * Get unified account cache entry (legacy compatibility)
     *
     * @param network - The network environment.
     * @param userAddress - The user's wallet address.
     * @returns The resulting string value.
     */
    get(network: 'mainnet' | 'testnet', userAddress: string): TradingReadinessCacheEntry | undefined;
    /**
     * Set unified account cache entry (legacy compatibility)
     *
     * @param network - The network environment.
     * @param userAddress - The user's wallet address.
     * @param data - The transaction data payload.
     * @param data.attempted - Whether the operation was attempted.
     * @param data.enabled - Whether the feature is enabled.
     * @param data.reason - Optional discriminator explaining a non-success outcome.
     */
    set(network: 'mainnet' | 'testnet', userAddress: string, data: {
        attempted: boolean;
        enabled: boolean;
        reason?: 'no_hl_account' | 'user_rejected' | 'transient';
    }): void;
    /**
     * Check if builder fee approval was attempted
     *
     * @param network - The network environment.
     * @param userAddress - The user's wallet address.
     * @returns The resulting string value.
     */
    getBuilderFee(network: 'mainnet' | 'testnet', userAddress: string): SigningOperationState | undefined;
    /**
     * Set builder fee approval state
     *
     * @param network - The network environment.
     * @param userAddress - The user's wallet address.
     * @param state - The current state.
     */
    setBuilderFee(network: 'mainnet' | 'testnet', userAddress: string, state: SigningOperationState): void;
    /**
     * Check if referral setup was attempted
     *
     * @param network - The network environment.
     * @param userAddress - The user's wallet address.
     * @returns The resulting string value.
     */
    getReferral(network: 'mainnet' | 'testnet', userAddress: string): SigningOperationState | undefined;
    /**
     * Set referral setup state
     *
     * @param network - The network environment.
     * @param userAddress - The user's wallet address.
     * @param state - The current state.
     */
    setReferral(network: 'mainnet' | 'testnet', userAddress: string, state: SigningOperationState): void;
    /**
     * Clear only unified account state for a specific network and user address
     * This preserves builder fee and referral states
     *
     * @param network - The network environment.
     * @param userAddress - The user's wallet address.
     */
    clearUnifiedAccount(network: 'mainnet' | 'testnet', userAddress: string): void;
    /**
     * Read the wallet's Hyperliquid registration signal.
     *
     * @param network - The network environment.
     * @param userAddress - The user's wallet address.
     * @returns The current signal, or undefined if no entry exists.
     */
    getWalletRegistered(network: 'mainnet' | 'testnet', userAddress: string): WalletRegistrationState | undefined;
    /**
     * Record whether the wallet has been observed on Hyperliquid. Once
     * `registered=true` is set, it stays true for the session — the goal
     * is to skip doomed exchange writes for unfunded wallets, not to
     * gate them after they fund.
     *
     * @param network - The network environment.
     * @param userAddress - The user's wallet address.
     * @param registered - True once any evidence (clearinghouseState balance,
     * userFills, successful deposit, ...) confirms the wallet exists on HL.
     */
    setWalletRegistered(network: 'mainnet' | 'testnet', userAddress: string, registered: boolean): void;
    /**
     * Clear only builder fee state for a specific network and user address
     * This preserves unified account and referral states
     *
     * @param network - The network environment.
     * @param userAddress - The user's wallet address.
     */
    clearBuilderFee(network: 'mainnet' | 'testnet', userAddress: string): void;
    /**
     * Clear only referral state for a specific network and user address
     * This preserves unified account and builder fee states
     *
     * @param network - The network environment.
     * @param userAddress - The user's wallet address.
     */
    clearReferral(network: 'mainnet' | 'testnet', userAddress: string): void;
    /**
     * Clear entire cache entry for a specific network and user address
     * WARNING: This clears ALL signing operation states (unifiedAccount, builderFee, referral)
     *
     * @param network - The network environment.
     * @param userAddress - The user's wallet address.
     */
    clear(network: 'mainnet' | 'testnet', userAddress: string): void;
    /**
     * Clear all cache entries
     * WARNING: This clears ALL signing operation states for ALL users
     */
    clearAll(): void;
    /**
     * Get all cache entries (for debugging)
     *
     * @returns The result of the operation.
     */
    getAll(): Map<string, PerpsSigningCacheEntry>;
    /**
     * Get cache size (for debugging)
     *
     * @returns The resulting numeric value.
     */
    size(): number;
    /**
     * Get full cache state for debugging
     *
     * @returns The resulting string value.
     */
    debugState(): string;
}
export declare const TradingReadinessCache: PerpsSigningCacheManager;
export declare const PerpsSigningCache: PerpsSigningCacheManager;
export {};
//# sourceMappingURL=TradingReadinessCache.d.mts.map