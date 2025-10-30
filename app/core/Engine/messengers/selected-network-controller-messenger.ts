import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RootMessenger } from '../types';
import { SelectedNetworkControllerMessenger } from '@metamask/selected-network-controller';

/**
 * Get the messenger for the selected network controller. This is scoped to the
 * actions and events that the selected network controller is allowed to handle
 *
 * @param rootMessenger - The root messenger.
 * @returns The SelectedNetworkControllerMessenger.
 */
export function getSelectedNetworkControllerMessenger(
  rootMessenger: RootMessenger,
): SelectedNetworkControllerMessenger {
  const messenger = new Messenger<
    'SelectedNetworkController',
    MessengerActions<SelectedNetworkControllerMessenger>,
    MessengerEvents<SelectedNetworkControllerMessenger>,
    RootMessenger
  >({
    namespace: 'SelectedNetworkController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'NetworkController:getNetworkClientById',
      'NetworkController:getState',
      'NetworkController:getSelectedNetworkClient',
      'PermissionController:hasPermissions',
      'PermissionController:getSubjectNames',
    ],
    events: [
      'NetworkController:stateChange',
      'PermissionController:stateChange',
    ],
    messenger,
  });
  return messenger;
}
