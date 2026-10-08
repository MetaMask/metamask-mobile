import { isMoneyMfaEnabled } from '../../lib/Money/feature-flags';
import {
  createOidcIdentifierAuthProvider,
  type LoginWithNonce,
} from './identifierAuthProvider';
import type { RecoveryIdentifierAuthProvider } from './types';

export interface CreateMoneyMfaOidcIdentifierAuthProviderOptions {
  /**
   * Returns the current remote feature-flag map (e.g.
   * `RemoteFeatureFlagController.state.remoteFeatureFlags`). Invoked on each
   * `getKeyBoundIdentifierToken` call so flag flips apply without rebuilding
   * the provider.
   */
  getRemoteFeatureFlags: () => Record<string, unknown> | undefined;
  loginWithNonce?: LoginWithNonce;
}

/**
 * Production `identifierAuthProvider` for MFA recovery ([MFA-703](https://consensyssoftware.atlassian.net/browse/MFA-703)).
 *
 * Wraps {@link createOidcIdentifierAuthProvider} and gates it with
 * {@link isMoneyMfaEnabled} (`isMoneyMfaEnabled` remote flag /
 * `MM_MONEY_MFA_ENABLED`).
 *
 * **In scope:** Google/Apple OIDC key-bound token for the recovery controller.
 * **Out of scope (later tickets):** Engine / `MfaRecoveryController` init,
 * AuthController AuthToken issuance, 2FA step-up, TOPRF, and SRP decrypt.
 *
 * @param options - Flag reader and optional login override for tests.
 * @returns A {@link RecoveryIdentifierAuthProvider} ready to inject into the
 * recovery controller when that package is wired.
 */
export function createMoneyMfaOidcIdentifierAuthProvider({
  getRemoteFeatureFlags,
  loginWithNonce,
}: CreateMoneyMfaOidcIdentifierAuthProviderOptions): RecoveryIdentifierAuthProvider {
  return createOidcIdentifierAuthProvider({
    isEnabled: () => isMoneyMfaEnabled(getRemoteFeatureFlags()),
    ...(loginWithNonce === undefined ? {} : { loginWithNonce }),
  });
}
