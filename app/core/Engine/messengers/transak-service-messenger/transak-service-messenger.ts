import { TransakServiceMessenger } from '@metamask/ramps-controller';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RootMessenger } from '../../types';

type AllowedActions = MessengerActions<TransakServiceMessenger>;

type AllowedEvents = MessengerEvents<TransakServiceMessenger>;

/**
 * Get the TransakServiceMessenger for the TransakService.
 *
 * @param rootMessenger - The root messenger.
 * @returns The TransakServiceMessenger.
 */
export function getTransakServiceMessenger(
  rootMessenger: RootMessenger,
): TransakServiceMessenger {
  return new Messenger<
    'TransakService',
    AllowedActions,
    AllowedEvents,
    typeof rootMessenger
  >({
    namespace: 'TransakService',
    parent: rootMessenger,
  });
}
