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
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  MultichainBalancesControllerState,
  MultichainBalancesController,
  MultichainBalancesControllerEvents,
  MultichainBalancesControllerActions,
  RatesControllerState,
  RatesController,
  RatesControllerEvents,
  RatesControllerActions,
  MultichainAssetsController,
  MultichainAssetsControllerState,
  MultichainAssetsControllerEvents,
  MultichainAssetsControllerActions,
  MultichainAssetsRatesController,
  MultichainAssetsRatesControllerState,
  MultichainAssetsRatesControllerEvents,
  MultichainAssetsRatesControllerActions,
  ///: END:ONLY_INCLUDE_IF
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
  SignatureControllerState,
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
} from '@metamask/remote-feature-flag-controller';
import {
  RemoteFeatureFlagControllerActions,
  RemoteFeatureFlagControllerEvents,
} from '@metamask/remote-feature-flag-controller/dist/remote-feature-flag-controller.cjs';
import {
  RestrictedMessenger,
  ActionConstraint,
  EventConstraint,
} from '@metamask/base-controller';
import {
  TokenSearchDiscoveryController,
  TokenSearchDiscoveryControllerState,
} from '@metamask/token-search-discovery-controller';
import {
  TokenSearchDiscoveryControllerActions,
  TokenSearchDiscoveryControllerEvents,
} from '@metamask/token-search-discovery-controller/dist/token-search-discovery-controller.cjs';
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
import { Hex } from '@metamask/utils';

import { CONTROLLER_MESSENGERS } from './messengers';
import type { RootState } from '../../reducers';

/**
 * Controllers that area always instantiated
 */
type RequiredControllers = Omit<Controllers, 'PPOMController'>;

/**
 * Controllers that are sometimes not instantiated
 */
type OptionalControllers = Pick<Controllers, 'PPOMController'>;

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
  | SnapInterfaceControllerActions
  | AuthenticationController.Actions
  | UserStorageController.Actions
  | NotificationServicesControllerMessengerActions
  | NotificationServicesPushControllerActions
  | CronjobControllerActions
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  | MultichainBalancesControllerActions
  | RatesControllerActions
  | MultichainAssetsControllerActions
  | MultichainAssetsRatesControllerActions
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
  | AssetsContractControllerActions
  | RemoteFeatureFlagControllerActions
  | TokenSearchDiscoveryControllerActions
  | MultichainNetworkControllerActions
  | BridgeControllerActions
  | BridgeStatusControllerActions
  | EarnControllerActions;

type GlobalEvents =
  | ComposableControllerEvents<EngineState>
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
  | SnapInterfaceControllerEvents
  | AuthenticationController.Events
  | UserStorageController.Events
  | NotificationServicesControllerMessengerEvents
  | NotificationServicesPushControllerEvents
  | CronjobControllerEvents
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  | MultichainBalancesControllerEvents
  | RatesControllerEvents
  | MultichainAssetsControllerEvents
  | MultichainAssetsRatesControllerEvents
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
  | AssetsContractControllerEvents
  | RemoteFeatureFlagControllerEvents
  | TokenSearchDiscoveryControllerEvents
  | SnapKeyringEvents
  | MultichainNetworkControllerEvents
  | BridgeControllerEvents
  | BridgeStatusControllerEvents
  | EarnControllerEvents;

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
export type BaseControllerMessenger = ExtendedControllerMessenger<
  GlobalActions,
  GlobalEvents
>;

/**
 * All mobile controllers, keyed by name
 */
