/**
 * Push Provisioning Module
 *
 * Main entry point for the push provisioning feature.
 * Provides a flexible architecture for provisioning cards to mobile wallets.
 *
 * ## Architecture
 *
 * The module uses an adapter pattern to support:
 * - Card providers (Galileo)
 * - Wallet providers (Google Wallet, Apple Pay)
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
 * import { CardProviderRegistry, MockCardAdapter } from '@app/components/UI/Card/pushProvisioning';
 *
 * // Register mock adapter for local testing
 * CardProviderRegistry.getInstance().register('mock', new MockCardAdapter());
 *
 * // Use with the hook
 * const { initiateProvisioning } = usePushProvisioning({
 *   cardId: 'mock-card-123',
 *   cardProviderId: 'mock',
 * });
 * ```
 */

// Types
export * from './types';

// Constants
export * from './constants';

// Adapters
export {
  // Card provider adapters
  type ICardProviderAdapter,
  CardProviderRegistry,
  GalileoCardAdapter,
  MockCardAdapter,
  type MockCardConfig,
  // Wallet provider adapters
  type IWalletProviderAdapter,
  WalletProviderRegistry,
  GoogleWalletAdapter,
} from './adapters';

// Service
export {
  PushProvisioningService,
  getPushProvisioningService,
  resetPushProvisioningService,
  type ProvisioningOptions,
} from './service';

// Hooks
export { usePushProvisioning, useWalletAvailability } from './hooks';
