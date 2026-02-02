///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
import {
  SamplePetnamesController,
  SamplePetnamesControllerState,
  SamplePetnamesControllerActions,
  SamplePetnamesControllerEvents,
} from '@metamask/sample-controllers';
///: END:ONLY_INCLUDE_IF
import { ExtendedMessenger } from '../ExtendedMessenger';
import {
  AccountTrackerController,
  AccountTrackerControllerState,
  AccountTrackerControllerActions,
  AccountTrackerControllerEvents,
  CurrencyRateController,
  CurrencyRateState,
  CurrencyRateControllerActions,
  CurrencyRateControllerEvents,
  NftController,
  NftControllerState,
  NftControllerActions,
  NftControllerEvents,
  NftDetectionController,
  TokenListController,
  TokenListControllerActions,
  TokenListControllerEvents,
  TokenListState,
  TokensController,
  TokensControllerActions,
  TokensControllerEvents,
  TokensControllerState,
  TokenBalancesController,
  TokenBalancesControllerState,
  TokenBalancesControllerActions,
  TokenBalancesControllerEvents,
  TokenDetectionController,
  TokenRatesController,
  TokenRatesControllerState,
  TokenRatesControllerActions,
  TokenRatesControllerEvents,
  AssetsContractController,
  AssetsContractControllerActions,
  AssetsContractControllerEvents,
  DeFiPositionsController,
  DeFiPositionsControllerState,
  DeFiPositionsControllerEvents,
  DeFiPositionsControllerActions,
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  MultichainBalancesControllerState,
  MultichainBalancesController,
  MultichainBalancesControllerEvents,
  MultichainBalancesControllerActions,
  TokenSearchDiscoveryDataController,
  TokenSearchDiscoveryDataControllerState,
  TokenSearchDiscoveryDataControllerActions,
  TokenSearchDiscoveryDataControllerEvents,
  MultichainAssetsController,
  MultichainAssetsControllerState,
  MultichainAssetsControllerEvents,
  MultichainAssetsControllerActions,
  MultichainAssetsRatesController,
  MultichainAssetsRatesControllerState,
  MultichainAssetsRatesControllerEvents,
  MultichainAssetsRatesControllerActions,
  CodefiTokenPricesServiceV2,
  TokenDetectionControllerEvents,
  TokenDetectionControllerActions,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/assets-controllers';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import {
  MultichainTransactionsController,
  MultichainTransactionsControllerState,
} from '@metamask/multichain-transactions-controller';
import {
  MultichainTransactionsControllerEvents,
  MultichainTransactionsControllerActions,
} from './messengers/multichain-transactions-controller-messenger/types';
///: END:ONLY_INCLUDE_IF
import {
  AddressBookController,
  AddressBookControllerActions,
  AddressBookControllerEvents,
  AddressBookControllerState,
} from '@metamask/address-book-controller';
import {
  ConnectivityController,
  ConnectivityControllerActions,
  ConnectivityControllerEvents,
  ConnectivityControllerState,
} from '@metamask/connectivity-controller';
import {
  KeyringController,
  KeyringControllerActions,
  KeyringControllerEvents,
  KeyringControllerState,
} from '@metamask/keyring-controller';
import {
  NetworkController,
  NetworkControllerActions,
  NetworkControllerEvents,
  NetworkState,
} from '@metamask/network-controller';
import {
  NetworkEnablementController,
  NetworkEnablementControllerActions,
  NetworkEnablementControllerEvents,
  NetworkEnablementControllerState,
} from '@metamask/network-enablement-controller';
import {
  PhishingController,
  PhishingControllerActions,
  PhishingControllerEvents,
  PhishingControllerState,
} from '@metamask/phishing-controller';
import {
  PreferencesController,
  PreferencesControllerActions,
  PreferencesControllerEvents,
  PreferencesState,
} from '@metamask/preferences-controller';
import {
  RampsController,
  RampsControllerState,
  RampsControllerActions,
  RampsControllerEvents,
  RampsService,
  RampsServiceActions,
  RampsServiceEvents,
} from '@metamask/ramps-controller';
import {
  TransactionController,
  TransactionControllerActions,
  TransactionControllerEvents,
  TransactionControllerState,
} from '@metamask/transaction-controller';
import {
  GasFeeController,
  GasFeeState,
  GasFeeControllerActions,
  GasFeeControllerEvents,
} from '@metamask/gas-fee-controller';
import {
  ApprovalController,
  ApprovalControllerActions,
  ApprovalControllerEvents,
  ApprovalControllerState,
} from '@metamask/approval-controller';
import {
  SelectedNetworkController,
  SelectedNetworkControllerEvents,
  SelectedNetworkControllerActions,
  SelectedNetworkControllerState,
} from '@metamask/selected-network-controller';
import {
  PermissionController,
  PermissionControllerActions,
  PermissionControllerEvents,
  PermissionControllerState,
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  SubjectMetadataController,
  SubjectMetadataControllerActions,
  SubjectMetadataControllerEvents,
  SubjectMetadataControllerState,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/permission-controller';
import SwapsController, {
  SwapsControllerState,
  SwapsControllerActions,
  SwapsControllerEvents,
} from '@metamask/swaps-controller';
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import {
  SnapController,
  ExecutionService,
  PersistedSnapControllerState,
  SnapControllerEvents,
  SnapControllerActions,
  JsonSnapsRegistry as SnapsRegistry,
  SnapsRegistryState,
  SnapInterfaceControllerState,
  SnapInterfaceControllerEvents,
  SnapInterfaceControllerActions,
  SnapInterfaceController,
  SnapsRegistryActions,
  SnapsRegistryEvents,
  CronjobControllerState,
  CronjobControllerEvents,
  CronjobControllerActions,
  CronjobController,
  MultichainRouterActions,
  WebSocketService,
  WebSocketServiceActions,
  WebSocketServiceEvents,
  MultichainRouter,
  ExecutionServiceActions,
  ExecutionServiceEvents,
} from '@metamask/snaps-controllers';
///: END:ONLY_INCLUDE_IF
import {
  LoggingController,
  LoggingControllerActions,
  LoggingControllerEvents,
  LoggingControllerState,
} from '@metamask/logging-controller';
import {
  AnalyticsController,
  AnalyticsControllerActions,
  AnalyticsControllerEvents,
  AnalyticsControllerState,
} from '@metamask/analytics-controller';
import {
  SignatureController,
  SignatureControllerActions,
  SignatureControllerEvents,
  SignatureControllerState,
} from '@metamask/signature-controller';
import {
  SmartTransactionsController,
  type SmartTransactionsControllerActions,
  type SmartTransactionsControllerEvents,
  SmartTransactionsControllerState,
} from '@metamask/smart-transactions-controller';
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import {
  AuthenticationController,
  UserStorageController,
} from '@metamask/profile-sync-controller';
import type {
  Controller as NotificationServicesController,
  Actions as NotificationServicesControllerMessengerActions,
  Events as NotificationServicesControllerMessengerEvents,
  NotificationServicesControllerState,
} from '@metamask/notification-services-controller/notification-services';
import type {
  Controller as NotificationServicesPushController,
  Actions as NotificationServicesPushControllerActions,
  Events as NotificationServicesPushControllerEvents,
  NotificationServicesPushControllerState,
} from '@metamask/notification-services-controller/push-services';

///: END:ONLY_INCLUDE_IF
import {
  BackendWebSocketService,
  BackendWebSocketServiceActions,
  BackendWebSocketServiceEvents,
  AccountActivityService,
  AccountActivityServiceActions,
  AccountActivityServiceEvents,
} from '@metamask/core-backend';
import {
  AccountsController,
  AccountsControllerActions,
  AccountsControllerEvents,
  AccountsControllerState,
} from '@metamask/accounts-controller';
import { getPermissionSpecifications } from '../Permissions/specifications.js';
import { ComposableControllerEvents } from '@metamask/composable-controller';
import { STATELESS_NON_CONTROLLER_NAMES } from './constants';
import {
  RemoteFeatureFlagController,
  RemoteFeatureFlagControllerState,
  RemoteFeatureFlagControllerActions,
  RemoteFeatureFlagControllerEvents,
} from '@metamask/remote-feature-flag-controller';
import {
  Messenger,
  ActionConstraint,
  EventConstraint,
} from '@metamask/messenger';
import {
  TokenSearchDiscoveryController,
  TokenSearchDiscoveryControllerState,
  TokenSearchDiscoveryControllerActions,
  TokenSearchDiscoveryControllerEvents,
} from '@metamask/token-search-discovery-controller';
import { SnapKeyringEvents } from '@metamask/eth-snap-keyring';
import {
  MultichainNetworkController,
  MultichainNetworkControllerActions,
  MultichainNetworkControllerState,
  MultichainNetworkControllerEvents,
} from '@metamask/multichain-network-controller';
import {
  BridgeController,
  BridgeControllerActions,
  type BridgeControllerEvents,
  type BridgeControllerState,
} from '@metamask/bridge-controller';
import type {
  BridgeStatusController,
  BridgeStatusControllerActions,
  BridgeStatusControllerEvents,
  BridgeStatusControllerState,
} from '@metamask/bridge-status-controller';
import {
  EarnController,
  EarnControllerActions,
  EarnControllerEvents,
  EarnControllerState,
} from '@metamask/earn-controller';
import {
  PerpsController,
  PerpsControllerState,
  PerpsControllerActions,
  PerpsControllerEvents,
} from '../../components/UI/Perps/controllers/PerpsController';
import { RewardsController } from './controllers/rewards-controller/RewardsController';
import {
  RewardsDataService,
  RewardsDataServiceActions,
} from './controllers/rewards-controller/services/rewards-data-service';
import type {
  RewardsControllerState,
  RewardsControllerEvents,
  RewardsControllerActions,
} from './controllers/rewards-controller/types';
import {
  PredictController,
  PredictControllerState,
  PredictControllerActions,
  PredictControllerEvents,
} from '../../components/UI/Predict/controllers/PredictController';
import {
  SeedlessOnboardingController,
  SeedlessOnboardingControllerState,
  SeedlessOnboardingControllerEvents,
  SeedlessOnboardingControllerActions,
} from '@metamask/seedless-onboarding-controller';
import { EncryptionKey } from '../Encryptor/types';

import { Hex } from '@metamask/utils';

import { CONTROLLER_MESSENGERS } from './messengers';
import type { RootState } from '../../reducers';
import {
  AppMetadataController,
  AppMetadataControllerActions,
  AppMetadataControllerEvents,
  AppMetadataControllerState,
} from '@metamask/app-metadata-controller';
import type {
  ErrorReportingService,
  ErrorReportingServiceActions,
} from '@metamask/error-reporting-service';
import type {
  StorageService,
  StorageServiceActions,
  StorageServiceEvents,
} from '@metamask/storage-service';
import {
  AccountTreeController,
  AccountTreeControllerState,
  AccountTreeControllerActions,
  AccountTreeControllerEvents,
} from '@metamask/account-tree-controller';
import {
  MultichainAccountService,
  MultichainAccountServiceActions,
  MultichainAccountServiceEvents,
} from '@metamask/multichain-account-service';
import {
  GatorPermissionsController,
  GatorPermissionsControllerActions,
  GatorPermissionsControllerEvents,
  GatorPermissionsControllerState,
} from '@metamask/gator-permissions-controller';
import { DelegationController } from '@metamask/delegation-controller';
import {
  DelegationControllerActions,
  DelegationControllerEvents,
  DelegationControllerState,
} from '@metamask/delegation-controller/dist/types.cjs';
import { SnapKeyringBuilder } from '../SnapKeyring/SnapKeyring';
import { QrKeyringDeferredPromiseBridge } from '@metamask/eth-qr-keyring';
import {
  ControllerGetStateAction,
  ControllerStateChangeEvent,
} from '@metamask/base-controller';
import type { NFTDetectionControllerState } from '@metamask/assets-controllers/dist/NftDetectionController.cjs';
import {
  ProfileMetricsController,
  ProfileMetricsControllerActions,
  ProfileMetricsControllerEvents,
  ProfileMetricsControllerState,
  ProfileMetricsService,
  ProfileMetricsServiceActions,
  ProfileMetricsServiceEvents,
} from '@metamask/profile-metrics-controller';

type NftDetectionControllerActions = ControllerGetStateAction<
  'NftDetectionController',
  NFTDetectionControllerState
>;

type NftDetectionControllerEvents = ControllerStateChangeEvent<
  'NftDetectionController',
  NFTDetectionControllerState
>;
import {
  TransactionPayController,
  TransactionPayControllerState,
} from '@metamask/transaction-pay-controller';
import {
  TransactionPayControllerActions,
  TransactionPayControllerEvents,
} from '@metamask/transaction-pay-controller/dist/types.cjs';

/**
 * Controllers that area always instantiated
 */
type RequiredControllers = Omit<
  Controllers,
  | 'ErrorReportingService'
  | 'MultichainRouter'
  | 'RewardsDataService'
  | 'SnapKeyringBuilder'
  | 'StorageService'
>;

/**
 * Controllers that are sometimes not instantiated
 */
type OptionalControllers = Pick<
  Controllers,
  | 'ErrorReportingService'
  | 'MultichainRouter'
  | 'RewardsDataService'
  | 'SnapKeyringBuilder'
  | 'StorageService'
>;

/**
 * Controllers that are defined with state.
 */
export type StatefulControllers = Omit<
  Controllers,
  (typeof STATELESS_NON_CONTROLLER_NAMES)[number]
>;

type PermissionsByRpcMethod = ReturnType<typeof getPermissionSpecifications>;
type Permissions = PermissionsByRpcMethod[keyof PermissionsByRpcMethod];

///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
// TODO: Abstract this into controller utils for SnapsController
type SnapsGlobalActions =
  | SnapControllerActions
  | SnapsRegistryActions
  | SubjectMetadataControllerActions
  | PhishingControllerActions;
type SnapsGlobalEvents =
  | SnapControllerEvents
  | SnapsRegistryEvents
  | SubjectMetadataControllerEvents
  | PhishingControllerEvents;
///: END:ONLY_INCLUDE_IF

type GlobalActions =
  ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
  | SamplePetnamesControllerActions
  ///: END:ONLY_INCLUDE_IF
  | AccountTrackerControllerActions
  | NftControllerActions
  | SwapsControllerActions
  | AddressBookControllerActions
  | ApprovalControllerActions
  | ConnectivityControllerActions
  | CurrencyRateControllerActions
  | GasFeeControllerActions
  | GatorPermissionsControllerActions
  | KeyringControllerActions
  | NetworkControllerActions
  | NetworkEnablementControllerActions
  | PermissionControllerActions
  | SignatureControllerActions
  | LoggingControllerActions
  | AnalyticsControllerActions
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  | SnapsGlobalActions
  | SnapInterfaceControllerActions
  | AuthenticationController.Actions
  | UserStorageController.Actions
  | NotificationServicesControllerMessengerActions
  | NotificationServicesPushControllerActions
  | CronjobControllerActions
  | WebSocketServiceActions
  | ExecutionServiceActions
  ///: END:ONLY_INCLUDE_IF
  | BackendWebSocketServiceActions
  | AccountActivityServiceActions
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  | MultichainBalancesControllerActions
  | MultichainAssetsControllerActions
  | MultichainAssetsRatesControllerActions
  | MultichainTransactionsControllerActions
  | MultichainAccountServiceActions
  ///: END:ONLY_INCLUDE_IF
  | AccountsControllerActions
  | AccountTreeControllerActions
  | PreferencesControllerActions
  | TokenBalancesControllerActions
  | TokensControllerActions
  | TokenDetectionControllerActions
  | TokenRatesControllerActions
  | TokenListControllerActions
  | TransactionControllerActions
  | TransactionPayControllerActions
  | SelectedNetworkControllerActions
  | SmartTransactionsControllerActions
  | AssetsContractControllerActions
  | RemoteFeatureFlagControllerActions
  | TokenSearchDiscoveryControllerActions
  | TokenSearchDiscoveryDataControllerActions
  | MultichainNetworkControllerActions
  | BridgeControllerActions
  | BridgeStatusControllerActions
  | EarnControllerActions
  | PerpsControllerActions
  | PredictControllerActions
  | RewardsControllerActions
  | RewardsDataServiceActions
  | AppMetadataControllerActions
  | MultichainRouterActions
  | DeFiPositionsControllerActions
  | ErrorReportingServiceActions
  | StorageServiceActions
  | DelegationControllerActions
  | SeedlessOnboardingControllerActions
  | NftDetectionControllerActions
  | ProfileMetricsControllerActions
  | ProfileMetricsServiceActions
  | RampsControllerActions
  | RampsServiceActions;

type GlobalEvents =
  ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
  | SamplePetnamesControllerEvents
  ///: END:ONLY_INCLUDE_IF
  | ComposableControllerEvents<EngineState>
  | AccountTrackerControllerEvents
  | NftControllerEvents
  | SwapsControllerEvents
  | AddressBookControllerEvents
  | ApprovalControllerEvents
  | ConnectivityControllerEvents
  | CurrencyRateControllerEvents
  | GasFeeControllerEvents
  | GatorPermissionsControllerEvents
  | KeyringControllerEvents
  | NetworkControllerEvents
  | NetworkEnablementControllerEvents
  | PermissionControllerEvents
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  | SnapsGlobalEvents
  | SnapInterfaceControllerEvents
  | AuthenticationController.Events
  | UserStorageController.Events
  | NotificationServicesControllerMessengerEvents
  | NotificationServicesPushControllerEvents
  | CronjobControllerEvents
  | WebSocketServiceEvents
  | ExecutionServiceEvents
  ///: END:ONLY_INCLUDE_IF
  | BackendWebSocketServiceEvents
  | AccountActivityServiceEvents
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  | MultichainBalancesControllerEvents
  | MultichainAssetsControllerEvents
  | MultichainAssetsRatesControllerEvents
  | MultichainTransactionsControllerEvents
  | MultichainAccountServiceEvents
  ///: END:ONLY_INCLUDE_IF
  | SignatureControllerEvents
  | LoggingControllerEvents
  | AnalyticsControllerEvents
  | StorageServiceEvents
  | AccountsControllerEvents
  | PreferencesControllerEvents
  | TokenBalancesControllerEvents
  | TokensControllerEvents
  | TokenDetectionControllerEvents
  | TokenRatesControllerEvents
  | TokenListControllerEvents
  | TransactionControllerEvents
  | TransactionPayControllerEvents
  | SelectedNetworkControllerEvents
  | SmartTransactionsControllerEvents
  | AssetsContractControllerEvents
  | RemoteFeatureFlagControllerEvents
  | TokenSearchDiscoveryControllerEvents
  | TokenSearchDiscoveryDataControllerEvents
  | SnapKeyringEvents
  | MultichainNetworkControllerEvents
  | BridgeControllerEvents
  | BridgeStatusControllerEvents
  | EarnControllerEvents
  | PerpsControllerEvents
  | PredictControllerEvents
  | RewardsControllerEvents
  | AppMetadataControllerEvents
  | SeedlessOnboardingControllerEvents
  | DeFiPositionsControllerEvents
  | AccountTreeControllerEvents
  | DelegationControllerEvents
  | NftDetectionControllerEvents
  | ProfileMetricsControllerEvents
  | ProfileMetricsServiceEvents
  | RampsControllerEvents
  | RampsServiceEvents;

/**
 * Type definition for the messenger used in the Engine.
 * It extends the base Messenger with global actions and events.
 */
export type RootExtendedMessenger = ExtendedMessenger<
  'Root',
  GlobalActions,
  GlobalEvents
>;

export const getRootExtendedMessenger = (): RootExtendedMessenger =>
  new ExtendedMessenger<'Root', GlobalActions, GlobalEvents>({
    namespace: 'Root',
  });

/**
 * Type definition for the root messenger used in the Engine.
 * It extends the root messenger with global actions and events.
 */
export type RootMessenger = Messenger<'Root', GlobalActions, GlobalEvents>;

export const getRootMessenger = (): RootMessenger =>
  new Messenger<'Root', GlobalActions, GlobalEvents>({
    namespace: 'Root',
  });

/**
 * All mobile controllers, keyed by name
 */
// Interfaces are incompatible with our controllers and state types by default.
// Adding an index signature fixes this, but at the cost of widening the type unnecessarily.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Controllers = {
  ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
  SamplePetnamesController: SamplePetnamesController;
  ///: END:ONLY_INCLUDE_IF
  AccountsController: AccountsController;
  AccountTreeController: AccountTreeController;
  AccountTrackerController: AccountTrackerController;
  AddressBookController: AddressBookController;
  AppMetadataController: AppMetadataController;
  ConnectivityController: ConnectivityController;
  ApprovalController: ApprovalController;
  AssetsContractController: AssetsContractController;
  CurrencyRateController: CurrencyRateController;
  ErrorReportingService: ErrorReportingService;
  GasFeeController: GasFeeController;
  KeyringController: KeyringController;
  LoggingController: LoggingController;
  AnalyticsController: AnalyticsController;
  NetworkController: NetworkController;
  NetworkEnablementController: NetworkEnablementController;
  NftController: NftController;
  NftDetectionController: NftDetectionController;
  // TODO: Fix permission types
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PermissionController: PermissionController<any, any>;
  SelectedNetworkController: SelectedNetworkController;
  PhishingController: PhishingController;
  PreferencesController: PreferencesController;
  RampsController: RampsController;
  RemoteFeatureFlagController: RemoteFeatureFlagController;
  TokenBalancesController: TokenBalancesController;
  TokenListController: TokenListController;
  TokenDetectionController: TokenDetectionController;
  TokenRatesController: TokenRatesController;
  TokenSearchDiscoveryController: TokenSearchDiscoveryController;
  TokensController: TokensController;
  DeFiPositionsController: DeFiPositionsController;
  TransactionController: TransactionController;
  TransactionPayController: TransactionPayController;
  SmartTransactionsController: SmartTransactionsController;
  SignatureController: SignatureController;
  StorageService: StorageService;
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  ExecutionService: ExecutionService;
  SnapController: SnapController;
  SnapsRegistry: SnapsRegistry;
  SubjectMetadataController: SubjectMetadataController;
  AuthenticationController: AuthenticationController.Controller;
  UserStorageController: UserStorageController.Controller;
  NotificationServicesController: NotificationServicesController;
  NotificationServicesPushController: NotificationServicesPushController;
  SnapInterfaceController: SnapInterfaceController;
  CronjobController: CronjobController;
  WebSocketService: WebSocketService;
  ///: END:ONLY_INCLUDE_IF
  BackendWebSocketService: BackendWebSocketService;
  AccountActivityService: AccountActivityService;
  SwapsController: SwapsController;
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  MultichainBalancesController: MultichainBalancesController;
  MultichainAssetsRatesController: MultichainAssetsRatesController;
  MultichainAssetsController: MultichainAssetsController;
  MultichainRouter: MultichainRouter;
  MultichainTransactionsController: MultichainTransactionsController;
  MultichainAccountService: MultichainAccountService;
  SnapKeyringBuilder: SnapKeyringBuilder;
  ///: END:ONLY_INCLUDE_IF
  TokenSearchDiscoveryDataController: TokenSearchDiscoveryDataController;
  MultichainNetworkController: MultichainNetworkController;
  BridgeController: BridgeController;
  BridgeStatusController: BridgeStatusController;
  EarnController: EarnController;
  PerpsController: PerpsController;
  PredictController: PredictController;
  RewardsController: RewardsController;
  RewardsDataService: RewardsDataService;
  SeedlessOnboardingController: SeedlessOnboardingController<EncryptionKey>;
  GatorPermissionsController: GatorPermissionsController;
  DelegationController: DelegationController;
  ProfileMetricsController: ProfileMetricsController;
  ProfileMetricsService: ProfileMetricsService;
  RampsService: RampsService;
};

