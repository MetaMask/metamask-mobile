/**
 * Wallet Provider Adapters
 *
 * Exports for wallet provider adapter interfaces and implementations.
 *
 * NOTE: This is the base module. Platform-specific adapters
 * (GoogleWalletAdapter, AppleWalletAdapter) are added in platform-specific branches.
 */

export type { IWalletProviderAdapter } from './IWalletProviderAdapter';
export type { TokenInfo } from './utils';

// NOTE: Platform-specific adapters are exported from platform-specific branches:
// - feat/google-in-app-provisioning: GoogleWalletAdapter
// - feat/apple-in-app-provisioning: AppleWalletAdapter
