import { accountsControllerInit } from '../controllers/accounts-controller';
import { getControllerOrThrow, initModularizedControllers } from './utils';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import { NetworkController } from '@metamask/network-controller';
import { createMockControllerInitFunction } from './test-utils';
import {
  AccountsController,
  AccountsControllerMessenger,
} from '@metamask/accounts-controller';
import { cronjobControllerInit } from '../controllers/CronJobController';
import { CronjobController } from '@metamask/snaps-controllers';
import { BaseRestrictedControllerMessenger } from '../types';
import { multichainAssetsRatesControllerInit } from '../controllers/MultichainAssetsRatesController';
import {
  CurrencyRateController,
  MultichainAssetsController,
  MultichainAssetsControllerMessenger,
  MultiChainAssetsRatesController as MultichainAssetsRatesController, // TODO: Remove this once the assets-controllers package is updated > 51.0.0
  MultichainAssetsRatesControllerMessenger,
  MultichainBalancesController,
  MultichainBalancesControllerMessenger,
} from '@metamask/assets-controllers';
import { multichainAssetsControllerInit } from '../controllers/MultichainAssetsController';
import { currencyRateControllerInit } from '../controllers/CurrencyRateController';
import { multichainBalancesControllerInit } from '../controllers/MultichainBalancesController';
import { multichainNetworkControllerInit } from '../controllers/MultichainNetworkController';
import {
  MultichainNetworkController,
  MultichainNetworkControllerMessenger,
} from '@metamask/multichain-network-controller';

describe('initModularizedControllers', () => {
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
      },
      persistedState: {},
      baseControllerMessenger: new ExtendedControllerMessenger(),
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
        },
        persistedState: {},
        baseControllerMessenger: new ExtendedControllerMessenger(),
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
        },
        persistedState: {},
        baseControllerMessenger: new ExtendedControllerMessenger(),
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
