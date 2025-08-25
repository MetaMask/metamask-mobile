import type { ControllerInitFunction } from '../../types';
import {
  SeedlessOnboardingController,
  SeedlessOnboardingControllerState,
  Web3AuthNetwork,
  getDefaultSeedlessOnboardingControllerState,
  type SeedlessOnboardingControllerMessenger,
} from '@metamask/seedless-onboarding-controller';
import { Encryptor, LEGACY_DERIVATION_OPTIONS } from '../../../Encryptor';
import { EncryptionKey } from '../../../Encryptor/types';
import { web3AuthNetwork } from '../../../OAuthService/OAuthLoginHandlers/constants';
import AuthTokenHandler from '../../../OAuthService/AuthTokenHandler';

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
  SeedlessOnboardingController<EncryptionKey>,
  SeedlessOnboardingControllerMessenger
> = (request) => {
  if (!web3AuthNetwork) {
    throw new Error(
      `Missing environment variables for SeedlessOnboardingController\n
      WEB3AUTH_NETWORK: ${web3AuthNetwork}\n`,
    );
  }

  const { controllerMessenger, persistedState } = request;

  const seedlessOnboardingControllerState =
    persistedState.SeedlessOnboardingController ??
    getDefaultSeedlessOnboardingControllerState();

  const controller = new SeedlessOnboardingController({
    messenger: controllerMessenger,
    state:
      seedlessOnboardingControllerState as SeedlessOnboardingControllerState,
    encryptor: {
      ...encryptor,
      // Typing issue
      decryptWithKey: encryptor.decryptWithKey as unknown as (
        key: EncryptionKey,
        encryptedString: string,
      ) => Promise<unknown>,
    },
    network: web3AuthNetwork as Web3AuthNetwork,
    passwordOutdatedCacheTTL: 15_000, // 15 seconds
    refreshJWTToken: AuthTokenHandler.refreshJWTToken,
    revokeRefreshToken: AuthTokenHandler.revokeRefreshToken,
  });

  return { controller };
};