/**
 * Combines required and optional controllers for the Engine context type.
 */
export type EngineContext = RequiredControllers & Partial<OptionalControllers>;

/**
 * All engine state, keyed by controller name
 */
// Interfaces are incompatible with our controllers and state types by default.
// Adding an index signature fixes this, but at the cost of widening the type unnecessarily.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type EngineState = {
  AccountTrackerController: AccountTrackerControllerState;
  AddressBookController: AddressBookControllerState;
  AppMetadataController: AppMetadataControllerState;
  ConnectivityController: ConnectivityControllerState;
  NftController: NftControllerState;
  TokenListController: TokenListState;
  CurrencyRateController: CurrencyRateState;
  KeyringController: KeyringControllerState;
  NetworkController: NetworkState;
  NetworkEnablementController: NetworkEnablementControllerState;
  PreferencesController: PreferencesState;
  RemoteFeatureFlagController: RemoteFeatureFlagControllerState;
  RampsController: RampsControllerState;
  PhishingController: PhishingControllerState;
  TokenBalancesController: TokenBalancesControllerState;
  TokenRatesController: TokenRatesControllerState;
  TokenSearchDiscoveryController: TokenSearchDiscoveryControllerState;
  TransactionController: TransactionControllerState;
  TransactionPayController: TransactionPayControllerState;
  SmartTransactionsController: SmartTransactionsControllerState;
  SwapsController: SwapsControllerState;
  GasFeeController: GasFeeState;
  TokensController: TokensControllerState;
  DeFiPositionsController: DeFiPositionsControllerState;
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  SnapController: PersistedSnapControllerState;
  SnapsRegistry: SnapsRegistryState;
  SubjectMetadataController: SubjectMetadataControllerState;
  AuthenticationController: AuthenticationController.AuthenticationControllerState;
  UserStorageController: UserStorageController.UserStorageControllerState;
  NotificationServicesController: NotificationServicesControllerState;
  NotificationServicesPushController: NotificationServicesPushControllerState;
  SnapInterfaceController: SnapInterfaceControllerState;
  CronjobController: CronjobControllerState;
  ///: END:ONLY_INCLUDE_IF
  PermissionController: PermissionControllerState<Permissions>;
  ApprovalController: ApprovalControllerState;
  LoggingController: LoggingControllerState;
  AnalyticsController: AnalyticsControllerState;
  AccountsController: AccountsControllerState;
  AccountTreeController: AccountTreeControllerState;
  SelectedNetworkController: SelectedNetworkControllerState;
  SignatureController: SignatureControllerState;
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  MultichainBalancesController: MultichainBalancesControllerState;
  MultichainAssetsController: MultichainAssetsControllerState;
  MultichainAssetsRatesController: MultichainAssetsRatesControllerState;
  MultichainTransactionsController: MultichainTransactionsControllerState;
  ///: END:ONLY_INCLUDE_IF
  TokenSearchDiscoveryDataController: TokenSearchDiscoveryDataControllerState;
  MultichainNetworkController: MultichainNetworkControllerState;
  BridgeController: BridgeControllerState;
  BridgeStatusController: BridgeStatusControllerState;
  EarnController: EarnControllerState;
  PerpsController: PerpsControllerState;
  PredictController: PredictControllerState;
  RewardsController: RewardsControllerState;
  SeedlessOnboardingController: SeedlessOnboardingControllerState;
  ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
  SamplePetnamesController: SamplePetnamesControllerState;
  ///: END:ONLY_INCLUDE_IF
  GatorPermissionsController: GatorPermissionsControllerState;
  DelegationController: DelegationControllerState;
  ProfileMetricsController: ProfileMetricsControllerState;
};

