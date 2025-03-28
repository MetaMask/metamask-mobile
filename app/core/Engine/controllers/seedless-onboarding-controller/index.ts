import type { ControllerInitFunction } from '../../types';
import {
  SeedlessOnboardingController,
  SeedlessOnboardingControllerState,
  type SeedlessOnboardingControllerMessenger,
} from '@metamask/seedless-onboarding-controller';



const getDefaultSeedlessOnboardingControllerState = () : SeedlessOnboardingControllerState => ({
  nodeAuthTokens: undefined,
  hasValidEncryptionKey: false,
});


/**
 * Initialize the SeedlessOnboardingController.
 *
 * @param request - The request object.
 * @returns The SeedlessOnboardingController.
 */
export const seedlessOnboardingControllerInit: ControllerInitFunction<
  SeedlessOnboardingController,
  SeedlessOnboardingControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  const seedlessOnboardingControllerState =
    persistedState.SeedlessOnboardingController ?? getDefaultSeedlessOnboardingControllerState();

  const controller = new SeedlessOnboardingController({
    messenger: controllerMessenger,
    state: seedlessOnboardingControllerState,
  });
  return { controller };
};
