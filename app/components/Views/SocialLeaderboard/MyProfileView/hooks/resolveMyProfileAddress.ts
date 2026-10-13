/**
 * Identifier for owner `GET /traders/:addressOrId` (profile + commented feed).
 *
 * Prefer the auth session `profileId` (OIDC `sub`, same as
 * `AuthenticationController.getSessionProfile`). Send it unprefixed — social-api
 * maps it to Clicker's `ext:{profileId}`. Fall back to the linked onboarding
 * wallet, then the selected account, when no session exists yet.
 */
export const resolveMyProfileAddress = (
  sessionProfileId: string | null | undefined,
  linkedAccountAddress: string | null | undefined,
  selectedAddress: string | null | undefined,
): string | undefined => {
  const sessionId = sessionProfileId?.trim();
  if (sessionId) {
    return sessionId;
  }
  const linked = linkedAccountAddress?.trim();
  if (linked) {
    return linked;
  }
  const selected = selectedAddress?.trim();
  return selected || undefined;
};