/** Controller names */
export type ControllerName = keyof Controllers;

/**
 * Controller type
 */
export type Controller = Controllers[ControllerName];

/** Map of controllers by name. */
export type ControllerByName = {
  [Name in ControllerName]: Controllers[Name];
};

/**
 * A messenger for the controller
 */
export type ControllerMessenger = Messenger<
  string,
  ActionConstraint,
  EventConstraint
>;

/**
 * Specify controllers to initialize.
 */
export type ControllersToInitialize =
  ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
  | 'SamplePetnamesController'
  ///: END:ONLY_INCLUDE_IF
  | 'AccountTrackerController'
  | 'AddressBookController'
  | 'AssetsContractController'
  | 'ConnectivityController'
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  | 'AuthenticationController'
  | 'CronjobController'
  | 'ExecutionService'
  | 'SnapController'
  | 'SnapInterfaceController'
  | 'SnapsRegistry'
  | 'WebSocketService'
  | 'NotificationServicesController'
  | 'NotificationServicesPushController'
  | 'AppMetadataController'
  | 'SubjectMetadataController'
  | 'UserStorageController'
  ///: END:ONLY_INCLUDE_IF
  | 'BackendWebSocketService'
  | 'AccountActivityService'
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  | 'MultichainAssetsController'
  | 'MultichainAssetsRatesController'
  | 'MultichainBalancesController'
  | 'MultichainRouter'
  | 'MultichainTransactionsController'
  | 'MultichainAccountService'
  | 'SnapKeyringBuilder'
  ///: END:ONLY_INCLUDE_IF
  | 'EarnController'
  | 'ErrorReportingService'
  | 'StorageService'
  | 'LoggingController'
  | 'NetworkController'
  | 'AccountTreeController'
  | 'AccountsController'
  | 'ApprovalController'
  | 'CurrencyRateController'
  | 'DeFiPositionsController'
  | 'GasFeeController'
  | 'KeyringController'
  | 'MultichainNetworkController'
  | 'NftController'
  | 'NftDetectionController'
  | 'PhishingController'
  | 'RemoteFeatureFlagController'
  | 'SignatureController'
  | 'SeedlessOnboardingController'
  | 'SmartTransactionsController'
  | 'SwapsController'
  | 'TokenBalancesController'
  | 'TokenDetectionController'
  | 'TokenListController'
  | 'TokenRatesController'
  | 'TokensController'
  | 'TokenSearchDiscoveryController'
  | 'TokenSearchDiscoveryDataController'
  | 'TransactionController'
  | 'TransactionPayController'
  | 'PermissionController'
  | 'PerpsController'
  | 'PredictController'
  | 'PreferencesController'
  | 'BridgeController'
  | 'BridgeStatusController'
  | 'NetworkEnablementController'
  | 'RewardsController'
  | 'RewardsDataService'
  | 'RampsController'
  | 'RampsService'
  | 'GatorPermissionsController'
  | 'DelegationController'
  | 'SelectedNetworkController'
  | 'ProfileMetricsController'
  | 'ProfileMetricsService'
  | 'AnalyticsController';

