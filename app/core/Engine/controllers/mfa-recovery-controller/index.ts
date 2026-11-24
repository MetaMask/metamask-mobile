import {
  CubistEscrowProvider,
  MfaRecoveryController,
  type MfaRecoveryControllerMessenger,
  type MfaRecoveryControllerState,
  RecoveryRegistrationLockProvider,
  UserStorageTrustedIdentifierStore,
} from '@metamask/mfa-recovery-controller';
import { selectMfaRecoveryEnabled } from '../../../../selectors/featureFlagController/mfaRecovery';
import { isMfaDevBuild } from '../../../../util/identity/mfa/isMfaDevBuild';
import { mobilePasskeyAdapter } from '../../../../util/identity/mfa/passkeyAdapter';
import { hydrateDevSocialLinkEmail } from '../../../MfaRecovery/social-login/devSocialLinkEmail';
import type { MessengerClientInitFunction } from '../../types';
import {
  getRecoveryRegistrationLockProviderMessenger,
  getUserStorageTrustedIdentifierStoreMessenger,
  type MfaRecoveryControllerInitMessenger,
} from '../../messengers/mfa-recovery-controller-messenger';
import { RecoveryIdentifierRouter } from './auth/identifier-auth-provider';
import { createCubistSessionTokenProvider } from './auth/session-token-provider';
import { createSrpSiweSignerFromMessenger } from './auth/srp-siwe-signer';
import {
  getRegistrationUrl,
  isMfaRecoveryConfigured,
  tryGetCubistEscrowConfig,
} from './config';
import { createCubistClientGetter } from './cubist-escrow-provider';

/**
 * Earlier preview builds persisted `pendingOperation` as an encrypted JSON
 * string; current builds store the plain object without the recovery secret.
 * Drop a legacy string so it cannot block new mutations, while keeping current
 * pending operations so they can be resumed after restart.
 */
function withoutLegacyPendingOperation(
  state: Partial<MfaRecoveryControllerState> | undefined,
): Partial<MfaRecoveryControllerState> | undefined {
  return state && typeof state.pendingOperation === 'string'
    ? { ...state, pendingOperation: null }
    : state;
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
  if (isMfaDevBuild()) {
    void hydrateDevSocialLinkEmail();
  }
  const isEnabled = () => {
    const { remoteFeatureFlags } = initMessenger.call(
      'RemoteFeatureFlagController:getState',
    );
    return (
      selectMfaRecoveryEnabled.resultFunc(remoteFeatureFlags) &&
      isMfaRecoveryConfigured()
    );
  };

  const tokenProvider = createCubistSessionTokenProvider({
    isUnlocked: () =>
      initMessenger.call('KeyringController:getState').isUnlocked,
    getCanonicalProfileId: async () => {
      const { canonicalProfileId } = await initMessenger.call(
        'AuthenticationController:getSessionProfile',
      );
      if (canonicalProfileId) {
        return canonicalProfileId;
      }
      return await initMessenger.call(
        'AuthenticationController:refreshCanonicalProfileId',
      );
    },
    getBearerToken: async () =>
      await initMessenger.call('AuthenticationController:getBearerToken'),
    exchangeSocialAccessToken: async () =>
      await initMessenger.call(
        'AuthenticationController:exchangeSocialAccessToken',
      ),
  });

  const escrow = new CubistEscrowProvider({
    getClient: createCubistClientGetter({ tokenProvider, isEnabled }),
    ...tryGetCubistEscrowConfig(),
  });

  const controller = new MfaRecoveryController({
    messenger: controllerMessenger,
    state: withoutLegacyPendingOperation(persistedState.MfaRecoveryController),
    lockProvider: new RecoveryRegistrationLockProvider({
      baseUrl: getRegistrationUrl(),
      messenger: getRecoveryRegistrationLockProviderMessenger(initMessenger),
      fetch: globalThis.fetch.bind(globalThis),
    }),
    identifierAuthProvider: new RecoveryIdentifierRouter({
      getPasskeyAssertion: mobilePasskeyAdapter.get,
      siweSigner: createSrpSiweSignerFromMessenger(initMessenger),
      getSocialIdToken: async (nonce) => {
        // Dynamic import: OAuthService imports Engine, which imports this module.
        const { default: OAuthService } = await import(
          '../../../OAuthService/OAuthService'
        );
        return await OAuthService.getSocialIdTokenForNonce(nonce);
      },
    }),
    trustedIdentifierStore: new UserStorageTrustedIdentifierStore({
      messenger: getUserStorageTrustedIdentifierStoreMessenger(initMessenger),
    }),
    escrows: [escrow],
  });

  return { controller };
};
