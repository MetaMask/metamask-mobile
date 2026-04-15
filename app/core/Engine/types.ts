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
import {
  AssetsController,
  AssetsControllerActions,
  AssetsControllerEvents,
  AssetsControllerState,
} from '@metamask/assets-controller';
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
  TransakService,
  TransakServiceActions,
  TransakServiceEvents,
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
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import {
  SnapController,
  ExecutionService,
  PersistedSnapControllerState,
  SnapControllerEvents,
  SnapControllerActions,
  SnapRegistryController,
  SnapRegistryControllerState,
  SnapInterfaceControllerState,
  SnapInterfaceControllerEvents,
  SnapInterfaceControllerActions,
  SnapInterfaceController,
  SnapRegistryControllerActions,
  SnapRegistryControllerEvents,
  CronjobControllerState,
  CronjobControllerEvents,
  CronjobControllerActions,
  CronjobController,
  MultichainRoutingServiceActions,
  WebSocketService,
  WebSocketServiceActions,
  MultichainRoutingService,
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
  MoneyAccountController,
  MoneyAccountControllerActions,
  MoneyAccountControllerEvents,
  MoneyAccountControllerState,
} from '@metamask/money-account-controller';
import {
  GeolocationController,
  GeolocationControllerState,
  GeolocationControllerActions,
  GeolocationControllerEvents,
  GeolocationApiService,
  GeolocationApiServiceActions,
} from '@metamask/geolocation-controller';
import {
  PerpsController,
  PerpsControllerState,
  PerpsControllerActions,
  PerpsControllerEvents,
} from '@metamask/perps-controller';
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
import { CardController } from './controllers/card-controller/CardController';
import type {
  CardControllerState,
  CardControllerActions,
  CardControllerEvents,
} from './controllers/card-controller/types';
import {
  SeedlessOnboardingController,
  SeedlessOnboardingControllerState,
  SeedlessOnboardingControllerEvents,
  SeedlessOnboardingControllerActions,
} from '@metamask/seedless-onboarding-controller';
import { EncryptionKey } from '../Encryptor/types';

import { Hex } from '@metamask/utils';

import { MESSENGER_FACTORIES } from './messengers';
import type { RootState } from '../../reducers';
import {
  AppMetadataController,
  AppMetadataControllerActions,
  AppMetadataControllerEvents,
  AppMetadataControllerState,
} from '@metamask/app-metadata-controller';
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
import {
  AiDigestController,
  AiDigestControllerActions,
  AiDigestControllerEvents,
  AiDigestControllerState,
} from '@metamask/ai-controllers';
import {
  SocialController,
  SocialService,
  type SocialControllerActions,
  type SocialControllerEvents,
  type SocialControllerState,
  type SocialServiceActions,
  type SocialServiceEvents,
} from '@metamask/social-controllers';
import {
  ComplianceController,
  ComplianceControllerActions,
  ComplianceControllerEvents,
  ComplianceControllerState,
  ComplianceService,
  ComplianceServiceActions,
  ComplianceServiceEvents,
} from '@metamask/compliance-controller';
import { captureException } from '@sentry/react-native';

/**
 * Controllers that area always instantiated
 */
type RequiredControllers = Omit<
  MessengerClients,
  | 'GeolocationApiService'
  | 'MultichainRoutingService'
  | 'RewardsDataService'
  | 'SnapKeyringBuilder'
  | 'StorageService'
  | 'ComplianceService'
>;

/**
 * Controllers that are sometimes not instantiated
 */
type OptionalControllers = Pick<
  MessengerClients,
  | 'GeolocationApiService'
  | 'MultichainRoutingService'
  | 'RewardsDataService'
  | 'SnapKeyringBuilder'
  | 'StorageService'
  | 'ComplianceService'
>;

type PermissionsByRpcMethod = ReturnType<typeof getPermissionSpecifications>;
type Permissions = PermissionsByRpcMethod[keyof PermissionsByRpcMethod];

