import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RootExtendedMessenger, RootMessenger } from '../../types';
import { MultichainTransactionsControllerMessenger } from './types';

/**
 * Get the MultichainTransactionsControllerMessenger for the MultichainTransactionsController.
 *
 * @param rootExtendedMessenger - The root extended messenger.
 * @returns The MultichainTransactionsControllerMessenger.
 */
export function getMultichainTransactionsControllerMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
): MultichainTransactionsControllerMessenger {
  const messenger = new Messenger<
    'MultichainTransactionsController',
    MessengerActions<MultichainTransactionsControllerMessenger>,
    MessengerEvents<MultichainTransactionsControllerMessenger>,
    RootMessenger
  >({
    namespace: 'MultichainTransactionsController',
    parent: rootExtendedMessenger,
  });
  rootExtendedMessenger.delegate({
    actions: [
      'AccountsController:listMultichainAccounts',
      'SnapController:handleRequest',
      'KeyringController:getState',
    ],
    events: [
      'AccountsController:accountAdded',
      'AccountsController:accountRemoved',
      'AccountsController:accountTransactionsUpdated',
    ],
    messenger,
  });
  return messenger;
}
