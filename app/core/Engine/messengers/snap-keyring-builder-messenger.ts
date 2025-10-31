import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RootMessenger } from '../types';
import { SnapKeyringBuilderMessenger } from '../../SnapKeyring/types';
import { KeyringControllerPersistAllKeyringsAction } from '@metamask/keyring-controller';

/**
 * Get the messenger for the snap keyring builder. This is scoped to the
 * Snap keyring builder is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The SnapKeyringBuilderMessenger.
 */
export function getSnapKeyringBuilderMessenger(
  rootMessenger: RootMessenger,
): SnapKeyringBuilderMessenger {
  const messenger = new Messenger<
    'SnapKeyring',
    MessengerActions<SnapKeyringBuilderMessenger>,
    MessengerEvents<SnapKeyringBuilderMessenger>,
    RootMessenger
  >({
    namespace: 'SnapKeyring',
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
      'SnapController:get',
      'SnapController:handleRequest',
      'SnapController:isMinimumPlatformVersion',
    ],
    events: [],
    messenger,
  });
  return messenger;
}

export type AllowedInitializationActions =
  KeyringControllerPersistAllKeyringsAction;

export type SnapKeyringBuilderInitMessenger = ReturnType<
  typeof getSnapKeyringBuilderInitMessenger
>;

/**
 * Get the messenger for the snap keyring builder initialization. This is scoped to the
 * Snap keyring builder needs during initialization.
 *
 * @param rootMessenger - The root messenger.
 * @returns The SnapKeyringBuilderInitMessenger.
 */
export function getSnapKeyringBuilderInitMessenger(
  rootMessenger: RootMessenger,
) {
  const messenger = new Messenger<
    'SnapKeyringInit',
    AllowedInitializationActions,
    never,
    RootMessenger
  >({
    namespace: 'SnapKeyringInit',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['KeyringController:persistAllKeyrings'],
    events: [],
    messenger,
  });
  return messenger;
}
