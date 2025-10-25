import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RootExtendedMessenger, RootMessenger } from '../../types';
import { MultichainNetworkControllerMessenger } from '@metamask/multichain-network-controller';

/**
 * Get the MultichainNetworkControllerMessenger for the MultichainNetworkController.
 *
 * @param rootExtendedMessenger - The root extended messenger.
 * @returns The MultichainNetworkControllerMessenger.
 */
export function getMultichainNetworkControllerMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
): MultichainNetworkControllerMessenger {
  const messenger = new Messenger<
    'MultichainNetworkController',
    MessengerActions<MultichainNetworkControllerMessenger>,
    MessengerEvents<MultichainNetworkControllerMessenger>,
    RootMessenger
  >({
    namespace: 'MultichainNetworkController',
    parent: rootExtendedMessenger,
  });
  rootExtendedMessenger.delegate({
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
