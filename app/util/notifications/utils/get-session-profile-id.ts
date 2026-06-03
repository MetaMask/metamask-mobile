import Engine from '../../../core/Engine';

/**
 * Resolves the current session's profile ID from the `AuthenticationController`
 * — the same identity source the Braze plugin uses (see `app/core/Braze`).
 *
 * Returns `undefined` when signed out or on any error, so analytics callers can
 * safely omit the field.
 *
 * @returns the session profile ID, or `undefined` when unavailable.
 */
export async function getSessionProfileId(): Promise<string | undefined> {
  try {
    const { AuthenticationController } = Engine.context;
    const sessionProfile = await AuthenticationController.getSessionProfile();
    return sessionProfile?.profileId || undefined;
  } catch {
    return undefined;
  }
}
