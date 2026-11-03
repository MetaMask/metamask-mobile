import Engine from '../../core/Engine';

interface SessionProfileIds {
  profileId?: string;
  canonicalProfileId?: string;
}

/**
 * Profile id that the profile API and social API know the signed-in user by.
 *
 * Both APIs identify the caller by the access token's `sub`, which is the
 * session's `canonicalProfileId`. The session `profileId` is the pre-merge
 * alias for this SRP and differs from `sub` for merged profiles, so the
 * profile API rejects it with 403.
 */
export const resolveSocialProfileId = (
  sessionProfile: SessionProfileIds | null | undefined,
): string | undefined =>
  sessionProfile?.canonicalProfileId || sessionProfile?.profileId || undefined;

/**
 * {@link resolveSocialProfileId} for the current session.
 *
 * `undefined` when signed out or on error.
 */
export async function getSocialProfileId(): Promise<string | undefined> {
  try {
    const { AuthenticationController } = Engine.context;
    const sessionProfile = await AuthenticationController.getSessionProfile();
    return resolveSocialProfileId(sessionProfile);
  } catch {
    return undefined;
  }
}
