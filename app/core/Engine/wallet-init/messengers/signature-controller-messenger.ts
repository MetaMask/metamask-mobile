import { Messenger } from '@metamask/messenger';
import type { PreferencesControllerGetStateAction } from '@metamask/preferences-controller';
import type { RootMessenger } from '../../types';

type AllowedInitializationActions = PreferencesControllerGetStateAction;

export type SignatureControllerInitMessenger = ReturnType<
  typeof getSignatureControllerInitMessenger
>;

/**
 * Get the init messenger for the wallet-owned SignatureController. Scoped to
 * the actions needed by mobile's SignatureController instance options.
 *
 * @param rootMessenger - The root messenger.
 * @returns The SignatureControllerInitMessenger.
 */
export function getSignatureControllerInitMessenger(
  rootMessenger: RootMessenger,
) {
  const messenger = new Messenger<
    'SignatureControllerInit',
    AllowedInitializationActions,
    never,
    RootMessenger
  >({
    namespace: 'SignatureControllerInit',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['PreferencesController:getState'],
    events: [],
    messenger,
  });
  return messenger;
}
