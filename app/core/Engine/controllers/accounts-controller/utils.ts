import {
  AccountsController,
  AccountsControllerState,
} from '@metamask/accounts-controller';
import { ControllerInitFunction } from '../../modular-controller.types';
import { getAccountsControllerMessenger } from '../../messengers/accounts-controller-messenger';
import { logAccountsControllerCreation } from './logger';

// Default AccountsControllerState
export const defaultAccountsControllerState: AccountsControllerState = {
  internalAccounts: {
    accounts: {},
    selectedAccount: '',
  },
};

/**
 * Initialize the AccountsController.
 *
 * @param request - The request object.
 * @returns The AccountsController.
 */
export const accountsControllerInit: ControllerInitFunction<
  AccountsController
> = (request) => {
  const { baseControllerMessenger, persistedState } = request;

  const accountControllerState =
    persistedState.AccountsController ?? defaultAccountsControllerState;

  const controllerMessenger = getAccountsControllerMessenger(
    baseControllerMessenger,
  );

  logAccountsControllerCreation(accountControllerState);

  const controller = new AccountsController({
    messenger: controllerMessenger,
    state: accountControllerState,
  });

  return { controller };
};
