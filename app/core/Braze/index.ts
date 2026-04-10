import Logger from '../../util/Logger';
import { isE2E } from '../../util/test/utils';
import Engine from '../Engine/Engine';
import { setBrazeProfileId } from '../Engine/controllers/analytics-controller/platform-adapter';

/**
 * Resolve the profile ID from the current session and forward it to the
 * Braze Segment plugin so all subsequent identify / track / flush calls
 * are attributed to this identity.
 *
 * Skipped during E2E so CI does not create Braze profiles from mocked
 * identity sessions.
 */
export async function setBrazeUser(): Promise<void> {
  if (isE2E) {
    return;
  }

  try {
    const { AuthenticationController } = Engine.context;
    const sessionProfile = await AuthenticationController.getSessionProfile();
    if (sessionProfile?.profileId) {
      setBrazeProfileId(sessionProfile.profileId);
      Logger.log('[Braze] Identified user with profileId');
    }
  } catch (error) {
    Logger.error(error as Error, '[Braze] Failed to set Braze user');
  }
}

/**
 * Clear the Braze profile identity so the plugin becomes a no-op.
 * Call on sign-out to stop attributing events to the previous user.
 */
export function clearBrazeUser(): void {
  setBrazeProfileId(undefined);
  Logger.log('[Braze] Cleared Braze user identity');
}
