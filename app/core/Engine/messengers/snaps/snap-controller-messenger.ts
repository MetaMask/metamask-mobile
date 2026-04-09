import { Messenger } from '@metamask/messenger';
import {
  KeyringControllerLockEvent,
  KeyringControllerUnlockEvent,
  KeyringControllerWithKeyringAction,
} from '@metamask/keyring-controller';
import { PreferencesControllerGetStateAction } from '@metamask/preferences-controller';
import { RootMessenger } from '../../types';
import { AnalyticsControllerActions } from '@metamask/analytics-controller';
import {
  SnapControllerMessenger,
  SnapControllerSetClientActiveAction,
} from '@metamask/snaps-controllers';

/**
 * Get a messenger for the Snap controller. This is scoped to the
 * actions and events that the Snap controller is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The SnapControllerMessenger.
 */
export function getSnapControllerMessenger(rootMessenger: RootMessenger) {
  const messenger: SnapControllerMessenger = new Messenger({
    namespace: 'SnapController',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    actions: [
      'PermissionController:getEndowments',
      'PermissionController:getPermissions',
      'PermissionController:hasPermission',
      'PermissionController:hasPermissions',
      'PermissionController:revokeAllPermissions',
      'PermissionController:revokePermissions',
      'PermissionController:revokePermissionForAllSubjects',
      'PermissionController:getSubjectNames',
      'PermissionController:updateCaveat',
      'ApprovalController:addRequest',
      'ApprovalController:updateRequestState',
      'PermissionController:grantPermissions',
      'SubjectMetadataController:getSubjectMetadata',
      'SubjectMetadataController:addSubjectMetadata',
      'ExecutionService:executeSnap',
      'ExecutionService:terminateSnap',
      'ExecutionService:handleRpcRequest',
      'SnapRegistryController:get',
      'SnapRegistryController:getMetadata',
      'SnapRegistryController:requestUpdate',
      'SnapRegistryController:resolveVersion',
      `SnapInterfaceController:createInterface`,
      `SnapInterfaceController:getInterface`,
      'SnapInterfaceController:setInterfaceDisplayed',
      'StorageService:setItem',
      'StorageService:getItem',
      'StorageService:removeItem',
      'StorageService:clear',
    ],
    events: [
      'ExecutionService:unhandledError',
      'ExecutionService:outboundRequest',
      'ExecutionService:outboundResponse',
      'KeyringController:lock',
      'SnapRegistryController:stateChange',
    ],
    messenger,
  });

  return messenger;
}

type InitActions =
  | KeyringControllerWithKeyringAction
  | PreferencesControllerGetStateAction
  | SnapControllerSetClientActiveAction
  | AnalyticsControllerActions;

type InitEvents = KeyringControllerLockEvent | KeyringControllerUnlockEvent;

export type SnapControllerInitMessenger = ReturnType<
  typeof getSnapControllerInitMessenger
>;

/**
 * Get a messenger for the Snap controller init. This is scoped to
 * the actions and events that the Snap controller init is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The SnapControllerInitMessenger.
 */
export function getSnapControllerInitMessenger(rootMessenger: RootMessenger) {
  const messenger = new Messenger<
    'SnapControllerInit',
    InitActions,
    InitEvents,
    RootMessenger
  >({
    namespace: 'SnapControllerInit',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'KeyringController:withKeyring',
      'PreferencesController:getState',
      'SnapController:setClientActive',
      'AnalyticsController:trackEvent',
    ],
    events: ['KeyringController:lock', 'KeyringController:unlock'],
    messenger,
  });
  return messenger;
}
