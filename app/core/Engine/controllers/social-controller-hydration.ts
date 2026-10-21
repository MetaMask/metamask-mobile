import Engine from '../../Engine';
import Logger from '../../../util/Logger';

/**
 * Messengers (one per Engine instance) for which hydration has already run or
 * is waiting for the wallet to be unlocked. Guarantees at most one hydration
 * per app session, while still allowing a fresh Engine (new root messenger,
 * e.g. after Engine is destroyed and re-initialized) to hydrate again.
 */
const hydratedMessengers = new WeakSet<object>();

const logHydrationError = (err: unknown) => {
  Logger.error(err as Error, {
    tags: { feature: 'social', operation: 'hydrate_following' },
    extras: { message: 'hydrateSocialFollowing failed' },
  });
};

async function runHydration(): Promise<void> {
  try {
    await (Engine.controllerMessenger.call as CallableFunction)(
      'SocialController:updateFollowing',
    );
  } catch (err) {
    logHydrationError(err);
  }
}

/**
 * Fetches the current user's following list from the server and populates
 * SocialController.followingProfileIds in state. The caller is identified
 * server-side from the JWT attached by SocialService.
 *
 * Called once at Engine startup. The request needs a bearer token, which
 * AuthenticationController only issues while the wallet is unlocked, and at
 * cold start the wallet is normally still locked. If the wallet is already
 * unlocked, hydration runs immediately; otherwise it is deferred until the
 * first `KeyringController:unlock`, after which the listener is removed.
 *
 * Runs at most once per Engine instance (app session); later lock/unlock
 * cycles do not trigger it again. Failures are non-fatal: the controller's
 * persisted state from the previous session is used until the next successful
 * hydration.
 */
export async function hydrateSocialFollowing(): Promise<void> {
  const messenger = Engine.controllerMessenger;
  if (hydratedMessengers.has(messenger)) {
    return;
  }
  hydratedMessengers.add(messenger);

  let isUnlocked: boolean;
  try {
    ({ isUnlocked } = messenger.call('KeyringController:getState'));
  } catch (err) {
    logHydrationError(err);
    return;
  }

  if (isUnlocked) {
    await runHydration();
    return;
  }

  // No await between the getState() read above and subscribe() below, so an
  // unlock cannot be emitted in between and missed.
  const onUnlock = () => {
    messenger.unsubscribe('KeyringController:unlock', onUnlock);
    runHydration().catch(logHydrationError);
  };
  messenger.subscribe('KeyringController:unlock', onUnlock);
}
