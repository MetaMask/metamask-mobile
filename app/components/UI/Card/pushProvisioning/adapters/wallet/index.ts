/**
 * Wallet Provider Adapters
 *
 * Exports for wallet provider adapter interfaces and implementations.
 */

export type { IWalletProviderAdapter } from './IWalletProviderAdapter';
export { GoogleWalletAdapter } from './GoogleWalletAdapter';
export { MockWalletAdapter, type MockWalletConfig } from './MockWalletAdapter';
