import {
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
  rootMessenger: RootMessenger<AllowedActions, AllowedEvents>,
): RampsControllerMessenger {
  const messenger: RampsControllerMessenger = new Messenger({
    namespace: 'RampsController',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    messenger,
    actions: [
      // The controller reads the `moneyHeadlessAllProviders` feature flag
      // itself for quote widening.
      'RemoteFeatureFlagController:getState',
      // Spread the package-owned required list so new service actions
      // (e.g. getDefaultRedirectCallbackUrl) cannot be forgotten at upgrade.
      ...RAMPS_CONTROLLER_REQUIRED_SERVICE_ACTIONS,
    ],
    events: [],
  });

  return messenger;
}

export type RampsControllerInitMessenger = Messenger<
  'RampsControllerInit',
  RemoteFeatureFlagControllerGetStateAction,
  | RampsControllerOrderStatusChangedEvent
  | RemoteFeatureFlagControllerStateChangeEvent
>;

/**
 * Get the init messenger for the RampsController. Scoped to actions
 * needed during initialization (reading feature flags).
 *
 * @param rootMessenger - The root messenger.
 * @returns The RampsControllerInitMessenger.
 */
export function getRampsControllerInitMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<RampsControllerInitMessenger>,
    MessengerEvents<RampsControllerInitMessenger>
  >,
): RampsControllerInitMessenger {
  const messenger: RampsControllerInitMessenger = new Messenger({
    namespace: 'RampsControllerInit',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    actions: ['RemoteFeatureFlagController:getState'],
    events: [
      'RampsController:orderStatusChanged',
      'RemoteFeatureFlagController:stateChange', // React when flags arrive (avoids race with async fetch)
    ],
    messenger,
  });

  return messenger;
}
