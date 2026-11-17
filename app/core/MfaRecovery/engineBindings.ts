import { MfaRecoveryService } from '../Engine/controllers/mfa-recovery-controller/services/mfa-recovery-service';
import { PASSWORDLESS_RECOVERY_OPERATION } from './passwordlessSocialRecovery';

/**
 * Builds the service the locked passwordless recovery flow runs on. The user
 * verifies before recovery starts, so the service must not prompt again.
 */
export function createPasswordlessRecoveryService(): MfaRecoveryService {
  return new MfaRecoveryService({
    verifyMfa: async () => undefined,
    approvalOperation: PASSWORDLESS_RECOVERY_OPERATION,
  });
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
