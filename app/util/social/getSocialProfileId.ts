import Engine from '../../core/Engine';

/**
 * Profile id that the profile API and social API know the signed-in user by.
 *
 * Both APIs identify the caller by the access token's `sub`, which is the
 * session's `canonicalProfileId`. The session `profileId` is the pre-merge
 * alias for this SRP and differs from `sub` for merged profiles, so the
 * profile API rejects it with 403.
 *
 * `undefined` when signed out or on error.
 */
export async function getSocialProfileId(): Promise<string | undefined> {
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
