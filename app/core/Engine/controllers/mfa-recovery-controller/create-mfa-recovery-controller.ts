import {
  CubistEscrowProvider,
  MfaRecoveryController,
  type MfaRecoveryControllerMessenger,
  type MfaRecoveryControllerState,
  type PendingOperationEncryptor,
  type RecoveryAuthProvider,
} from '@metamask/mfa-recovery-controller';
import { createCubistSessionTokenProvider } from './auth/auth-provider';
import { CUBIST_AUTH_AUDIENCE } from './constants';
import { createCubistClientGetter } from './cubist-escrow-provider';
import { tryGetCubistKeys } from './config';
import { MfaRecoveryControllerError } from './errors';
import { RecoveryIdentifierRouter } from './auth/identifier-auth-provider';
import type { SocialIdTokenProvider } from './auth/social-identifier-auth-provider';
import type { PasskeyAssertionGetter } from './auth/passkey-identifier-auth-provider';
import type { SignPersonalMessage } from './auth/identifiers';
import { createKeyringPendingOperationEncryptor } from './pending-operation-encryptor';
import {
  withApprovalDiagnostics,
  withPendingCapture,
} from './dev/pending-operation-diagnostics';
import { withApplyMutationDiagnostics } from './dev/apply-mutation-diagnostics';

export interface CreateMfaRecoveryControllerOptions {
  messenger: MfaRecoveryControllerMessenger;
  state?: Partial<MfaRecoveryControllerState>;
  authProvider: RecoveryAuthProvider;
  getBearerToken: () => Promise<string>;
  getAddress: () => string;
  signPersonalMessage: SignPersonalMessage;
  exportEncryptionKey?: () => Promise<string>;
  pendingOperationEncryptor?: PendingOperationEncryptor;
  isEnabled?: () => boolean;
  /** Issues social ID tokens bound to a nonce; unavailable until sign-in supports it. */
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
  authProvider,
  getBearerToken,
  getAddress,
  signPersonalMessage,
  exportEncryptionKey,
  pendingOperationEncryptor,
  isEnabled = () => true,
  getSocialIdToken,
  getPasskeyAssertion,
}: CreateMfaRecoveryControllerOptions) {
  const tokenProvider = createCubistSessionTokenProvider(
    authProvider,
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
    pendingOperationEncryptor ??
    (exportEncryptionKey === undefined
      ? (() => {
          throw new MfaRecoveryControllerError(
            'An encryption key exporter is required',
            'missing_encryptor',
          );
        })()
      : createKeyringPendingOperationEncryptor({ exportEncryptionKey }));

  const controller = new MfaRecoveryController({
    messenger,
    state,
    authProvider: withApprovalDiagnostics(authProvider),
    identifierAuthProvider: identifierRouter,
    escrows: [escrow],
    pendingOperationEncryptor: withPendingCapture(encryptor),
  });

  return { controller, identifierRouter };
}
