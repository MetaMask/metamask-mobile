import type { Json } from '@metamask/utils';
import type { ControllerInitFunction } from '../../types';
import {
  SeedlessOnboardingController,
  SeedlessOnboardingControllerState,
  Web3AuthNetwork,
  getDefaultSeedlessOnboardingControllerState,
  type SeedlessOnboardingControllerMessenger,
} from '@metamask/seedless-onboarding-controller';
import { Encryptor, LEGACY_DERIVATION_OPTIONS } from '../../../Encryptor';
import type {
  EncryptionKey,
  KeyDerivationOptions,
} from '../../../Encryptor/types';
import { web3AuthNetwork } from '../../../OAuthService/OAuthLoginHandlers/constants';
import AuthTokenHandler from '../../../OAuthService/AuthTokenHandler';

const encryptor = new Encryptor({
  keyDerivationOptions: LEGACY_DERIVATION_OPTIONS,
});

/**
 * Encryption result interface expected by the SeedlessOnboardingController.
 * Uses 'data' instead of 'cipher' per @metamask/browser-passworder standard.
 */
interface ControllerEncryptionResult {
  data: string;
  iv: string;
  salt?: string;
  lib?: string;
  keyMetadata?: KeyDerivationOptions;
}

/**
 * Adapter that wraps the mobile Encryptor to be compatible with
 * SeedlessOnboardingController's VaultEncryptor interface.
 * Maps 'cipher' <-> 'data' between mobile and controller formats.
 */
const encryptorAdapter = {
  ...encryptor,
  encryptWithKey: async (
    key: EncryptionKey,
    data: Json,
  ): Promise<ControllerEncryptionResult> => {
    const result = await encryptor.encryptWithKey(key, data);
    return {
      data: result.cipher,
      iv: result.iv,
      salt: result.salt,
      lib: result.lib,
      keyMetadata: result.keyMetadata,
    };
  },
  decryptWithKey: async (
    key: EncryptionKey,
    encryptedObject: ControllerEncryptionResult,
  ): Promise<unknown> =>
    encryptor.decryptWithKey(key, {
      cipher: encryptedObject.data,
      iv: encryptedObject.iv,
      salt: encryptedObject.salt,
      lib: encryptedObject.lib,
      keyMetadata: encryptedObject.keyMetadata,
    }),
};

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
    encryptor: encryptorAdapter,
    network: web3AuthNetwork as Web3AuthNetwork,
    passwordOutdatedCacheTTL: 15_000, // 15 seconds
    refreshJWTToken: AuthTokenHandler.refreshJWTToken,
    renewRefreshToken: AuthTokenHandler.renewRefreshToken,
    revokeRefreshToken: AuthTokenHandler.revokeRefreshToken,
  });

  return { controller };
};
