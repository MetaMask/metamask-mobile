import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { SwapsControllerMessenger } from '@metamask/swaps-controller';
import { RootMessenger } from '../types';

/**
 * Get the messenger for the swaps controller. This is scoped to the
 * swaps controller is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The SwapsControllerMessenger.
 */
export function getSwapsControllerMessenger(
  rootMessenger: RootMessenger,
): SwapsControllerMessenger {
  const messenger = new Messenger<
    'SwapsController',
    MessengerActions<SwapsControllerMessenger>,
    MessengerEvents<SwapsControllerMessenger>,
    RootMessenger
  >({
    namespace: 'SwapsController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['NetworkController:getNetworkClientById'],
    events: ['NetworkController:networkDidChange'],
    messenger,
  });
  return messenger;
}
