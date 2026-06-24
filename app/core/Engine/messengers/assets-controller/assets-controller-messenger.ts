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
import { RootMessenger } from '../../types';

/**
 * Get the messenger for the AssetsController. This is scoped to the
 * actions and events that the AssetsController is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The AssetsControllerMessenger.
 */
export function getAssetsControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<AssetsControllerMessenger>,
    MessengerEvents<AssetsControllerMessenger>
  >,
): AssetsControllerMessenger {
  const messenger: AssetsControllerMessenger = new Messenger({
    namespace: 'AssetsController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
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

type AssetsControllerInitMessengerActions =
  | AuthenticationController.AuthenticationControllerGetBearerTokenAction
  | PreferencesControllerGetStateAction
  | RemoteFeatureFlagControllerGetStateAction
  | AnalyticsControllerActions;

export type AssetsControllerInitMessenger = Messenger<
  'AssetsControllerInit',
  AssetsControllerInitMessengerActions,
  never
>;

/**
 * Get the messenger for the AssetsController initialization. This is scoped to the
 * actions and events that the AssetsController is allowed to handle during
 * initialization.
 *
 * @param rootMessenger - The root messenger.
 * @returns The AssetsControllerInitMessenger.
 */
export function getAssetsControllerInitMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<AssetsControllerInitMessenger>,
    MessengerEvents<AssetsControllerInitMessenger>
  >,
): AssetsControllerInitMessenger {
  const messenger: AssetsControllerInitMessenger = new Messenger({
    namespace: 'AssetsControllerInit',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
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
