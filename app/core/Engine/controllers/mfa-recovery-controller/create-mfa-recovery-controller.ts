import {
  CubistEscrowProvider,
  MfaRecoveryController,
  type MfaRecoveryControllerMessenger,
  type MfaRecoveryControllerState,
  type PendingOperationEncryptor,
  type RecoveryAuthProvider,
} from '@metamask/mfa-recovery-controller';
import { createCubistSessionTokenProvider } from './auth-provider';
import { CUBIST_AUTH_AUDIENCE } from './constants';
import { createCubistClientGetter } from './cubist-escrow-provider';
import { tryGetCubistKeys } from './config';
import { MfaRecoveryControllerError } from './errors';
import { RecoveryIdentifierRouter } from './identifier-auth-provider';
import type { SignPersonalMessage } from './identifiers';
import { createKeyringPendingOperationEncryptor } from './pending-operation-encryptor';

export interface CreateMfaRecoveryControllerOptions {
  messenger: MfaRecoveryControllerMessenger;
  state?: Partial<MfaRecoveryControllerState>;
  authProvider: RecoveryAuthProvider;
  getAddress: () => string;
  signPersonalMessage: SignPersonalMessage;
  exportEncryptionKey?: () => Promise<string>;
  pendingOperationEncryptor?: PendingOperationEncryptor;
  isEnabled?: () => boolean;
}

/**
 * Creates a production-configured MFA recovery controller without importing
 * Engine, so standalone tests can exercise the same providers.
 */
export function createMfaRecoveryController({
  messenger,
  state,
  authProvider,
  getAddress,
  signPersonalMessage,
  exportEncryptionKey,
  pendingOperationEncryptor,
  isEnabled = () => true,
}: CreateMfaRecoveryControllerOptions) {
  const tokenProvider = createCubistSessionTokenProvider(authProvider);
  const identifierRouter = new RecoveryIdentifierRouter({
    getAddress,
    signPersonalMessage,
  });
  const escrow = new CubistEscrowProvider({
    getClient: createCubistClientGetter({ tokenProvider, isEnabled }),
    authAudience: CUBIST_AUTH_AUDIENCE,
    ...tryGetCubistKeys(),
  });
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
    authProvider,
    identifierAuthProvider: identifierRouter,
    escrows: [escrow],
    pendingOperationEncryptor: encryptor,
  });

  return { controller, identifierRouter };
}
