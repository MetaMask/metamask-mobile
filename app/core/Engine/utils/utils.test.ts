import { AccountsController } from '@metamask/accounts-controller';
import { NetworkController } from '@metamask/network-controller';
import { TransactionController } from '@metamask/transaction-controller';
import { Messenger } from '@metamask/base-controller';

import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import { accountsControllerInit } from '../controllers/accounts-controller';
import { TransactionControllerInit } from '../controllers/transaction-controller';
import { getControllerOrThrow, initModularizedControllers } from './utils';
import { mockControllerInitFunction } from './test-utils';

jest.mock('../controllers/transaction-controller');
jest.mock('../controllers/accounts-controller');

describe('initModularizedControllers', () => {
  const mockAccountsControllerInit = jest.mocked(accountsControllerInit);
  const mockTransactionControllerInit = jest.mocked(TransactionControllerInit);

  beforeEach(() => {
    jest.clearAllMocks();
    mockAccountsControllerInit.mockReturnValue({
      controller: {} as unknown as AccountsController,
    });

    mockTransactionControllerInit.mockReturnValue({
      controller: {} as unknown as TransactionController,
    });
  });

  it('initializes controllers', () => {
    const controllers = initModularizedControllers({
      baseControllerMessenger: new ExtendedControllerMessenger(),
      controllerInitFunctions: {
        AccountsController: mockAccountsControllerInit,
        TransactionController: mockTransactionControllerInit,
      },
      existingControllersByName: {},
      getGlobalChainId: jest.fn(),
      getUIState: jest.fn(),
      persistedState: {},
    });

    expect(controllers.controllersByName.AccountsController).toBeDefined();
    expect(controllers.controllersByName.TransactionController).toBeDefined();
  });

  it('initializes function including initMessenger', () => {
    const baseControllerMessenger = new ExtendedControllerMessenger();
    initModularizedControllers({
      baseControllerMessenger,
      controllerInitFunctions: {
        AccountsController: mockAccountsControllerInit,
        TransactionController: mockTransactionControllerInit,
      },
      existingControllersByName: {},
      getGlobalChainId: jest.fn(),
      getUIState: jest.fn(),
      persistedState: {},
    });

    const initMessengerOfTransactionController =
      mockTransactionControllerInit.mock.calls[0][0].initMessenger;

    const initMessengerOfAccountsController =
      mockAccountsControllerInit.mock.calls[0][0].initMessenger;

    expect(initMessengerOfTransactionController).toBeDefined();
    expect(initMessengerOfAccountsController).not.toBeDefined();
  });

  it('throws when controller is not found', async () => {
    expect(() =>
      initModularizedControllers({
        existingControllersByName: {},
        controllerInitFunctions: {
          AccountsController: mockControllerInitFunction,
          TransactionController: TransactionControllerInit,
        },
        persistedState: {},
        baseControllerMessenger: new ExtendedControllerMessenger(),
        getGlobalChainId: jest.fn(),
        getUIState: jest.fn(),
      }),
    ).toThrow(
      'Controller requested before it was initialized: NetworkController',
    );
  });

  it('not throws when when existing controller is found', async () => {
    expect(() =>
      initModularizedControllers({
        existingControllersByName: {
          NetworkController: jest.fn() as unknown as NetworkController,
        },
        controllerInitFunctions: {
          AccountsController: mockControllerInitFunction,
          TransactionController: TransactionControllerInit,
        },
        persistedState: {},
        baseControllerMessenger: new ExtendedControllerMessenger(),
        getGlobalChainId: jest.fn(),
        getUIState: jest.fn(),
      }),
    ).not.toThrow();
  });
});

describe('getControllerOrThrow', () => {
  it('throws when controller is not found', () => {
    expect(() =>
      getControllerOrThrow({
        controller: undefined,
        name: 'AccountsController',
      }),
    ).toThrow();
  });

  it('not throws when controller is found', () => {
    expect(() =>
      getControllerOrThrow({
        controller: jest.fn() as unknown as AccountsController,
        name: 'AccountsController',
      }),
    ).not.toThrow();
  });
});
