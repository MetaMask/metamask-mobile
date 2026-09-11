import { Messenger } from '@metamask/messenger';
import { RootMessenger } from '../../types';
import { SnapKeyringBuilderMessenger } from '../../../SnapKeyring/types';

export type { SnapKeyringBuilderMessenger };

/**
 * Gets the messenger for the Snap keyring, which is used to handle communication between the Snap keyring
 * and the rest of the extension.
 *
 * @param messenger - The root messenger instance, used to create a child messenger for the Snap keyring and to delegate necessary actions to it.
 * @returns The Snap keyring messenger instance.
 */
export function getLegacySnapKeyringBuilderMessenger(
  messenger: RootMessenger,
): SnapKeyringBuilderMessenger {
  const snapKeyringMessenger: SnapKeyringBuilderMessenger = new Messenger({
    namespace: 'SnapKeyring',
    parent: messenger,
  });

  messenger.delegate({
    messenger: snapKeyringMessenger,
    actions: [
      'ApprovalController:addRequest',
      'ApprovalController:acceptRequest',
      'ApprovalController:rejectRequest',
      'ApprovalController:startFlow',
      'ApprovalController:endFlow',
      'ApprovalController:showSuccess',
      'ApprovalController:showError',
      'PhishingController:testOrigin',
      'PhishingController:maybeUpdateState',
      'KeyringController:getAccounts',
      'KeyringController:persistAllKeyrings',
      'KeyringController:removeAccount',
      'AccountsController:setSelectedAccount',
      'AccountsController:getAccountByAddress',
      'AccountsController:setAccountName',
      'AccountsController:listMultichainAccounts',
      'SnapController:handleRequest',
      'SnapController:getSnap',
      'SnapController:isMinimumPlatformVersion',
    ],
  });

  return snapKeyringMessenger;
}
