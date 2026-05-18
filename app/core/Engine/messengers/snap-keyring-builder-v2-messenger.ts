import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import type {
  KeyringControllerPersistAllKeyringsAction,
} from '@metamask/keyring-controller';
import type { AccountsControllerUpdateAccountsAction } from '@metamask/accounts-controller';
import type { RootMessenger } from '../types';
import type { SnapKeyringBuilderV2Messenger as SnapKeyringV2Messenger } from '../../SnapKeyring/SnapKeyringV2';
import type { SnapKeyringBuilderMessenger } from '../../SnapKeyring/types';

/**
 * Re-export of the messenger type used by the v2 Snap keyring. The v2
 * keyring needs the exact same scope as the v1 keyring (the underlying
 * callbacks are shared).
 */
export type SnapKeyringBuilderV2Messenger = SnapKeyringV2Messenger;

/**
 * Get the messenger for the v2 Snap keyring builder. The actions and events
 * delegated mirror the v1 builder, but under a dedicated namespace so the v1
 * and v2 builders coexist without delegation collisions.
 *
 * @param rootMessenger - The root messenger.
 * @returns The SnapKeyringBuilderV2Messenger.
 */
export function getSnapKeyringBuilderV2Messenger(
  rootMessenger: RootMessenger,
): SnapKeyringBuilderV2Messenger {
  const messenger = new Messenger<
    'SnapKeyringV2',
    MessengerActions<SnapKeyringBuilderMessenger>,
    MessengerEvents<SnapKeyringBuilderMessenger>,
    RootMessenger
  >({
    namespace: 'SnapKeyringV2',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'AccountsController:getAccountByAddress',
      'AccountsController:listMultichainAccounts',
      'AccountsController:setAccountName',
      'AccountsController:setAccountNameAndSelectAccount',
      'AccountsController:setSelectedAccount',
      'ApprovalController:acceptRequest',
      'ApprovalController:addRequest',
      'ApprovalController:endFlow',
      'ApprovalController:rejectRequest',
      'ApprovalController:showError',
      'ApprovalController:showSuccess',
      'ApprovalController:startFlow',
      'KeyringController:getAccounts',
      'PhishingController:maybeUpdateState',
      'PhishingController:testOrigin',
      'SnapController:getSnap',
      'SnapController:handleRequest',
      'SnapController:isMinimumPlatformVersion',
    ],
    events: [],
    messenger,
  });
  return messenger;
}

export type AllowedInitializationActions =
  | KeyringControllerPersistAllKeyringsAction
  | AccountsControllerUpdateAccountsAction;

export type SnapKeyringBuilderV2InitMessenger = ReturnType<
  typeof getSnapKeyringBuilderV2InitMessenger
>;

/**
 * Get the init messenger for the v2 Snap keyring builder. It is allowed to
 * persist keyrings and trigger a sync of the AccountsController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The SnapKeyringBuilderV2InitMessenger.
 */
export function getSnapKeyringBuilderV2InitMessenger(
  rootMessenger: RootMessenger,
) {
  const messenger = new Messenger<
    'SnapKeyringV2Init',
    AllowedInitializationActions,
    never,
    RootMessenger
  >({
    namespace: 'SnapKeyringV2Init',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'KeyringController:persistAllKeyrings',
      'AccountsController:updateAccounts',
    ],
    events: [],
    messenger,
  });
  return messenger;
}
