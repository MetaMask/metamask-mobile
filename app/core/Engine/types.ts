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
  TokenListService,
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
import type {
  NetworkConnectionBannerController,
  NetworkConnectionBannerControllerState,
  NetworkConnectionBannerControllerActions,
  NetworkConnectionBannerControllerEvents,
} from '@metamask/network-connection-banner-controller';
import {
  ConnectivityController,
  ConnectivityControllerActions,
  ConnectivityControllerEvents,
  ConnectivityControllerState,
} from '@metamask/connectivity-controller';
import {
  ConfigRegistryController,
  type ConfigRegistryControllerState,
  type ConfigRegistryControllerEvents,
  ConfigRegistryControllerActions,
  ConfigRegistryApiServiceActions,
  ConfigRegistryApiServiceEvents,
  ConfigRegistryApiService,
} from '@metamask/config-registry-controller';
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
  PreferencesControllerActions,
  PreferencesControllerEvents,
} from '@metamask/preferences-controller';
import type {
  PreferencesControllerWithSavedGasFees,
  PreferencesStateWithSavedGasFees,
} from './controllers/preferences-controller-types';
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
  ///: BEGIN:ONLY_INCLUDE_IF(snaps)
  SubjectMetadataController,
  SubjectMetadataControllerActions,
  SubjectMetadataControllerEvents,
  SubjectMetadataControllerState,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/permission-controller';
///: BEGIN:ONLY_INCLUDE_IF(snaps)
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
///: BEGIN:ONLY_INCLUDE_IF(snaps)
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
  OHLCVService,
  OHLCVServiceActions,
  OHLCVServiceEvents,
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
  MoneyAccountBalanceService,
  MoneyAccountBalanceServiceActions,
  MoneyAccountBalanceServiceEvents,
} from '@metamask/money-account-balance-service';
import {
  MoneyAccountApiDataService,
  type MoneyAccountApiDataServiceActions,
  type MoneyAccountApiDataServiceEvents,
} from '@metamask/money-account-api-data-service';
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
import { QrSyncController } from '../QrSync/QrSyncController';
import type {
  QrSyncControllerState,
  QrSyncControllerActions,
  QrSyncControllerEvents,
} from '../QrSync/controller-types';
import {
  QrSyncProvisioningService,
  type QrSyncProvisioningServiceActions,
} from '../QrSync/services/qr-sync-provisioning-service';
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
import type {
  SnapAccountService,
  SnapAccountServiceActions,
  SnapAccountServiceEvents,
} from '@metamask/snap-account-service';
import {
  GatorPermissionsController,
  GatorPermissionsControllerActions,
  GatorPermissionsControllerEvents,
  GatorPermissionsControllerState,
} from '@metamask/gator-permissions-controller';
import {
  DelegationController,
  DelegationControllerActions,
  DelegationControllerEvents,
} from '@metamask/delegation-controller';
// `DelegationControllerState` isn't re-exported from the package's public
// entry, so we go through the `@metamask/delegation-controller/types` path
// alias declared in `tsconfig.json`. Once the upstream package re-exports it
// (or we move to Node16/NodeNext module resolution), drop both the alias and
// this dedicated import.
import type { DelegationControllerState } from '@metamask/delegation-controller/types';
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
  ProofOfOwnershipService,
  ProofOfOwnershipServiceActions,
  ProofOfOwnershipServiceEvents,
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
  TransactionPayControllerActions,
  TransactionPayControllerEvents,
  TransactionPayControllerState,
} from '@metamask/transaction-pay-controller';
import {
  AiDigestController,
  AiDigestControllerActions,
  AiDigestControllerEvents,
  AiDigestControllerState,
} from '@metamask/ai-controllers';
import {
  ClientController,
  ClientControllerActions,
  ClientControllerEvents,
  ClientControllerState,
} from '@metamask/client-controller';
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
  AuthenticatedUserStorageService,
  type AuthenticatedUserStorageActions,
  type AuthenticatedUserStorageEvents,
} from '@metamask/authenticated-user-storage';
import {
  ComplianceController,
  ComplianceControllerActions,
  ComplianceControllerEvents,
  ComplianceControllerState,
  ComplianceService,
  ComplianceServiceActions,
  ComplianceServiceEvents,
} from '@metamask/compliance-controller';
import {
  ChompApiService,
  ChompApiServiceActions,
  type ChompApiServiceEvents,
} from '@metamask/chomp-api-service';
import {
  MoneyAccountUpgradeController,
  MoneyAccountUpgradeControllerActions,
  MoneyAccountUpgradeControllerEvents,
  MoneyAccountUpgradeControllerState,
} from '@metamask/money-account-upgrade-controller';
import { captureException } from '@sentry/react-native';
import { Wallet } from '@metamask/wallet';

