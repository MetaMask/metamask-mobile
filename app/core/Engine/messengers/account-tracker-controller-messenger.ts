import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { AccountTrackerControllerMessenger } from '@metamask/assets-controllers';
import { RootMessenger } from '../types';

/**
 * Get the AccountTrackerControllerMessenger for the AccountTrackerController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The AccountTrackerControllerMessenger.
 */
export function getAccountTrackerControllerMessenger(
  rootMessenger: RootMessenger,
): AccountTrackerControllerMessenger {
  const messenger = new Messenger<
    'AccountTrackerController',
    MessengerActions<AccountTrackerControllerMessenger>,
    MessengerEvents<AccountTrackerControllerMessenger>,
    RootMessenger
  >({
    namespace: 'AccountTrackerController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'AccountsController:getSelectedAccount',
      'AccountsController:listAccounts',
      'PreferencesController:getState',
      'NetworkController:getState',
      'NetworkController:getNetworkClientById',
      'KeyringController:getState',
    ],
    events: [
      'AccountsController:selectedEvmAccountChange',
      'TransactionController:transactionConfirmed',
      'TransactionController:unapprovedTransactionAdded',
      'NetworkController:networkAdded',
      'KeyringController:unlock',
      'KeyringController:lock',
    ],
    messenger,
  });
  return messenger;
}
