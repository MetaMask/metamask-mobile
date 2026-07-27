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
  rootMessenger: RootMessenger<AllowedActions, AllowedEvents>,
): TransakServiceMessenger {
  const messenger: TransakServiceMessenger = new Messenger({
    namespace: 'TransakService',
    parent: rootMessenger,
  });
  return messenger;
}
