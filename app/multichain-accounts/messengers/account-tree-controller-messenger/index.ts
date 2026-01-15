import {
  AccountTreeControllerMessenger,
  AccountTreeControllerSelectedAccountGroupChangeEvent,
} from '@metamask/account-tree-controller';
import {
  RootExtendedMessenger,
  RootMessenger,
} from '../../../core/Engine/types';
import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import { AnalyticsControllerActions } from '@metamask/analytics-controller';

/**
 * Get the messenger for the AccountTreeController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The AccountTreeControllerMessenger.
 */
export function getAccountTreeControllerMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
): AccountTreeControllerMessenger {
  const messenger = new Messenger<
    'AccountTreeController',
    MessengerActions<AccountTreeControllerMessenger>,
    MessengerEvents<AccountTreeControllerMessenger>,
    RootMessenger
  >({
    namespace: 'AccountTreeController',
    parent: rootExtendedMessenger,
  });
  rootExtendedMessenger.delegate({
    actions: [
      'AccountsController:listMultichainAccounts',
      'AccountsController:getAccount',
      'AccountsController:getSelectedMultichainAccount',
      'AccountsController:setSelectedAccount',
      'UserStorageController:getState',
      'UserStorageController:performGetStorage',
      'UserStorageController:performGetStorageAllFeatureEntries',
      'UserStorageController:performSetStorage',
      'UserStorageController:performBatchSetStorage',
      'AuthenticationController:getSessionProfile',
      'MultichainAccountService:createMultichainAccountGroup',
      'SnapController:get',
      'KeyringController:getState',
    ],
    events: [
      'AccountsController:accountAdded',
      'AccountsController:accountRemoved',
      'AccountsController:selectedAccountChange',
      'UserStorageController:stateChange',
      'MultichainAccountService:walletStatusChange',
    ],
    messenger,
  });
  return messenger;
}

export type AllowedInitializationEvents =
  AccountTreeControllerSelectedAccountGroupChangeEvent;

type AccountTreeControllerInitMessengerActions = AnalyticsControllerActions;

export type AccountTreeControllerInitMessenger = ReturnType<
  typeof getAccountTreeControllerInitMessenger
>;

/**
 * Get a messenger for the AccountTreeController during initialization. This is scoped to the
 * actions and events that the AccountTreeController requires during initialization.
 *
 * @param rootMessenger - The root messenger.
 * @returns The AccountTreeControllerInitMessenger.
 */
export function getAccountTreeControllerInitMessenger(
  rootMessenger: RootMessenger,
) {
  const messenger = new Messenger<
    'AccountTreeControllerInit',
    AccountTreeControllerInitMessengerActions,
    AllowedInitializationEvents,
    RootMessenger
  >({
    namespace: 'AccountTreeControllerInit',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['AnalyticsController:trackEvent'],
    events: ['AccountTreeController:selectedAccountGroupChange'],
    messenger,
  });
  return messenger;
}
