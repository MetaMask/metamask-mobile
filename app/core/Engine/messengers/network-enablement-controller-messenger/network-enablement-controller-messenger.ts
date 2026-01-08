import type { NetworkEnablementControllerMessenger } from '@metamask/network-enablement-controller';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RootMessenger, RootExtendedMessenger } from '../../types';
/**
 * Get the messenger for the NetworkEnablementController.
 *
 * @param rootExtendedMessenger - The root extended messenger.
 * @returns The NetworkEnablementControllerMessenger.
 */
export function getNetworkEnablementControllerMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
): NetworkEnablementControllerMessenger {
  const messenger = new Messenger<
    'NetworkEnablementController',
    MessengerActions<NetworkEnablementControllerMessenger>,
    MessengerEvents<NetworkEnablementControllerMessenger>,
    RootMessenger
  >({
    namespace: 'NetworkEnablementController',
    parent: rootExtendedMessenger,
  });
  rootExtendedMessenger.delegate({
    actions: [
      'NetworkController:getState',
      'MultichainNetworkController:getState',
    ],
    events: [
      'NetworkController:networkAdded',
      'NetworkController:networkRemoved',
      'NetworkController:stateChange',
      'TransactionController:transactionSubmitted',
    ],
    messenger,
  });
  return messenger;
}
