import { Messenger } from '@metamask/base-controller';
import {
  AcceptRequest,
  AddApprovalRequest,
  HasApprovalRequest,
  RejectRequest,
} from '@metamask/approval-controller';
import {
  GetPermittedSnaps,
  InstallSnaps,
  MultichainRouterGetSupportedAccountsAction,
  MultichainRouterIsSupportedScopeAction,
} from '@metamask/snaps-controllers';
import { GetSubjectMetadata } from '@metamask/permission-controller';
import { AccountsControllerListAccountsAction } from '@metamask/accounts-controller';
import {
  SnapPermissionSpecificationsActions,
  SnapPermissionSpecificationsEvents,
} from '../../Snaps/permissions/specifications.ts';
import { NetworkControllerFindNetworkClientIdByChainIdAction } from '@metamask/network-controller';

type AllowedActions =
  | AddApprovalRequest
  | HasApprovalRequest
  | AcceptRequest
  | RejectRequest
  | GetPermittedSnaps
  | InstallSnaps
  | GetSubjectMetadata;

export type PermissionControllerMessenger = ReturnType<
  typeof getPermissionControllerMessenger
>;

/**
 * Get a restricted messenger for the permission controller. This is scoped to the
 * actions and events that the permission controller is allowed to handle.
 *
 * @param messenger - The messenger to restrict.
 * @returns The restricted messenger.
 */
export function getPermissionControllerMessenger(
  messenger: Messenger<AllowedActions, never>,
) {
  return messenger.getRestricted({
    name: 'PermissionController',
    allowedActions: [
      'ApprovalController:addRequest',
      'ApprovalController:hasRequest',
      'ApprovalController:acceptRequest',
      'ApprovalController:rejectRequest',
      ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
      'SnapController:getPermitted',
      'SnapController:install',
      'SubjectMetadataController:getSubjectMetadata',
      ///: END:ONLY_INCLUDE_IF
    ],
    allowedEvents: [],
  });
}

type AllowedInitializationActions =
  | AccountsControllerListAccountsAction
  | MultichainRouterIsSupportedScopeAction
  | MultichainRouterGetSupportedAccountsAction
  | NetworkControllerFindNetworkClientIdByChainIdAction
  | SnapPermissionSpecificationsActions;

type AllowedInitializationEvents = SnapPermissionSpecificationsEvents;

export type PermissionControllerInitMessenger = ReturnType<
  typeof getPermissionControllerInitMessenger
>;

/**
 * Get a restricted messenger for the permission controller. This is scoped to the
 * actions and events that the permission controller is allowed to handle during
 * initialization.
 *
 * @param messenger - The messenger to restrict.
 * @returns The restricted messenger.
 */
export function getPermissionControllerInitMessenger(
  messenger: Messenger<
    AllowedInitializationActions,
    AllowedInitializationEvents
  >,
) {
  return messenger.getRestricted({
    name: 'PermissionControllerInit',
    allowedActions: [
      'ApprovalController:addRequest',
      'AccountsController:listAccounts',
      'CurrencyRateController:getState',
      'KeyringController:getKeyringsByType',
      'KeyringController:getState',
      'KeyringController:withKeyring',
      'MultichainRouter:isSupportedScope',
      'MultichainRouter:getSupportedAccounts',
      'NetworkController:findNetworkClientIdByChainId',
      'PermissionController:hasPermission',
      'PhishingController:maybeUpdateState',
      'PhishingController:testOrigin',
      'PreferencesController:getState',
      'SnapController:clearSnapState',
      'SnapController:get',
      'SnapController:getSnapState',
      'SnapController:handleRequest',
      'SnapController:updateSnapState',
      'SnapInterfaceController:createInterface',
      'SnapInterfaceController:getInterface',
    ],
    allowedEvents: ['KeyringController:unlock'],
  });
}
