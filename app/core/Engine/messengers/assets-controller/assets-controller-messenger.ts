import type { AssetsControllerMessenger as PackageAssetsControllerMessenger } from '@metamask/assets-controller';
import { Messenger } from '@metamask/messenger';
import { AuthenticationController } from '@metamask/profile-sync-controller';
import type {
  PreferencesControllerGetStateAction,
  PreferencesControllerStateChangeEvent,
} from '@metamask/preferences-controller';
import type {
  NetworkControllerGetStateAction,
  NetworkControllerGetNetworkClientByIdAction,
  NetworkControllerStateChangeEvent,
} from '@metamask/network-controller';
import type { AccountsControllerAccountBalancesUpdatesEvent } from '@metamask/accounts-controller';
import type {
  NetworkEnablementControllerGetStateAction,
  NetworkEnablementControllerEvents,
} from '@metamask/network-enablement-controller';
import type { ClientControllerStateChangeEvent } from '@metamask/client-controller';
import type {
  KeyringControllerLockEvent,
  KeyringControllerUnlockEvent,
} from '@metamask/keyring-controller';
import type {
  AccountTreeControllerGetAccountsFromSelectedAccountGroupAction,
  AccountTreeControllerSelectedAccountGroupChangeEvent,
} from '@metamask/account-tree-controller';
import type {
  BackendWebSocketServiceActions,
  BackendWebSocketServiceEvents,
} from '@metamask/core-backend';
import type {
  GetPermissions,
  PermissionControllerStateChange,
} from '@metamask/permission-controller';
import type { PhishingControllerBulkScanTokensAction } from '@metamask/phishing-controller';
import type {
  SnapControllerHandleRequestAction,
  SnapControllerGetRunnableSnapsAction,
} from '@metamask/snaps-controllers';
import type {
  TransactionControllerTransactionConfirmedEvent,
  TransactionControllerIncomingTransactionsReceivedEvent,
} from '@metamask/transaction-controller';
import type { RemoteFeatureFlagControllerGetStateAction } from '@metamask/remote-feature-flag-controller';
import type { AnalyticsControllerActions } from '@metamask/analytics-controller';
import { RootExtendedMessenger, RootMessenger } from '../../types';

/**
 * Actions allowed for AssetsController messenger.
 * Aligned with extension: core controller + RpcDataSource + BackendWebsocketDataSource + SnapDataSource + TokenDataSource.
 */
type AssetsControllerAllowedActions =
  | NetworkControllerGetStateAction
  | NetworkControllerGetNetworkClientByIdAction
  | NetworkEnablementControllerGetStateAction
  | AccountTreeControllerGetAccountsFromSelectedAccountGroupAction
  | BackendWebSocketServiceActions
  | SnapControllerHandleRequestAction
  | SnapControllerGetRunnableSnapsAction
  | GetPermissions
  | PhishingControllerBulkScanTokensAction;
/**
 * Events that AssetsController and its data sources subscribe to.
 * Aligned with extension: core + RpcDataSource + BackendWebsocketDataSource + SnapDataSource.
 */
type AssetsControllerAllowedEvents =
  | KeyringControllerUnlockEvent
  | KeyringControllerLockEvent
  | ClientControllerStateChangeEvent
  | PreferencesControllerStateChangeEvent
  | AccountTreeControllerSelectedAccountGroupChangeEvent
  | NetworkEnablementControllerEvents
  | BackendWebSocketServiceEvents
  | NetworkControllerStateChangeEvent
  | TransactionControllerTransactionConfirmedEvent
  | TransactionControllerIncomingTransactionsReceivedEvent
  | AccountsControllerAccountBalancesUpdatesEvent
  | PermissionControllerStateChange;

/** Re-export package type so init receives the type expected by AssetsController constructor. */
export type AssetsControllerMessenger = PackageAssetsControllerMessenger;

/**
 * Get the messenger for the AssetsController. This is scoped to the
 * actions and events that the AssetsController is allowed to handle.
 *
 * @param rootExtendedMessenger - The root extended messenger.
 * @returns The AssetsControllerMessenger.
 */
export function getAssetsControllerMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
): PackageAssetsControllerMessenger {
  const messenger = new Messenger<
    'AssetsController',
    AssetsControllerAllowedActions,
    AssetsControllerAllowedEvents,
    RootMessenger
  >({
    namespace: 'AssetsController',
    parent: rootExtendedMessenger,
  });
  rootExtendedMessenger.delegate({
    actions: [
      'AccountTreeController:getAccountsFromSelectedAccountGroup',
      'NetworkEnablementController:getState',
      'NetworkController:getState',
      'NetworkController:getNetworkClientById',
      'BackendWebSocketService:subscribe',
      'BackendWebSocketService:getConnectionInfo',
      'BackendWebSocketService:findSubscriptionsByChannelPrefix',
      'SnapController:handleRequest',
      'SnapController:getRunnableSnaps',
      'PermissionController:getPermissions',
      'PhishingController:bulkScanTokens',
    ],
    events: [
      'AccountTreeController:selectedAccountGroupChange',
      'ClientController:stateChange',
      'NetworkEnablementController:stateChange',
      'KeyringController:lock',
      'KeyringController:unlock',
      'PreferencesController:stateChange',
      'NetworkController:stateChange',
      'TransactionController:transactionConfirmed',
      'TransactionController:incomingTransactionsReceived',
      'BackendWebSocketService:connectionStateChanged',
      'AccountsController:accountBalancesUpdated',
      'PermissionController:stateChange',
    ],
    messenger,
  });
  // Mobile delegates extra actions/events for data sources; package types a narrower messenger.
  return messenger as PackageAssetsControllerMessenger;
}

export type AssetsControllerInitMessenger = ReturnType<
  typeof getAssetsControllerInitMessenger
>;

/**
 * Get the messenger for the AssetsController initialization. This is scoped to the
 * actions and events that the AssetsController is allowed to handle during
 * initialization.
 *
 * @param rootExtendedMessenger - The root extended messenger.
 * @returns The AssetsControllerInitMessenger.
 */
export function getAssetsControllerInitMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
) {
  const messenger = new Messenger<
    'AssetsControllerInit',
    | AuthenticationController.AuthenticationControllerGetBearerTokenAction
    | PreferencesControllerGetStateAction
    | RemoteFeatureFlagControllerGetStateAction
    | AnalyticsControllerActions,
    never,
    RootMessenger
  >({
    namespace: 'AssetsControllerInit',
    parent: rootExtendedMessenger,
  });
  rootExtendedMessenger.delegate({
    actions: [
      'AuthenticationController:getBearerToken',
      'PreferencesController:getState',
      'RemoteFeatureFlagController:getState',
      'AnalyticsController:trackEvent',
    ],
    events: [],
    messenger,
  });
  return messenger;
}
