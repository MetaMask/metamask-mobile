import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import type { RootMessenger } from '../types';
import type { SnapKeyringV2BuilderMessenger as SnapKeyringV2Messenger } from '../../SnapKeyring/SnapKeyringV2';

/**
 * Re-export of the messenger type used by the v2 Snap keyring. The v2
 * keyring needs the exact same scope as the v1 keyring (the underlying
 * callbacks are shared).
 */
export type SnapKeyringV2BuilderMessenger = SnapKeyringV2Messenger;

/**
 * Get the messenger for the v2 Snap keyring builder. The actions and events
 * delegated mirror the v1 builder, but under a dedicated namespace so the v1
 * and v2 builders coexist without delegation collisions.
 *
 * @param rootMessenger - The root messenger.
 * @returns The SnapKeyringV2BuilderMessenger.
 */
export function getSnapKeyringV2BuilderMessenger(
  rootMessenger: RootMessenger,
): SnapKeyringV2BuilderMessenger {
  const messenger = new Messenger<
    'SnapKeyringV2',
    MessengerActions<SnapKeyringV2BuilderMessenger>,
    MessengerEvents<SnapKeyringV2BuilderMessenger>,
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