/**
 * Controllers that are always instantiated
 */
type RequiredControllers = Omit<
  MessengerClients,
  | 'GeolocationApiService'
  | 'MultichainRoutingService'
  | 'RewardsDataService'
  | 'StorageService'
  | 'ComplianceService'
  | 'ChompApiService'
>;

/**
 * Controllers that are sometimes not instantiated
 */
type OptionalControllers = Pick<
  MessengerClients,
  | 'GeolocationApiService'
  | 'MultichainRoutingService'
  | 'RewardsDataService'
  | 'StorageService'
  | 'ComplianceService'
  | 'ChompApiService'
>;

type PermissionsByRpcMethod = ReturnType<typeof getPermissionSpecifications>;
type Permissions = PermissionsByRpcMethod[keyof PermissionsByRpcMethod];

///: BEGIN:ONLY_INCLUDE_IF(snaps)
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

export type GlobalActions =
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
  | NetworkConnectionBannerControllerActions
  | PermissionControllerActions
  | SignatureControllerActions
  | LoggingControllerActions
  | AnalyticsControllerActions
  ///: BEGIN:ONLY_INCLUDE_IF(snaps)
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
  | OHLCVServiceActions
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  | MultichainBalancesControllerActions
  | MultichainAssetsControllerActions
  | MultichainAssetsRatesControllerActions
  | MultichainTransactionsControllerActions
  | MultichainAccountServiceActions
  | SnapAccountServiceActions
  ///: END:ONLY_INCLUDE_IF
  | AccountsControllerActions
  | AccountTreeControllerActions
  | PreferencesControllerActions
  | TokenBalancesControllerActions
  | TokensControllerActions
  | TokenDetectionControllerActions
  | TokenRatesControllerActions
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
  | MoneyAccountBalanceServiceActions
  | MoneyAccountApiDataServiceActions
  | GeolocationControllerActions
  | GeolocationApiServiceActions
  | PerpsControllerActions
  | PredictControllerActions
  | CardControllerActions
  | QrSyncControllerActions
  | QrSyncProvisioningServiceActions
  | ClientControllerActions
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
  | ProofOfOwnershipServiceActions
  | RampsControllerActions
  | RampsServiceActions
  | AiDigestControllerActions
  | SocialControllerActions
  | SocialServiceActions
  | AuthenticatedUserStorageActions
  | ComplianceControllerActions
  | ComplianceServiceActions
  | TransakServiceActions
  | ConfigRegistryControllerActions
  | ConfigRegistryApiServiceActions
  | ChompApiServiceActions
  | MoneyAccountUpgradeControllerActions;

