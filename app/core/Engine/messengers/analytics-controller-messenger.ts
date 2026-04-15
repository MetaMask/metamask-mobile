import { AnalyticsControllerMessenger } from '@metamask/analytics-controller';
import {
  Messenger,
  MessengerEvents,
  MessengerActions,
} from '@metamask/messenger';
import type {
  RemoteFeatureFlagControllerGetStateAction,
  RemoteFeatureFlagControllerStateChangeEvent,
} from '@metamask/remote-feature-flag-controller';
import { RootMessenger } from '../types';

/**
 * Get the AnalyticsControllerMessenger for the AnalyticsController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The AnalyticsControllerMessenger.
 */
export function getAnalyticsControllerMessenger(
  rootMessenger: RootMessenger,
): AnalyticsControllerMessenger {
  const messenger = new Messenger<
    'AnalyticsController',
    MessengerActions<AnalyticsControllerMessenger>,
    MessengerEvents<AnalyticsControllerMessenger>,
    RootMessenger
  >({
    namespace: 'AnalyticsController',
    parent: rootMessenger,
  });
  return messenger;
}

export type AnalyticsControllerInitMessenger = ReturnType<
  typeof getAnalyticsControllerInitMessenger
>;

/**
 * Get the init messenger for the AnalyticsController.
 * Scoped to reading remote feature flags during initialization and
 * reacting to flag updates at runtime (Braze allowlists).
 *
 * @param rootMessenger - The root messenger.
 * @returns The AnalyticsControllerInitMessenger.
 */
export function getAnalyticsControllerInitMessenger(
  rootMessenger: RootMessenger,
) {
  const messenger = new Messenger<
    'AnalyticsControllerInit',
    RemoteFeatureFlagControllerGetStateAction,
    RemoteFeatureFlagControllerStateChangeEvent,
    RootMessenger
  >({
    namespace: 'AnalyticsControllerInit',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    actions: ['RemoteFeatureFlagController:getState'],
    events: ['RemoteFeatureFlagController:stateChange'],
    messenger,
  });

  return messenger;
}
