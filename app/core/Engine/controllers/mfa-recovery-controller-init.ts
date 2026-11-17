import {
  MfaRecoveryController,
  type MfaRecoveryControllerMessenger,
  type MfaRecoveryControllerState,
  type PendingOperationEncryptor,
  type RecoveryAuthProvider,
  type RecoveryEscrowProvider,
} from '@metamask/mfa-recovery-controller';
import { createMoneyMfaOidcIdentifierAuthProvider } from '../../MfaRecovery';
import Logger from '../../../util/Logger';
import type { MessengerClientInitFunction } from '../types';
import type { MfaRecoveryControllerInitMessenger } from '../messengers/mfa-recovery-controller-messenger';

const getMfaRecoveryPreviewVersion = (): string => {
  try {
    // Local preview testing only — surfaces which Core preview is loaded.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@metamask/mfa-recovery-controller/package.json')
      .version as string;
  } catch {
    return 'unknown';
  }
};

const leftPathNotWired = (surface: string, method: string): Promise<never> =>
  Promise.reject(
    new Error(
      `MfaRecoveryController ${surface}.${method} is not wired on the left-hand social unlock path`,
    ),
  );

/**
 * Minimal Engine wiring for left-hand social unlock only:
 * `authenticateIdentifier` (AAL1) → seedless authenticate → password.
 *
 * Constructor still requires authProvider / escrows / pending encryptor;
 * those are stubs. Cubist and Auth API AAL2 approvals are out of scope.
 */
export const mfaRecoveryControllerInit: MessengerClientInitFunction<
  MfaRecoveryController,
  MfaRecoveryControllerMessenger,
  MfaRecoveryControllerInitMessenger
> = ({ controllerMessenger, initMessenger, persistedState }) => {
  const previewVersion = getMfaRecoveryPreviewVersion();
  try {
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
      pendingOperationEncryptor: createLeftPathPendingEncryptorStub(),
    });

    return { controller };
  } catch (error) {
    Logger.error(error instanceof Error ? error : new Error(String(error)), {
      tags: {
        feature: 'mfa',
        operation: 'mfa_recovery_controller_init',
        previewVersion,
      },
    });
    throw error;
  }
};

function createLeftPathAuthProviderStub(): RecoveryAuthProvider {
  return {
    getAuthenticatedProfileId: () =>
      leftPathNotWired('authProvider', 'getAuthenticatedProfileId'),
    authorizeRecoveryRequest: () =>
      leftPathNotWired('authProvider', 'authorizeRecoveryRequest'),
  };
}

function createLeftPathEscrowStub(): RecoveryEscrowProvider {
  return {
    id: 'left-path-stub',
    authAudience: 'left-path-stub',
    wrapPublicKey: new Uint8Array(32),
    isAvailable: () => Promise.resolve(false),
    generateChallenge: () => leftPathNotWired('escrow', 'generateChallenge'),
    getIdentifiers: () => leftPathNotWired('escrow', 'getIdentifiers'),
    getSecret: () => leftPathNotWired('escrow', 'getSecret'),
    applyMutation: () => leftPathNotWired('escrow', 'applyMutation'),
    verifyReceipt: () => leftPathNotWired('escrow', 'verifyReceipt'),
  };
}

function createLeftPathPendingEncryptorStub(): PendingOperationEncryptor {
  return {
    encrypt: () => leftPathNotWired('pendingEncryptor', 'encrypt'),
    decrypt: () => leftPathNotWired('pendingEncryptor', 'decrypt'),
  };
}
