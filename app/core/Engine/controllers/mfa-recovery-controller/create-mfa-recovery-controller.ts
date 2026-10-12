import {
  MfaRecoveryController,
  type MfaRecoveryControllerMessenger,
  type MfaRecoveryControllerState,
  type PendingOperationEncryptor,
} from '@metamask/mfa-recovery-controller';
import { MpcTokenRecoveryAuthProvider } from './auth-provider';
import { LazyCubistEscrowProvider } from './cubist-escrow-provider';
import { readEnvironmentVariable } from './config';
import { MfaRecoveryControllerError } from './errors';
import { RecoveryIdentifierRouter } from './identifier-auth-provider';
import type { SignPersonalMessage } from './identifiers';
import { createKeyringPendingOperationEncryptor } from './pending-operation-encryptor';

export interface CreateMfaRecoveryControllerOptions {
  messenger: MfaRecoveryControllerMessenger;
  state?: Partial<MfaRecoveryControllerState>;
  getBearerToken: () => Promise<string>;
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
  getBearerToken,
  getAddress,
  signPersonalMessage,
  exportEncryptionKey,
  pendingOperationEncryptor,
  isEnabled = () => true,
}: CreateMfaRecoveryControllerOptions) {
  const authProvider = new MpcTokenRecoveryAuthProvider({
    getBearerToken,
    apiKey: readEnvironmentVariable('MFA_RECOVERY_DEV_API_KEY') ?? '',
  });
  const identifierRouter = new RecoveryIdentifierRouter({
    getAddress,
    signPersonalMessage,
  });
  const escrow = new LazyCubistEscrowProvider({
    authProvider,
    isEnabled,
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
