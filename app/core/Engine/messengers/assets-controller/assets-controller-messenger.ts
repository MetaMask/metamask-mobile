import type { AssetsControllerMessenger } from '@metamask/assets-controller';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { AuthenticationController } from '@metamask/profile-sync-controller';
import type { PreferencesControllerGetStateAction } from '@metamask/preferences-controller';
import type { RemoteFeatureFlagControllerGetStateAction } from '@metamask/remote-feature-flag-controller';
import type { AnalyticsControllerActions } from '@metamask/analytics-controller';
import { RootExtendedMessenger, RootMessenger } from '../../types';

/**
 * Get the messenger for the AssetsController. This is scoped to the
 * actions and events that the AssetsController is allowed to handle.
 *
 * @param rootExtendedMessenger - The root extended messenger.
 * @returns The AssetsControllerMessenger.
 */
export function getAssetsControllerMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
): AssetsControllerMessenger {
  const messenger = new Messenger<
    'AssetsController',
    MessengerActions<AssetsControllerMessenger>,
    MessengerEvents<AssetsControllerMessenger>,
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
      'AccountsController:getSelectedAccount',
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
      'TransactionController:unapprovedTransactionAdded',
      'NetworkController:networkRemoved',
      'NetworkController:networkAdded',
      'SnapController:snapInstalled',
    ],
    messenger,
  });

  return messenger;
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
