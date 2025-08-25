import {
  AccountsController,
  AccountsControllerMessenger,
} from '@metamask/accounts-controller';
import { ApprovalController } from '@metamask/approval-controller';
import {
  CurrencyRateController,
  DeFiPositionsController,
  MultichainAssetsController,
  MultichainAssetsRatesController,
  MultichainBalancesController,
} from '@metamask/assets-controllers';
import { GasFeeController } from '@metamask/gas-fee-controller';
import { MultichainNetworkController } from '@metamask/multichain-network-controller';
import { type Controller as NotificationServicesController } from '@metamask/notification-services-controller/notification-services';
import { type Controller as NotificationServicesPushController } from '@metamask/notification-services-controller/push-services';
import { NetworkController } from '@metamask/network-controller';
import {
  AbstractExecutionService,
  CronjobController,
  JsonSnapsRegistry,
  SnapController,
  SnapInterfaceController,
} from '@metamask/snaps-controllers';
import { MultichainTransactionsController } from '@metamask/multichain-transactions-controller';
import { TransactionController } from '@metamask/transaction-controller';
import { SignatureController } from '@metamask/signature-controller';
import { merge } from 'lodash';

import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import { accountsControllerInit } from '../controllers/accounts-controller';
import { ApprovalControllerInit } from '../controllers/approval-controller';
import { currencyRateControllerInit } from '../controllers/currency-rate-controller/currency-rate-controller-init';
import { GasFeeControllerInit } from '../controllers/gas-fee-controller';
import { multichainAssetsControllerInit } from '../controllers/multichain-assets-controller/multichain-assets-controller-init';
import { multichainAssetsRatesControllerInit } from '../controllers/multichain-assets-rates-controller/multichain-assets-rates-controller-init';
import { multichainBalancesControllerInit } from '../controllers/multichain-balances-controller/multichain-balances-controller-init';
import { multichainNetworkControllerInit } from '../controllers/multichain-network-controller/multichain-network-controller-init';
import { multichainTransactionsControllerInit } from '../controllers/multichain-transactions-controller/multichain-transactions-controller-init';
import { notificationServicesControllerInit } from '../controllers/notifications/notification-services-controller-init';
import { notificationServicesPushControllerInit } from '../controllers/notifications/notification-services-push-controller-init';
import { SignatureControllerInit } from '../controllers/signature-controller';
import { defiPositionsControllerInit } from '../controllers/defi-positions-controller/defi-positions-controller-init';
import {
  cronjobControllerInit,
  executionServiceInit,
  snapControllerInit,
  snapInterfaceControllerInit,
  snapsRegistryInit,
} from '../controllers/snaps';
import { TransactionControllerInit } from '../controllers/transaction-controller';
import { createMockControllerInitFunction } from './test-utils';
import { getControllerOrThrow, initModularizedControllers } from './utils';
import { AppMetadataController } from '@metamask/app-metadata-controller';
import { appMetadataControllerInit } from '../controllers/app-metadata-controller';
import { seedlessOnboardingControllerInit } from '../controllers/seedless-onboarding-controller';
import { AccountTreeController } from '@metamask/account-tree-controller';
import { accountTreeControllerInit } from '../../../multichain-accounts/controllers/account-tree-controller';
import { WebSocketServiceInit } from '../controllers/snaps/websocket-service-init';
import { perpsControllerInit } from '../controllers/perps-controller';
import { bridgeControllerInit } from '../controllers/bridge-controller/bridge-controller-init';
import { bridgeStatusControllerInit } from '../controllers/bridge-status-controller/bridge-status-controller-init';
import { BridgeController } from '@metamask/bridge-controller';
import { BridgeStatusController } from '@metamask/bridge-status-controller';
import { multichainAccountServiceInit } from '../controllers/multichain-account-service/multichain-account-service-init';
import { networkEnablementControllerInit } from '../controllers/network-enablement-controller/network-enablement-controller-init';
import { rewardsControllerInit } from '../controllers/rewards-controller';
import { RewardsController } from '../controllers/rewards-controller/RewardsController';

jest.mock('../controllers/accounts-controller');
jest.mock('../controllers/rewards-controller');
jest.mock('../controllers/app-metadata-controller');
jest.mock('../controllers/approval-controller');
jest.mock(
  '../controllers/currency-rate-controller/currency-rate-controller-init',
);
jest.mock('../controllers/gas-fee-controller');
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
jest.mock(
  '../controllers/multichain-transactions-controller/multichain-transactions-controller-init',
);
jest.mock('../controllers/notifications/notification-services-controller-init');
jest.mock(
  '../controllers/notifications/notification-services-push-controller-init',
);
jest.mock('../controllers/snaps');
jest.mock('../controllers/signature-controller');
jest.mock('../controllers/transaction-controller');
jest.mock(
  '../controllers/defi-positions-controller/defi-positions-controller-init',
);
jest.mock('../../../multichain-accounts/controllers/account-tree-controller');
jest.mock('../controllers/bridge-controller/bridge-controller-init');
jest.mock(
  '../controllers/bridge-status-controller/bridge-status-controller-init',
);

