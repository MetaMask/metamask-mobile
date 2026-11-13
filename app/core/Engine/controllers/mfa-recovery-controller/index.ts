import type {
  MfaRecoveryController,
  MfaRecoveryControllerMessenger,
  MfaRecoveryControllerState,
} from '@metamask/mfa-recovery-controller';
import { selectMfaRecoveryEnabled } from '../../../../selectors/featureFlagController/mfaRecovery';
import { mobilePasskeyAdapter } from '../../../../util/identity/mfa/passkeyAdapter';
import type { MessengerClientInitFunction } from '../../types';
import type { MfaRecoveryControllerInitMessenger } from '../../messengers/mfa-recovery-controller-messenger';
import { isMfaRecoveryConfigured } from './config';
import { createMfaRecoveryController } from './create-mfa-recovery-controller';

/**
 * The pending mutation key lives only in memory, so a pending mutation saved
 * by an earlier run cannot be decrypted. Reading it fails with a JSON error,
 * which also blocks every new mutation. Start without it.
 */
function withoutUnreadablePendingOperation(
  state: Partial<MfaRecoveryControllerState> | undefined,
): Partial<MfaRecoveryControllerState> | undefined {
  return state ? { ...state, pendingOperation: null } : state;
}

/**
 * Initializes the MFA recovery controller with the Cubist escrow, the
 * platform passkey sheet, and nonce-bound social sign-in.
 */
export const mfaRecoveryControllerInit: MessengerClientInitFunction<
  MfaRecoveryController,
  MfaRecoveryControllerMessenger,
  MfaRecoveryControllerInitMessenger
> = ({ controllerMessenger, initMessenger, persistedState }) => {
  const isEnabled = () => {
    const { remoteFeatureFlags } = initMessenger.call(
      'RemoteFeatureFlagController:getState',
    );
    return (
      selectMfaRecoveryEnabled.resultFunc(remoteFeatureFlags) &&
      isMfaRecoveryConfigured()
    );
  };

  const controller = createMfaRecoveryController({
    messenger: controllerMessenger,
    state: withoutUnreadablePendingOperation(
      persistedState.MfaRecoveryController as
        | Partial<MfaRecoveryControllerState>
        | undefined,
    ),
    isEnabled,
    isUnlocked: () =>
      initMessenger.call('KeyringController:getState').isUnlocked,
    refreshCanonicalProfileId: async () =>
      await initMessenger.call(
        'AuthenticationController:refreshCanonicalProfileId',
      ),
    getBearerToken: async () =>
      await initMessenger.call('AuthenticationController:getBearerToken'),
    exchangeSocialAccessToken: async () =>
      await initMessenger.call(
        'AuthenticationController:exchangeSocialAccessToken',
      ),
    getPasskeyAssertion: mobilePasskeyAdapter.get,
    getSocialIdToken: async (nonce) => {
      // Dynamic import: OAuthService imports Engine, which imports this module.
      const { default: OAuthService } = await import(
        '../../../OAuthService/OAuthService'
      );
      return await OAuthService.getSocialIdTokenForNonce(nonce);
    },
  });

  return { controller };
};
