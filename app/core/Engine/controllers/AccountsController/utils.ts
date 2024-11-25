import {
  AccountsController,
  AccountsControllerMessenger,
  AccountsControllerState,
} from '@metamask/accounts-controller';
import { ControllerMessenger } from '../../types';
import Logger from '../../../../util/Logger';

// Default AccountsControllerState
export const defaultAccountsControllerState: AccountsControllerState = {
  internalAccounts: {
    accounts: {},
    selectedAccount: '',
  },
};

/**
 * Creates instance of AccountsController
 *
 * @param options.messenger - Controller messenger instance
 * @param options.initialState - Initial state of AccountsController
 * @returns - AccountsController instance
 */
export const createAccountsController = ({
  messenger,
  initialState,
}: {
  messenger: ControllerMessenger;
  initialState?: AccountsControllerState;
}): AccountsController => {
  let accountsController = {} as AccountsController;

  try {
    const accountsControllerMessenger: AccountsControllerMessenger =
      messenger.getRestricted({
        name: 'AccountsController',
        allowedEvents: [
          'SnapController:stateChange',
          'KeyringController:accountRemoved',
          'KeyringController:stateChange',
        ],
        allowedActions: [
          'KeyringController:getAccounts',
          'KeyringController:getKeyringsByType',
          'KeyringController:getKeyringForAccount',
        ],
      });

    accountsController = new AccountsController({
      messenger: accountsControllerMessenger,
      state: initialState ?? defaultAccountsControllerState,
    });
  } catch (error) {
    // Report error while initializing AccountsController
    // TODO: Direct to vault recovery to reset controller states
    Logger.error(error as Error, 'Failed to initialize AccountsController');
  }

  return accountsController;
};
