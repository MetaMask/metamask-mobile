import { RampsServiceMessenger } from '@metamask/ramps-controller';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RootMessenger } from '../../types';

type AllowedActions = MessengerActions<RampsServiceMessenger>;

type AllowedEvents = MessengerEvents<RampsServiceMessenger>;

/**
 * Get the RampsServiceMessenger for the RampsService.
 *
 * @param rootMessenger - The root messenger.
 * @returns The RampsServiceMessenger.
 */
export function getRampsServiceMessenger(
  rootMessenger: RootMessenger,
): RampsServiceMessenger {
  return new Messenger<
    'RampsService',
    AllowedActions,
    AllowedEvents,
    typeof rootMessenger
  >({
    namespace: 'RampsService',
    parent: rootMessenger,
  });
}