export type GlobalEvents =
  ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
  | SamplePetnamesControllerEvents
  ///: END:ONLY_INCLUDE_IF
  | AccountTrackerControllerEvents
  | AssetsControllerEvents
  | NftControllerEvents
  | AddressBookControllerEvents
  | ApprovalControllerEvents
  | ConnectivityControllerEvents
  | ConfigRegistryControllerEvents
  | ConfigRegistryApiServiceEvents
  | CurrencyRateControllerEvents
  | GasFeeControllerEvents
  | GatorPermissionsControllerEvents
  | KeyringControllerEvents
  | NetworkControllerEvents
  | NetworkEnablementControllerEvents
  | NetworkConnectionBannerControllerEvents
  | PermissionControllerEvents
  ///: BEGIN:ONLY_INCLUDE_IF(snaps)
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
  | OHLCVServiceEvents
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  | MultichainBalancesControllerEvents
  | MultichainAssetsControllerEvents
  | MultichainAssetsRatesControllerEvents
  | MultichainTransactionsControllerEvents
  | MultichainAccountServiceEvents
  | SnapAccountServiceEvents
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
  | MoneyAccountBalanceServiceEvents
  | MoneyAccountApiDataServiceEvents
  | GeolocationControllerEvents
  | PerpsControllerEvents
  | PredictControllerEvents
  | CardControllerEvents
  | QrSyncControllerEvents
  | ClientControllerEvents
  | RewardsControllerEvents
  | AppMetadataControllerEvents
  | SeedlessOnboardingControllerEvents
  | DeFiPositionsControllerEvents
  | AccountTreeControllerEvents
  | DelegationControllerEvents
  | NftDetectionControllerEvents
  | ProfileMetricsControllerEvents
  | ProfileMetricsServiceEvents
  | ProofOfOwnershipServiceEvents
  | RampsControllerEvents
  | RampsServiceEvents
  | AiDigestControllerEvents
  | SocialControllerEvents
  | SocialServiceEvents
  | AuthenticatedUserStorageEvents
  | ComplianceControllerEvents
  | ComplianceServiceEvents
  | TransakServiceEvents
  | ChompApiServiceEvents
  | MoneyAccountUpgradeControllerEvents;

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
export type RootMessenger<
  AllowedActions extends GlobalActions = GlobalActions,
  AllowedEvents extends GlobalEvents = GlobalEvents,
