import { AccountsControllerMessenger } from '@metamask/accounts-controller';
import { SnapControllerStateChangeEvent } from '../../controllers/snaps';
import { RootExtendedMessenger, RootMessenger } from '../../types';
import {
  SnapKeyringAccountAssetListUpdatedEvent,
  SnapKeyringAccountBalancesUpdatedEvent,
  SnapKeyringAccountTransactionsUpdatedEvent,
} from '../../../SnapKeyring/constants';
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
  rootExtendedMessenger: RootExtendedMessenger,
): AccountsControllerMessenger {
  const messenger = new Messenger<
    'AccountsController',
    MessengerActions<AccountsControllerMessenger>,
    MessengerEvents<AccountsControllerMessenger>,
    RootMessenger
  >({
    namespace: 'AccountsController',
    parent: rootExtendedMessenger,
  });

  rootExtendedMessenger.delegate({
    actions: [
      'KeyringController:getState',
      'KeyringController:getKeyringsByType',
    ],
    events: [
      'KeyringController:stateChange',
      SnapControllerStateChangeEvent,
      SnapKeyringAccountAssetListUpdatedEvent,
      SnapKeyringAccountBalancesUpdatedEvent,
      SnapKeyringAccountTransactionsUpdatedEvent,
      'MultichainNetworkController:networkDidChange',
    ],
    messenger,
  });
  return messenger;
}
