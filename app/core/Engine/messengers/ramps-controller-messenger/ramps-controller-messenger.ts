import {
  RAMPS_CONTROLLER_REQUIRED_CONTROLLER_ACTIONS,
  RAMPS_CONTROLLER_REQUIRED_SERVICE_ACTIONS,
  RampsControllerMessenger,
  type RampsControllerOrderStatusChangedEvent,
} from '@metamask/ramps-controller';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import type {
  KeyringControllerGetStateAction,
  KeyringControllerUnlockEvent,
} from '@metamask/keyring-controller';
import type {
  RemoteFeatureFlagControllerGetStateAction,
  RemoteFeatureFlagControllerStateChangeEvent,
} from '@metamask/remote-feature-flag-controller';
import { RootMessenger } from '../../types';

type AllowedActions = MessengerActions<RampsControllerMessenger>;

type AllowedEvents = MessengerEvents<RampsControllerMessenger>;

/**
 * Get the RampsControllerMessenger for the RampsController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The RampsControllerMessenger.
 */
export function getRampsControllerMessenger(
  rootMessenger: RootMessenger,
): RampsControllerMessenger {
  const messenger = new Messenger<
    'RampsController',
    AllowedActions,
    AllowedEvents,
    typeof rootMessenger
  >({
    namespace: 'RampsController',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    messenger,
    actions: [
      ...RAMPS_CONTROLLER_REQUIRED_CONTROLLER_ACTIONS,
      ...RAMPS_CONTROLLER_REQUIRED_SERVICE_ACTIONS,
    ],
    events: [],
  });

  return messenger;
}

export type RampsControllerInitMessenger = ReturnType<
  typeof getRampsControllerInitMessenger
>;

/**
 * Get the init messenger for the RampsController. Scoped to actions
 * needed during initialization (reading feature flags and hydrating VBA).
 *
 * @param rootMessenger - The root messenger.
 * @returns The RampsControllerInitMessenger.
 */
export function getRampsControllerInitMessenger(rootMessenger: RootMessenger) {
  const messenger = new Messenger<
    'RampsControllerInit',
    RemoteFeatureFlagControllerGetStateAction | KeyringControllerGetStateAction,
    | RampsControllerOrderStatusChangedEvent
    | RemoteFeatureFlagControllerStateChangeEvent
    | KeyringControllerUnlockEvent,
    RootMessenger
  >({
    namespace: 'RampsControllerInit',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    actions: [
      'RemoteFeatureFlagController:getState',
      'KeyringController:getState',
    ],
    events: [
      'RampsController:orderStatusChanged',
      'RemoteFeatureFlagController:stateChange',
      'KeyringController:unlock',
    ],
    messenger,
  });

  return messenger;
}
