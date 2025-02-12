import {
  AccountsController,
  type AccountsControllerMessenger,
} from '@metamask/accounts-controller';
import type { ControllerInitRequest } from '../../types';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { accountsControllerInit } from '.';
import { defaultAccountsControllerState } from './constants';
import { logAccountsControllerCreation } from './utils';
import { ExtendedControllerMessenger } from '../../../ExtendedControllerMessenger';

jest.mock('./utils', () => ({
  logAccountsControllerCreation: jest.fn(),
}));

const mockedLogAccountsControllerCreation = jest.mocked(
  logAccountsControllerCreation,
);

jest.mock('@metamask/accounts-controller');

describe('accounts controller init', () => {
  const accountsControllerClassMock = jest.mocked(AccountsController);
  let initRequestMock: jest.Mocked<
    ControllerInitRequest<AccountsControllerMessenger>
  >;

  beforeEach(() => {
    jest.resetAllMocks();
    const baseControllerMessenger = new ExtendedControllerMessenger();
    // Create controller init request mock
    initRequestMock = buildControllerInitRequestMock(baseControllerMessenger);
  });

  describe('logs are registered during controller creation', () => {
    it('logs creation with default state when no initial state provided', () => {
      accountsControllerInit(initRequestMock);
      expect(mockedLogAccountsControllerCreation).toHaveBeenCalledWith(
        defaultAccountsControllerState,
      );
    });

    it('logs creation with provided initial state', () => {
      // Set initial state
      const initialAccountsControllerState = {
        internalAccounts: {
          accounts: {},
          selectedAccount: '0x2',
        },
      };
      // Update mock with initial state
      initRequestMock.persistedState = {
        ...initRequestMock.persistedState,
        AccountsController: initialAccountsControllerState,
      };
      accountsControllerInit(initRequestMock);
      expect(mockedLogAccountsControllerCreation).toHaveBeenCalledWith(
        initialAccountsControllerState,
      );
    });
  });

  it('returns controller instance', () => {
    expect(accountsControllerInit(initRequestMock).controller).toBeInstanceOf(
      AccountsController,
    );
  });

  it('controller state should be default state when no initial state is passed in', () => {
    accountsControllerInit(initRequestMock);
    const accountsControllerState =
      accountsControllerClassMock.mock.calls[0][0].state;
    expect(accountsControllerState).toEqual(defaultAccountsControllerState);
  });

  it('controller state should be initial state when initial state is passed in', () => {
    // Create initial state
    const initialAccountsControllerState = {
      internalAccounts: {
        accounts: {},
        selectedAccount: '0x2',
      },
    };
    // Update mock with initial state
    initRequestMock.persistedState = {
      ...initRequestMock.persistedState,
      AccountsController: initialAccountsControllerState,
    };
    accountsControllerInit(initRequestMock);
    const accountsControllerState =
      accountsControllerClassMock.mock.calls[0][0].state;
    expect(accountsControllerState).toEqual(initialAccountsControllerState);
  });
});
