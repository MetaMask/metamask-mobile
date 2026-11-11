import {
  CubistEscrowProvider,
  MfaRecoveryController,
  type MfaRecoveryControllerMessenger,
  type MfaRecoveryControllerState,
} from '@metamask/mfa-recovery-controller';
import { createCubistSessionTokenProvider } from './auth/auth-provider';
import { CUBIST_AUTH_AUDIENCE } from './constants';
import { createCubistClientGetter } from './cubist-escrow-provider';
import { tryGetCubistKeys } from './config';
import { RecoveryIdentifierRouter } from './auth/identifier-auth-provider';
import type { SocialIdTokenProvider } from './auth/social-identifier-auth-provider';
import type { PasskeyAssertionGetter } from './auth/passkey-identifier-auth-provider';
import type { SignPersonalMessage } from './auth/identifiers';
import {
  createPendingOperationEncryptor,
  type MobilePendingOperationEncryptor,
} from './pending-operation-encryptor';
import { withApplyMutationDiagnostics } from './dev/apply-mutation-diagnostics';

export interface CreateMfaRecoveryControllerOptions {
  messenger: MfaRecoveryControllerMessenger;
  state?: Partial<MfaRecoveryControllerState>;
  /** Resolves the canonical profile ID for Cubist sessions. */
  getAuthenticatedProfileId: () => Promise<string>;
  getBearerToken: () => Promise<string>;
  getAddress: () => string;
  signPersonalMessage: SignPersonalMessage;
  pendingOperationEncryptor?: MobilePendingOperationEncryptor;
  isEnabled?: () => boolean;
  /** Issues provider ID tokens bound to a nonce; omitted means social proofs are unavailable. */
  getSocialIdToken?: SocialIdTokenProvider;
  /** Runs the platform passkey assertion ceremony for passkey identifiers. */
  getPasskeyAssertion?: PasskeyAssertionGetter;
}

/**
 * Creates a production-configured MFA recovery controller without importing
 * Engine, so standalone tests can exercise the same providers.
 */
export function createMfaRecoveryController({
  messenger,
  state,
  getAuthenticatedProfileId,
  getBearerToken,
  getAddress,
  signPersonalMessage,
  pendingOperationEncryptor,
  isEnabled = () => true,
  getSocialIdToken,
  getPasskeyAssertion,
}: CreateMfaRecoveryControllerOptions) {
  const tokenProvider = createCubistSessionTokenProvider(
    getAuthenticatedProfileId,
    getBearerToken,
  );
  const identifierRouter = new RecoveryIdentifierRouter({
    getAddress,
    signPersonalMessage,
    getSocialIdToken,
    getPasskeyAssertion,
  });
  const getClient = createCubistClientGetter({ tokenProvider, isEnabled });
  const escrow = new CubistEscrowProvider({
    getClient,
    authAudience: CUBIST_AUTH_AUDIENCE,
    ...tryGetCubistKeys(),
  });
  withApplyMutationDiagnostics(escrow);
  const encryptor =
    pendingOperationEncryptor ?? createPendingOperationEncryptor();

  const controller = new MfaRecoveryController({
    messenger,
    state,
    identifierAuthProvider: identifierRouter,
    escrows: [escrow],
    encryptor,
  });

  return { controller, identifierRouter };
}
