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

  // No external dependencies needed for this controller
  rootExtendedMessenger.delegate({
    actions: [],
    events: [],
    messenger,
  });

  return messenger;
}
