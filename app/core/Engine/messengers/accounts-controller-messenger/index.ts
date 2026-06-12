import { AccountsControllerMessenger } from '@metamask/accounts-controller';
import { RootMessenger } from '../../types';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';

// Export the types
export * from './types';

/**
 * Get the AccountsControllerMessenger for the AccountsController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The AccountsControllerMessenger.
 */
export function getAccountsControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<AccountsControllerMessenger>,
    MessengerEvents<AccountsControllerMessenger>
  >,
): AccountsControllerMessenger {
  const messenger: AccountsControllerMessenger = new Messenger({
    namespace: 'AccountsController',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    actions: [
      'KeyringController:getState',
      'KeyringController:getKeyringsByType',
    ],
    events: [
      'KeyringController:stateChange',
      'SnapAccountService:accountAssetListUpdated',
      'SnapAccountService:accountBalancesUpdated',
      'SnapAccountService:accountTransactionsUpdated',
      'MultichainNetworkController:networkDidChange',
    ],
    messenger,
  });
  return messenger;
}
