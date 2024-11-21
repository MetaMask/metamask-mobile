import { ExtendedControllerMessenger } from '../ExtendedControllerMessenger';
import {
  AccountTrackerController,
  AccountTrackerControllerState,
  CurrencyRateController,
  CurrencyRateStateChange,
  GetCurrencyRateState,
  CurrencyRateState,
  NftController,
  NftControllerState,
  NftDetectionController,
  TokenListController,
  TokenListControllerActions,
  TokenListControllerEvents,
  GetTokenListState,
  TokenListStateChange,
  TokenListState,
  TokensController,
  TokensControllerActions,
  TokensControllerEvents,
  TokensControllerState,
  TokenBalancesController,
  TokenBalancesControllerState,
  TokenDetectionController,
  TokenRatesController,
  TokenRatesControllerState,
  AssetsContractController,
  AssetsContractControllerGetERC20BalanceOfAction,
  AssetsContractControllerGetERC721AssetNameAction,
  AssetsContractControllerGetERC721AssetSymbolAction,
  AssetsContractControllerGetERC721TokenURIAction,
  AssetsContractControllerGetERC721OwnerOfAction,
  AssetsContractControllerGetERC1155BalanceOfAction,
  AssetsContractControllerGetERC1155TokenURIAction,
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
  TransactionControllerEvents,
  TransactionControllerState,
} from '@metamask/transaction-controller';
import {
  GasFeeController,
  GasFeeStateChange,
  GetGasFeeState,
  GasFeeState,
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
import SwapsController from '@metamask/swaps-controller';
import { SwapsState } from '@metamask/swaps-controller/dist/SwapsController';
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
  SnapControllerEvents,
  SnapControllerActions,
  SnapsRegistryState,
  PersistedSnapControllerState,
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
import { BaseState } from '@metamask/base-controller';
import { getPermissionSpecifications } from '../Permissions/specifications.js';

type PermissionsByRpcMethod = ReturnType<typeof getPermissionSpecifications>;
type Permissions = PermissionsByRpcMethod[keyof PermissionsByRpcMethod];

///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
type AuthenticationControllerActions = AuthenticationController.AllowedActions;
type UserStorageControllerActions = UserStorageController.AllowedActions;
type NotificationsServicesControllerActions =
  NotificationServicesController.AllowedActions;

type SnapsGlobalActions =
  | SnapControllerActions
  | SubjectMetadataControllerActions
  | PhishingControllerActions
  | SnapsAllowedActions;

type SnapsGlobalEvents =
  | SnapControllerEvents
  | SubjectMetadataControllerEvents
  | PhishingControllerEvents
  | SnapsAllowedEvents;
///: END:ONLY_INCLUDE_IF

type GlobalActions =
  | AddressBookControllerActions
  | ApprovalControllerActions
  | GetCurrencyRateState
  | GetGasFeeState
  | GetTokenListState
  | KeyringControllerActions
  | NetworkControllerActions
  | PermissionControllerActions
  | SignatureControllerActions
  | LoggingControllerActions
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  | SnapsGlobalActions
  | AuthenticationControllerActions
  | UserStorageControllerActions
  | NotificationsServicesControllerActions
  ///: END:ONLY_INCLUDE_IF
  | KeyringControllerActions
  | AccountsControllerActions
  | PreferencesControllerActions
  | PPOMControllerActions
  | TokensControllerActions
  | TokenListControllerActions
  | SelectedNetworkControllerActions
  | SmartTransactionsControllerActions
  | AssetsContractControllerGetERC20BalanceOfAction
  | AssetsContractControllerGetERC721AssetNameAction
  | AssetsContractControllerGetERC721AssetSymbolAction
  | AssetsContractControllerGetERC721TokenURIAction
  | AssetsContractControllerGetERC721OwnerOfAction
  | AssetsContractControllerGetERC1155BalanceOfAction
  | AssetsContractControllerGetERC1155TokenURIAction;

type GlobalEvents =
  | AddressBookControllerEvents
  | ApprovalControllerEvents
  | CurrencyRateStateChange
  | GasFeeStateChange
  | KeyringControllerEvents
  | TokenListStateChange
  | NetworkControllerEvents
  | PermissionControllerEvents
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  | SnapsGlobalEvents
  ///: END:ONLY_INCLUDE_IF
  | SignatureControllerEvents
  | LoggingControllerEvents
  | KeyringControllerEvents
  | PPOMControllerEvents
  | AccountsControllerEvents
  | PreferencesControllerEvents
  | TokensControllerEvents
  | TokenListControllerEvents
  | TransactionControllerEvents
  | SelectedNetworkControllerEvents
  | SmartTransactionsControllerEvents;

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
  SubjectMetadataController: SubjectMetadataController;
  AuthenticationController: AuthenticationController.Controller;
  UserStorageController: UserStorageController.Controller;
  NotificationServicesController: NotificationServicesController.Controller;
  NotificationServicesPushController: NotificationServicesPushController.Controller;
  ///: END:ONLY_INCLUDE_IF
  SwapsController: SwapsController;
}

export interface EngineState {
  AccountTrackerController: AccountTrackerControllerState;
  AddressBookController: AddressBookControllerState;
  AssetsContractController: BaseState;
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
  SwapsController: SwapsState;
  GasFeeController: GasFeeState;
  TokensController: TokensControllerState;
  TokenDetectionController: BaseState;
  NftDetectionController: BaseState;
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