describe('initModularizedControllers', () => {
  const mockAccountsControllerInit = jest.mocked(accountsControllerInit);
  const mockApprovalControllerInit = jest.mocked(ApprovalControllerInit);
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
  const mockWebSocketServiceInit = jest.mocked(WebSocketServiceInit);
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
  const mockGasFeeControllerInit = jest.mocked(GasFeeControllerInit);
  const mockAppMetadataControllerInit = jest.mocked(appMetadataControllerInit);
  const mockSignatureControllerInit = jest.mocked(SignatureControllerInit);
  const mockDeFiPositionsControllerInit = jest.mocked(
    defiPositionsControllerInit,
  );
  const mockSeedlessOnboardingControllerInit = jest.mocked(
    seedlessOnboardingControllerInit,
  );
  const mockAccountTreeControllerInit = jest.mocked(accountTreeControllerInit);
  const mockPerpsControllerInit = jest.mocked(perpsControllerInit);
  const mockBridgeControllerInit = jest.mocked(bridgeControllerInit);
  const mockBridgeStatusControllerInit = jest.mocked(
    bridgeStatusControllerInit,
  );
  const mockMultichainAccountServiceInit = jest.mocked(
    multichainAccountServiceInit,
  );
  const mockNetworkEnablementControllerInit = jest.mocked(
    networkEnablementControllerInit,
  );
  const mockRewardsControllerInit = jest.mocked(rewardsControllerInit);

  function buildModularizedControllerRequest(
    overrides?: Record<string, unknown>,
  ) {
    return merge(
      {
        existingControllersByName: {},
        controllerInitFunctions: {
          AccountsController: mockAccountsControllerInit,
          AccountTreeController: mockAccountTreeControllerInit,
          ApprovalController: mockApprovalControllerInit,
          CurrencyRateController: mockCurrencyRateControllerInit,
          CronjobController: mockCronjobControllerInit,
          GasFeeController: mockGasFeeControllerInit,
          ExecutionService: mockExecutionServiceInit,
          WebSocketService: mockWebSocketServiceInit,
          MultichainNetworkController: mockMultichainNetworkControllerInit,
          MultichainAssetsController: mockMultichainAssetsControllerInit,
          MultichainTransactionsController:
            mockMultichainTransactionsControllerInit,
          MultichainAssetsRatesController:
            mockMultichainAssetsRatesControllerInit,
          MultichainBalancesController: mockMultichainBalancesControllerInit,
          MultichainAccountService: mockMultichainAccountServiceInit,
          NetworkEnablementController: mockNetworkEnablementControllerInit,
          NotificationServicesController:
            mockNotificationServicesControllerInit,
          NotificationServicesPushController:
            mockNotificationServicesPushControllerInit,
          SignatureController: mockSignatureControllerInit,
          SnapController: mockSnapControllerInit,
          SnapInterfaceController: mockSnapInterfaceControllerInit,
          SnapsRegistry: mockSnapsRegistryInit,
          TransactionController: mockTransactionControllerInit,
          AppMetadataController: mockAppMetadataControllerInit,
          DeFiPositionsController: mockDeFiPositionsControllerInit,
          SeedlessOnboardingController: mockSeedlessOnboardingControllerInit,
          PerpsController: mockPerpsControllerInit,
          BridgeController: mockBridgeControllerInit,
          BridgeStatusController: mockBridgeStatusControllerInit,
          RewardsController: mockRewardsControllerInit,
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
    mockApprovalControllerInit.mockReturnValue({
      controller: {} as unknown as ApprovalController,
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
    mockGasFeeControllerInit.mockReturnValue({
      controller: {} as unknown as GasFeeController,
    });
    mockAppMetadataControllerInit.mockReturnValue({
      controller: {} as unknown as AppMetadataController,
    });
    mockSignatureControllerInit.mockReturnValue({
      controller: {} as unknown as SignatureController,
    });
    mockDeFiPositionsControllerInit.mockReturnValue({
      controller: {} as unknown as DeFiPositionsController,
    });
    mockAccountTreeControllerInit.mockReturnValue({
      controller: {} as unknown as AccountTreeController,
    });
    mockBridgeControllerInit.mockReturnValue({
      controller: {} as BridgeController,
    });
    mockBridgeStatusControllerInit.mockReturnValue({
      controller: {} as BridgeStatusController,
    });
    mockRewardsControllerInit.mockReturnValue({
      controller: {} as unknown as RewardsController,
    });
  });

  it('initializes controllers', () => {
    const request = buildModularizedControllerRequest();
    const controllers = initModularizedControllers(request);

    expect(controllers.controllersByName.AccountsController).toBeDefined();
    expect(controllers.controllersByName.ApprovalController).toBeDefined();
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
    expect(controllers.controllersByName.GasFeeController).toBeDefined();
    expect(controllers.controllersByName.SignatureController).toBeDefined();
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
