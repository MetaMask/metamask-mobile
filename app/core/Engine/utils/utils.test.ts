import {
  AccountsController,
  AccountsControllerMessenger,
} from '@metamask/accounts-controller';
import { ApprovalController } from '@metamask/approval-controller';
import { CodefiTokenPricesServiceV2 } from '@metamask/assets-controllers';
import { NetworkController } from '@metamask/network-controller';
import { merge } from 'lodash';

import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import { accountsControllerInit } from '../controllers/accounts-controller';
import { ApprovalControllerInit } from '../controllers/approval-controller';
import { createMockControllerInitFunction } from './test-utils';
import { getControllerOrThrow, initModularizedControllers } from './utils';
import { permissionControllerInit } from '../controllers/permission-controller-init';
import {
  CaveatSpecificationConstraint,
  PermissionController,
  PermissionSpecificationConstraint,
} from '@metamask/permission-controller';
import { InitModularizedControllersFunctionRequest } from '../types';
import { QrKeyringDeferredPromiseBridge } from '@metamask/eth-qr-keyring';
<<<<<<< HEAD
=======
import { networkControllerInit } from '../controllers/network-controller-init';
import { TransactionPayControllerInit } from '../controllers/transaction-pay-controller';
import { TransactionPayController } from '@metamask/transaction-pay-controller';
>>>>>>> c727dac668 (Fix types)

jest.mock('../controllers/accounts-controller');
jest.mock('../controllers/approval-controller');
jest.mock('../controllers/permission-controller-init');
jest.mock('../controllers/delegation/delegation-controller-init');

describe('initModularizedControllers', () => {
  const mockAccountsControllerInit = jest.mocked(accountsControllerInit);
  const mockApprovalControllerInit = jest.mocked(ApprovalControllerInit);
  const mockPermissionControllerInit = jest.mocked(permissionControllerInit);
<<<<<<< HEAD
=======
  const mockSelectedNetworkControllerInit = jest.mocked(
    selectedNetworkControllerInit,
  );
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
  const mockTransactionPayControllerInit = jest.mocked(
    TransactionPayControllerInit,
  );
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
  const mockPredictControllerInit = jest.mocked(predictControllerInit);
  const mockGatorPermissionsControllerInit = jest.mocked(
    GatorPermissionsControllerInit,
  );
  const mockSubjectMetadataControllerInit = jest.mocked(
    subjectMetadataControllerInit,
  );
  const mockPreferencesControllerInit = jest.mocked(preferencesControllerInit);
  const mockKeyringControllerInit = jest.mocked(keyringControllerInit);
  const mockSnapKeyringBuilderInit = jest.mocked(snapKeyringBuilderInit);
  const mockNetworkControllerInit = jest.mocked(networkControllerInit);
>>>>>>> c727dac668 (Fix types)

  function buildModularizedControllerRequest(
    overrides?: Record<string, unknown>,
  ): InitModularizedControllersFunctionRequest {
    const partialRequest = merge(
      {
        existingControllersByName: {},
        controllerInitFunctions: {
          AccountsController: mockAccountsControllerInit,
          ApprovalController: mockApprovalControllerInit,
<<<<<<< HEAD
          PermissionController: mockPermissionControllerInit,
=======
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
          TransactionPayController: mockTransactionPayControllerInit,
          AppMetadataController: mockAppMetadataControllerInit,
          DeFiPositionsController: mockDeFiPositionsControllerInit,
          SeedlessOnboardingController: mockSeedlessOnboardingControllerInit,
          PerpsController: mockPerpsControllerInit,
          BridgeController: mockBridgeControllerInit,
          BridgeStatusController: mockBridgeStatusControllerInit,
          RewardsController: mockRewardsControllerInit,
          PredictController: mockPredictControllerInit,
          GatorPermissionsController: mockGatorPermissionsControllerInit,
          SubjectMetadataController: mockSubjectMetadataControllerInit,
          PreferencesController: mockPreferencesControllerInit,
          KeyringController: mockKeyringControllerInit,
          SnapKeyringBuilder: mockSnapKeyringBuilderInit,
          NetworkController: mockNetworkControllerInit,
>>>>>>> c727dac668 (Fix types)
        },
        persistedState: {},
        baseControllerMessenger: new ExtendedControllerMessenger(),
        codefiTokenApiV2: jest.fn() as unknown as CodefiTokenPricesServiceV2,
        getGlobalChainId: jest.fn(),
        getState: jest.fn(),
        removeAccount: jest.fn(),
        qrKeyringScanner:
          jest.fn() as unknown as QrKeyringDeferredPromiseBridge,
        initialKeyringState: null,
      },
      overrides,
    );

    // @ts-expect-error: Intentionally only providing a subset of all
    // controllers, to avoid excessive boilerplate in tests.
    return partialRequest as InitModularizedControllersFunctionRequest;
  }

  beforeEach(() => {
    jest.clearAllMocks();

    mockAccountsControllerInit.mockReturnValue({
      controller: {} as unknown as AccountsController,
    });
    mockApprovalControllerInit.mockReturnValue({
      controller: {} as unknown as ApprovalController,
    });
    mockPermissionControllerInit.mockReturnValue({
      controller: {} as unknown as PermissionController<
        PermissionSpecificationConstraint,
        CaveatSpecificationConstraint
      >,
    });
<<<<<<< HEAD
=======
    mockSelectedNetworkControllerInit.mockReturnValue({
      controller: {} as unknown as SelectedNetworkController,
    });
    mockTransactionControllerInit.mockReturnValue({
      controller: {} as unknown as TransactionController,
    });
    mockTransactionPayControllerInit.mockReturnValue({
      controller: {} as unknown as TransactionPayController,
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
    mockPredictControllerInit.mockReturnValue({
      controller: {} as unknown as PredictController,
    });
    mockGatorPermissionsControllerInit.mockReturnValue({
      controller: {} as unknown as GatorPermissionsController,
    });
    mockSubjectMetadataControllerInit.mockReturnValue({
      controller: {} as unknown as SubjectMetadataController,
    });
    mockPreferencesControllerInit.mockReturnValue({
      controller: {} as unknown as PreferencesController,
    });
    mockKeyringControllerInit.mockReturnValue({
      controller: {} as unknown as KeyringController,
    });
    mockSnapKeyringBuilderInit.mockReturnValue({
      controller: {} as unknown as SnapKeyringBuilder,
    });
    mockNetworkControllerInit.mockReturnValue({
      controller: {} as unknown as NetworkController,
    });
>>>>>>> c727dac668 (Fix types)
  });

  it('initializes controllers', () => {
    const request = buildModularizedControllerRequest();
    const controllers = initModularizedControllers(request);

    expect(controllers.controllersByName.AccountsController).toBeDefined();
    expect(controllers.controllersByName.ApprovalController).toBeDefined();
    expect(controllers.controllersByName.PermissionController).toBeDefined();
  });

  it('initializes function including initMessenger', () => {
    const request = buildModularizedControllerRequest();
    initModularizedControllers(request);

    const permissionControllerInitMessenger =
      mockPermissionControllerInit.mock.calls[0][0].initMessenger;

    expect(permissionControllerInitMessenger).toBeDefined();
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