///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
// TODO: Abstract this into controller utils for SnapsController
type SnapsGlobalActions =
  | SnapControllerActions
  | SnapRegistryControllerActions
  | SubjectMetadataControllerActions
  | PhishingControllerActions;

type SnapsGlobalEvents =
  | SnapControllerEvents
  | SnapRegistryControllerEvents
  | SubjectMetadataControllerEvents
  | PhishingControllerEvents;
///: END:ONLY_INCLUDE_IF

type GlobalActions =
  ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
  | SamplePetnamesControllerActions
  ///: END:ONLY_INCLUDE_IF
  | AccountTrackerControllerActions
  | AssetsControllerActions
  | NftControllerActions
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
  | TokenSearchDiscoveryDataControllerActions
  | MultichainNetworkControllerActions
  | BridgeControllerActions
  | BridgeStatusControllerActions
  | EarnControllerActions
  | MoneyAccountControllerActions
  | GeolocationControllerActions
  | GeolocationApiServiceActions
  | PerpsControllerActions
  | PredictControllerActions
  | CardControllerActions
  | RewardsControllerActions
  | RewardsDataServiceActions
  | AppMetadataControllerActions
  | MultichainRoutingServiceActions
  | DeFiPositionsControllerActions
  | StorageServiceActions
  | DelegationControllerActions
  | SeedlessOnboardingControllerActions
  | NftDetectionControllerActions
  | ProfileMetricsControllerActions
  | ProfileMetricsServiceActions
  | RampsControllerActions
  | RampsServiceActions
  | AiDigestControllerActions
  | SocialControllerActions
  | SocialServiceActions
  | ComplianceControllerActions
  | ComplianceServiceActions
  | TransakServiceActions;

type GlobalEvents =
  ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
  | SamplePetnamesControllerEvents
  ///: END:ONLY_INCLUDE_IF
  | AccountTrackerControllerEvents
  | AssetsControllerEvents
  | NftControllerEvents
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
  | TokenSearchDiscoveryDataControllerEvents
  | SnapKeyringEvents
  | MultichainNetworkControllerEvents
  | BridgeControllerEvents
  | BridgeStatusControllerEvents
  | EarnControllerEvents
  | MoneyAccountControllerEvents
  | GeolocationControllerEvents
  | PerpsControllerEvents
  | PredictControllerEvents
  | CardControllerEvents
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
  | RampsServiceEvents
  | AiDigestControllerEvents
  | SocialControllerEvents
  | SocialServiceEvents
  | ComplianceControllerEvents
  | ComplianceServiceEvents
  | TransakServiceEvents;

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
    captureException,
  });

/**
 * Type definition for the root messenger used in the Engine.
 * It extends the root messenger with global actions and events.
 */
export type RootMessenger = Messenger<'Root', GlobalActions, GlobalEvents>;

export const getRootMessenger = (): RootMessenger =>
  new Messenger<'Root', GlobalActions, GlobalEvents>({
    namespace: 'Root',
    captureException,
  });

/**
 * All mobile controllers, keyed by name
 */
