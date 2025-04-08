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
import {
  cronjobControllerInit,
  executionServiceInit,
  snapControllerInit,
  snapInterfaceControllerInit,
  snapsRegistryInit,
} from '../controllers/snaps';
import {
  AbstractExecutionService,
  CronjobController,
  JsonSnapsRegistry,
  SnapController,
  SnapInterfaceController,
} from '@metamask/snaps-controllers';
import { multichainAssetsRatesControllerInit } from '../controllers/multichain-assets-rates-controller/multichain-assets-rates-controller-init';
import {
  CurrencyRateController,
  MultichainAssetsController,
  MultichainAssetsRatesController,
  MultichainBalancesController,
} from '@metamask/assets-controllers';
import { MultichainTransactionsController } from '@metamask/multichain-transactions-controller';
import { multichainAssetsControllerInit } from '../controllers/multichain-assets-controller/multichain-assets-controller-init';
import { currencyRateControllerInit } from '../controllers/currency-rate-controller/currency-rate-controller-init';
import { multichainBalancesControllerInit } from '../controllers/multichain-balances-controller/multichain-balances-controller-init';
import { multichainNetworkControllerInit } from '../controllers/multichain-network-controller/multichain-network-controller-init';
import { multichainTransactionsControllerInit } from '../controllers/multichain-transactions-controller/multichain-transactions-controller-init';
import { MultichainNetworkController } from '@metamask/multichain-network-controller';
import { notificationServicesControllerInit } from '../controllers/notifications/notification-services-controller-init';
import { notificationServicesPushControllerInit } from '../controllers/notifications/notification-services-push-controller-init';
import { type Controller as NotificationServicesController } from '@metamask/notification-services-controller/notification-services';
import { type Controller as NotificationServicesPushController } from '@metamask/notification-services-controller/push-services';

jest.mock('../controllers/accounts-controller');
jest.mock('../controllers/snaps');
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
jest.mock(
  '../controllers/multichain-transactions-controller/multichain-transactions-controller-init',
);
jest.mock('../controllers/notifications/notification-services-controller-init');
jest.mock(
  '../controllers/notifications/notification-services-push-controller-init',
);

describe('initModularizedControllers', () => {
  const mockAccountsControllerInit = jest.mocked(accountsControllerInit);
  const mockMultichainNetworkControllerInit = jest.mocked(
    multichainNetworkControllerInit,
  );
  const mockCurrencyRateControllerInit = jest.mocked(
    currencyRateControllerInit,
  );
  const mockCronjobControllerInit = jest.mocked(cronjobControllerInit);
  const mockExecutionServiceInit = jest.mocked(executionServiceInit);
  const mockSnapControllerInit = jest.mocked(snapControllerInit);
  const mockSnapInterfaceControllerInit = jest.mocked(
    snapInterfaceControllerInit,
  );
  const mockSnapsRegistryInit = jest.mocked(snapsRegistryInit);
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
  const mockMultichainTransactionsControllerInit = jest.mocked(
    multichainTransactionsControllerInit,
  );
  const mockNotificationServicesControllerInit = jest.mocked(
    notificationServicesControllerInit,
  );
  const mockNotificationServicesPushControllerInit = jest.mocked(
    notificationServicesPushControllerInit,
  );

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
          ExecutionService: mockExecutionServiceInit,
          SnapController: mockSnapControllerInit,
          SnapInterfaceController: mockSnapInterfaceControllerInit,
          SnapsRegistry: mockSnapsRegistryInit,
          MultichainAssetsController: mockMultichainAssetsControllerInit,
          MultichainTransactionsController:
            mockMultichainTransactionsControllerInit,
          MultichainAssetsRatesController:
            mockMultichainAssetsRatesControllerInit,
          MultichainBalancesController: mockMultichainBalancesControllerInit,
          TransactionController: mockTransactionControllerInit,
          NotificationServicesController:
            mockNotificationServicesControllerInit,
          NotificationServicesPushController:
            mockNotificationServicesPushControllerInit,
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
    mockExecutionServiceInit.mockReturnValue({
      controller: {} as unknown as AbstractExecutionService<unknown>,
    });
    mockSnapControllerInit.mockReturnValue({
      controller: {} as unknown as SnapController,
    });
    mockSnapInterfaceControllerInit.mockReturnValue({
      controller: {} as unknown as SnapInterfaceController,
    });
    mockSnapsRegistryInit.mockReturnValue({
      controller: {} as unknown as JsonSnapsRegistry,
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
    mockMultichainTransactionsControllerInit.mockReturnValue({
      controller: {} as unknown as MultichainTransactionsController,
    });
    mockNotificationServicesControllerInit.mockReturnValue({
      controller: {} as unknown as NotificationServicesController,
    });
    mockNotificationServicesPushControllerInit.mockReturnValue({
      controller: {} as unknown as NotificationServicesPushController,
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
    expect(
      controllers.controllersByName.MultichainTransactionsController,
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
