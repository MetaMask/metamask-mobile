import { RootExtendedMessenger } from '../../types';

export type SeedlessOnboardingControllerMessenger = ReturnType<
  typeof getSeedlessOnboardingControllerMessenger
>;

/**
 * Get the SeedlessOnboardingControllerMessenger for the SeedlessOnboardingController.
 *
 * @param baseControllerMessenger - The base controller messenger.
 * @returns The SeedlessOnboardingControllerMessenger.
 */
export function getSeedlessOnboardingControllerMessenger(
  baseControllerMessenger: RootExtendedMessenger,
) {
  return baseControllerMessenger.getRestricted({
    name: 'SeedlessOnboardingController',
    allowedEvents: [],
    allowedActions: [],
  });
}