// Interfaces are incompatible with our controllers and state types by default.
// Adding an index signature fixes this, but at the cost of widening the type unnecessarily.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Controllers = {
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
  RemoteFeatureFlagController: RemoteFeatureFlagController;
  PPOMController: PPOMController;
  TokenBalancesController: TokenBalancesController;
  TokenListController: TokenListController;
  TokenDetectionController: TokenDetectionController;
  TokenRatesController: TokenRatesController;
  TokenSearchDiscoveryController: TokenSearchDiscoveryController;
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
  NotificationServicesController: NotificationServicesController;
  NotificationServicesPushController: NotificationServicesPushController;
  SnapInterfaceController: SnapInterfaceController;
  CronjobController: CronjobController;
  ///: END:ONLY_INCLUDE_IF
  SwapsController: SwapsController;
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  MultichainBalancesController: MultichainBalancesController;
  MultichainAssetsRatesController: MultichainAssetsRatesController;
  RatesController: RatesController;
  MultichainAssetsController: MultichainAssetsController;
  ///: END:ONLY_INCLUDE_IF
  MultichainNetworkController: MultichainNetworkController;
  BridgeController: BridgeController;
  BridgeStatusController: BridgeStatusController;
  EarnController: EarnController;
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
  NftController: NftControllerState;
  TokenListController: TokenListState;
  CurrencyRateController: CurrencyRateState;
  KeyringController: KeyringControllerState;
  NetworkController: NetworkState;
  PreferencesController: PreferencesState;
  RemoteFeatureFlagController: RemoteFeatureFlagControllerState;
  PhishingController: PhishingControllerState;
  TokenBalancesController: TokenBalancesControllerState;
  TokenRatesController: TokenRatesControllerState;
  TokenSearchDiscoveryController: TokenSearchDiscoveryControllerState;
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
  NotificationServicesController: NotificationServicesControllerState;
  NotificationServicesPushController: NotificationServicesPushControllerState;
  SnapInterfaceController: SnapInterfaceControllerState;
  CronjobController: CronjobControllerState;
  ///: END:ONLY_INCLUDE_IF
  PermissionController: PermissionControllerState<Permissions>;
  ApprovalController: ApprovalControllerState;
  LoggingController: LoggingControllerState;
  PPOMController: PPOMState;
  AccountsController: AccountsControllerState;
  SelectedNetworkController: SelectedNetworkControllerState;
  SignatureController: SignatureControllerState;
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  MultichainBalancesController: MultichainBalancesControllerState;
  RatesController: RatesControllerState;
  MultichainAssetsController: MultichainAssetsControllerState;
  MultichainAssetsRatesController: MultichainAssetsRatesControllerState;
  ///: END:ONLY_INCLUDE_IF
  MultichainNetworkController: MultichainNetworkControllerState;
  BridgeController: BridgeControllerState;
  BridgeStatusController: BridgeStatusControllerState;
  EarnController: EarnControllerState;
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
 * A restricted version of the controller messenger
 */
export type BaseRestrictedControllerMessenger = RestrictedMessenger<
  string,
  ActionConstraint,
  EventConstraint,
  string,
  string
>;

/**
 * Specify controllers to initialize.
 */
export type ControllersToInitialize =
  ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
  | 'CronjobController'
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  | 'MultichainAssetsController'
  | 'MultichainAssetsRatesController'
  | 'MultichainBalancesController'
  ///: END:ONLY_INCLUDE_IF
  | 'CurrencyRateController'
  | 'AccountsController'
  | 'MultichainNetworkController'
  | 'TransactionController';

/**
 * Callback that returns a controller messenger for a specific controller.
 */
export type ControllerMessengerCallback = (
  baseControllerMessenger: BaseControllerMessenger,
) => BaseRestrictedControllerMessenger;

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
  ControllerMessengerType extends BaseRestrictedControllerMessenger,
  InitMessengerType extends void | BaseRestrictedControllerMessenger = void,
> = {
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
  ControllerMessengerType extends BaseRestrictedControllerMessenger,
  InitMessengerType extends void | BaseRestrictedControllerMessenger = void,
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
    // @ts-expect-error TODO: Resolve mismatch between base-controller versions.
    ReturnType<(typeof CONTROLLER_MESSENGERS)[Name]['getMessenger']>,
    ReturnType<(typeof CONTROLLER_MESSENGERS)[Name]['getInitMessenger']>
  >;
};

/**
 * Function to initialize the controllers in the engine.
 */
export type InitModularizedControllersFunction = (request: {
  baseControllerMessenger: BaseControllerMessenger;
  controllerInitFunctions: ControllerInitFunctionByControllerName;
  existingControllersByName?: Partial<ControllerByName>;
  getGlobalChainId: () => Hex;
  getState: () => RootState;
  persistedState: ControllerPersistedState;
}) => {
  controllersByName: ControllerByName;
};
