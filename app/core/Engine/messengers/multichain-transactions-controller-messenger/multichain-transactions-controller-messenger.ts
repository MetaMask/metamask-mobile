import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RootMessenger } from '../../types';
import { MultichainTransactionsControllerMessenger } from './types';

/**
 * Get the MultichainTransactionsControllerMessenger for the MultichainTransactionsController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The MultichainTransactionsControllerMessenger.
 */
export function getMultichainTransactionsControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<MultichainTransactionsControllerMessenger>,
    MessengerEvents<MultichainTransactionsControllerMessenger>
  >,
): MultichainTransactionsControllerMessenger {
  const messenger: MultichainTransactionsControllerMessenger = new Messenger({
    namespace: 'MultichainTransactionsController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
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