/**
 * Callback that returns a controller messenger for a specific controller.
 */
export type ControllerMessengerCallback = (
  baseControllerMessenger: RootExtendedMessenger,
) => ControllerMessenger;

/**
 * Persisted state for all controllers.
 * e.g. `{ TransactionController: { transactions: [] } }`.
 */
type ControllerPersistedState = Partial<{
  [Name in Exclude<
    ControllerName,
    (typeof STATELESS_NON_CONTROLLER_NAMES)[number]
  >]: Partial<ControllerByName[Name]['state']>;
}>;

/**
 * Map of controller messengers by controller name.
 */
export type ControllerMessengerByControllerName = typeof CONTROLLER_MESSENGERS;

/**
 * Request to initialize and return a controller instance.
 * Includes standard data and methods not coupled to any specific controller.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ControllerInitRequest<
  ControllerMessengerType extends ControllerMessenger,
  InitMessengerType extends void | ControllerMessenger = void,
> = {
  /**
   * The token API service instance.
   */
  codefiTokenApiV2: CodefiTokenPricesServiceV2;

  /**
   * Controller messenger for the client.
   * Used to generate controller for each controller.
   */
  controllerMessenger: ControllerMessengerType;

  /**
   * Retrieve a controller instance by name.
   * Throws an error if the controller is not yet initialized.
   *
   * @param name - The name of the controller to retrieve.
   */
  getController<Name extends ControllerName>(
    name: Name,
  ): ControllerByName[Name];

  /**
   * Retrieve the chain ID of the globally selected network.
   *
   * @deprecated Will be removed in the future pending multi-chain support.
   */
  getGlobalChainId: () => Hex;

  /**
   * Get the UI state of the app, returning the current Redux state including transient UI data,
   * whereas `persistedState` contains only the subset of state persisted across sessions.
   * For example: `{ settings, user, engine: { backgroundState: EngineState } }`.
   */
  getState: () => RootState;

  /**
   * The analytics ID to use for tracking.
   * This is always provided at runtime and should not be undefined.
   */
  analyticsId: string;

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  /**
   * Remove an account from all controllers that manage accounts.
   *
   * @param address - The address of the account to remove.
   */
  removeAccount(address: string): Promise<void>;
  ///: END:ONLY_INCLUDE_IF

  /**
   * The initial state of the keyring controller, if applicable.
   */
  initialKeyringState?: KeyringControllerState | null;

  /**
   * QR keyring scanner bridge.
   */
  qrKeyringScanner: QrKeyringDeferredPromiseBridge;

  /**
   * Required initialization messenger instance.
   * Generated using the callback specified in `getInitMessenger`.
   */
  initMessenger: InitMessengerType;

  /**
   * The full persisted state for all controllers.
   * Includes controller name properties.
   * e.g. `{ TransactionController: { transactions: [] } }`.
   */
  persistedState: ControllerPersistedState;
};

