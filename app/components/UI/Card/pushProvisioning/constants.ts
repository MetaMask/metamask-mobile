/**
 * Push Provisioning Constants
 *
 * Constants for push provisioning feature configuration.
 */

import { Platform } from 'react-native';

/**
 * Minimum account creation date for push provisioning eligibility.
 * Accounts created before this date are not eligible.
 */
export const PROVISIONING_ELIGIBLE_AFTER = '2026-01-01T00:00:00.000Z';

/**
 * Get the wallet name for the current platform
 *
 * @returns 'Apple Wallet' for iOS, 'Google Wallet' for Android
 */
export function getWalletName(): string {
  return Platform.OS === 'ios' ? 'Apple Wallet' : 'Google Wallet';
}

/**
 * Check whether an account is eligible for push provisioning based on its
 * creation date. Accounts created before January 2026 are not eligible.
 *
 * @param accountCreatedAt - ISO 8601 date string from UserResponse.createdAt
 * @returns true if the account was created on or after the cutoff date
 */
export function isAccountEligibleForProvisioning(
  accountCreatedAt: string | null | undefined,
): boolean {
  if (!accountCreatedAt) {
    return false;
  }

  const createdDate = new Date(accountCreatedAt);
  if (isNaN(createdDate.getTime())) {
    return false;
  }

  return createdDate >= new Date(PROVISIONING_ELIGIBLE_AFTER);
}
