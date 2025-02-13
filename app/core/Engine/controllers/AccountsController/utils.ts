import {
  AccountsController,
  AccountsControllerMessenger,
  AccountsControllerState,
} from '@metamask/accounts-controller';
import Logger from '../../../../util/Logger';
import { logAccountsControllerCreation } from './logger';

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
  messenger: AccountsControllerMessenger;
  initialState?: AccountsControllerState;
}): AccountsController => {
  try {
    logAccountsControllerCreation(initialState);
    const accountsController = new AccountsController({
      messenger,
      state: initialState ?? defaultAccountsControllerState,
    });
    return accountsController;
  } catch (error) {
    // Report error while initializing AccountsController
    Logger.error(error as Error, 'Failed to initialize AccountsController');

    // TODO: Direct to vault recovery to reset controller states
    throw error;
  }
};