/**
 * Function to initialize a controller instance and return associated data.
 */
export type ControllerInitFunction<
  ControllerType extends Controller,
  ControllerMessengerType extends ControllerMessenger,
  InitMessengerType extends void | ControllerMessenger = void,
> = (
  request: ControllerInitRequest<ControllerMessengerType, InitMessengerType>,
) => {
  controller: ControllerType;
};

/**
 * Map of controller init functions by controller name.
 */
export type ControllerInitFunctionByControllerName = {
  [Name in ControllersToInitialize]: ControllerInitFunction<
    ControllerByName[Name],
    ReturnType<(typeof CONTROLLER_MESSENGERS)[Name]['getMessenger']>,
    ReturnType<(typeof CONTROLLER_MESSENGERS)[Name]['getInitMessenger']>
  >;
};

export interface InitModularizedControllersFunctionRequest {
  baseControllerMessenger: RootExtendedMessenger;
  controllerInitFunctions: ControllerInitFunctionByControllerName;
  existingControllersByName?: Partial<ControllerByName>;
  getGlobalChainId: () => Hex;
  getState: () => RootState;
  analyticsId: string;
  initialKeyringState?: KeyringControllerState | null;
  qrKeyringScanner: QrKeyringDeferredPromiseBridge;
  codefiTokenApiV2: CodefiTokenPricesServiceV2;
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  removeAccount: (address: string) => Promise<void>;
  ///: END:ONLY_INCLUDE_IF
  persistedState: ControllerPersistedState;
}

/**
 * Function to initialize the controllers in the engine.
 */
export type InitModularizedControllersFunction = (
  request: InitModularizedControllersFunctionRequest,
) => {
  controllersByName: ControllerByName;
};
