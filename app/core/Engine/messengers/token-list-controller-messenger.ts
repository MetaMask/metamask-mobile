import { Messenger } from '@metamask/base-controller';
import {
  NetworkControllerGetNetworkClientByIdAction,
  NetworkControllerStateChangeEvent,
} from '@metamask/network-controller';

type AllowedActions = NetworkControllerGetNetworkClientByIdAction;

type AllowedEvents = NetworkControllerStateChangeEvent;

export type TokenListControllerMessenger = ReturnType<
  typeof getTokenListControllerMessenger
>;

/**
 * Get a restricted messenger for the tokenList controller. This is scoped to the
 * actions and events that the tokenList controller is allowed to handle.
 *
 * @param messenger - The messenger to restrict.
 * @returns The restricted messenger.
 */
export function getTokenListControllerMessenger(
  messenger: Messenger<AllowedActions, AllowedEvents>,
) {
  return messenger.getRestricted({
    name: 'TokenListController',
    allowedActions: ['NetworkController:getNetworkClientById'],
    allowedEvents: ['NetworkController:stateChange'],
  });
}

type AllowedInitializationActions = never;

type AllowedInitializationEvents = NetworkControllerStateChangeEvent;

export type TokenListControllerInitMessenger = ReturnType<
  typeof getTokenListControllerInitMessenger
>;

/**
 * Get a restricted messenger for the tokenList controller. This is scoped to the
 * actions and events that the tokenList controller is allowed to handle during
 * initialization.
 *
 * @param messenger - The messenger to restrict.
 * @returns The restricted messenger.
 */
export function getTokenListControllerInitMessenger(
  messenger: Messenger<
    AllowedInitializationActions,
    AllowedInitializationEvents
  >,
) {
  return messenger.getRestricted({
    name: 'TokenListControllerInit',
    allowedActions: [],
    allowedEvents: ['NetworkController:stateChange'],
  });
}
