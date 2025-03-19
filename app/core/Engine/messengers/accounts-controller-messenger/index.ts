import { AccountsControllerMessenger } from '@metamask/accounts-controller';
import { SnapControllerStateChangeEvent } from '../../controllers/snaps';
import { BaseControllerMessenger } from '../../types';
import {
  SnapKeyringAccountAssetListUpdatedEvent,
  SnapKeyringAccountBalancesUpdatedEvent,
  SnapKeyringAccountTransactionsUpdatedEvent,
} from '../../../SnapKeyring/constants';

// Export the types
export * from './types';

/**
 * Get the AccountsControllerMessenger for the AccountsController.
 *
 * @param baseControllerMessenger - The base controller messenger.
 * @returns The AccountsControllerMessenger.
 */
export function getAccountsControllerMessenger(
  baseControllerMessenger: BaseControllerMessenger,
): AccountsControllerMessenger {
  return baseControllerMessenger.getRestricted({
    name: 'AccountsController',
    allowedEvents: [
      'KeyringController:accountRemoved',
      'KeyringController:stateChange',
      SnapControllerStateChangeEvent,
      SnapKeyringAccountAssetListUpdatedEvent,
      SnapKeyringAccountBalancesUpdatedEvent,
      SnapKeyringAccountTransactionsUpdatedEvent,
      'MultichainNetworkController:networkDidChange',
    ],
    allowedActions: [
      'KeyringController:getAccounts',
      'KeyringController:getKeyringsByType',
      'KeyringController:getKeyringForAccount',
    ],
  });
}
