/**
 * Push provisioning constants.
 */

import { Platform } from 'react-native';
import type { WalletType } from './types';

/**
 * @returns 'Apple Wallet' for iOS, 'Google Wallet' for Android
 */
export function getWalletName(): string {
  return Platform.OS === 'ios' ? 'Apple Wallet' : 'Google Wallet';
}

export function getWalletTypeForPlatform(): WalletType {
  return Platform.OS === 'ios' ? 'apple_wallet' : 'google_wallet';
}
