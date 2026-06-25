import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';

import {
  SnapControllerGetPermittedSnapsAction,
  SnapControllerInstallSnapsAction,
  MultichainRoutingServiceGetSupportedAccountsAction,
  MultichainRoutingServiceIsSupportedScopeAction,
} from '@metamask/snaps-controllers';
import { AccountsControllerListAccountsAction } from '@metamask/accounts-controller';
import {
  SnapPermissionSpecificationsActions,
  SnapPermissionSpecificationsEvents,
} from '../../Snaps/permissions/specifications.ts';
import { NetworkControllerFindNetworkClientIdByChainIdAction } from '@metamask/network-controller';
import { RootMessenger } from '../types.ts';
import { PermissionControllerMessenger } from '@metamask/permission-controller';
import { SnapAccountServiceHandleKeyringSnapMessageAction } from '@metamask/snap-account-service';

type PermissionControllerMessengerActions =
  | MessengerActions<PermissionControllerMessenger>
  | SnapControllerGetPermittedSnapsAction
  | SnapControllerInstallSnapsAction;

/**
 * Get the messenger for the permission controller. This is scoped to the
 * actions and events that the permission controller is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The PermissionControllerMessenger.
 */
export function getPermissionControllerMessenger(
  rootMessenger: RootMessenger<
    PermissionControllerMessengerActions,
    MessengerEvents<PermissionControllerMessenger>
  >,
): PermissionControllerMessenger {
  const messenger: Messenger<
    'PermissionController',
    PermissionControllerMessengerActions,
    MessengerEvents<PermissionControllerMessenger>
  > = new Messenger({
    namespace: 'PermissionController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'ApprovalController:addRequest',
      'ApprovalController:hasRequest',
      'ApprovalController:acceptRequest',
      'ApprovalController:rejectRequest',
      ///: BEGIN:ONLY_INCLUDE_IF(snaps)
      'SnapController:getPermittedSnaps',
      'SnapController:installSnaps',
      'SubjectMetadataController:getSubjectMetadata',
      ///: END:ONLY_INCLUDE_IF
    ],
    events: [],
    messenger,
  });
  return messenger;
}

type AllowedInitializationActions =
  | AccountsControllerListAccountsAction
  | MultichainRoutingServiceIsSupportedScopeAction
  | MultichainRoutingServiceGetSupportedAccountsAction
  | NetworkControllerFindNetworkClientIdByChainIdAction
  | SnapPermissionSpecificationsActions
  | SnapAccountServiceHandleKeyringSnapMessageAction;

type AllowedInitializationEvents = SnapPermissionSpecificationsEvents;

export type PermissionControllerInitMessenger = ReturnType<
  typeof getPermissionControllerInitMessenger
>;

/**
 * Get the messenger for the permission controller. This is scoped to the
 * actions and events that the permission controller is allowed to handle during
 * initialization.
 *
 * @param rootMessenger - The root messenger.
 * @returns The PermissionControllerInitMessenger.
 */
export function getPermissionControllerInitMessenger(
  rootMessenger: RootMessenger,
) {
  const messenger = new Messenger<
    'PermissionControllerInit',
    AllowedInitializationActions,
    AllowedInitializationEvents,
    RootMessenger
  >({
    namespace: 'PermissionControllerInit',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'ApprovalController:addRequest',
      'AccountsController:listAccounts',
      'CurrencyRateController:getState',
      'KeyringController:getState',
      'KeyringController:withKeyring',
      'KeyringController:withKeyringV2Unsafe',
      'MultichainRoutingService:isSupportedScope',
      'MultichainRoutingService:getSupportedAccounts',
      'NetworkController:findNetworkClientIdByChainId',
      'PermissionController:hasPermission',
      'PhishingController:maybeUpdateState',
      'PhishingController:testOrigin',
      'PreferencesController:getState',
      'SnapController:clearSnapState',
      'SnapController:getSnap',
      'SnapController:getSnapState',
      'SnapController:handleRequest',
      'SnapController:updateSnapState',
      'SnapInterfaceController:createInterface',
      'SnapInterfaceController:getInterface',
      'SnapInterfaceController:setInterfaceDisplayed',
      'SnapInterfaceController:updateInterface',
      'SnapAccountService:handleKeyringSnapMessage',
    ],
    events: ['KeyringController:unlock'],
    messenger,
  });
  return messenger;
}
