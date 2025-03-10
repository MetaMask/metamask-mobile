import { merge } from 'lodash';
import { TransactionController } from '@metamask/transaction-controller';
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
import { multichainAssetsRatesControllerInit } from '../controllers/multichain-assets-rates-controller/multichain-assets-rates-controller-init';
import {
  CurrencyRateController,
  MultichainAssetsController,
  MultichainAssetsRatesController,
  MultichainBalancesController,
} from '@metamask/assets-controllers';
import { multichainAssetsControllerInit } from '../controllers/multichain-assets-controller/multichain-assets-controller-init';
import { currencyRateControllerInit } from '../controllers/currency-rate-controller/currency-rate-controller-init';
import { multichainBalancesControllerInit } from '../controllers/multichain-balances-controller/multichain-balances-controller-init';
import { multichainNetworkControllerInit } from '../controllers/multichain-network-controller/multichain-network-controller-init';
import { MultichainNetworkController } from '@metamask/multichain-network-controller';

jest.mock('../controllers/accounts-controller');
jest.mock('../controllers/cronjob-controller/cronjob-controller-init');
jest.mock(
  '../controllers/currency-rate-controller/currency-rate-controller-init',
);
jest.mock(
  '../controllers/multichain-assets-controller/multichain-assets-controller-init',
);
jest.mock(
  '../controllers/multichain-assets-rates-controller/multichain-assets-rates-controller-init',
);
jest.mock(
  '../controllers/multichain-balances-controller/multichain-balances-controller-init',
);
jest.mock(
  '../controllers/multichain-network-controller/multichain-network-controller-init',
);
jest.mock('../controllers/transaction-controller');

describe('initModularizedControllers', () => {
  const mockAccountsControllerInit = jest.mocked(accountsControllerInit);
  const mockMultichainNetworkControllerInit = jest.mocked(
    multichainNetworkControllerInit,
  );
  const mockCurrencyRateControllerInit = jest.mocked(
    currencyRateControllerInit,
  );
  const mockCronjobControllerInit = jest.mocked(cronjobControllerInit);
  const mockMultichainAssetsControllerInit = jest.mocked(
    multichainAssetsControllerInit,
  );
  const mockMultichainAssetsRatesControllerInit = jest.mocked(
    multichainAssetsRatesControllerInit,
  );
  const mockMultichainBalancesControllerInit = jest.mocked(
    multichainBalancesControllerInit,
  );
  const mockTransactionControllerInit = jest.mocked(TransactionControllerInit);

  function buildModularizedControllerRequest(
    overrides?: Record<string, unknown>,
  ) {
    return merge(
      {
        existingControllersByName: {},
        controllerInitFunctions: {
          AccountsController: mockAccountsControllerInit,
          MultichainNetworkController: mockMultichainNetworkControllerInit,
          CurrencyRateController: mockCurrencyRateControllerInit,
          CronjobController: mockCronjobControllerInit,
          MultichainAssetsController: mockMultichainAssetsControllerInit,
          MultichainAssetsRatesController:
            mockMultichainAssetsRatesControllerInit,
          MultichainBalancesController: mockMultichainBalancesControllerInit,
          TransactionController: mockTransactionControllerInit,
        },
        persistedState: {},
        baseControllerMessenger: new ExtendedControllerMessenger(),
        getGlobalChainId: jest.fn(),
        getState: jest.fn(),
      },
      overrides,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();

    mockAccountsControllerInit.mockReturnValue({
      controller: {} as unknown as AccountsController,
    });
    mockTransactionControllerInit.mockReturnValue({
      controller: {} as unknown as TransactionController,
    });
    mockMultichainNetworkControllerInit.mockReturnValue({
      controller: {} as unknown as MultichainNetworkController,
    });
    mockCurrencyRateControllerInit.mockReturnValue({
      controller: {} as unknown as CurrencyRateController,
    });
    mockCronjobControllerInit.mockReturnValue({
      controller: {} as unknown as CronjobController,
    });
    mockMultichainAssetsControllerInit.mockReturnValue({
      controller: {} as unknown as MultichainAssetsController,
    });
    mockMultichainAssetsRatesControllerInit.mockReturnValue({
      controller: {} as unknown as MultichainAssetsRatesController,
    });
    mockMultichainBalancesControllerInit.mockReturnValue({
      controller: {} as unknown as MultichainBalancesController,
    });
  });

  it('initializes controllers', () => {
    const request = buildModularizedControllerRequest();
    const controllers = initModularizedControllers(request);

    expect(controllers.controllersByName.AccountsController).toBeDefined();
    expect(
      controllers.controllersByName.MultichainNetworkController,
    ).toBeDefined();
    expect(controllers.controllersByName.CurrencyRateController).toBeDefined();
    expect(controllers.controllersByName.CronjobController).toBeDefined();
    expect(
      controllers.controllersByName.MultichainAssetsController,
    ).toBeDefined();
    expect(
      controllers.controllersByName.MultichainAssetsRatesController,
    ).toBeDefined();
    expect(
      controllers.controllersByName.MultichainBalancesController,
    ).toBeDefined();
    expect(controllers.controllersByName.TransactionController).toBeDefined();
  });

  it('initializes function including initMessenger', () => {
    const request = buildModularizedControllerRequest();
    initModularizedControllers(request);

    const initMessengerOfTransactionController =
      mockTransactionControllerInit.mock.calls[0][0].initMessenger;

    expect(initMessengerOfTransactionController).toBeDefined();
  });

  it('throws when controller is not found', async () => {
    const request = buildModularizedControllerRequest({
      controllerInitFunctions: {
        AccountsController: createMockControllerInitFunction<
          AccountsController,
          AccountsControllerMessenger
        >('NetworkController'),
      },
    });
    expect(() => initModularizedControllers(request)).toThrow(
      'Controller requested before it was initialized: NetworkController',
    );
  });

  it('not throws when when existing controller is found', async () => {
    const request = buildModularizedControllerRequest({
      existingControllersByName: {
        NetworkController: jest.fn() as unknown as NetworkController,
      },
    });

    expect(() => initModularizedControllers(request)).not.toThrow();
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
