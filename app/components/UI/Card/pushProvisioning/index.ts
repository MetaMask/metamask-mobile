/**
 * Push Provisioning Module
 *
 * Main entry point for the push provisioning feature.
 * Provides a flexible architecture for provisioning cards to mobile wallets.
 *
 * ## Architecture
 *
 * The module uses an adapter pattern to support:
 * - Card providers (Galileo, Monavate)
 * - Wallet providers (Google Wallet, Apple Wallet)
 *
 * Providers are selected automatically based on:
 * - User location: 'us' -> Galileo, 'international' -> Monavate
 * - Platform OS: 'android' -> Google Wallet, 'ios' -> Apple Wallet
 *
 * ## Usage
 *
 * ```tsx
 * import { usePushProvisioning } from '@app/components/UI/Card/pushProvisioning';
 *
 * const { initiateProvisioning, isProvisioning, canAddToWallet } = usePushProvisioning({
 *   cardId: 'card-123',
 *   cardholderName: 'John Doe',
 * });
 * ```
 */

// Types
export * from './types';

// Constants
export * from './constants';

// Provider factory functions
export { getCardProvider, getWalletProvider } from './providers';

// Adapters
export {
  // Card provider adapters
  type ICardProviderAdapter,
  GalileoCardAdapter,
  // Wallet provider adapters
  type IWalletProviderAdapter,
  GoogleWalletAdapter,
} from './adapters';

// Service
export {
  PushProvisioningService,
  createPushProvisioningService,
  type ProvisioningOptions,
} from './service';

// Hooks
export { usePushProvisioning } from './hooks';
