import {
  AccountsController,
  type AccountsControllerMessenger,
  type AccountsControllerState,
} from '@metamask/accounts-controller';
import type { MessengerClientInitFunction } from '../../types';
import { logAccountsControllerCreation } from './utils';
import { defaultAccountsControllerState } from './constants';

// Export constants
export * from './constants';

/**
 * Initialize the AccountsController.
 *
 * @param request - The request object.
 * @returns The AccountsController.
 */
export const accountsControllerInit: MessengerClientInitFunction<
  AccountsController,
  AccountsControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  const accountControllerState = (persistedState.AccountsController ??
    defaultAccountsControllerState) as AccountsControllerState;

  logAccountsControllerCreation(accountControllerState);

  const messengerClient = new AccountsController({
    messenger: controllerMessenger,
    state: accountControllerState,
  });

  return { messengerClient };
};