> = Messenger<'Root', AllowedActions, AllowedEvents>;

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
  NetworkConnectionBannerController: NetworkConnectionBannerController;
  ConfigRegistryController: ConfigRegistryController;
  ConfigRegistryApiService: ConfigRegistryApiService;
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
  PreferencesController: PreferencesControllerWithSavedGasFees;
  RampsController: RampsController;
  RemoteFeatureFlagController: RemoteFeatureFlagController;
  TokenBalancesController: TokenBalancesController;
  TokenDetectionController: TokenDetectionController;
  TokenRatesController: TokenRatesController;
  TokensController: TokensController;
  DeFiPositionsController: DeFiPositionsController;
  TransactionController: TransactionController;
  TransactionPayController: TransactionPayController;
  SmartTransactionsController: SmartTransactionsController;
  SignatureController: SignatureController;
  StorageService: StorageService;
  ///: BEGIN:ONLY_INCLUDE_IF(snaps)
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
  OHLCVService: OHLCVService;
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  MultichainBalancesController: MultichainBalancesController;
  MultichainAssetsRatesController: MultichainAssetsRatesController;
  MultichainAssetsController: MultichainAssetsController;
  MultichainRoutingService: MultichainRoutingService;
  MultichainTransactionsController: MultichainTransactionsController;
  MultichainAccountService: MultichainAccountService;
  SnapAccountService: SnapAccountService;
  ///: END:ONLY_INCLUDE_IF
  TokenSearchDiscoveryDataController: TokenSearchDiscoveryDataController;
  MultichainNetworkController: MultichainNetworkController;
  BridgeController: BridgeController;
  BridgeStatusController: BridgeStatusController;
  EarnController: EarnController;
  MoneyAccountController: MoneyAccountController;
  MoneyAccountBalanceService: MoneyAccountBalanceService;
  MoneyAccountApiDataService: MoneyAccountApiDataService;
  GeolocationController: GeolocationController;
  GeolocationApiService: GeolocationApiService;
  PerpsController: PerpsController;
  PredictController: PredictController;
  CardController: CardController;
  QrSyncController: QrSyncController;
  QrSyncProvisioningService: QrSyncProvisioningService;
  ClientController: ClientController;
  RewardsController: RewardsController;
  RewardsDataService: RewardsDataService;
  SeedlessOnboardingController: SeedlessOnboardingController<EncryptionKey>;
  GatorPermissionsController: GatorPermissionsController;
  DelegationController: DelegationController;
  ProfileMetricsController: ProfileMetricsController;
  ProfileMetricsService: ProfileMetricsService;
  ProofOfOwnershipService: ProofOfOwnershipService;
  RampsService: RampsService;
  AiDigestController: AiDigestController;
  SocialController: SocialController;
  SocialService: SocialService;
  AuthenticatedUserStorageService: AuthenticatedUserStorageService;
  ComplianceService: ComplianceService;
  ComplianceController: ComplianceController;
  TransakService: TransakService;
  ChompApiService: ChompApiService;
  MoneyAccountUpgradeController: MoneyAccountUpgradeController;
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
  NetworkConnectionBannerController: NetworkConnectionBannerControllerState;
  ConfigRegistryController: ConfigRegistryControllerState;
  NftController: NftControllerState;
  CurrencyRateController: CurrencyRateState;
  KeyringController: KeyringControllerState;
  NetworkController: NetworkState;
  NetworkEnablementController: NetworkEnablementControllerState;
  PreferencesController: PreferencesStateWithSavedGasFees;
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
  ///: BEGIN:ONLY_INCLUDE_IF(snaps)
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
  QrSyncController: QrSyncControllerState;
  ClientController: ClientControllerState;
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
  MoneyAccountUpgradeController: MoneyAccountUpgradeControllerState;
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
  | 'AssetsContractController'
  | 'AssetsController'
  | 'NetworkConnectionBannerController'
  | 'ConfigRegistryController'
  | 'ConfigRegistryApiService'
  ///: BEGIN:ONLY_INCLUDE_IF(snaps)
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
  | 'OHLCVService'
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  | 'MultichainAssetsController'
  | 'MultichainAssetsRatesController'
  | 'MultichainBalancesController'
  | 'MultichainRoutingService'
  | 'MultichainTransactionsController'
  | 'MultichainAccountService'
  | 'SnapAccountService'
  ///: END:ONLY_INCLUDE_IF
  | 'EarnController'
  | 'MoneyAccountController'
  | 'MoneyAccountBalanceService'
  | 'MoneyAccountApiDataService'
  | 'LoggingController'
  | 'AccountTreeController'
  | 'CurrencyRateController'
  | 'DeFiPositionsController'
  | 'GasFeeController'
  | 'GeolocationController'
  | 'GeolocationApiService'
  | 'MultichainNetworkController'
  | 'NftController'
  | 'NftDetectionController'
  | 'PhishingController'
  | 'SignatureController'
  | 'SeedlessOnboardingController'
  | 'SmartTransactionsController'
  | 'TokenBalancesController'
  | 'TokenDetectionController'
  | 'TokenRatesController'
  | 'TokensController'
  | 'TokenSearchDiscoveryDataController'
  | 'TransactionPayController'
  | 'PermissionController'
  | 'PerpsController'
  | 'PredictController'
  | 'CardController'
  | 'QrSyncController'
  | 'QrSyncProvisioningService'
  | 'ClientController'
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
  | 'ProofOfOwnershipService'
  | 'AnalyticsController'
  | 'AiDigestController'
  | 'SocialService'
  | 'SocialController'
  | 'AuthenticatedUserStorageService'
  | 'ComplianceService'
  | 'ComplianceController'
  | 'ChompApiService'
  | 'MoneyAccountUpgradeController';

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
   * Shared token list service instance.
   * Owns a TanStack Query cache (4-hour stale time) so that both
   * TokenDetectionController and TokensController share the same in-memory
   * cache without redundant network requests.
   */
  tokenListService: TokenListService;

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
  wallet: Wallet;
  baseControllerMessenger: RootExtendedMessenger;
  initFunctions: MessengerClientInitFunctionsByMessengerClientName;
  getGlobalChainId: () => Hex;
  getState: () => RootState;
  analyticsId: string;
  codefiTokenApiV2: CodefiTokenPricesServiceV2;
  tokenListService: TokenListService;
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  removeAccount: (address: string) => Promise<void>;
  ///: END:ONLY_INCLUDE_IF
  persistedState: MessengerClientPersistedState;
}

/**
 * Map of only the messenger clients that `initMessengerClients` constructs.
 * Wallet-owned controllers (e.g. `AccountsController`) are intentionally absent;
 * resolve those via `wallet.getInstance(...)`, not this map.
 */
export type InitializedMessengerClientsByName = {
  [Name in MessengerClientsToInitialize]: MessengerClientsByName[Name];
};

/**
 * Function to initialize the messenger clients in the engine.
 */
export type InitMessengerClientsFunction = (
  request: InitMessengerClientsFunctionRequest,
) => {
  messengerClientsByName: InitializedMessengerClientsByName;
};
