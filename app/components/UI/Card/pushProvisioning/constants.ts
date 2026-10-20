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

/**
 * Apple Pay in-app provisioning is certified for cards issued in New Zealand.
 * This is a fixed list until more countries are certified.
 */
export const APPLE_PAY_PROVISIONING_COUNTRY = 'NZ';

export function isApplePayProvisioningCountry(
  countryCode: string | null | undefined,
): boolean {
  return countryCode?.toUpperCase() === APPLE_PAY_PROVISIONING_COUNTRY;
}
