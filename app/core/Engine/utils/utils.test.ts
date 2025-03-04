import { AccountsController } from '@metamask/accounts-controller';
import { NetworkController } from '@metamask/network-controller';
import { TransactionController } from '@metamask/transaction-controller';

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

  it('should initialize controllers', () => {
    const controllers = initModularizedControllers({
      baseControllerMessenger: new ExtendedControllerMessenger(),
      controllerInitFunctions: {
        AccountsController: mockAccountsControllerInit,
        TransactionController: mockTransactionControllerInit,
      },
      existingControllersByName: {},
      getGlobalChainId: jest.fn(),
      getRootState: jest.fn(),
      persistedState: {},
    });

    expect(controllers.controllersByName.AccountsController).toBeDefined();
    expect(controllers.controllersByName.TransactionController).toBeDefined();
  });

  it('should not throw when when existing controller is found', async () => {
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
        getRootState: jest.fn(),
      }),
    ).not.toThrow();
  });
});

describe('getControllerOrThrow', () => {
  it('should throw when controller is not found', () => {
    expect(() =>
      getControllerOrThrow({
        controller: undefined,
        name: 'AccountsController',
      }),
    ).toThrow();
  });

  it('should not throw when controller is found', () => {
    expect(() =>
      getControllerOrThrow({
        controller: jest.fn() as unknown as AccountsController,
        name: 'AccountsController',
      }),
    ).not.toThrow();
  });
});
