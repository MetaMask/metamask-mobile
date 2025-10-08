import { Messenger } from '@metamask/base-controller';
import {
  AcceptRequest,
  AddApprovalRequest,
  EndFlow,
  RejectRequest,
  ShowError,
  ShowSuccess,
  StartFlow,
} from '@metamask/approval-controller';
import { MaybeUpdateState, TestOrigin } from '@metamask/phishing-controller';
import {
  KeyringControllerGetAccountsAction,
  KeyringControllerPersistAllKeyringsAction,
} from '@metamask/keyring-controller';
import {
  AccountsControllerGetAccountByAddressAction,
  AccountsControllerGetSelectedAccountAction,
  AccountsControllerListMultichainAccountsAction,
  AccountsControllerSetAccountNameAction,
  AccountsControllerSetAccountNameAndSelectAccountAction,
  AccountsControllerSetSelectedAccountAction,
} from '@metamask/accounts-controller';
import {
  GetSnap,
  HandleSnapRequest,
  IsMinimumPlatformVersion,
} from '@metamask/snaps-controllers';

type AllowedActions =
  | AcceptRequest
  | AccountsControllerGetSelectedAccountAction
  | AccountsControllerGetAccountByAddressAction
  | AccountsControllerSetAccountNameAction
  | AccountsControllerSetAccountNameAndSelectAccountAction
  | AccountsControllerSetSelectedAccountAction
  | AccountsControllerListMultichainAccountsAction
  | AddApprovalRequest
  | EndFlow
  | GetSnap
  | HandleSnapRequest
  | IsMinimumPlatformVersion
  | KeyringControllerGetAccountsAction
  | MaybeUpdateState
  | RejectRequest
  | StartFlow
  | ShowSuccess
  | ShowError
  | TestOrigin;

type AllowedEvents = never;

export type SnapKeyringBuilderMessenger = ReturnType<
  typeof getSnapKeyringBuilderMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * Snap keyring builder is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getSnapKeyringBuilderMessenger(
  messenger: Messenger<AllowedActions, AllowedEvents>,
) {
  return messenger.getRestricted({
    name: 'SnapKeyringBuilder',
    allowedActions: [
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
    allowedEvents: [],
  });
}

export type AllowedInitializationActions =
  KeyringControllerPersistAllKeyringsAction;

export type SnapKeyringBuilderInitMessenger = ReturnType<
  typeof getSnapKeyringBuilderInitMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * Snap keyring builder needs during initialization.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getSnapKeyringBuilderInitMessenger(
  messenger: Messenger<AllowedInitializationActions, never>,
) {
  return messenger.getRestricted({
    name: 'SnapKeyringBuilderInit',
    allowedActions: ['KeyringController:persistAllKeyrings'],
    allowedEvents: [],
  });
}
