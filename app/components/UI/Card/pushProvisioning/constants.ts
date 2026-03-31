/**
 * Push Provisioning Constants
 *
 * Constants for push provisioning feature configuration.
 */

import { Platform } from 'react-native';

/**
 * Get the wallet name for the current platform
 *
 * @returns 'Apple Wallet' for iOS, 'Google Wallet' for Android
 */
export function getWalletName(): string {
  return Platform.OS === 'ios' ? 'Apple Wallet' : 'Google Wallet';
}
