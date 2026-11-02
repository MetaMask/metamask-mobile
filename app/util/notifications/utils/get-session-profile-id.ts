import Engine from '../../../core/Engine';

/** Session profile ID from `AuthenticationController` (same source as Braze, see `app/core/Braze`); `undefined` when signed out or on error. */
export async function getSessionProfileId(): Promise<string | undefined> {
  try {
    const { AuthenticationController } = Engine.context;
    const sessionProfile = await AuthenticationController.getSessionProfile();
    return sessionProfile?.profileId || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Profile id the profile API accepts as the caller.
 *
 * `profileId` is the SRP leaf alias after pairing. Social and profile APIs
 * authenticate on the token `sub`, which is `canonicalProfileId`. Unpaired
 * wallets store the same value in both fields.
 *
 * `undefined` when signed out or on error.
 */
export async function getCanonicalSessionProfileId(): Promise<
  string | undefined
> {
  try {
    const { AuthenticationController } = Engine.context;
    const sessionProfile = await AuthenticationController.getSessionProfile();
    return (
      sessionProfile?.canonicalProfileId ||
      sessionProfile?.profileId ||
      undefined
    );
  } catch {
    return undefined;
  }
}
