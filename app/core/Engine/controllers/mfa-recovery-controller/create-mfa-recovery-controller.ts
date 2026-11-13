import {
  CubistEscrowProvider,
  MfaRecoveryController,
  type MfaRecoveryControllerMessenger,
  type MfaRecoveryControllerState,
} from '@metamask/mfa-recovery-controller';
import {
  createCubistSessionTokenProvider,
  type SessionTokenProviderOptions,
} from './auth/session-token-provider';
import { createCubistClientGetter } from './cubist-escrow-provider';
import { tryGetCubistEscrowConfig } from './config';
import { RecoveryIdentifierRouter } from './auth/identifier-auth-provider';
import type { SocialIdTokenProvider } from './auth/social-identifier-auth-provider';
import type { PasskeyAssertionGetter } from './auth/passkey-identifier-auth-provider';
import {
  createPendingOperationEncryptor,
  createPendingOperationKeyGetter,
} from './pending-operation-encryptor';

export interface CreateMfaRecoveryControllerOptions
  extends SessionTokenProviderOptions {
  messenger: MfaRecoveryControllerMessenger;
  state?: Partial<MfaRecoveryControllerState>;
  isEnabled: () => boolean;
  /** Issues provider ID tokens bound to a nonce, for social identifiers. */
  getSocialIdToken: SocialIdTokenProvider;
  /** Runs the platform passkey assertion ceremony, for passkey identifiers. */
  getPasskeyAssertion: PasskeyAssertionGetter;
}

/**
 * Creates the MFA recovery controller with the Cubist escrow and the wallet's
 * identifier providers, without importing Engine.
 */
export function createMfaRecoveryController({
  messenger,
  state,
  isEnabled,
  getSocialIdToken,
  getPasskeyAssertion,
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

  return new MfaRecoveryController({
    messenger,
    state,
    identifierAuthProvider: new RecoveryIdentifierRouter({
      getPasskeyAssertion,
      getSocialIdToken,
    }),
    escrows: [escrow],
    encryptor: createPendingOperationEncryptor(),
    getPendingOperationKey: createPendingOperationKeyGetter(),
  });
}
