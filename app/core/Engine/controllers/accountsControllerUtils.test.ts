import { AccountsControllerState } from '@metamask/accounts-controller';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import {
  createAccountsController,
  defaultAccountsControllerState,
} from './accountsControllerUtils';
import { ControllerMessenger } from '../';
import { withScope } from '@sentry/react-native';
import { AGREED, METRICS_OPT_IN } from '../../../constants/storage';
import StorageWrapper from '../../../store/storage-wrapper';

jest.mock('@sentry/react-native', () => ({
  withScope: jest.fn(),
}));
const mockedWithScope = jest.mocked(withScope);

describe('accountControllersUtils', () => {
  describe('createAccountsController', () => {
    beforeEach(() => {
      StorageWrapper.getItem = jest.fn((key: string) => {
        switch (key) {
          case METRICS_OPT_IN:
            return Promise.resolve(AGREED);
          default:
            return Promise.resolve('');
        }
      });
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

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
    it('should throw error when controller fails to initialize', async () => {
      const controllerMessenger =
        'controllerMessenger' as unknown as ControllerMessenger;
      const accountsController = await createAccountsController({
        messenger: controllerMessenger,
      });
      expect(mockedWithScope).toHaveBeenCalledTimes(1);
      expect(accountsController).toEqual({});
    });
  });
});
