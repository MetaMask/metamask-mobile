import { AccountsController } from '@metamask/accounts-controller';
import { NetworkController } from '@metamask/network-controller';
import { TransactionController } from '@metamask/transaction-controller';

import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import { accountsControllerInit } from '../controllers/accounts-controller';
import { TransactionControllerInit } from '../controllers/transaction-controller';
import { getControllerOrThrow, initModularizedControllers } from './utils';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import { NetworkController } from '@metamask/network-controller';
import { createMockControllerInitFunction } from './test-utils';
import {
  AccountsController,
  AccountsControllerMessenger,
} from '@metamask/accounts-controller';
import { cronjobControllerInit } from '../controllers/cronjob-controller/cronjob-controller-init';
import { CronjobController } from '@metamask/snaps-controllers';
import { BaseRestrictedControllerMessenger } from '../types';
import { multichainAssetsRatesControllerInit } from '../controllers/multichain-assets-rates-controller/multichain-assets-rates-controller-init';
import {
  CurrencyRateController,
  MultichainAssetsController,
  MultichainAssetsControllerMessenger,
  MultichainAssetsRatesController,
  MultichainAssetsRatesControllerMessenger,
  MultichainBalancesController,
  MultichainBalancesControllerMessenger,
} from '@metamask/assets-controllers';
import { multichainAssetsControllerInit } from '../controllers/multichain-assets-controller/multichain-assets-controller-init';
import { currencyRateControllerInit } from '../controllers/currency-rate-controller/currency-rate-controller-init';
import { multichainBalancesControllerInit } from '../controllers/multichain-balances-controller/multichain-balances-controller-init';
import { multichainNetworkControllerInit } from '../controllers/multichain-network-controller/multichain-network-controller-init';
import {
  MultichainNetworkController,
  MultichainNetworkControllerMessenger,
} from '@metamask/multichain-network-controller';

jest.mock('../controllers/transaction-controller');

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
      existingControllersByName: {},
      controllerInitFunctions: {
        AccountsController: accountsControllerInit,
        MultichainNetworkController: multichainNetworkControllerInit,
        CurrencyRateController: currencyRateControllerInit,
        CronjobController: cronjobControllerInit,
        MultichainAssetsController: multichainAssetsControllerInit,
        MultichainAssetsRatesController: multichainAssetsRatesControllerInit,
        MultichainBalancesController: multichainBalancesControllerInit,
        TransactionController: mockTransactionControllerInit,
      },
      persistedState: {},
      baseControllerMessenger: new ExtendedControllerMessenger(),
      getGlobalChainId: jest.fn(),
      getRootState: jest.fn(),
    });

    expect(controllers.controllersByName.AccountsController).toBeDefined();
  });

  it('should throw when controller is not found', async () => {
    expect(() =>
      initModularizedControllers({
        existingControllersByName: {},
        controllerInitFunctions: {
          AccountsController: createMockControllerInitFunction<
            AccountsController,
            AccountsControllerMessenger
          >(),
          MultichainNetworkController: createMockControllerInitFunction<
            MultichainNetworkController,
            MultichainNetworkControllerMessenger
          >(),
          CurrencyRateController: createMockControllerInitFunction<
            CurrencyRateController,
            BaseRestrictedControllerMessenger
          >(),
          CronjobController: createMockControllerInitFunction<
            CronjobController,
            BaseRestrictedControllerMessenger
          >(),
          MultichainAssetsController: createMockControllerInitFunction<
            MultichainAssetsController,
            MultichainAssetsControllerMessenger
          >(),
          MultichainAssetsRatesController: createMockControllerInitFunction<
            MultichainAssetsRatesController,
            MultichainAssetsRatesControllerMessenger
          >(),
          MultichainBalancesController: createMockControllerInitFunction<
            MultichainBalancesController,
            MultichainBalancesControllerMessenger
          >(),
          TransactionController: TransactionControllerInit,
        },
        persistedState: {},
        baseControllerMessenger: new ExtendedControllerMessenger(),
        getCurrentChainId: jest.fn(),
        getRootState: jest.fn(),
      }),
    ).toThrow(
      'Controller requested before it was initialized: NetworkController',
    );
  });

  it('should not throw when when existing controller is found', async () => {
    expect(() =>
      initModularizedControllers({
        existingControllersByName: {
          NetworkController: jest.fn() as unknown as NetworkController,
        },
        controllerInitFunctions: {
          AccountsController: createMockControllerInitFunction<
            AccountsController,
            AccountsControllerMessenger
          >(),
          MultichainNetworkController: createMockControllerInitFunction<
            MultichainNetworkController,
            MultichainNetworkControllerMessenger
          >(),
          CurrencyRateController: createMockControllerInitFunction<
            CurrencyRateController,
            BaseRestrictedControllerMessenger
          >(),
          CronjobController: createMockControllerInitFunction<
            CronjobController,
            BaseRestrictedControllerMessenger
          >(),
          MultichainAssetsController: createMockControllerInitFunction<
            MultichainAssetsController,
            MultichainAssetsControllerMessenger
          >(),
          MultichainAssetsRatesController: createMockControllerInitFunction<
            MultichainAssetsRatesController,
            MultichainAssetsRatesControllerMessenger
          >(),
          MultichainBalancesController: createMockControllerInitFunction<
            MultichainBalancesController,
            MultichainBalancesControllerMessenger
          >(),
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
