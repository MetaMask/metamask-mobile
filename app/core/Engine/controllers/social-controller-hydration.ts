import Engine from '../../Engine';
import Logger from '../../../util/Logger';

/**
 * Fetches the current user's following list from the server and populates
 * SocialController.followingProfileIds in state. The caller is identified
 * server-side from the JWT attached by SocialService.
 *
 * Called once at Engine startup. Failures are non-fatal — the controller's
 * persisted state from the previous session is used until the next successful
 * hydration.
 */
export async function hydrateSocialFollowing(): Promise<void> {
  try {
    await (Engine.controllerMessenger.call as CallableFunction)(
      'SocialController:updateFollowing',
    );
  } catch (err) {
    Logger.error(err as Error, 'hydrateSocialFollowing failed');
  }
}
