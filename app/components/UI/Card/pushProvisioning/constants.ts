/**
 * Push Provisioning Constants
 *
 * Constants for push provisioning feature configuration.
 */

import { CardProviderId, WalletType } from './types';

/**
 * Default card provider to use when not specified
 */
export const DEFAULT_CARD_PROVIDER: CardProviderId = 'galileo';

/**
 * Timeout for provisioning operations (in milliseconds)
 */
export const PROVISIONING_TIMEOUT_MS = 30000;

/**
 * Timeout for wallet availability check (in milliseconds)
 */
export const WALLET_CHECK_TIMEOUT_MS = 5000;

/**
 * Card network display names
 */
export const CARD_NETWORK_DISPLAY_NAMES: Record<string, string> = {
  MASTERCARD: 'Mastercard',
};

/**
 * Wallet type display names
 */
export const WALLET_TYPE_DISPLAY_NAMES: Record<WalletType, string> = {
  google_wallet: 'Google Wallet',
};

/**
 * Platform to wallet type mapping
 */
export const PLATFORM_WALLET_MAP: Record<'android', WalletType> = {
  android: 'google_wallet',
};

/**
 * Card provider display names
 */
export const CARD_PROVIDER_DISPLAY_NAMES: Record<CardProviderId, string> = {
  galileo: 'Galileo',
  mock: 'Mock (Testing)',
};

/**
 * Test IDs for push provisioning components
 */
export const PUSH_PROVISIONING_TEST_IDS = {
  ADD_TO_WALLET_BUTTON: 'add-to-wallet-button',
  ADD_TO_WALLET_BUTTON_LOADING: 'add-to-wallet-button-loading',
  PROVISIONING_ERROR_ALERT: 'provisioning-error-alert',
  PROVISIONING_SUCCESS_ALERT: 'provisioning-success-alert',
} as const;
