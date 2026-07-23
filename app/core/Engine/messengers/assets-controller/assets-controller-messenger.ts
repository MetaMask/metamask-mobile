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

const ASSETS_CONTROLLER_DELEGATED_EVENTS = [
  // core#9388: RPC balance refresh on account-group switch / tree updates
  'AccountTreeController:selectedAccountGroupChange',
  // core#9478: use exported :stateChange (not local :stateChanged aliases)
  'AccountTreeController:stateChange',
  // core#9388: RPC balance refresh when enabling custom RPC networks (e.g. DXC)
  // StakedBalanceDataSource also listens to this
  'NetworkEnablementController:stateChange',
  // UI + keyring lifecycle (RpcDataSource only runs when UI open + unlocked)
  'ClientController:stateChange',
  'KeyringController:lock',
  'KeyringController:unlock',
  // Network picker (EVM selected network switch)
  'NetworkController:networkDidChange',
  'NetworkController:networkAdded',
  'NetworkController:networkRemoved',
  // RpcDataSource + StakedBalanceDataSource
  'NetworkController:stateChange',
  // Snap + WS + tx + preferences
  'BackendWebSocketService:connectionStateChanged',
  'AccountsController:accountBalancesUpdated',
  'PermissionController:stateChange',
  'SnapController:snapInstalled',
  'PreferencesController:stateChange',
  'TransactionController:transactionConfirmed',
  'TransactionController:unapprovedTransactionAdded',
  // Real-time post-tx balances (AccountActivityService WS path)
  'AccountActivityService:balanceUpdated',
] as const;

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
      // Account group + network context for RpcDataSource (core#9388)
      'AccountTreeController:getAccountsFromSelectedAccountGroup',
      'NetworkEnablementController:getState',
      'NetworkController:getState',
      'NetworkController:getNetworkClientById',
      'AccountsController:getSelectedAccount',
      'BackendWebSocketService:subscribe',
      'BackendWebSocketService:getConnectionInfo',
      'BackendWebSocketService:findSubscriptionsByChannelPrefix',
      'BackendWebSocketService:addChannelCallback',
      'BackendWebSocketService:removeChannelCallback',
      'SnapController:handleRequest',
      'SnapController:getRunnableSnaps',
      'PermissionController:getPermissions',
      'PhishingController:bulkScanTokens',
    ],
    events: [...ASSETS_CONTROLLER_DELEGATED_EVENTS],
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
