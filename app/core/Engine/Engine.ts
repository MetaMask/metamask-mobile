/* eslint-disable @typescript-eslint/no-shadow */
///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
import { samplePetnamesControllerInit } from '../../features/SampleFeature/controllers/sample-petnames-controller-init';
///: END:ONLY_INCLUDE_IF
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import {
  AppState,
  AppStateStatus,
  NativeEventSubscription,
} from 'react-native';
///: END:ONLY_INCLUDE_IF
import { CodefiTokenPricesServiceV2 } from '@metamask/assets-controllers';
import { AccountsController } from '@metamask/accounts-controller';
import { ComposableController } from '@metamask/composable-controller';
import {
  KeyringController,
  KeyringControllerState,
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  KeyringTypes,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/keyring-controller';
import { NetworkState, NetworkStatus } from '@metamask/network-controller';
import {
  TransactionController,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { GasFeeController } from '@metamask/gas-fee-controller';
import { AcceptOptions } from '@metamask/approval-controller';
import {
  type CaveatSpecificationConstraint,
  PermissionController,
  type PermissionSpecificationConstraint,
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  SubjectMetadataController,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/permission-controller';
import { QrKeyringDeferredPromiseBridge } from '@metamask/eth-qr-keyring';
import { isTestNet } from '../../util/networks';
import { deprecatedGetNetworkId } from '../../util/networks/engineNetworkUtils';
import AppConstants from '../AppConstants';
import { store } from '../../store';
import {
  renderFromTokenMinimalUnit,
  balanceToFiatNumber,
  weiToFiatNumber,
  toHexadecimal,
  hexToBN,
  renderFromWei,
} from '../../util/number';
import NotificationManager from '../NotificationManager';
import Logger from '../../util/Logger';
import { isZero } from '../../util/lodash';
import { isE2E } from '../../util/test/utils';

///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import { notificationServicesControllerInit } from './controllers/notifications/notification-services-controller-init';
import { notificationServicesPushControllerInit } from './controllers/notifications/notification-services-push-controller-init';
///: END:ONLY_INCLUDE_IF
import {
  backendWebSocketServiceInit,
  accountActivityServiceInit,
} from './controllers/core-backend';
import { AppStateWebSocketManager } from '../AppStateWebSocketManager';
import { backupVault } from '../BackupVault';
import {
  CaipAssetType,
  Hex,
  Json,
  KnownCaipNamespace,
  parseCaipAssetType,
} from '@metamask/utils';
import { providerErrors } from '@metamask/rpc-errors';

import {
  networkIdUpdated,
  networkIdWillUpdate,
} from '../../core/redux/slices/inpageProvider';
import type { SmartTransactionsController } from '@metamask/smart-transactions-controller';
import { zeroAddress } from 'ethereumjs-util';
import {
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  toHex,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/controller-utils';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { removeAccountsFromPermissions } from '../Permissions';
import { multichainBalancesControllerInit } from './controllers/multichain-balances-controller/multichain-balances-controller-init';
import { multichainAssetsControllerInit } from './controllers/multichain-assets-controller/multichain-assets-controller-init';
import { multichainAssetsRatesControllerInit } from './controllers/multichain-assets-rates-controller/multichain-assets-rates-controller-init';
import { multichainTransactionsControllerInit } from './controllers/multichain-transactions-controller/multichain-transactions-controller-init';
import { multichainAccountServiceInit } from './controllers/multichain-account-service/multichain-account-service-init';
import { snapKeyringBuilderInit } from './controllers/snap-keyring-builder-init';
import { SnapKeyring } from '@metamask/eth-snap-keyring';
///: END:ONLY_INCLUDE_IF
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import {
  cronjobControllerInit,
  executionServiceInit,
  snapControllerInit,
  snapInterfaceControllerInit,
  snapsRegistryInit,
} from './controllers/snaps';
import { RestrictedMethods } from '../Permissions/constants';
///: END:ONLY_INCLUDE_IF
import {
  RootExtendedMessenger,
  EngineState,
  EngineContext,
  StatefulControllers,
  getRootExtendedMessenger,
  RootMessenger,
} from './types';
import {
  BACKGROUND_STATE_CHANGE_EVENT_NAMES,
  STATELESS_NON_CONTROLLER_NAMES,
} from './constants';
import { getGlobalChainId } from '../../util/networks/global-network';
import { logEngineCreation } from './utils/logger';
import { initModularizedControllers } from './utils';
import { accountsControllerInit } from './controllers/accounts-controller';
import { accountTreeControllerInit } from '../../multichain-accounts/controllers/account-tree-controller';
import { ApprovalControllerInit } from './controllers/approval-controller';
import { bridgeControllerInit } from './controllers/bridge-controller/bridge-controller-init';
import { bridgeStatusControllerInit } from './controllers/bridge-status-controller/bridge-status-controller-init';
import { multichainNetworkControllerInit } from './controllers/multichain-network-controller/multichain-network-controller-init';
import { currencyRateControllerInit } from './controllers/currency-rate-controller/currency-rate-controller-init';
import { TransactionControllerInit } from './controllers/transaction-controller';
import { defiPositionsControllerInit } from './controllers/defi-positions-controller/defi-positions-controller-init';
import { SignatureControllerInit } from './controllers/signature-controller';
import { GasFeeControllerInit } from './controllers/gas-fee-controller';
import { appMetadataControllerInit } from './controllers/app-metadata-controller';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { toFormattedAddress } from '../../util/address';
import { WebSocketServiceInit } from './controllers/snaps/websocket-service-init';
import { networkEnablementControllerInit } from './controllers/network-enablement-controller/network-enablement-controller-init';
import { seedlessOnboardingControllerInit } from './controllers/seedless-onboarding-controller';
import { scanCompleted, scanRequested } from '../redux/slices/qrKeyringScanner';
import { perpsControllerInit } from './controllers/perps-controller';
import { predictControllerInit } from './controllers/predict-controller';
import { rewardsControllerInit } from './controllers/rewards-controller';
import { GatorPermissionsControllerInit } from './controllers/gator-permissions-controller';
import type { GatorPermissionsController } from '@metamask/gator-permissions-controller';
import { DelegationControllerInit } from './controllers/delegation/delegation-controller-init';
import { selectedNetworkControllerInit } from './controllers/selected-network-controller-init';
import { permissionControllerInit } from './controllers/permission-controller-init';
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import { subjectMetadataControllerInit } from './controllers/subject-metadata-controller-init';
///: END:ONLY_INCLUDE_IF
import { PreferencesController } from '@metamask/preferences-controller';
import { preferencesControllerInit } from './controllers/preferences-controller-init';
import { keyringControllerInit } from './controllers/keyring-controller-init';
import { networkControllerInit } from './controllers/network-controller-init';
import { TransactionPayControllerInit } from './controllers/transaction-pay-controller';
import { tokenSearchDiscoveryDataControllerInit } from './controllers/token-search-discovery-data-controller-init';
import { assetsContractControllerInit } from './controllers/assets-contract-controller-init';
import { tokensControllerInit } from './controllers/tokens-controller-init';
import { tokenListControllerInit } from './controllers/token-list-controller-init';
import { tokenSearchDiscoveryControllerInit } from './controllers/token-search-discovery-controller-init';
import { tokenDetectionControllerInit } from './controllers/token-detection-controller-init';
import { tokenBalancesControllerInit } from './controllers/token-balances-controller-init';
import { tokenRatesControllerInit } from './controllers/token-rates-controller-init';
import { accountTrackerControllerInit } from './controllers/account-tracker-controller-init';
import { nftControllerInit } from './controllers/nft-controller-init';
import { nftDetectionControllerInit } from './controllers/nft-detection-controller-init';
import { smartTransactionsControllerInit } from './controllers/smart-transactions-controller-init';
import { userStorageControllerInit } from './controllers/identity/user-storage-controller-init';
import { authenticationControllerInit } from './controllers/identity/authentication-controller-init';
import { earnControllerInit } from './controllers/earn-controller-init';
import { rewardsDataServiceInit } from './controllers/rewards-data-service-init';
import { swapsControllerInit } from './controllers/swaps-controller-init';
import { remoteFeatureFlagControllerInit } from './controllers/remote-feature-flag-controller-init';
import { errorReportingServiceInit } from './controllers/error-reporting-service-init';
import { storageServiceInit } from './controllers/storage-service-init';
import { loggingControllerInit } from './controllers/logging-controller-init';
import { phishingControllerInit } from './controllers/phishing-controller-init';
import { addressBookControllerInit } from './controllers/address-book-controller-init';
import { analyticsControllerInit } from './controllers/analytics-controller/analytics-controller-init';
import { connectivityControllerInit } from './controllers/connectivity/connectivity-controller-init';
import { multichainRouterInit } from './controllers/multichain-router-init';
import { profileMetricsControllerInit } from './controllers/profile-metrics-controller-init';
import { profileMetricsServiceInit } from './controllers/profile-metrics-service-init';
import { rampsServiceInit } from './controllers/ramps-controller/ramps-service-init';
import { rampsControllerInit } from './controllers/ramps-controller/ramps-controller-init';
import { Messenger, MessengerEvents } from '@metamask/messenger';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let currentChainId: any;

/**
 * Core controller responsible for composing other metamask controllers together
 * and exposing convenience methods for common wallet operations.
 */
export class Engine {
  /**
   * The global Engine singleton
   */
  static instance: Engine | null;
  /**
   * Flag to disable automatic vault backups (used during wallet reset)
   */
  static disableAutomaticVaultBackup = false;
  /**
   * A collection of all controller instances
   */
  context: EngineContext;
  /**
   * The global controller messenger.
   */
  controllerMessenger: RootExtendedMessenger;
  /**
   * ComposableController reference containing all child controllers
   */
  datamodel: ComposableController<EngineState, StatefulControllers>;

  /**
   * Object containing the info for the latest incoming tx block
   * for each address and network
   */
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lastIncomingTxBlockInfo: any;

  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  /**
   * The app state event listener.
   * This is used to handle app state changes in snaps lifecycle hooks.
   */
  appStateListener: NativeEventSubscription;

  subjectMetadataController: SubjectMetadataController;
  ///: END:ONLY_INCLUDE_IF

  /**
   * The app state WebSocket manager.
   * This is used to handle WebSocket lifecycle based on app state.
   */
  appStateWebSocketManager: AppStateWebSocketManager;

  accountsController: AccountsController;
  gasFeeController: GasFeeController;
  gatorPermissionsController: GatorPermissionsController;
  keyringController: KeyringController;
  smartTransactionsController: SmartTransactionsController;
  transactionController: TransactionController;
  preferencesController: PreferencesController;

  readonly qrKeyringScanner = new QrKeyringDeferredPromiseBridge({
    onScanRequested: (request) => {
      store.dispatch(scanRequested(request));
    },
    onScanResolved: () => {
      store.dispatch(scanCompleted());
    },
    onScanRejected: () => {
      store.dispatch(scanCompleted());
    },
  });

  permissionController: PermissionController<
    PermissionSpecificationConstraint,
    CaveatSpecificationConstraint
  >;

  /**
   * Creates a CoreController instance
   */
  constructor(
    analyticsId: string,
    initialState: Partial<EngineState> = {},
    initialKeyringState?: KeyringControllerState | null,
  ) {
    const keyringState = initialKeyringState ?? null;
    logEngineCreation(initialState, keyringState);

    this.controllerMessenger = getRootExtendedMessenger();

    const codefiTokenApiV2 = new CodefiTokenPricesServiceV2();

    const initRequest = {
      getState: () => store.getState(),
      getGlobalChainId: () => currentChainId,
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      removeAccount: this.removeAccount.bind(this),
      ///: END:ONLY_INCLUDE_IF
      analyticsId,
      initialKeyringState: keyringState,
      qrKeyringScanner: this.qrKeyringScanner,
      codefiTokenApiV2,
    };
    const { controllersByName } = initModularizedControllers({
      controllerInitFunctions: {
        ErrorReportingService: errorReportingServiceInit,
        StorageService: storageServiceInit,
        LoggingController: loggingControllerInit,
        PreferencesController: preferencesControllerInit,
        RemoteFeatureFlagController: remoteFeatureFlagControllerInit,
        NetworkController: networkControllerInit,
        AccountsController: accountsControllerInit,
        ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
        SnapKeyringBuilder: snapKeyringBuilderInit,
        ///: END:ONLY_INCLUDE_IF
        KeyringController: keyringControllerInit,
        PermissionController: permissionControllerInit,
        ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
        SubjectMetadataController: subjectMetadataControllerInit,
        ///: END:ONLY_INCLUDE_IF
        AccountTreeController: accountTreeControllerInit,
        AppMetadataController: appMetadataControllerInit,
        AssetsContractController: assetsContractControllerInit,
        AccountTrackerController: accountTrackerControllerInit,
        SelectedNetworkController: selectedNetworkControllerInit,
        ApprovalController: ApprovalControllerInit,
        GasFeeController: GasFeeControllerInit,
        GatorPermissionsController: GatorPermissionsControllerInit,
        SmartTransactionsController: smartTransactionsControllerInit,
        TransactionController: TransactionControllerInit,
        TransactionPayController: TransactionPayControllerInit,
        SignatureController: SignatureControllerInit,
        CurrencyRateController: currencyRateControllerInit,
        EarnController: earnControllerInit,
        TokensController: tokensControllerInit,
        TokenBalancesController: tokenBalancesControllerInit,
        TokenRatesController: tokenRatesControllerInit,
        TokenListController: tokenListControllerInit,
        TokenDetectionController: tokenDetectionControllerInit,
        TokenSearchDiscoveryController: tokenSearchDiscoveryControllerInit,
        TokenSearchDiscoveryDataController:
          tokenSearchDiscoveryDataControllerInit,
        MultichainNetworkController: multichainNetworkControllerInit,
        DeFiPositionsController: defiPositionsControllerInit,
        BridgeController: bridgeControllerInit,
        BridgeStatusController: bridgeStatusControllerInit,
        NftController: nftControllerInit,
        NftDetectionController: nftDetectionControllerInit,
        SwapsController: swapsControllerInit,
        ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
        ExecutionService: executionServiceInit,
        CronjobController: cronjobControllerInit,
        SnapController: snapControllerInit,
        SnapInterfaceController: snapInterfaceControllerInit,
        SnapsRegistry: snapsRegistryInit,
        NotificationServicesController: notificationServicesControllerInit,
        NotificationServicesPushController:
          notificationServicesPushControllerInit,
        WebSocketService: WebSocketServiceInit,
        AuthenticationController: authenticationControllerInit,
        UserStorageController: userStorageControllerInit,
        ///: END:ONLY_INCLUDE_IF
        BackendWebSocketService: backendWebSocketServiceInit,
        AccountActivityService: accountActivityServiceInit,
        ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
        MultichainAssetsController: multichainAssetsControllerInit,
        MultichainAssetsRatesController: multichainAssetsRatesControllerInit,
        MultichainBalancesController: multichainBalancesControllerInit,
        MultichainRouter: multichainRouterInit,
        MultichainTransactionsController: multichainTransactionsControllerInit,
        MultichainAccountService: multichainAccountServiceInit,
        ///: END:ONLY_INCLUDE_IF
        SeedlessOnboardingController: seedlessOnboardingControllerInit,
        ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
        SamplePetnamesController: samplePetnamesControllerInit,
        ///: END:ONLY_INCLUDE_IF
        NetworkEnablementController: networkEnablementControllerInit,
        PerpsController: perpsControllerInit,
        PhishingController: phishingControllerInit,
        PredictController: predictControllerInit,
        RewardsController: rewardsControllerInit,
        RewardsDataService: rewardsDataServiceInit,
        DelegationController: DelegationControllerInit,
        AddressBookController: addressBookControllerInit,
        ConnectivityController: connectivityControllerInit,
        ProfileMetricsController: profileMetricsControllerInit,
        ProfileMetricsService: profileMetricsServiceInit,
        AnalyticsController: analyticsControllerInit,
        RampsService: rampsServiceInit,
        RampsController: rampsControllerInit,
      },
      persistedState: initialState as EngineState,
      baseControllerMessenger: this.controllerMessenger,
      ...initRequest,
    });

    const analyticsController = controllersByName.AnalyticsController;
    const loggingController = controllersByName.LoggingController;
    const remoteFeatureFlagController =
      controllersByName.RemoteFeatureFlagController;
    const accountsController = controllersByName.AccountsController;
    const accountTreeController = controllersByName.AccountTreeController;
    const approvalController = controllersByName.ApprovalController;
    const assetsContractController = controllersByName.AssetsContractController;
    const accountTrackerController = controllersByName.AccountTrackerController;
    const gasFeeController = controllersByName.GasFeeController;
    const signatureController = controllersByName.SignatureController;
    const smartTransactionsController =
      controllersByName.SmartTransactionsController;
    const transactionController = controllersByName.TransactionController;
    const seedlessOnboardingController =
      controllersByName.SeedlessOnboardingController;
    const perpsController = controllersByName.PerpsController;
    const phishingController = controllersByName.PhishingController;
    const predictController = controllersByName.PredictController;
    const rewardsController = controllersByName.RewardsController;
    const gatorPermissionsController =
      controllersByName.GatorPermissionsController;
    const selectedNetworkController =
      controllersByName.SelectedNetworkController;
    const preferencesController = controllersByName.PreferencesController;
    const delegationController = controllersByName.DelegationController;
    const addressBookController = controllersByName.AddressBookController;
    const connectivityController = controllersByName.ConnectivityController;
    const profileMetricsController = controllersByName.ProfileMetricsController;
    const profileMetricsService = controllersByName.ProfileMetricsService;
    const rampsService = controllersByName.RampsService;
    const rampsController = controllersByName.RampsController;

    // Backwards compatibility for existing references
    this.accountsController = accountsController;
    this.gasFeeController = gasFeeController;
    this.gatorPermissionsController = gatorPermissionsController;
    this.transactionController = transactionController;
    this.smartTransactionsController = smartTransactionsController;
    this.permissionController = controllersByName.PermissionController;
    this.preferencesController = preferencesController;
    this.keyringController = controllersByName.KeyringController;

    const multichainNetworkController =
      controllersByName.MultichainNetworkController;
    const currencyRateController = controllersByName.CurrencyRateController;
    const earnController = controllersByName.EarnController;
    const tokensController = controllersByName.TokensController;
    const tokenBalancesController = controllersByName.TokenBalancesController;
    const tokenRatesController = controllersByName.TokenRatesController;
    const tokenListController = controllersByName.TokenListController;
    const tokenDetectionController = controllersByName.TokenDetectionController;
    const tokenSearchDiscoveryController =
      controllersByName.TokenSearchDiscoveryController;
    const tokenSearchDiscoveryDataController =
      controllersByName.TokenSearchDiscoveryDataController;
    const bridgeController = controllersByName.BridgeController;
    const nftController = controllersByName.NftController;
    const nftDetectionController = controllersByName.NftDetectionController;
    const swapsController = controllersByName.SwapsController;
    const networkController = controllersByName.NetworkController;

    ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
    const cronjobController = controllersByName.CronjobController;
    const executionService = controllersByName.ExecutionService;
    const snapController = controllersByName.SnapController;
    const snapInterfaceController = controllersByName.SnapInterfaceController;
    const snapsRegistry = controllersByName.SnapsRegistry;
    const webSocketService = controllersByName.WebSocketService;
    const notificationServicesController =
      controllersByName.NotificationServicesController;
    const notificationServicesPushController =
      controllersByName.NotificationServicesPushController;
    this.subjectMetadataController =
      controllersByName.SubjectMetadataController;
    const authenticationController = controllersByName.AuthenticationController;
    const userStorageController = controllersByName.UserStorageController;
    ///: END:ONLY_INCLUDE_IF

    // Initialize BackendWebSocketService lifecycle management
    const backendWebSocketService = controllersByName.BackendWebSocketService;
    this.appStateWebSocketManager = new AppStateWebSocketManager(
      backendWebSocketService,
    );
    const accountActivityService = controllersByName.AccountActivityService;

    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    const multichainAssetsController =
      controllersByName.MultichainAssetsController;
    const multichainAssetsRatesController =
      controllersByName.MultichainAssetsRatesController;
    const multichainBalancesController =
      controllersByName.MultichainBalancesController;
    const multichainTransactionsController =
      controllersByName.MultichainTransactionsController;
    const multichainAccountService = controllersByName.MultichainAccountService;
    ///: END:ONLY_INCLUDE_IF

    const networkEnablementController =
      controllersByName.NetworkEnablementController;
    networkEnablementController.init();

    ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
    snapController.init();
    cronjobController.init();
    // Notification Setup
    notificationServicesController.init();
    ///: END:ONLY_INCLUDE_IF

    this.context = {
      AnalyticsController: analyticsController,
      KeyringController: this.keyringController,
      AccountTreeController: accountTreeController,
      AccountTrackerController: accountTrackerController,
      AddressBookController: addressBookController,
      AppMetadataController: controllersByName.AppMetadataController,
      ConnectivityController: connectivityController,
      AssetsContractController: assetsContractController,
      NftController: nftController,
      TokensController: tokensController,
      TokenListController: tokenListController,
      TokenDetectionController: tokenDetectionController,
      NftDetectionController: nftDetectionController,
      CurrencyRateController: currencyRateController,
      NetworkController: networkController,
      PhishingController: phishingController,
      PreferencesController: preferencesController,
      TokenBalancesController: tokenBalancesController,
      TokenRatesController: tokenRatesController,
      TransactionController: this.transactionController,
      TransactionPayController: controllersByName.TransactionPayController,
      SmartTransactionsController: this.smartTransactionsController,
      SwapsController: swapsController,
      GasFeeController: this.gasFeeController,
      GatorPermissionsController: gatorPermissionsController,
      ApprovalController: approvalController,
      PermissionController: this.permissionController,
      RemoteFeatureFlagController: remoteFeatureFlagController,
      SelectedNetworkController: selectedNetworkController,
      SignatureController: signatureController,
      TokenSearchDiscoveryController: tokenSearchDiscoveryController,
      LoggingController: loggingController,
      ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
      CronjobController: cronjobController,
      ExecutionService: executionService,
      SnapController: snapController,
      SnapInterfaceController: snapInterfaceController,
      SnapsRegistry: snapsRegistry,
      SubjectMetadataController: this.subjectMetadataController,
      AuthenticationController: authenticationController,
      UserStorageController: userStorageController,
      WebSocketService: webSocketService,
      NotificationServicesController: notificationServicesController,
      NotificationServicesPushController: notificationServicesPushController,
      ///: END:ONLY_INCLUDE_IF
      BackendWebSocketService: backendWebSocketService,
      AccountActivityService: accountActivityService,
      AccountsController: accountsController,
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      MultichainBalancesController: multichainBalancesController,
      MultichainAssetsController: multichainAssetsController,
      MultichainAssetsRatesController: multichainAssetsRatesController,
      MultichainTransactionsController: multichainTransactionsController,
      MultichainAccountService: multichainAccountService,
      ///: END:ONLY_INCLUDE_IF
      TokenSearchDiscoveryDataController: tokenSearchDiscoveryDataController,
      MultichainNetworkController: multichainNetworkController,
      BridgeController: bridgeController,
      BridgeStatusController: controllersByName.BridgeStatusController,
      EarnController: earnController,
      DeFiPositionsController: controllersByName.DeFiPositionsController,
      SeedlessOnboardingController: seedlessOnboardingController,
      ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
      SamplePetnamesController: controllersByName.SamplePetnamesController,
      ///: END:ONLY_INCLUDE_IF
      NetworkEnablementController: networkEnablementController,
      PerpsController: perpsController,
      PredictController: predictController,
      RewardsController: rewardsController,
      DelegationController: delegationController,
      ProfileMetricsController: profileMetricsController,
      ProfileMetricsService: profileMetricsService,
      RampsService: rampsService,
      RampsController: rampsController,
    };

    const childControllers = Object.assign({}, this.context);
    STATELESS_NON_CONTROLLER_NAMES.forEach((name) => {
      if (name in childControllers && childControllers[name]) {
        delete childControllers[name];
      }
    });
    const composableControllerMessenger = new Messenger<
      'ComposableController',
      never,
      MessengerEvents<RootMessenger>,
      RootMessenger
    >({
      namespace: 'ComposableController',
      parent: this.controllerMessenger,
    });

    this.controllerMessenger.delegate({
      actions: [],
      events: Array.from(BACKGROUND_STATE_CHANGE_EVENT_NAMES),
      messenger: composableControllerMessenger,
    });

    this.datamodel = new ComposableController<EngineState, StatefulControllers>(
      {
        controllers: childControllers as StatefulControllers,
        messenger: composableControllerMessenger,
      },
    );

    this.controllerMessenger.subscribe(
      'TransactionController:incomingTransactionsReceived',
      (incomingTransactions: TransactionMeta[]) => {
        NotificationManager.gotIncomingTransaction(incomingTransactions);
      },
    );

    this.controllerMessenger.subscribe(
      AppConstants.NETWORK_STATE_CHANGE_EVENT,
      (state: NetworkState) => {
        if (
          state.networksMetadata[state.selectedNetworkClientId].status ===
            NetworkStatus.Available &&
          getGlobalChainId(networkController) !== currentChainId
        ) {
          // We should add a state or event emitter saying the provider changed
          // Use shorter delay during E2E tests to prevent pending timer issues
          const delay = isE2E ? 0 : 500;
          setTimeout(() => {
            this.configureControllersOnNetworkChange();
            currentChainId = getGlobalChainId(networkController);
          }, delay);
        }
      },
    );

    this.controllerMessenger.subscribe(
      AppConstants.NETWORK_STATE_CHANGE_EVENT,
      async () => {
        try {
          const networkId = await deprecatedGetNetworkId();
          store.dispatch(networkIdUpdated(networkId));
        } catch (error) {
          console.error(
            error,
            `Network ID not changed, current chainId: ${getGlobalChainId(
              networkController,
            )}`,
          );
        }
      },
    );

    this.controllerMessenger.subscribe(
      `${networkController.name}:networkWillChange`,
      () => {
        store.dispatch(networkIdWillUpdate());
      },
    );

    ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
    this.controllerMessenger.subscribe(
      `${snapController.name}:snapTerminated`,
      (truncatedSnap) => {
        const pendingApprovals = this.controllerMessenger.call(
          'ApprovalController:getState',
        ).pendingApprovals;
        const approvals = Object.values(pendingApprovals).filter(
          (approval) =>
            approval.origin === truncatedSnap.id &&
            approval.type.startsWith(RestrictedMethods.snap_dialog),
        );
        for (const approval of approvals) {
          this.controllerMessenger.call<'ApprovalController:rejectRequest'>(
            'ApprovalController:rejectRequest',
            approval.id,
            new Error('Snap was terminated.'),
          );
        }
      },
    );

    // Subscribe to destinationTransactionCompleted event from BridgeStatusController and refresh assets.
    this.controllerMessenger.subscribe(
      'BridgeStatusController:destinationTransactionCompleted',
      (caipAsset: CaipAssetType) => {
        try {
          const { chain } = parseCaipAssetType(caipAsset);

          const { namespace: caipNamespace, reference } = chain;
          if (caipNamespace === 'eip155') {
            const hexChainId = toHex(reference);
            this.context.TokenDetectionController.detectTokens({
              chainIds: [hexChainId],
            });
            this.context.TokenBalancesController.updateBalances({
              chainIds: [hexChainId],
            });
          }
        } catch (error) {
          console.error(
            'Error handling BridgeStatusController:destinationTransactionCompleted event:',
            error,
          );
        }
      },
    );

    this.appStateListener = AppState.addEventListener(
      'change',
      (state: AppStateStatus) => {
        if (state !== 'active' && state !== 'background') {
          return;
        }

        const { isUnlocked } = this.controllerMessenger.call(
          'KeyringController:getState',
        );

        // Notifies Snaps that the app may be in the background.
        // This is best effort as we cannot guarantee the messages are received in time.
        if (isUnlocked) {
          return this.controllerMessenger.call(
            'SnapController:setClientActive',
            state === 'active',
          );
        }
      },
    );
    ///: END:ONLY_INCLUDE_IF

    this.configureControllersOnNetworkChange();
    this.startPolling();
    this.handleVaultBackup();

    Engine.instance = this;
  }

  handleVaultBackup() {
    this.controllerMessenger.subscribe(
      AppConstants.KEYRING_STATE_CHANGE_EVENT,
      (state: KeyringControllerState) => {
        // Check if automatic backups are disabled (during wallet reset)
        if (Engine.disableAutomaticVaultBackup) {
          return;
        }

        if (!state.vault) {
          return;
        }

        // Back up vault if it exists
        backupVault(state)
          .then(() => {
            Logger.log('Engine', 'Vault back up successful');
          })
          .catch((error) => {
            Logger.error(error, 'Engine Vault backup failed');
          });
      },
    );
  }

  startPolling() {
    const { TransactionController } = this.context;

    TransactionController.stopIncomingTransactionPolling();

    // leaving the reference of TransactionController here, rather than importing it from utils to avoid circular dependency
    TransactionController.startIncomingTransactionPolling();
  }

  configureControllersOnNetworkChange() {
    const { AccountTrackerController, NetworkController } = this.context;
    const { provider } = NetworkController.getProviderAndBlockTracker();

    // Skip configuration if this is called before the provider is initialized
    if (!provider) {
      return;
    }
    provider.sendAsync = provider.sendAsync.bind(provider);

    AccountTrackerController.refresh([
      NetworkController.state.networkConfigurationsByChainId[
        getGlobalChainId(NetworkController)
      ]?.rpcEndpoints?.[
        NetworkController.state.networkConfigurationsByChainId[
          getGlobalChainId(NetworkController)
        ]?.defaultRpcEndpointIndex
      ]?.networkClientId,
    ]);
  }

  getTotalEvmFiatAccountBalance = (
    account?: InternalAccount,
  ): {
    ethFiat: number;
    tokenFiat: number;
    tokenFiat1dAgo: number;
    ethFiat1dAgo: number;
    totalNativeTokenBalance: string;
    ticker: string;
  } => {
    const {
      CurrencyRateController,
      AccountsController,
      AccountTrackerController,
      TokenBalancesController,
      TokenRatesController,
      TokensController,
      NetworkController,
    } = this.context;

    const selectedInternalAccount =
      account ??
      AccountsController.getAccount(
        AccountsController.state.internalAccounts.selectedAccount,
      );

    if (!selectedInternalAccount) {
      return {
        ethFiat: 0,
        tokenFiat: 0,
        ethFiat1dAgo: 0,
        tokenFiat1dAgo: 0,
        totalNativeTokenBalance: '0',
        ticker: '',
      };
    }

    const selectedInternalAccountFormattedAddress = toFormattedAddress(
      selectedInternalAccount.address,
    );
    const { currentCurrency } = CurrencyRateController.state;
    const { settings: { showFiatOnTestnets } = {} } = store.getState();

    const { accountsByChainId } = AccountTrackerController.state;
    const { marketData } = TokenRatesController.state;

    let totalEthFiat = 0;
    let totalEthFiat1dAgo = 0;
    let totalTokenFiat = 0;
    let totalTokenFiat1dAgo = 0;
    let aggregatedNativeTokenBalance = '0';
    let primaryTicker = '';

    const decimalsToShow = (currentCurrency === 'usd' && 2) || undefined;

    const networkConfigurations = Object.values(
      NetworkController.state.networkConfigurationsByChainId || {},
    );

    networkConfigurations.forEach((networkConfig) => {
      const { chainId } = networkConfig;
      const chainIdHex = toHexadecimal(chainId);

      if (isTestNet(chainId) && !showFiatOnTestnets) {
        return;
      }

      let ticker = '';
      try {
        const networkClientId =
          NetworkController.findNetworkClientIdByChainId(chainId);
        if (networkClientId) {
          const networkClient =
            NetworkController.getNetworkClientById(networkClientId);
          ticker = networkClient.configuration.ticker;
        }
      } catch (error) {
        return;
      }

      const conversionRate =
        CurrencyRateController.state?.currencyRates?.[ticker]?.conversionRate ??
        0;

      if (conversionRate === 0) {
        return;
      }

      if (!primaryTicker) {
        primaryTicker = ticker;
      }

      const accountData =
        accountsByChainId?.[chainIdHex]?.[
          selectedInternalAccountFormattedAddress
        ];
      if (accountData) {
        const balanceHex = accountData.balance;
        const balanceBN = hexToBN(balanceHex);

        const stakedBalanceBN = hexToBN(accountData.stakedBalance || '0x00');
        const totalAccountBalance = balanceBN
          .add(stakedBalanceBN)
          .toString('hex');

        const chainEthFiat = weiToFiatNumber(
          totalAccountBalance,
          conversionRate,
          decimalsToShow,
        );

        // Avoid NaN and Infinity values
        if (isFinite(chainEthFiat)) {
          totalEthFiat += chainEthFiat;
        }

        const tokenExchangeRates = marketData?.[chainIdHex];
        const ethPricePercentChange1d =
          tokenExchangeRates?.[zeroAddress() as Hex]?.pricePercentChange1d;

        let chainEthFiat1dAgo = chainEthFiat;
        if (
          ethPricePercentChange1d !== undefined &&
          isFinite(ethPricePercentChange1d) &&
          ethPricePercentChange1d !== -100
        ) {
          chainEthFiat1dAgo =
            chainEthFiat / (1 + ethPricePercentChange1d / 100);
        }

        if (isFinite(chainEthFiat1dAgo)) {
          totalEthFiat1dAgo += chainEthFiat1dAgo;
        }

        const chainNativeBalance = renderFromWei(balanceHex);
        if (chainNativeBalance && parseFloat(chainNativeBalance) > 0) {
          const currentAggregated = parseFloat(
            aggregatedNativeTokenBalance || '0',
          );
          aggregatedNativeTokenBalance = (
            currentAggregated + parseFloat(chainNativeBalance)
          ).toString();
        }
      }

      const tokens =
        TokensController.state.allTokens?.[chainIdHex]?.[
          selectedInternalAccount.address
        ] || [];
      const tokenExchangeRates = marketData?.[chainIdHex];

      if (tokens.length > 0) {
        const { tokenBalances: allTokenBalances } =
          TokenBalancesController.state;
        const tokenBalances =
          allTokenBalances?.[selectedInternalAccount.address as Hex]?.[
            chainId
          ] ?? {};

        tokens.forEach(
          (item: { address: string; balance?: string; decimals: number }) => {
            const exchangeRate =
              tokenExchangeRates?.[item.address as Hex]?.price;

            if (!exchangeRate || !isFinite(exchangeRate)) {
              return;
            }

            const tokenBalance =
              item.balance ||
              (item.address in tokenBalances
                ? renderFromTokenMinimalUnit(
                    tokenBalances[item.address as Hex],
                    item.decimals,
                  )
                : undefined);

            if (!tokenBalance) {
              return;
            }

            const tokenBalanceFiat = balanceToFiatNumber(
              tokenBalance,
              conversionRate,
              exchangeRate,
              decimalsToShow,
            );

            if (isFinite(tokenBalanceFiat)) {
              totalTokenFiat += tokenBalanceFiat;
            }

            const tokenPricePercentChange1d =
              tokenExchangeRates?.[item.address as Hex]?.pricePercentChange1d;
            let tokenBalance1dAgo = tokenBalanceFiat;

            if (
              tokenPricePercentChange1d !== undefined &&
              isFinite(tokenPricePercentChange1d) &&
              tokenPricePercentChange1d !== -100
            ) {
              tokenBalance1dAgo =
                tokenBalanceFiat / (1 + tokenPricePercentChange1d / 100);
            }

            if (isFinite(tokenBalance1dAgo)) {
              totalTokenFiat1dAgo += tokenBalance1dAgo;
            }
          },
        );
      }
    });

    return {
      ethFiat: totalEthFiat ?? 0,
      ethFiat1dAgo: totalEthFiat1dAgo ?? 0,
      tokenFiat: totalTokenFiat ?? 0,
      tokenFiat1dAgo: totalTokenFiat1dAgo ?? 0,
      totalNativeTokenBalance: aggregatedNativeTokenBalance ?? '0',
      ticker: primaryTicker,
    };
  };

  /**
   * Gets a subset of preferences from the PreferencesController to pass to a snap.
   */
  getPreferences = () => {
    const {
      securityAlertsEnabled,
      useTransactionSimulations,
      useTokenDetection,
      privacyMode,
      useNftDetection,
      displayNftMedia,
      isMultiAccountBalancesEnabled,
      showTestNetworks,
    } = this.context.PreferencesController.state;

    return {
      securityAlertsEnabled,
      useTransactionSimulations,
      useTokenDetection,
      privacyMode,
      useNftDetection,
      displayNftMedia,
      isMultiAccountBalancesEnabled,
      showTestNetworks,
    };
  };

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  getSnapKeyring = async (): Promise<SnapKeyring> => {
    // TODO: Replace `getKeyringsByType` with `withKeyring`
    let [snapKeyring] = this.keyringController.getKeyringsByType(
      KeyringTypes.snap,
    );
    if (!snapKeyring) {
      await this.keyringController.addNewKeyring(KeyringTypes.snap);
      // TODO: Replace `getKeyringsByType` with `withKeyring`
      [snapKeyring] = this.keyringController.getKeyringsByType(
        KeyringTypes.snap,
      );
    }
    return snapKeyring as SnapKeyring;
  };

  /**
   * Removes an account from state / storage.
   *
   * @param {string} address - A hex address
   */
  removeAccount = async (address: string) => {
    const addressHex = toHex(address);
    // Remove all associated permissions
    await removeAccountsFromPermissions([addressHex]);
    // Remove account from the keyring
    await this.keyringController.removeAccount(addressHex);
  };
  ///: END:ONLY_INCLUDE_IF

  /**
   * Returns true or false whether the user has funds or not
   */
  hasFunds = () => {
    try {
      const {
        engine: { backgroundState },
      } = store.getState();
      // TODO: Check `allNfts[currentChainId]` property instead
      // @ts-expect-error This property does not exist
      const nfts = backgroundState.NftController.nfts;

      const { tokenBalances } = backgroundState.TokenBalancesController;

      const hasNonZeroTokenBalance = (): boolean => {
        for (const chains of Object.values(tokenBalances)) {
          for (const tokens of Object.values(chains)) {
            for (const balance of Object.values(tokens)) {
              if (!isZero(balance)) {
                return true;
              }
            }
          }
        }
        return false;
      };

      const tokenFound = hasNonZeroTokenBalance();

      const fiatBalance = this.getTotalEvmFiatAccountBalance() || 0;
      const totalFiatBalance = fiatBalance.ethFiat + fiatBalance.ethFiat;

      return totalFiatBalance > 0 || tokenFound || nfts.length > 0;
    } catch (e) {
      Logger.log('Error while getting user funds', e);
    }
  };

  resetState = async () => {
    // Whenever we are gonna start a new wallet
    // either imported or created, we need to
    // get rid of the old data from state
    const {
      TransactionController,
      TokensController,
      NftController,
      TokenBalancesController,
      TokenRatesController,
      PermissionController,
      // SelectedNetworkController,
      ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
      SnapController,
      ///: END:ONLY_INCLUDE_IF
      LoggingController,
    } = this.context;

    // Remove all permissions.
    PermissionController?.clearState?.();
    ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
    await SnapController.clearState();
    ///: END:ONLY_INCLUDE_IF

    // Clear selected network
    // TODO implement this method on SelectedNetworkController
    // SelectedNetworkController.unsetAllDomains()

    //Clear assets info
    TokensController.resetState();
    NftController.resetState();

    TokenBalancesController.resetState();
    TokenRatesController.resetState();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (TransactionController as any).update(() => ({
      methodData: {},
      transactions: [],
      transactionBatches: [],
      lastFetchedBlockNumbers: {},
      submitHistory: [],
      swapsTransactions: {},
    }));

    LoggingController.clear();
  };

  removeAllListeners() {
    this.controllerMessenger.clearSubscriptions();

    ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
    this.appStateListener?.remove();
    ///: END:ONLY_INCLUDE_IF

    // Cleanup AppStateWebSocketManager
    this.appStateWebSocketManager.cleanup();
  }

  async destroyEngineInstance() {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Object.values(this.context).forEach((controller: any) => {
      if (controller.destroy) {
        controller.destroy();
      }
    });
    this.removeAllListeners();
    await this.resetState();

    Engine.instance = null;
  }

  rejectPendingApproval(
    id: string,
    reason: Error = providerErrors.userRejectedRequest(),
    opts: { ignoreMissing?: boolean; logErrors?: boolean } = {},
  ) {
    const { ApprovalController } = this.context;

    if (opts.ignoreMissing && !ApprovalController.has({ id })) {
      return;
    }

    try {
      ApprovalController.reject(id, reason);
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (opts.logErrors !== false) {
        Logger.error(
          error,
          'Reject while rejecting pending connection request',
        );
      }
    }
  }

  async acceptPendingApproval(
    id: string,
    requestData?: Record<string, Json>,
    opts: AcceptOptions & { handleErrors?: boolean } = {
      waitForResult: false,
      deleteAfterResult: false,
      handleErrors: true,
    },
  ) {
    const { ApprovalController } = this.context;

    try {
      return await ApprovalController.accept(id, requestData, {
        waitForResult: opts.waitForResult,
        deleteAfterResult: opts.deleteAfterResult,
      });
    } catch (err) {
      if (opts.handleErrors === false) {
        throw err;
      }
    }
  }

  // This should be used instead of directly calling PreferencesController.setSelectedAddress or AccountsController.setSelectedAccount
  setSelectedAccount(address: string) {
    const { AccountsController, PreferencesController } = this.context;
    const account = AccountsController.getAccountByAddress(address);
    if (account) {
      AccountsController.setSelectedAccount(account.id);
      PreferencesController.setSelectedAddress(address);
    } else {
      throw new Error(`No account found for address: ${address}`);
    }
  }

  /**
   * This should be used instead of directly calling PreferencesController.setAccountLabel or AccountsController.setAccountName in order to keep the names in sync
   * We are currently incrementally migrating the accounts data to the AccountsController so we must keep these values
   * in sync until the migration is complete.
   */
  setAccountLabel(address: string, label: string) {
    const { AccountsController, PreferencesController } = this.context;
    const accountToBeNamed = AccountsController.getAccountByAddress(address);
    if (accountToBeNamed === undefined) {
      throw new Error(`No account found for address: ${address}`);
    }
    AccountsController.setAccountName(accountToBeNamed.id, label);
    PreferencesController.setAccountLabel(address, label);
  }

  /**
   * Gathers metadata (primarily connectivity status) about the enabled networks and persists it to state.
   */
  async lookupEnabledNetworks(): Promise<void> {
    const { NetworkController, NetworkEnablementController } = this.context;

    const chainIds = Object.entries(
      NetworkEnablementController.state?.enabledNetworkMap?.[
        KnownCaipNamespace.Eip155
      ] ?? {},
    )
      .filter(([, isEnabled]) => isEnabled)
      .map(([networkChainId]) => networkChainId as Hex);

    await Promise.allSettled(
      chainIds
        .map((chainId) =>
          NetworkController.findNetworkClientIdByChainId(chainId as Hex),
        )
        .filter((id): id is string => !!id)
        .map((id) => NetworkController.lookupNetwork(id)),
    );
  }
}

/**
 * Assert that the given Engine instance has been initialized
 *
 * @param instance - Either an Engine instance, or null
 */
function assertEngineExists(
  instance: Engine | null,
): asserts instance is Engine {
  if (!instance) {
    throw new Error('Engine does not exist');
  }
}

let instance: Engine | null;

export default {
  get context() {
    assertEngineExists(instance);
    return instance.context;
  },

  get controllerMessenger() {
    assertEngineExists(instance);
    return instance.controllerMessenger;
  },

  get state() {
    assertEngineExists(instance);
    const {
      ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
      SamplePetnamesController,
      ///: END:ONLY_INCLUDE_IF
      AccountsController,
      AccountTrackerController,
      AccountTreeController,
      AddressBookController,
      AppMetadataController,
      AnalyticsController,
      ApprovalController,
      BridgeController,
      BridgeStatusController,
      ConnectivityController,
      CurrencyRateController,
      DeFiPositionsController,
      DelegationController,
      EarnController,
      GasFeeController,
      GatorPermissionsController,
      KeyringController,
      LoggingController,
      MultichainNetworkController,
      NetworkController,
      NetworkEnablementController,
      NftController,
      PermissionController,
      PerpsController,
      PhishingController,
      PredictController,
      PreferencesController,
      RemoteFeatureFlagController,
      RewardsController,
      SeedlessOnboardingController,
      SelectedNetworkController,
      SignatureController,
      SmartTransactionsController,
      SwapsController,
      TokenBalancesController,
      TokenListController,
      TokenRatesController,
      TokensController,
      TokenSearchDiscoveryController,
      TokenSearchDiscoveryDataController,
      TransactionController,
      TransactionPayController,
      RampsController,
      ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
      AuthenticationController,
      CronjobController,
      NotificationServicesController,
      NotificationServicesPushController,
      SnapController,
      SnapInterfaceController,
      SnapsRegistry,
      SubjectMetadataController,
      UserStorageController,
      ///: END:ONLY_INCLUDE_IF
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      MultichainAssetsController,
      MultichainAssetsRatesController,
      MultichainBalancesController,
      MultichainTransactionsController,
      ///: END:ONLY_INCLUDE_IF
      ProfileMetricsController,
    } = instance.datamodel.state;

    return {
      ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
      SamplePetnamesController,
      ///: END:ONLY_INCLUDE_IF
      AccountsController,
      AccountTrackerController,
      AccountTreeController,
      AddressBookController,
      AppMetadataController,
      AnalyticsController,
      ApprovalController,
      BridgeController,
      BridgeStatusController,
      ConnectivityController,
      CurrencyRateController,
      DeFiPositionsController,
      DelegationController,
      EarnController,
      GasFeeController,
      GatorPermissionsController,
      KeyringController,
      LoggingController,
      MultichainNetworkController,
      NetworkController,
      NetworkEnablementController,
      NftController,
      PermissionController,
      PerpsController,
      PhishingController,
      PredictController,
      PreferencesController,
      RemoteFeatureFlagController,
      RewardsController,
      SeedlessOnboardingController,
      SelectedNetworkController,
      SignatureController,
      SmartTransactionsController,
      SwapsController,
      TokenBalancesController,
      TokenListController,
      TokenRatesController,
      TokensController,
      TokenSearchDiscoveryController,
      TokenSearchDiscoveryDataController,
      TransactionController,
      TransactionPayController,
      RampsController,
      ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
      AuthenticationController,
      CronjobController,
      NotificationServicesController,
      NotificationServicesPushController,
      SnapController,
      SnapInterfaceController,
      SnapsRegistry,
      SubjectMetadataController,
      UserStorageController,
      ///: END:ONLY_INCLUDE_IF
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      MultichainAssetsController,
      MultichainAssetsRatesController,
      MultichainBalancesController,
      MultichainTransactionsController,
      ///: END:ONLY_INCLUDE_IF
      ProfileMetricsController,
    };
  },

  get datamodel() {
    assertEngineExists(instance);
    return instance.datamodel;
  },

  getTotalEvmFiatAccountBalance(account?: InternalAccount) {
    assertEngineExists(instance);
    return instance.getTotalEvmFiatAccountBalance(account);
  },

  hasFunds() {
    assertEngineExists(instance);
    return instance.hasFunds();
  },

  resetState() {
    assertEngineExists(instance);
    return instance.resetState();
  },

  destroyEngine: async () => {
    await instance?.destroyEngineInstance();
    instance = null;
  },

  init(
    analyticsId: string,
    state: Partial<EngineState> | undefined = {},
    keyringState?: KeyringControllerState | null,
  ) {
    instance = Engine.instance || new Engine(analyticsId, state, keyringState);
    Object.freeze(instance);
    return instance;
  },

  acceptPendingApproval: async (
    id: string,
    requestData?: Record<string, Json>,
    opts?: AcceptOptions & { handleErrors?: boolean },
  ) => instance?.acceptPendingApproval(id, requestData, opts),

  rejectPendingApproval: (
    id: string,
    reason: Error,
    opts: {
      ignoreMissing?: boolean;
      logErrors?: boolean;
    } = {},
  ) => instance?.rejectPendingApproval(id, reason, opts),

  setSelectedAddress: (address: string) => {
    assertEngineExists(instance);
    instance.setSelectedAccount(address);
  },

  setAccountLabel: (address: string, label: string) => {
    assertEngineExists(instance);
    instance.setAccountLabel(address, label);
  },

  getQrKeyringScanner: () => {
    assertEngineExists(instance);
    return instance.qrKeyringScanner;
  },

  lookupEnabledNetworks: () => {
    assertEngineExists(instance);
    instance.lookupEnabledNetworks();
  },

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  getSnapKeyring: () => {
    assertEngineExists(instance);
    return instance.getSnapKeyring();
  },
  removeAccount: async (address: string) => {
    assertEngineExists(instance);
    return await instance.removeAccount(address);
  },
  ///: END:ONLY_INCLUDE_IF
};
