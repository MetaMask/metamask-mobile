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
 * import {
 *   usePushProvisioning,
 *   useWalletAvailability,
 * } from '@app/components/UI/Card/pushProvisioning';
 *
 * const { isAvailable, eligibility } = useWalletAvailability({ lastFourDigits: '1234' });
 * const { initiateProvisioning, isProvisioning } = usePushProvisioning({ cardId: 'card-123' });
 * ```
 *
 * ## Testing with Mock Provider
 *
 * ```tsx
 * import { MockCardAdapter } from '@app/components/UI/Card/pushProvisioning';
 *
 * // Create mock adapter for local testing
 * const mockAdapter = new MockCardAdapter();
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
  MockCardAdapter,
  type MockCardConfig,
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
export { usePushProvisioning, useWalletAvailability } from './hooks';
