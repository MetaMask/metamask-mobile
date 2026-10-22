import Engine from '../../Engine';
import Logger from '../../../util/Logger';

const logHydrationError = (err: unknown) => {
  Logger.error(err as Error, {
    tags: { feature: 'social', operation: 'hydrate_following' },
    extras: { message: 'hydrateSocialFollowing failed' },
  });
};

/**
 * Fetches the current user's following list from the server and populates
 * SocialController.followingProfileIds in state. The caller is identified
 * server-side from the JWT attached by SocialService.
 *
 * Called once at Engine startup. Hydration only runs when the wallet is
 * already unlocked and AuthenticationController is already signed in, so it
 * never triggers an initial sign-in. Otherwise it is skipped silently and the
 * controller's persisted state from the previous session is used. The wallet
 * is normally locked at cold start, so in practice this is usually skipped.
 *
 * Failures are non-fatal: they are logged and the persisted state is kept.
 */
export async function hydrateSocialFollowing(): Promise<void> {
  try {
    const messenger = Engine.controllerMessenger;
    const { isUnlocked } = messenger.call('KeyringController:getState');
    if (!isUnlocked) {
      return;
    }

    const isSignedIn = messenger.call('AuthenticationController:isSignedIn');
    if (!isSignedIn) {
      return;
    }

    await messenger.call('SocialController:updateFollowing');
  } catch (err) {
    logHydrationError(err);
  }
}
