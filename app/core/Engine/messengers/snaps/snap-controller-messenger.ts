import { Messenger } from '@metamask/messenger';
import {
  ExecuteSnapAction,
  TerminateSnapAction,
  TerminateAllSnapsAction,
  HandleRpcRequestAction,
  GetResult,
  GetMetadata,
  Update,
  ResolveVersion,
  CreateInterface,
  GetInterface,
  ErrorMessageEvent,
  OutboundRequest,
  OutboundResponse,
  SetClientActive,
} from '@metamask/snaps-controllers';
import {
  GetEndowments,
  GetPermissions,
  HasPermission,
  HasPermissions,
  RequestPermissions,
  RevokeAllPermissions,
  RevokePermissions,
  RevokePermissionForAllSubjects,
  GetSubjects,
  GrantPermissions,
  GetSubjectMetadata,
  AddSubjectMetadata,
  UpdateCaveat,
} from '@metamask/permission-controller';
import {
  AddApprovalRequest,
  UpdateRequestState,
} from '@metamask/approval-controller';
import {
  KeyringControllerGetKeyringsByTypeAction,
  KeyringControllerLockEvent,
  KeyringControllerUnlockEvent,
} from '@metamask/keyring-controller';
import { PreferencesControllerGetStateAction } from '@metamask/preferences-controller';
import { NetworkControllerGetNetworkClientByIdAction } from '@metamask/network-controller';
import { SelectedNetworkControllerGetNetworkClientIdForDomainAction } from '@metamask/selected-network-controller';
import { RootMessenger } from '../../types';
import { AnalyticsControllerActions } from '@metamask/analytics-controller';
import {
  StorageServiceClearAction,
  StorageServiceGetItemAction,
  StorageServiceRemoveItemAction,
  StorageServiceSetItemAction,
} from '@metamask/storage-service';

type Actions =
  | GetEndowments
  | GetPermissions
  | HasPermission
  | HasPermissions
  | RequestPermissions
  | RevokeAllPermissions
  | RevokePermissions
  | RevokePermissionForAllSubjects
  | GetSubjects
  | AddApprovalRequest
  | UpdateRequestState
  | GrantPermissions
  | GetSubjectMetadata
  | UpdateCaveat
  | AddSubjectMetadata
  | ExecuteSnapAction
  | TerminateSnapAction
  | TerminateAllSnapsAction
  | HandleRpcRequestAction
  | GetResult
  | GetMetadata
  | Update
  | ResolveVersion
  | CreateInterface
  | GetInterface
  | NetworkControllerGetNetworkClientByIdAction
  | SelectedNetworkControllerGetNetworkClientIdForDomainAction
  | StorageServiceSetItemAction
  | StorageServiceGetItemAction
  | StorageServiceRemoveItemAction
  | StorageServiceClearAction;

type Events =
  | ErrorMessageEvent
  | OutboundRequest
  | OutboundResponse
  | KeyringControllerLockEvent;

export type SnapControllerMessenger = ReturnType<
  typeof getSnapControllerMessenger
>;

/**
 * Get a messenger for the Snap controller. This is scoped to the
 * actions and events that the Snap controller is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The SnapControllerMessenger.
 */
export function getSnapControllerMessenger(rootMessenger: RootMessenger) {
  const messenger = new Messenger<
    'SnapController',
    Actions,
    Events,
    RootMessenger
  >({
    namespace: 'SnapController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'PermissionController:getEndowments',
      'PermissionController:getPermissions',
      'PermissionController:hasPermission',
      'PermissionController:hasPermissions',
      'PermissionController:requestPermissions',
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
      'ExecutionService:terminateAllSnaps',
      'ExecutionService:handleRpcRequest',
      'SnapsRegistry:get',
      'SnapsRegistry:getMetadata',
      'SnapsRegistry:update',
      'SnapsRegistry:resolveVersion',
      `SnapInterfaceController:createInterface`,
      `SnapInterfaceController:getInterface`,
      'NetworkController:getNetworkClientById',
      'SelectedNetworkController:getNetworkClientIdForDomain',
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
    ],
    messenger,
  });
  return messenger;
}

type InitActions =
  | KeyringControllerGetKeyringsByTypeAction
  | PreferencesControllerGetStateAction
  | SetClientActive
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
      'KeyringController:getKeyringsByType',
      'PreferencesController:getState',
      'SnapController:setClientActive',
      'AnalyticsController:trackEvent',
    ],
    events: ['KeyringController:lock', 'KeyringController:unlock'],
    messenger,
  });
  return messenger;
}
