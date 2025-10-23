import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import type { NetworkControllerGetSelectedNetworkClientAction } from '@metamask/network-controller';
import {
  PreferencesControllerGetStateAction,
  PreferencesControllerStateChangeEvent,
} from '@metamask/preferences-controller';
import { RootMessenger } from '../types';
import { PPOMControllerMessenger } from '@metamask/ppom-validator';

export function getPPOMControllerMessenger(
  rootMessenger: RootMessenger,
): PPOMControllerMessenger {
  const messenger = new Messenger<
    'PPOMController',
    MessengerActions<PPOMControllerMessenger>,
    MessengerEvents<PPOMControllerMessenger>,
    RootMessenger
  >({
    namespace: 'PPOMController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['NetworkController:getNetworkClientById'],
    events: ['NetworkController:networkDidChange'],
    messenger,
  });
  return messenger;
}

type AllowedInitializationActions =
  | NetworkControllerGetSelectedNetworkClientAction
  | PreferencesControllerGetStateAction;

type AllowedInitializationEvents = PreferencesControllerStateChangeEvent;

export type PPOMControllerInitMessenger = ReturnType<
  typeof getPPOMControllerInitMessenger
>;

/**
 * Get the messenger for the PPOM controller initialization. This is scoped to the
 * actions and events that the PPOM controller is allowed to handle during
 * initialization.
 *
 * @param rootMessenger - The root messenger.
 * @returns The PPOMControllerInitMessenger.
 */
export function getPPOMControllerInitMessenger(rootMessenger: RootMessenger) {
  const messenger = new Messenger<
    'PPOMControllerInit',
    AllowedInitializationActions,
    AllowedInitializationEvents,
    RootMessenger
  >({
    namespace: 'PPOMControllerInit',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'NetworkController:getSelectedNetworkClient',
      'PreferencesController:getState',
    ],
    events: ['PreferencesController:stateChange'],
    messenger,
  });
  return messenger;
}
