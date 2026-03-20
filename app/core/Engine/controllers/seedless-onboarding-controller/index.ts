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
 * Normalizes a serialized vault so the mobile Encryptor can decrypt it
 * regardless of whether the vault was written by the adapter (using 'data')
 * or by the original mobile Encryptor (using 'cipher').
 *
 * Background: the SeedlessOnboardingController stores vaults via
 * encryptWithKey (adapter, 'data' field) and via encryptWithDetail (mobile
 * Encryptor, 'cipher' field).  The mobile Encryptor's decrypt / decryptWithDetail
 * always reads 'cipher', so vaults produced by the adapter must be normalized
 * before being handed to those methods.
 */
function normalizeVaultFormat(text: string): string {
  const payload: Record<string, unknown> = JSON.parse(text);
  if (payload.data !== undefined && payload.cipher === undefined) {
    return JSON.stringify({ ...payload, cipher: payload.data });
  }
  return text;
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
    // Accept both adapter format ('data') and legacy mobile format ('cipher').
    // 'data' is intentionally optional here: pre-adapter vaults only carry
    // 'cipher', so making 'data' required would be a lie about the runtime
    // shape and would allow the fallback to be silently removed.
    encryptedObject: Omit<ControllerEncryptionResult, 'data'> & {
      data?: string;
      cipher?: string;
    },
  ): Promise<unknown> => {
    const cipher = encryptedObject.data ?? encryptedObject.cipher;
    if (!cipher) {
      throw new Error(
        'SeedlessOnboardingController encryptorAdapter: vault is missing both "data" and "cipher" fields',
      );
    }
    return encryptor.decryptWithKey(key, {
      cipher,
      iv: encryptedObject.iv,
      salt: encryptedObject.salt,
      lib: encryptedObject.lib,
      keyMetadata: encryptedObject.keyMetadata,
    });
  },
  decrypt: async (password: string, text: string): Promise<unknown> =>
    encryptor.decrypt(password, normalizeVaultFormat(text)),
  decryptWithDetail: async (password: string, text: string) =>
    encryptor.decryptWithDetail(password, normalizeVaultFormat(text)),
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
