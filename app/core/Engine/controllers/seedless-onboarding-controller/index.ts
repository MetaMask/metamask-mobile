import type { MessengerClientInitFunction } from '../../types';
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
  EncryptionResult,
  KeyDerivationOptions,
} from '../../../Encryptor/types';
import { web3AuthNetwork } from '../../../OAuthService/OAuthLoginHandlers/constants';
import AuthTokenHandler from '../../../OAuthService/AuthTokenHandler';
import { trackSeedlessLegacyDataVaultDecrypt } from './trackSeedlessLegacyDataVaultDecrypt';

const baseEncryptor = new Encryptor({
  keyDerivationOptions: LEGACY_DERIVATION_OPTIONS,
});

/**
 * Seedless-only encryptor wrapper (ADR TO-590).
 *
 * Replaces the old encryptorAdapter glue: mobile uses `cipher` as the canonical
 * encrypted payload field, but legacy SeedlessOnboardingController vaults may
 * still store `data`. Migration 144 rewrites persisted vaults; this class
 * handles unmigrated runtime decrypts.
 *
 * Delegates to a separate baseEncryptor instance because Encryptor methods are
 * class-field arrow functions — super.decryptWithKey is not available.
 */
class SeedlessEncryptor extends Encryptor {
  decryptWithKey = async (
    key: EncryptionKey,
    payload: EncryptionResult & { data?: string },
  ): Promise<unknown> => {
    const cipher = payload.cipher ?? payload.data;
    if (!cipher) {
      throw new Error(
        'Encrypted payload is missing both "cipher" and "data" fields',
      );
    }

    if (!payload.cipher && payload.data) {
      trackSeedlessLegacyDataVaultDecrypt({
        lib: payload.lib,
        source: 'seedlessEncryptor',
      });
    }

    const newPayload = {
      ...payload,
      cipher: payload.cipher ?? payload.data,
    };
    return baseEncryptor.decryptWithKey(key, newPayload);
  };
}

const encryptor = new SeedlessEncryptor({
  keyDerivationOptions: LEGACY_DERIVATION_OPTIONS,
});

/**
 * Initialize the SeedlessOnboardingController.
 *
 * @param request - The request object.
 * @returns The SeedlessOnboardingController.
 */
export const seedlessOnboardingControllerInit: MessengerClientInitFunction<
  SeedlessOnboardingController<
    EncryptionKey,
    KeyDerivationOptions,
    EncryptionResult
  >,
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

  const controller = new SeedlessOnboardingController<
    EncryptionKey,
    KeyDerivationOptions,
    EncryptionResult
  >({
    messenger: controllerMessenger,
    state:
      seedlessOnboardingControllerState as SeedlessOnboardingControllerState,
    encryptor,
    network: web3AuthNetwork as Web3AuthNetwork,
    passwordOutdatedCacheTTL: 15_000, // 15 seconds
    refreshJWTToken: AuthTokenHandler.refreshJWTToken,
    renewRefreshToken: AuthTokenHandler.renewRefreshToken,
    revokeRefreshToken: AuthTokenHandler.revokeRefreshToken,
  });

  return { controller };
};
