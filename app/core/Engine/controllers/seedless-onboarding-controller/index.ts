import type { ControllerInitFunction } from '../../types';
import {
  SeedlessOnboardingController,
  SeedlessOnboardingControllerState,
  Web3AuthNetwork,
  getDefaultSeedlessOnboardingControllerState,
  type SeedlessOnboardingControllerMessenger,
} from '@metamask/seedless-onboarding-controller';
import { Encryptor, LEGACY_DERIVATION_OPTIONS } from '../../../Encryptor';
import { web3AuthNetwork } from '../../../Oauth2Login/Oauth2LoginHandler/constants';

// const web3AuthNetwork = process.env.Web3AuthNetwork as Web3AuthNetwork;

// if (!web3AuthNetwork) {
//   throw new Error('Missing environment variables');
// }

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
    persistedState.SeedlessOnboardingController ??
    getDefaultSeedlessOnboardingControllerState();

  const controller = new SeedlessOnboardingController({
    messenger: controllerMessenger,
    state:
      seedlessOnboardingControllerState as SeedlessOnboardingControllerState,
    encryptor,
    network: web3AuthNetwork as Web3AuthNetwork,
  });

  return { controller };
};
