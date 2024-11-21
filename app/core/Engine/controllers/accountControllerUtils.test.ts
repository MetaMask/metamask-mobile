import { AccountsControllerState } from '@metamask/accounts-controller';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import {
  createAccountsController,
  defaultAccountsControllerState,
} from './accountControllerUtils';

describe('accountControllerUtils', () => {
  describe('createAccountsController', () => {
    it('AccountsController state should be default state when no initial state is passed in', () => {
      const controllerMessenger = new ExtendedControllerMessenger();
      const accountsController = createAccountsController({
        messenger: controllerMessenger,
      });
      expect(accountsController.state).toEqual(defaultAccountsControllerState);
    });
    it('AccountsController state should be initial state when initial state is passed in', () => {
      const controllerMessenger = new ExtendedControllerMessenger();
      const initialAccountsControllerState: AccountsControllerState = {
        internalAccounts: {
          accounts: {},
          selectedAccount: '0x1',
        },
      };
      const accountsController = createAccountsController({
        messenger: controllerMessenger,
        initialState: initialAccountsControllerState,
      });
      expect(accountsController.state).toEqual(initialAccountsControllerState);
    });
    it('AccountsController name should be AccountsController', () => {
      const controllerMessenger = new ExtendedControllerMessenger();
      const accountsControllerName = 'AccountsController';
      const accountsController = createAccountsController({
        messenger: controllerMessenger,
      });
      expect(accountsController.name).toEqual(accountsControllerName);
    });
  });
});
