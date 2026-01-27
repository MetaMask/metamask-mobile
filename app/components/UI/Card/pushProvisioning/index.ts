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
 * ## Development Mode - Mock Providers
 *
 * In development (`__DEV__`), you can use mock adapters to bypass real SDK dependencies:
 *
 * ### Mock Wallet Provider (for Google Wallet)
 *
 * When developing without Google's TapAndPay allowlist, enable the mock wallet:
 *
 * **Option 1: Environment variable**
 * ```bash
 * MOCK_WALLET_PROVIDER=true yarn start:android
 * ```
 *
 * **Option 2: Programmatic toggle**
 * ```tsx
 * import { setUseMockWalletProvider } from '@app/components/UI/Card/pushProvisioning';
 *
 * // Enable mock wallet provider
 * setUseMockWalletProvider(true);
 *
 * // Disable mock (use real provider)
 * setUseMockWalletProvider(false);
 *
 * // Reset to use environment variable
 * setUseMockWalletProvider(null);
 * ```
 *
 * ### Mock Card Provider
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
export {
  getCardProvider,
  getWalletProvider,
  setUseMockWalletProvider,
} from './providers';

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
  MockWalletAdapter,
  type MockWalletConfig,
} from './adapters';

// Service
export {
  PushProvisioningService,
  createPushProvisioningService,
  type ProvisioningOptions,
} from './service';

// Hooks
export { usePushProvisioning, useWalletAvailability } from './hooks';
