import { ExtendedControllerMessenger } from '../ExtendedControllerMessenger';
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
} from '@metamask/assets-controllers';
import {
  AddressBookController,
  AddressBookControllerActions,
  AddressBookControllerEvents,
  AddressBookControllerState,
} from '@metamask/address-book-controller';
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
  TransactionController,
  TransactionControllerActions,
  TransactionControllerEvents,
  TransactionControllerState,
  TransactionMeta,
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
import {
  PPOMController,
  PPOMControllerActions,
  PPOMControllerEvents,
  PPOMState,
} from '@metamask/ppom-validator';
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import {
  SnapController,
  AllowedActions as SnapsAllowedActions,
  AllowedEvents as SnapsAllowedEvents,
  PersistedSnapControllerState,
  SnapControllerEvents,
  SnapControllerActions,
  JsonSnapsRegistry as SnapsRegistry,
  SnapsRegistryState,
  SnapsRegistryActions,
  SnapsRegistryEvents,
} from '@metamask/snaps-controllers';
///: END:ONLY_INCLUDE_IF
import {
  LoggingController,
  LoggingControllerActions,
  LoggingControllerEvents,
  LoggingControllerState,
} from '@metamask/logging-controller';
import {
  SignatureController,
  SignatureControllerActions,
  SignatureControllerEvents,
} from '@metamask/signature-controller';
import SmartTransactionsController, {
  type SmartTransactionsControllerActions,
  type SmartTransactionsControllerEvents,
  SmartTransactionsControllerState,
} from '@metamask/smart-transactions-controller';
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import {
  AuthenticationController,
  UserStorageController,
} from '@metamask/profile-sync-controller';
import {
  NotificationServicesPushController,
  NotificationServicesController,
} from '@metamask/notification-services-controller';
///: END:ONLY_INCLUDE_IF
import {
  AccountsController,
  AccountsControllerActions,
  AccountsControllerEvents,
  AccountsControllerState,
} from '@metamask/accounts-controller';
import { getPermissionSpecifications } from '../Permissions/specifications.js';

/**
 * Controllers that area always instantiated
 */
type RequiredControllers = Omit<Controllers, 'PPOMController'>;

/**
 * Controllers that are sometimes not instantiated
 */
type OptionalControllers = Pick<Controllers, 'PPOMController'>;

type PermissionsByRpcMethod = ReturnType<typeof getPermissionSpecifications>;
type Permissions = PermissionsByRpcMethod[keyof PermissionsByRpcMethod];

///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
// TODO: Abstract this into controller utils for SnapsController
type SnapsGlobalActions =
  | SnapControllerActions
  | SnapsRegistryActions
  | SubjectMetadataControllerActions
  | PhishingControllerActions
  | SnapsAllowedActions;
type SnapsGlobalEvents =
  | SnapControllerEvents
  | SnapsRegistryEvents
  | SubjectMetadataControllerEvents
  | PhishingControllerEvents
  | SnapsAllowedEvents;
///: END:ONLY_INCLUDE_IF

type GlobalActions =
  | AccountTrackerControllerActions
  | NftControllerActions
  | SwapsControllerActions
  | AddressBookControllerActions
  | ApprovalControllerActions
  | CurrencyRateControllerActions
  | GasFeeControllerActions
  | KeyringControllerActions
  | NetworkControllerActions
  | PermissionControllerActions
  | SignatureControllerActions
  | LoggingControllerActions
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  | SnapsGlobalActions
  | AuthenticationController.Actions
  | UserStorageController.Actions
  | NotificationServicesController.Actions
  | NotificationServicesPushController.Actions
  ///: END:ONLY_INCLUDE_IF
  | AccountsControllerActions
  | PreferencesControllerActions
  | PPOMControllerActions
  | TokenBalancesControllerActions
  | TokensControllerActions
  | TokenRatesControllerActions
  | TokenListControllerActions
  | TransactionControllerActions
  | SelectedNetworkControllerActions
  | SmartTransactionsControllerActions
  | AssetsContractControllerActions;

