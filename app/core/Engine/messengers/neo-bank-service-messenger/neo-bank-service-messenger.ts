import { NeoBankServiceMessenger } from '@metamask/ramps-controller';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RootMessenger } from '../../types';

type AllowedActions = MessengerActions<NeoBankServiceMessenger>;

type AllowedEvents = MessengerEvents<NeoBankServiceMessenger>;

/**
 * Get the NeoBankServiceMessenger for the NeoBankService.
 *
 * @param rootMessenger - The root messenger.
 * @returns The NeoBankServiceMessenger.
 */
export function getNeoBankServiceMessenger(
  rootMessenger: RootMessenger,
): NeoBankServiceMessenger {
  const messenger = new Messenger<
    'NeoBankService',
    AllowedActions,
    AllowedEvents,
    typeof rootMessenger
  >({
    namespace: 'NeoBankService',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['AuthenticationController:getBearerToken'],
    events: [],
    messenger,
  });
  return messenger;
}
