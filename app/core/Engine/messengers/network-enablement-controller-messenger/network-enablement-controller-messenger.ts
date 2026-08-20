import type { NetworkEnablementControllerMessenger } from '@metamask/network-enablement-controller';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RootMessenger } from '../../types';

/**
 * Get the messenger for the NetworkEnablementController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The NetworkEnablementControllerMessenger.
 */
export function getNetworkEnablementControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<NetworkEnablementControllerMessenger>,
    MessengerEvents<NetworkEnablementControllerMessenger>
  >,
): NetworkEnablementControllerMessenger {
  const messenger: NetworkEnablementControllerMessenger = new Messenger({
    namespace: 'NetworkEnablementController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
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
