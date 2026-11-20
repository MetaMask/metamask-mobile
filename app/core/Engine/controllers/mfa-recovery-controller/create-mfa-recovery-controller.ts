import {
  CubistEscrowProvider,
  MfaRecoveryController,
  type MfaRecoveryControllerMessenger,
  type MfaRecoveryControllerState,
  RecoveryRegistrationLockProvider,
  type RecoveryRegistrationLockProviderMessenger,
} from '@metamask/mfa-recovery-controller';
import {
  createCubistSessionTokenProvider,
  type SessionTokenProviderOptions,
} from './auth/session-token-provider';
import Logger from '../../../../util/Logger';
import { createCubistClientGetter } from './cubist-escrow-provider';
import { getRegistrationUrl, tryGetCubistEscrowConfig } from './config';
import { RecoveryIdentifierRouter } from './auth/identifier-auth-provider';
import type { SocialIdTokenProvider } from './auth/social-identifier-auth-provider';
import type { PasskeyAssertionGetter } from './auth/passkey-identifier-auth-provider';
import type { SiweSigner } from './auth/srp-siwe-signer';
import {
  createPendingOperationEncryptor,
  createPendingOperationKeyGetter,
} from './pending-operation-encryptor';

export interface CreateMfaRecoveryControllerOptions
  extends SessionTokenProviderOptions {
  messenger: MfaRecoveryControllerMessenger;
  state?: Partial<MfaRecoveryControllerState>;
  /** Calls AuthenticationController for the recovery lease's bearer token. */
  lockProviderMessenger: RecoveryRegistrationLockProviderMessenger;
  isEnabled: () => boolean;
  /** Issues provider ID tokens bound to a nonce, for social identifiers. */
  getSocialIdToken: SocialIdTokenProvider;
  /** Runs the platform passkey assertion ceremony, for passkey identifiers. */
  getPasskeyAssertion: PasskeyAssertionGetter;
  /** Signs SIWE identifier proofs with the primary SRP's message-signing key. */
  siweSigner: SiweSigner;
}

/**
 * Creates the MFA recovery controller with the Cubist escrow and the wallet's
 * identifier providers, without importing Engine.
 */
export function createMfaRecoveryController({
  messenger,
  state,
  lockProviderMessenger,
  isEnabled,
  getSocialIdToken,
  getPasskeyAssertion,
  siweSigner,
  ...sessionTokenOptions
}: CreateMfaRecoveryControllerOptions): MfaRecoveryController {
  const getClient = createCubistClientGetter({
    tokenProvider: createCubistSessionTokenProvider(sessionTokenOptions),
    isEnabled,
  });
  const escrow = new CubistEscrowProvider({
    getClient,
    ...tryGetCubistEscrowConfig(),
  });
  const applyMutation = escrow.applyMutation.bind(escrow);
  escrow.applyMutation = async (...args) => {
    try {
      return await applyMutation(...args);
    } catch (error) {
      Logger.log('MfaRecovery applyMutation failed', {
        code: (error as { code?: string }).code,
        name: (error as Error).name,
        message: (error as Error).message,
      });
      throw error;
    }
  };

  return new MfaRecoveryController({
    messenger,
    state,
    lockProvider: new RecoveryRegistrationLockProvider({
      baseUrl: getRegistrationUrl(),
      messenger: lockProviderMessenger,
      fetch: globalThis.fetch.bind(globalThis),
    }),
    identifierAuthProvider: new RecoveryIdentifierRouter({
      getPasskeyAssertion,
      getSocialIdToken,
      siweSigner,
    }),
    escrows: [escrow],
    encryptor: createPendingOperationEncryptor(),
    getPendingOperationKey: createPendingOperationKeyGetter(),
  });
}
