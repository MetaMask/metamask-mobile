import {
  AccountsControllerMessenger,
  AccountsControllerState,
} from '@metamask/accounts-controller';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';
import {
  createAccountsController,
  defaultAccountsControllerState,
} from './utils';
import { withScope } from '@sentry/react-native';
import { AGREED, METRICS_OPT_IN } from '../../../../constants/storage';
import StorageWrapper from '../../../../store/storage-wrapper';
import { logAccountsControllerCreation } from './logger';
import { SnapControllerStateChangeEvent } from '../SnapController/constants';

jest.mock('@sentry/react-native', () => ({
  withScope: jest.fn(),
}));
jest.mock('./logger', () => ({
  logAccountsControllerCreation: jest.fn(),
}));

const mockedWithScope = jest.mocked(withScope);
const mockedLogAccountsControllerCreation = jest.mocked(
  logAccountsControllerCreation,
);

describe('accountControllersUtils', () => {
  describe('createAccountsController', () => {
    let accountsControllerMessenger: AccountsControllerMessenger;

    beforeEach(() => {
      const globalMessenger = new ExtendedControllerMessenger();
      accountsControllerMessenger = globalMessenger.getRestricted({
        name: 'AccountsController',
        allowedEvents: [
          SnapControllerStateChangeEvent,
          'KeyringController:accountRemoved',
          'KeyringController:stateChange',
        ],
        allowedActions: [
          'KeyringController:getAccounts',
          'KeyringController:getKeyringsByType',
          'KeyringController:getKeyringForAccount',
        ],
      });
      // Mock required for Logger
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

    it('logs creation with default state when no initial state provided', () => {
      createAccountsController({
        messenger: accountsControllerMessenger,
      });
      expect(mockedLogAccountsControllerCreation).toHaveBeenCalledWith(
        undefined,
      );
    });

    it('logs creation with provided initial state', () => {
      const initialState = {
        internalAccounts: {
          accounts: {},
          selectedAccount: '0x1',
        },
      };
      createAccountsController({
        messenger: accountsControllerMessenger,
        initialState,
      });
      expect(mockedLogAccountsControllerCreation).toHaveBeenCalledWith(
        initialState,
      );
    });

    it('AccountsController state should be default state when no initial state is passed in', () => {
      const accountsController = createAccountsController({
        messenger: accountsControllerMessenger,
      });
      expect(accountsController.state).toEqual(defaultAccountsControllerState);
    });

    it('AccountsController state should be initial state when initial state is passed in', () => {
      const initialAccountsControllerState: AccountsControllerState = {
        internalAccounts: {
          accounts: {},
          selectedAccount: '0x1',
        },
      };
      const accountsController = createAccountsController({
        messenger: accountsControllerMessenger,
        initialState: initialAccountsControllerState,
      });
      expect(accountsController.state).toEqual(initialAccountsControllerState);
    });

    it('AccountsController name should be AccountsController', () => {
      const accountsControllerName = 'AccountsController';
      const accountsController = createAccountsController({
        messenger: accountsControllerMessenger,
      });
      expect(accountsController.name).toEqual(accountsControllerName);
    });

    it('should detect and log an error when controller fails to initialize', async () => {
      const brokenAccountsControllerMessenger =
        'controllerMessenger' as unknown as AccountsControllerMessenger;
      await expect(() =>
        createAccountsController({
          messenger: brokenAccountsControllerMessenger,
        }),
      ).toThrow();

      expect(mockedWithScope).toHaveBeenCalledTimes(1);
    });
  });
});
