import { Messenger } from '@metamask/base-controller';
import type {
  NetworkControllerGetNetworkClientByIdAction,
  NetworkControllerGetSelectedNetworkClientAction,
  NetworkControllerNetworkDidChangeEvent,
} from '@metamask/network-controller';
import {
  PreferencesControllerGetStateAction,
  PreferencesControllerStateChangeEvent,
} from '@metamask/preferences-controller';

type AllowedActions = NetworkControllerGetNetworkClientByIdAction;

type AllowedEvents = NetworkControllerNetworkDidChangeEvent;

export type PPOMControllerMessenger = ReturnType<
  typeof getPPOMControllerMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * PPOM controller is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getPPOMControllerMessenger(
  messenger: Messenger<AllowedActions, AllowedEvents>,
) {
  return messenger.getRestricted({
    name: 'PPOMController',
    allowedActions: ['NetworkController:getNetworkClientById'],
    allowedEvents: ['NetworkController:networkDidChange'],
  });
}

type AllowedInitializationActions =
  | NetworkControllerGetSelectedNetworkClientAction
  | PreferencesControllerGetStateAction;

type AllowedInitializationEvents = PreferencesControllerStateChangeEvent;

export type PPOMControllerInitMessenger = ReturnType<
  typeof getPPOMControllerInitMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * PPOM controller initialization is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getPPOMControllerInitMessenger(
  messenger: Messenger<
    AllowedInitializationActions,
    AllowedInitializationEvents
  >,
) {
  return messenger.getRestricted({
    name: 'PPOMController',
    allowedActions: [
      'NetworkController:getSelectedNetworkClient',
      'PreferencesController:getState',
    ],
    allowedEvents: ['PreferencesController:stateChange'],
  });
}
