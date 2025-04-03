import type { ControllerInitFunction } from '../../types';
import {
  SeedlessOnboardingController,
  SeedlessOnboardingControllerState,
  type SeedlessOnboardingControllerMessenger,
} from '@metamask/seedless-onboarding-controller';
import { Encryptor, LEGACY_DERIVATION_OPTIONS } from '../../../Encryptor';


const getDefaultSeedlessOnboardingControllerState = () : SeedlessOnboardingControllerState => ({
  nodeAuthTokens: undefined,
  hasValidEncryptionKey: false,
});

const encryptor = new Encryptor({
  keyDerivationOptions: LEGACY_DERIVATION_OPTIONS,
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
    encryptor,
  });


  return { controller };
};
