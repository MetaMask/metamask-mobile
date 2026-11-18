import {
  MfaRecoveryController,
  type MfaRecoveryControllerState,
  type PendingOperationEncryptor,
  type RecoveryAuthProvider,
  type RecoveryEscrowProvider,
  type RecoveryLockProvider,
} from '@metamask/mfa-recovery-controller';
import { createMoneyMfaOidcIdentifierAuthProvider } from '../../MfaRecovery';
import Logger from '../../../util/Logger';
import type { MessengerClientInitFunctionsByMessengerClientName } from '../types';

const getMfaRecoveryPackageVersion = (): string => {
  try {
    // Surfaces which published MFA recovery package is loaded (Sentry tags).
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
 * Constructor still requires authProvider / lockProvider / escrows / pending
 * encryptor; those are stubs. Cubist and Auth API AAL2 approvals are out of
 * scope.
 *
 * Same pattern as SamplePetnames: controller may be omitted when init fails so
 * Engine still starts (`MessengerClients.MfaRecoveryController` is optional).
 */
export const mfaRecoveryControllerInit: MessengerClientInitFunctionsByMessengerClientName['MfaRecoveryController'] =
  ({ controllerMessenger, initMessenger, persistedState }) => {
    const packageVersion = getMfaRecoveryPackageVersion();
    try {
      const controller = new MfaRecoveryController({
        messenger: controllerMessenger,
        state: persistedState.MfaRecoveryController as
          | Partial<MfaRecoveryControllerState>
          | undefined,
        authProvider: createLeftPathAuthProviderStub(),
        lockProvider: createLeftPathLockProviderStub(),
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
      // Do not abort Engine startup — fall back to classic OAuth rehydration
      // when Money MFA gating sees no MfaRecoveryController on context.
      Logger.error(error instanceof Error ? error : new Error(String(error)), {
        tags: {
          feature: 'mfa',
          operation: 'mfa_recovery_controller_init',
          packageVersion,
        },
      });
      return { controller: undefined };
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

function createLeftPathLockProviderStub(): RecoveryLockProvider {
  return {
    acquire: () => leftPathNotWired('lockProvider', 'acquire'),
    release: () => leftPathNotWired('lockProvider', 'release'),
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
    getMutationReceipt: () => leftPathNotWired('escrow', 'getMutationReceipt'),
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
