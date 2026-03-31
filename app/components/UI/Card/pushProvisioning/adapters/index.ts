/**
 * Push Provisioning Adapters
 *
 * Re-exports all adapter interfaces and implementations.
 *
 * NOTE: This is the base module. Platform-specific adapters
 * (GoogleWalletAdapter, AppleWalletAdapter) are added in platform-specific branches.
 */

// Card provider adapters
export { type ICardProviderAdapter, GalileoCardAdapter } from './card';

// Wallet provider adapters
export {
  type IWalletProviderAdapter,
  type TokenInfo,
  // NOTE: Platform-specific adapters (GoogleWalletAdapter, AppleWalletAdapter)
  // are exported from platform-specific branches
} from './wallet';
