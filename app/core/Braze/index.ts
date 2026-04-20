import Braze from '@braze/react-native-sdk';
import Logger from '../../util/Logger';
import { isE2E } from '../../util/test/utils';
import Engine from '../Engine/Engine';

/**
 * Set the Braze external user ID to the MetaMask profile ID.
 * This creates/switches the Braze user so push tokens, events,
 * and attributes are associated with this identity.
 *
 * Callers are responsible for gating on sign-in state before invoking this.
 *
 * Skipped during E2E (IS_TEST / METAMASK_ENVIRONMENT=e2e) so CI does not create
 * Braze profiles from mocked identity sessions.
 */
export async function setBrazeUser(): Promise<void> {
  if (isE2E) {
    return;
  }

  try {
    const { AuthenticationController } = Engine.context;

    const sessionProfile = await AuthenticationController.getSessionProfile();
    if (sessionProfile?.profileId) {
      Braze.changeUser(sessionProfile.profileId);
      Logger.log('[Braze] Identified user with profileId');
    }
  } catch (error) {
    Logger.error(error as Error, '[Braze] Failed to set Braze user');
  }
}
