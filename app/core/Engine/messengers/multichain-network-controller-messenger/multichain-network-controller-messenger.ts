import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RootMessenger } from '../../types';
import { MultichainNetworkControllerMessenger } from '@metamask/multichain-network-controller';

/**
 * Get the MultichainNetworkControllerMessenger for the MultichainNetworkController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The MultichainNetworkControllerMessenger.
 */
export function getMultichainNetworkControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<MultichainNetworkControllerMessenger>,
    MessengerEvents<MultichainNetworkControllerMessenger>
  >,
): MultichainNetworkControllerMessenger {
  const messenger: MultichainNetworkControllerMessenger = new Messenger({
    namespace: 'MultichainNetworkController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'NetworkController:setActiveNetwork',
      'NetworkController:getState',
      'AccountsController:listMultichainAccounts',
    ],
    events: ['AccountsController:selectedAccountChange'],
    messenger,
  });
  return messenger;
}
