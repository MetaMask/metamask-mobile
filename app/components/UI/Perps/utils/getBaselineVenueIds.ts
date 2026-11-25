import type {
  AccountState,
  PerpsProviderType,
} from '@metamask/perps-controller';

/**
 * Venues whose 1-day-ago balance belongs in the baseline for `account`'s live
 * total (TAT-4407).
 *
 * Aggregated mode: only `available` venues. A `pending` or `unavailable` venue
 * contributes nothing to the live total, so counting its history would compare
 * a one-venue total against a two-venue baseline.
 * Direct mode: the single venue the account belongs to.
 */
export const getBaselineVenueIds = (
  account: AccountState | null | undefined,
  fallbackProviderId: PerpsProviderType,
): string[] => {
  if (!account) {
    return [];
  }
  if (account.providerStates) {
    return Object.entries(account.providerStates)
      .filter(([, entry]) => entry.status === 'available')
      .map(([providerId]) => providerId);
  }
  return [account.providerId ?? fallbackProviderId];
};
