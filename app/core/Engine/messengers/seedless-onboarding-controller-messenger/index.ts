import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RootExtendedMessenger, RootMessenger } from '../../types';
import { SeedlessOnboardingControllerMessenger } from '@metamask/seedless-onboarding-controller';

/**
 * Get the SeedlessOnboardingControllerMessenger for the SeedlessOnboardingController.
 *
 * @param rootExtendedMessenger - The root extended messenger.
 * @returns The SeedlessOnboardingControllerMessenger.
 */
export function getSeedlessOnboardingControllerMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
): SeedlessOnboardingControllerMessenger {
  const messenger = new Messenger<
    'SeedlessOnboardingController',
    MessengerActions<SeedlessOnboardingControllerMessenger>,
    MessengerEvents<SeedlessOnboardingControllerMessenger>,
    RootMessenger
  >({
    namespace: 'SeedlessOnboardingController',
    parent: rootExtendedMessenger,
  });
  return messenger;
}
