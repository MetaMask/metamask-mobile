/**
 * Baanx accounts created before this instant are not eligible for push
 * provisioning.
 */
export const PROVISIONING_ELIGIBLE_AFTER = '2025-11-10T00:00:00.000Z';

/**
 * @param accountCreatedAt - ISO 8601 date string from the Baanx user record
 * @returns true when the account was created on or after the cutoff
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
