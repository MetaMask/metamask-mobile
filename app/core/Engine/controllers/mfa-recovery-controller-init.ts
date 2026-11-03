import {
  MfaRecoveryController,
  type Identifier,
  type IdentifierAuthorization,
  type MfaRecoveryControllerMessenger,
  type MfaRecoveryControllerState,
  type Mutation,
  type MutationPayload,
  type MutationReceipt,
  type PendingOperation,
  type PendingOperationEncryptor,
  type RecoveryAuthProvider,
  type RecoveryEscrowProvider,
  type AuthControllerToken,
} from '@metamask/mfa-recovery-controller';
import { type Json } from '@metamask/utils';
import { createMoneyMfaOidcIdentifierAuthProvider } from '../../MfaRecovery';
import type { EncryptionResult } from '../../Encryptor/types';
import type { MessengerClientInitFunction } from '../types';
import type { MfaRecoveryControllerInitMessenger } from '../messengers/mfa-recovery-controller-messenger';

/**
 * Engine wiring for the **left-hand social unlock** path only:
 * `authenticateIdentifier` (AAL1) → seedless authenticate → password.
 *
 * Cubist escrow / Auth API `requestMfaApproval` (AAL2 register/recover) are
 * intentionally not wired here. A stub escrow satisfies the controller's
 * non-empty `escrows` constructor requirement; escrow I/O throws if called.
 */
export const mfaRecoveryControllerInit: MessengerClientInitFunction<
  MfaRecoveryController,
  MfaRecoveryControllerMessenger,
  MfaRecoveryControllerInitMessenger
> = ({ controllerMessenger, initMessenger, persistedState }) => {
  const exportEncryptionKey = async () =>
    await initMessenger.call('KeyringController:exportEncryptionKey');

  const controller = new MfaRecoveryController({
    messenger: controllerMessenger,
    state: persistedState.MfaRecoveryController as
      | Partial<MfaRecoveryControllerState>
      | undefined,
    authProvider: createLeftPathAuthProviderStub(),
    identifierAuthProvider: createMoneyMfaOidcIdentifierAuthProvider({
      getRemoteFeatureFlags: () =>
        initMessenger.call('RemoteFeatureFlagController:getState')
          .remoteFeatureFlags as Record<string, unknown> | undefined,
    }),
    escrows: [createLeftPathEscrowStub()],
    pendingOperationEncryptor:
      createKeyringPendingOperationEncryptor(exportEncryptionKey),
  });

  return { controller };
};

/**
 * `authenticateIdentifier` does not call the auth provider. Escrow mutations
 * / reads that need Auth API approvals are out of scope on this branch.
 */
function createLeftPathAuthProviderStub(): RecoveryAuthProvider {
  const notWired = (method: string): never => {
    throw new Error(
      `MfaRecoveryController authProvider.${method} is not wired on the left-hand social unlock path (no Cubist / AAL2 approvals)`,
    );
  };
  return {
    getAuthenticatedProfileId: async () =>
      notWired('getAuthenticatedProfileId'),
    authorizeRecoveryRequest: async () => notWired('authorizeRecoveryRequest'),
  };
}

/**
 * Satisfies non-empty `escrows[]`. Left-hand unlock never calls escrow I/O.
 */
function createLeftPathEscrowStub(): RecoveryEscrowProvider {
  const notWired = (method: string): never => {
    throw new Error(
      `MfaRecoveryController escrow.${method} is not wired on the left-hand social unlock path (no Cubist)`,
    );
  };
  return {
    id: 'left-path-stub',
    authAudience: 'left-path-stub',
    wrapPublicKey: new Uint8Array(32),
    isAvailable: async () => false,
    generateChallenge: async () => notWired('generateChallenge'),
    getSecret: async (
      _authControllerToken: AuthControllerToken,
      _authorization: IdentifierAuthorization,
      _requestId: string,
      _pkE: Uint8Array,
    ) => notWired('getSecret'),
    applyMutation: async (
      _mutation: Mutation,
      _authControllerToken: AuthControllerToken,
      _identifierAuthorization: IdentifierAuthorization | null,
      _payload: MutationPayload,
      _approvedIdentifiers: Identifier[],
    ): Promise<MutationReceipt> => notWired('applyMutation'),
    verifyReceipt: async () => notWired('verifyReceipt'),
  };
}

function createKeyringPendingOperationEncryptor(
  exportEncryptionKey: () => Promise<string>,
): PendingOperationEncryptor {
  const encryptorPromise = import('../../Encryptor').then(
    ({ Encryptor, LEGACY_DERIVATION_OPTIONS }) =>
      new Encryptor({
        keyDerivationOptions: LEGACY_DERIVATION_OPTIONS,
      }),
  );
  const importCurrentKey = async () =>
    await (await encryptorPromise).importKey(await exportEncryptionKey());

  return {
    async encrypt(operation: PendingOperation): Promise<string> {
      const key = await importCurrentKey();
      const encrypted = await (
        await encryptorPromise
      ).encryptWithKey(key, operation as unknown as Json);
      return JSON.stringify(encrypted);
    },
    async decrypt(ciphertext: string): Promise<PendingOperation> {
      const key = await importCurrentKey();
      const payload = JSON.parse(ciphertext) as EncryptionResult;
      return (await (
        await encryptorPromise
      ).decryptWithKey(key, payload)) as PendingOperation;
    },
  };
}
