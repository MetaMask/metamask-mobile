import { ExtendedControllerMessenger } from '../ExtendedControllerMessenger';
import {
  CurrencyRateStateChange,
  GetCurrencyRateState,
  GetTokenListState,
  TokenListStateChange,
  TokensControllerActions,
  TokensControllerEvents,
  TokenListControllerActions,
  TokenListControllerEvents,
  AssetsContractControllerGetERC20BalanceOfAction,
  AssetsContractControllerGetERC721AssetNameAction,
  AssetsContractControllerGetERC721AssetSymbolAction,
  AssetsContractControllerGetERC721TokenURIAction,
  AssetsContractControllerGetERC721OwnerOfAction,
  AssetsContractControllerGetERC1155BalanceOfAction,
  AssetsContractControllerGetERC1155TokenURIAction,
} from '@metamask/assets-controllers';
import {
  AddressBookControllerActions,
  AddressBookControllerEvents,
} from '@metamask/address-book-controller';
import {
  KeyringControllerActions,
  KeyringControllerEvents,
} from '@metamask/keyring-controller';
import {
  NetworkControllerActions,
  NetworkControllerEvents,
} from '@metamask/network-controller';
import {
  PhishingControllerActions,
  PhishingControllerEvents,
} from '@metamask/phishing-controller';
import {
  PreferencesControllerActions,
  PreferencesControllerEvents,
} from '@metamask/preferences-controller';
import { TransactionControllerEvents } from '@metamask/transaction-controller';
import {
  GasFeeStateChange,
  GetGasFeeState,
} from '@metamask/gas-fee-controller';
import {
  ApprovalControllerActions,
  ApprovalControllerEvents,
} from '@metamask/approval-controller';
import {
  SelectedNetworkControllerEvents,
  SelectedNetworkControllerActions,
} from '@metamask/selected-network-controller';
import {
  PermissionControllerActions,
  PermissionControllerEvents,
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  SubjectMetadataControllerActions,
  SubjectMetadataControllerEvents,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/permission-controller';
import {
  PPOMControllerActions,
  PPOMControllerEvents,
} from '@metamask/ppom-validator';
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import {
  AllowedActions as SnapsAllowedActions,
  AllowedEvents as SnapsAllowedEvents,
  SnapControllerEvents,
  SnapControllerActions,
} from '@metamask/snaps-controllers';
///: END:ONLY_INCLUDE_IF
import {
  LoggingControllerActions,
  LoggingControllerEvents,
} from '@metamask/logging-controller';
import {
  SignatureControllerActions,
  SignatureControllerEvents,
} from '@metamask/signature-controller';
import {
  type SmartTransactionsControllerActions,
  type SmartTransactionsControllerEvents,
} from '@metamask/smart-transactions-controller';
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import {
  AuthenticationController,
  UserStorageController,
} from '@metamask/profile-sync-controller';
import { NotificationServicesController } from '@metamask/notification-services-controller';
///: END:ONLY_INCLUDE_IF
import {
  AccountsControllerActions,
  AccountsControllerEvents,
} from './controllers/AccountsControllerService';

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
