import QuickCrypto from 'react-native-quick-crypto';
import Engine from '../Engine';
import { getToprfRecoveryConfig } from '../Engine/controllers/mfa-recovery-controller/config';
import type { PasswordlessRecoveryDependencies } from './passwordlessSocialRecovery';

/** Binds the passwordless recovery flow to the Engine controllers. */
export function createPasswordlessRecoveryDependencies(): PasswordlessRecoveryDependencies {
  const {
    MfaRecoveryController,
    SeedlessOnboardingController,
    AuthenticationController,
  } = Engine.context;
  return {
    mfaRecovery: MfaRecoveryController,
    seedless: SeedlessOnboardingController,
    requestMfaApproval: (request) =>
      AuthenticationController.requestMfaApproval(request),
    toprf: getToprfRecoveryConfig(),
    randomBytes: (length) => new Uint8Array(QuickCrypto.randomBytes(length)),
  };
}

/**
 * Whether the social provider can sign in again with a caller nonce on this
 * platform. Android Apple and Telegram sign in through the auth server, which
 * does not return the provider's ID token.
 *
 * @param platform - `Platform.OS`.
 * @param authConnection - The seedless social login provider.
 * @returns Whether a social identifier can be proven.
 */
export function canProveSocialIdentifier(
  platform: string,
  authConnection: string | undefined,
): boolean {
  if (authConnection === 'google') {
    return platform === 'ios' || platform === 'android';
  }
  if (authConnection === 'apple') {
    return platform === 'ios';
  }
  return false;
}
