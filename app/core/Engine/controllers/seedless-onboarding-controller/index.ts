import type { ControllerInitFunction } from '../../types';
import {
  SeedlessOnboardingController,
  SeedlessOnboardingControllerState,
  Web3AuthNetwork,
  type SeedlessOnboardingControllerMessenger,
} from '@metamask/seedless-onboarding-controller';
import { Encryptor, LEGACY_DERIVATION_OPTIONS } from '../../../Encryptor';

export const TOPRFNetwork = Web3AuthNetwork.Devnet;

export const getDefaultSeedlessOnboardingControllerState = () : SeedlessOnboardingControllerState => ({
  vault: undefined,
  nodeAuthTokens: undefined,
  backupHashes: [],
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
    state: seedlessOnboardingControllerState as SeedlessOnboardingControllerState,
    encryptor,
    network: TOPRFNetwork
  });


  return { controller };
};
