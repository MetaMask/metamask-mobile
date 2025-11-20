import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RootExtendedMessenger, RootMessenger } from '../../types';
import type { FeatureFlagOverrideControllerMessenger } from '../../controllers/feature-flag-override-controller/FeatureFlagOverrideController';

/**
 * Get the FeatureFlagOverrideControllerMessenger for the FeatureFlagOverrideController.
 *
 * @param rootExtendedMessenger - The root extended messenger.
 * @returns The FeatureFlagOverrideControllerMessenger.
 */
export function getFeatureFlagOverrideControllerMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
): FeatureFlagOverrideControllerMessenger {
  const messenger = new Messenger<
    'FeatureFlagOverrideController',
    MessengerActions<FeatureFlagOverrideControllerMessenger>,
    MessengerEvents<FeatureFlagOverrideControllerMessenger>,
    RootMessenger
  >({
    namespace: 'FeatureFlagOverrideController',
    parent: rootExtendedMessenger,
  });

  // Allow access to RemoteFeatureFlagController to get remote feature flags
  rootExtendedMessenger.delegate({
    actions: ['RemoteFeatureFlagController:getState'],
    events: ['RemoteFeatureFlagController:stateChange'],
    messenger,
  });

  return messenger;
}
