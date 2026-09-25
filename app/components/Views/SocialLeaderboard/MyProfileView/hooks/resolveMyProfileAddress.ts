/**
 * Wallet used to read social-api trader endpoints for the owner profile.
 *
 * TODO: replace with the authenticated social `profileId` once GET /users/me
 * (or equivalent) exists. Until then the API is keyed by wallet address.
 */
export const resolveMyProfileAddress = (
  linkedAccountAddress: string | null | undefined,
  selectedAddress: string | null | undefined,
): string | undefined => {
  const linked = linkedAccountAddress?.trim();
  if (linked) {
    return linked;
  }
  const selected = selectedAddress?.trim();
  return selected || undefined;
};
