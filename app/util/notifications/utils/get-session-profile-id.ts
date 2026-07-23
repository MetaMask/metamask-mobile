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
