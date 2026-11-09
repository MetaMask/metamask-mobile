/**
 * Push Provisioning Module
 *
 * Main entry point for the push provisioning feature.
 * Provides a flexible architecture for provisioning cards to mobile wallets.
 *
 * ## Architecture
 *
 * The module uses an adapter pattern to support:
 * - Card providers (Baanx and Immersve via CardController)
 * - Wallet providers (Google Wallet, Apple Wallet)
 *
 * The card adapter is created only when the active provider's
 * `pushProvisioning` capability includes the platform wallet.
 * The wallet adapter follows the platform: Android -> Google Wallet, iOS -> Apple Wallet.
 *
 * ## Usage
 *
 * ```tsx
 * import { usePushProvisioning } from '@app/components/UI/Card/pushProvisioning';
 *
 * const { initiateProvisioning, isProvisioning, canAddToWallet } = usePushProvisioning({
 *   cardId: 'card-123',
 *   walletProvisioning: cardHomeData.walletProvisioning,
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
  ControllerCardAdapter,
  // Wallet provider adapters
  type IWalletProviderAdapter,
  AppleWalletAdapter,
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
