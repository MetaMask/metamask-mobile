import {
  AccountsController,
  AccountsControllerState,
} from '@metamask/accounts-controller';
import { logAccountsControllerCreation } from './logger';

// Default AccountsControllerState
export const defaultAccountsControllerState: AccountsControllerState = {
  internalAccounts: {
    accounts: {},
    selectedAccount: '',
  },
};

import { ControllerInitFunction } from '../../modular-controller.types';
import { getAccountsControllerMessenger } from '../../messengers/accounts-controller-messenger';

export const AccountsControllerInit: ControllerInitFunction<
  AccountsController
> = (request) => {
  const {
    baseControllerMessenger,
    persistedState,
    // getController,
  } = request;

  const controllerMessenger = getAccountsControllerMessenger(
    baseControllerMessenger,
  );

  logAccountsControllerCreation(persistedState.AccountsController);

  const controller = new AccountsController({
    messenger: controllerMessenger,
    state: persistedState.AccountsController ?? defaultAccountsControllerState,
  });

  return { controller };
};
