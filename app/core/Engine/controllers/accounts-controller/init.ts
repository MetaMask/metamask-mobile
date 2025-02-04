import {
  AccountsController,
  AccountsControllerState,
} from '@metamask/accounts-controller';
import { ControllerInitFunction } from '../../modular-controller.types';
import { getAccountsControllerMessenger } from '../../messengers/accounts-controller-messenger';
import { logAccountsControllerCreation } from './utils';
import { defaultAccountsControllerState } from './constants';
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

  const accountControllerState = (persistedState.AccountsController ??
    defaultAccountsControllerState) as AccountsControllerState;

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