type GlobalEvents =
  | AccountTrackerControllerEvents
  | NftControllerEvents
  | SwapsControllerEvents
  | AddressBookControllerEvents
  | ApprovalControllerEvents
  | CurrencyRateControllerEvents
  | GasFeeControllerEvents
  | KeyringControllerEvents
  | NetworkControllerEvents
  | PermissionControllerEvents
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  | SnapsGlobalEvents
  | AuthenticationController.Events
  | UserStorageController.Events
  | NotificationServicesController.Events
  | NotificationServicesPushController.Events
  ///: END:ONLY_INCLUDE_IF
  | SignatureControllerEvents
  | LoggingControllerEvents
  | PPOMControllerEvents
  | AccountsControllerEvents
  | PreferencesControllerEvents
  | TokenBalancesControllerEvents
  | TokensControllerEvents
  | TokenRatesControllerEvents
  | TokenListControllerEvents
  | TransactionControllerEvents
  | SelectedNetworkControllerEvents
  | SmartTransactionsControllerEvents
  | AssetsContractControllerEvents;

// TODO: Abstract this into controller utils for TransactionController
export interface TransactionEventPayload {
  transactionMeta: TransactionMeta;
  actionId?: string;
  error?: string;
}

/**
 * Type definition for the controller messenger used in the Engine.
 * It extends the base ControllerMessenger with global actions and events.
 */
export type ControllerMessenger = ExtendedControllerMessenger<
  GlobalActions,
  GlobalEvents
>;

/**
 * All mobile controllers, keyed by name
 */
export interface Controllers {
  AccountsController: AccountsController;
  AccountTrackerController: AccountTrackerController;
  AddressBookController: AddressBookController;
  ApprovalController: ApprovalController;
  AssetsContractController: AssetsContractController;
  CurrencyRateController: CurrencyRateController;
  GasFeeController: GasFeeController;
  KeyringController: KeyringController;
  LoggingController: LoggingController;
  NetworkController: NetworkController;
  NftController: NftController;
  NftDetectionController: NftDetectionController;
  // TODO: Fix permission types
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PermissionController: PermissionController<any, any>;
  SelectedNetworkController: SelectedNetworkController;
  PhishingController: PhishingController;
  PreferencesController: PreferencesController;
  PPOMController: PPOMController;
  TokenBalancesController: TokenBalancesController;
  TokenListController: TokenListController;
  TokenDetectionController: TokenDetectionController;
  TokenRatesController: TokenRatesController;
  TokensController: TokensController;
  TransactionController: TransactionController;
  SmartTransactionsController: SmartTransactionsController;
  SignatureController: SignatureController;
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  SnapController: SnapController;
  SnapsRegistry: SnapsRegistry;
  SubjectMetadataController: SubjectMetadataController;
  AuthenticationController: AuthenticationController.Controller;
  UserStorageController: UserStorageController.Controller;
  NotificationServicesController: NotificationServicesController.Controller;
  NotificationServicesPushController: NotificationServicesPushController.Controller;
  ///: END:ONLY_INCLUDE_IF
  SwapsController: SwapsController;
}

/**
 * Combines required and optional controllers for the Engine context type.
 */
export type EngineContext = RequiredControllers & Partial<OptionalControllers>;

/**
 * All engine state, keyed by controller name
 */
export interface EngineState {
  AccountTrackerController: AccountTrackerControllerState;
  AddressBookController: AddressBookControllerState;
  NftController: NftControllerState;
  TokenListController: TokenListState;
  CurrencyRateController: CurrencyRateState;
  KeyringController: KeyringControllerState;
  NetworkController: NetworkState;
  PreferencesController: PreferencesState;
  PhishingController: PhishingControllerState;
  TokenBalancesController: TokenBalancesControllerState;
  TokenRatesController: TokenRatesControllerState;
  TransactionController: TransactionControllerState;
  SmartTransactionsController: SmartTransactionsControllerState;
  SwapsController: SwapsControllerState;
  GasFeeController: GasFeeState;
  TokensController: TokensControllerState;
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  SnapController: PersistedSnapControllerState;
  SnapsRegistry: SnapsRegistryState;
  SubjectMetadataController: SubjectMetadataControllerState;
  AuthenticationController: AuthenticationController.AuthenticationControllerState;
  UserStorageController: UserStorageController.UserStorageControllerState;
  NotificationServicesController: NotificationServicesController.NotificationServicesControllerState;
  NotificationServicesPushController: NotificationServicesPushController.NotificationServicesPushControllerState;
  ///: END:ONLY_INCLUDE_IF
  PermissionController: PermissionControllerState<Permissions>;
  ApprovalController: ApprovalControllerState;
  LoggingController: LoggingControllerState;
  PPOMController: PPOMState;
  AccountsController: AccountsControllerState;
  SelectedNetworkController: SelectedNetworkControllerState;
}
