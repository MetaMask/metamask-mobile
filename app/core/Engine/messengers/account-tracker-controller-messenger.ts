import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { AccountTrackerControllerMessenger } from '@metamask/assets-controllers';

/**
 * Get the AccountTrackerControllerMessenger for the AccountTrackerController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The AccountTrackerControllerMessenger.
 */
export function getAccountTrackerControllerMessenger(
  rootMessenger: Messenger<
    'Root',
    MessengerActions<AccountTrackerControllerMessenger>,
    MessengerEvents<AccountTrackerControllerMessenger>
  >,
): AccountTrackerControllerMessenger {
  const messenger: AccountTrackerControllerMessenger = new Messenger({
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
      'NetworkEnablementController:getState',
      'NetworkEnablementController:listPopularEvmNetworks',
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