// Interfaces are incompatible with our controllers and state types by default.
// Adding an index signature fixes this, but at the cost of widening the type unnecessarily.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type MessengerClients = {
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
  AssetsController: AssetsController;
  CurrencyRateController: CurrencyRateController;
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
  SnapRegistryController: SnapRegistryController;
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
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  MultichainBalancesController: MultichainBalancesController;
  MultichainAssetsRatesController: MultichainAssetsRatesController;
  MultichainAssetsController: MultichainAssetsController;
  MultichainRoutingService: MultichainRoutingService;
  MultichainTransactionsController: MultichainTransactionsController;
  MultichainAccountService: MultichainAccountService;
  SnapKeyringBuilder: SnapKeyringBuilder;
  ///: END:ONLY_INCLUDE_IF
  TokenSearchDiscoveryDataController: TokenSearchDiscoveryDataController;
  MultichainNetworkController: MultichainNetworkController;
  BridgeController: BridgeController;
  BridgeStatusController: BridgeStatusController;
  EarnController: EarnController;
  MoneyAccountController: MoneyAccountController;
  GeolocationController: GeolocationController;
  GeolocationApiService: GeolocationApiService;
  PerpsController: PerpsController;
  PredictController: PredictController;
  CardController: CardController;
  RewardsController: RewardsController;
  RewardsDataService: RewardsDataService;
  SeedlessOnboardingController: SeedlessOnboardingController<EncryptionKey>;
  GatorPermissionsController: GatorPermissionsController;
  DelegationController: DelegationController;
  ProfileMetricsController: ProfileMetricsController;
  ProfileMetricsService: ProfileMetricsService;
  RampsService: RampsService;
  AiDigestController: AiDigestController;
  SocialController: SocialController;
  SocialService: SocialService;
  ComplianceService: ComplianceService;
  ComplianceController: ComplianceController;
  TransakService: TransakService;
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
  AssetsController: AssetsControllerState;
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
  TransactionController: TransactionControllerState;
  TransactionPayController: TransactionPayControllerState;
  SmartTransactionsController: SmartTransactionsControllerState;
  GasFeeController: GasFeeState;
  TokensController: TokensControllerState;
  DeFiPositionsController: DeFiPositionsControllerState;
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  SnapController: PersistedSnapControllerState;
  SnapRegistryController: SnapRegistryControllerState;
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
  MoneyAccountController: MoneyAccountControllerState;
  GeolocationController: GeolocationControllerState;
  PerpsController: PerpsControllerState;
  PredictController: PredictControllerState;
  CardController: CardControllerState;
  RewardsController: RewardsControllerState;
  SeedlessOnboardingController: SeedlessOnboardingControllerState;
  ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
  SamplePetnamesController: SamplePetnamesControllerState;
  ///: END:ONLY_INCLUDE_IF
  GatorPermissionsController: GatorPermissionsControllerState;
  DelegationController: DelegationControllerState;
  ProfileMetricsController: ProfileMetricsControllerState;
  AiDigestController: AiDigestControllerState;
  SocialController: SocialControllerState;
  ComplianceController: ComplianceControllerState;
};

/** Messenger client names */
export type MessengerClientName = keyof MessengerClients;

/**
 * Messenger client type
 */
export type MessengerClient = MessengerClients[MessengerClientName];

