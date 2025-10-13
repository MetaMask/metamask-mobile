import { Messenger } from '@metamask/base-controller';
import {
  NetworkControllerGetNetworkClientByIdAction,
  NetworkControllerGetNetworkConfigurationByNetworkClientId,
  NetworkControllerGetSelectedNetworkClientAction,
  NetworkControllerGetStateAction,
  NetworkControllerNetworkDidChangeEvent,
} from '@metamask/network-controller';
import { PreferencesControllerStateChangeEvent } from '@metamask/preferences-controller';

type AllowedActions =
  | NetworkControllerGetNetworkClientByIdAction
  | NetworkControllerGetNetworkConfigurationByNetworkClientId
  | NetworkControllerGetSelectedNetworkClientAction
  | NetworkControllerGetStateAction;

type AllowedEvents =
  | NetworkControllerNetworkDidChangeEvent
  | PreferencesControllerStateChangeEvent;

export type AssetsContractControllerMessenger = ReturnType<
  typeof getAssetsContractControllerMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * assets contract controller is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getAssetsContractControllerMessenger(
  messenger: Messenger<AllowedActions, AllowedEvents>,
) {
  return messenger.getRestricted({
    name: 'AssetsContractController',
    allowedActions: [
      'NetworkController:getNetworkClientById',
      'NetworkController:getNetworkConfigurationByNetworkClientId',
      'NetworkController:getSelectedNetworkClient',
      'NetworkController:getState',
    ],
    allowedEvents: [
      'NetworkController:networkDidChange',
      'PreferencesController:stateChange',
    ],
  });
}
