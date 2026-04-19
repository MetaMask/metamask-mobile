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
import type { AccountsControllerChangeEvent } from '@metamask/accounts-controller';
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
 * Scoped to analytics-init dependencies like accounts state changes for
 * account composition trait updates.
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
    RemoteFeatureFlagControllerStateChangeEvent | AccountsControllerChangeEvent,
    RootMessenger
  >({
    namespace: 'AnalyticsControllerInit',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    actions: ['RemoteFeatureFlagController:getState'],
    events: [
      'RemoteFeatureFlagController:stateChange',
      'AccountsController:stateChange',
    ],
    messenger,
  });

  return messenger;
}
