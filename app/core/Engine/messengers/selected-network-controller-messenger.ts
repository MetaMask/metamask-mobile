import { Messenger } from '@metamask/base-controller';
import {
  GetSubjects,
  HasPermissions,
  PermissionControllerStateChange,
} from '@metamask/permission-controller';
import {
  NetworkControllerGetNetworkClientByIdAction,
  NetworkControllerGetSelectedNetworkClientAction,
  NetworkControllerGetStateAction,
  NetworkControllerStateChangeEvent,
} from '@metamask/network-controller';

type AllowedActions =
  | NetworkControllerGetNetworkClientByIdAction
  | NetworkControllerGetSelectedNetworkClientAction
  | NetworkControllerGetStateAction
  | HasPermissions
  | GetSubjects;

type AllowedEvents =
  | NetworkControllerStateChangeEvent
  | PermissionControllerStateChange;

export type SelectedNetworkControllerMessenger = ReturnType<
  typeof getSelectedNetworkControllerMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * selected network controller is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getSelectedNetworkControllerMessenger(
  messenger: Messenger<AllowedActions, AllowedEvents>,
) {
  return messenger.getRestricted({
    name: 'SelectedNetworkController',
    allowedActions: [
      'NetworkController:getNetworkClientById',
      'NetworkController:getState',
      'NetworkController:getSelectedNetworkClient',
      'PermissionController:hasPermissions',
      'PermissionController:getSubjectNames',
    ],
    allowedEvents: [
      'NetworkController:stateChange',
      'PermissionController:stateChange',
    ],
  });
}