/** Map of messenger clients by name. */
export type MessengerClientsByName = {
  [Name in MessengerClientName]: MessengerClients[Name];
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
 * Specify messenger clients to initialize.
 */
export type MessengerClientsToInitialize =
  ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
  | 'SamplePetnamesController'
  ///: END:ONLY_INCLUDE_IF
  | 'AccountTrackerController'
  | 'AddressBookController'
  | 'AssetsContractController'
  | 'AssetsController'
  | 'ConnectivityController'
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  | 'AuthenticationController'
  | 'CronjobController'
  | 'ExecutionService'
  | 'SnapController'
  | 'SnapInterfaceController'
  | 'SnapRegistryController'
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
  | 'MultichainRoutingService'
  | 'MultichainTransactionsController'
  | 'MultichainAccountService'
  | 'SnapKeyringBuilder'
  ///: END:ONLY_INCLUDE_IF
  | 'EarnController'
  | 'MoneyAccountController'
  | 'StorageService'
  | 'LoggingController'
  | 'NetworkController'
  | 'AccountTreeController'
  | 'AccountsController'
  | 'ApprovalController'
  | 'CurrencyRateController'
  | 'DeFiPositionsController'
  | 'GasFeeController'
  | 'GeolocationController'
  | 'GeolocationApiService'
  | 'KeyringController'
  | 'MultichainNetworkController'
  | 'NftController'
  | 'NftDetectionController'
  | 'PhishingController'
  | 'RemoteFeatureFlagController'
  | 'SignatureController'
  | 'SeedlessOnboardingController'
  | 'SmartTransactionsController'
  | 'TokenBalancesController'
  | 'TokenDetectionController'
  | 'TokenListController'
  | 'TokenRatesController'
  | 'TokensController'
  | 'TokenSearchDiscoveryDataController'
  | 'TransactionController'
  | 'TransactionPayController'
  | 'PermissionController'
  | 'PerpsController'
  | 'PredictController'
  | 'CardController'
  | 'PreferencesController'
  | 'BridgeController'
  | 'BridgeStatusController'
  | 'NetworkEnablementController'
  | 'RewardsController'
  | 'RewardsDataService'
  | 'RampsController'
  | 'RampsService'
  | 'TransakService'
  | 'GatorPermissionsController'
  | 'DelegationController'
  | 'SelectedNetworkController'
  | 'ProfileMetricsController'
  | 'ProfileMetricsService'
  | 'AnalyticsController'
  | 'AiDigestController'
  | 'SocialService'
  | 'SocialController'
  | 'ComplianceService'
  | 'ComplianceController';

/**
 * Callback that returns a controller messenger for a specific controller.
 */
export type ControllerMessengerCallback = (
  baseControllerMessenger: RootExtendedMessenger,
) => ControllerMessenger;

/**
 * Persisted state for all messenger clients.
 * e.g. `{ TransactionController: { transactions: [] } }`.
 */
type MessengerClientPersistedState = Partial<{
  [Name in Exclude<
    MessengerClientName,
    (typeof STATELESS_NON_CONTROLLER_NAMES)[number]
  >]: Partial<MessengerClientsByName[Name]['state']>;
}>;

/**
 * Map of messenger client messengers by name.
 */
export type MessengerClientMessengersByName = typeof MESSENGER_FACTORIES;

/**
 * Request to initialize and return a messenger client instance.
 * Includes standard data and methods not coupled to any specific messenger client.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type MessengerClientInitRequest<
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
   * Throws an error if the messenger client is not yet initialized.
   *
   * @param name - The name of the messenger client to retrieve.
   */
  getMessengerClient<Name extends MessengerClientName>(
    name: Name,
  ): MessengerClientsByName[Name];

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
  persistedState: MessengerClientPersistedState;
};

/**
 * Function to initialize a controller instance and return associated data.
 */
export type MessengerClientInitFunction<
  MessengerClientType extends MessengerClient,
  ControllerMessengerType extends ControllerMessenger,
  InitMessengerType extends void | ControllerMessenger = void,
> = (
  request: MessengerClientInitRequest<
    ControllerMessengerType,
    InitMessengerType
  >,
) => {
  controller: MessengerClientType;
};

/**
 * Map of messenger client init functions by messenger client name.
 */
export type MessengerClientInitFunctionsByMessengerClientName = {
  [Name in MessengerClientsToInitialize]: MessengerClientInitFunction<
    MessengerClientsByName[Name],
    ReturnType<(typeof MESSENGER_FACTORIES)[Name]['getMessenger']>,
    ReturnType<(typeof MESSENGER_FACTORIES)[Name]['getInitMessenger']>
  >;
};

export interface InitMessengerClientsFunctionRequest {
  baseControllerMessenger: RootExtendedMessenger;
  initFunctions: MessengerClientInitFunctionsByMessengerClientName;
  getGlobalChainId: () => Hex;
  getState: () => RootState;
  analyticsId: string;
  initialKeyringState?: KeyringControllerState | null;
  qrKeyringScanner: QrKeyringDeferredPromiseBridge;
  codefiTokenApiV2: CodefiTokenPricesServiceV2;
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  removeAccount: (address: string) => Promise<void>;
  ///: END:ONLY_INCLUDE_IF
  persistedState: MessengerClientPersistedState;
}

/**
 * Function to initialize the messenger clients in the engine.
 */
export type InitMessengerClientsFunction = (
  request: InitMessengerClientsFunctionRequest,
) => {
  messengerClientsByName: MessengerClientsByName;
};
