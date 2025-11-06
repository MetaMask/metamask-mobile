import { Messenger } from '@metamask/base-controller';
import type {
  NetworkControllerGetNetworkClientByIdAction,
  NetworkControllerNetworkDidChangeEvent,
} from '@metamask/network-controller';

type AllowedActions = NetworkControllerGetNetworkClientByIdAction;

type AllowedEvents = NetworkControllerNetworkDidChangeEvent;

export type SwapsControllerMessenger = ReturnType<
  typeof getSwapsControllerMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * swaps controller is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getSwapsControllerMessenger(
  messenger: Messenger<AllowedActions, AllowedEvents>,
) {
  return messenger.getRestricted({
    name: 'SwapsController',
    allowedActions: ['NetworkController:getNetworkClientById'],
    allowedEvents: ['NetworkController:networkDidChange'],
  });
}
