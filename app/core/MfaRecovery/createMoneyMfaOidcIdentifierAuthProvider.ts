import { isMoneyMfaEnabled } from '../../lib/Money/feature-flags';
import {
  createOidcIdentifierAuthProvider,
  type LoginWithNonceAndSeedlessAuth,
} from './identifierAuthProvider';
import type { RecoveryIdentifierAuthProvider } from './types';

export interface CreateMoneyMfaOidcIdentifierAuthProviderOptions {
  /**
   * Returns the current remote feature-flag map (e.g.
   * `RemoteFeatureFlagController.state.remoteFeatureFlags`). Invoked on each
   * `getKeyBoundIdentifierLogin` call so flag flips apply without rebuilding
   * the provider.
   */
  getRemoteFeatureFlags: () => Record<string, unknown> | undefined;
  /**
   * Test override for the single identifier login. Production uses
   * `loginWithNonceAndSeedlessAuthViaHandlers`.
   */
  loginWithNonceAndSeedlessAuth?: LoginWithNonceAndSeedlessAuth;
}

/**
 * Production Seedless OIDC `identifierAuthProvider` for MFA recovery
 * ([MFA-703](https://consensyssoftware.atlassian.net/browse/MFA-703)).
 *
 * Wraps Seedless Google/Apple/Telegram login
 * ({@link createOidcIdentifierAuthProvider}) and gates it with
 * {@link isMoneyMfaEnabled}. Implements Core’s single
 * `getKeyBoundIdentifierLogin` method. This is the first consumer path for
 * `@metamask/mfa-recovery-controller`; passkey/SIWE and full Engine
 * `MfaRecoveryController` init (AuthToken, Cubist escrow) follow later.
 *
 * @param options - Flag reader and optional login override for tests.
 * @returns A {@link RecoveryIdentifierAuthProvider} for Seedless OIDC.
 */
export function createMoneyMfaOidcIdentifierAuthProvider({
  getRemoteFeatureFlags,
  loginWithNonceAndSeedlessAuth,
}: CreateMoneyMfaOidcIdentifierAuthProviderOptions): RecoveryIdentifierAuthProvider {
  return createOidcIdentifierAuthProvider({
    isEnabled: () => isMoneyMfaEnabled(getRemoteFeatureFlags()),
    ...(loginWithNonceAndSeedlessAuth === undefined
      ? {}
      : { loginWithNonceAndSeedlessAuth }),
  });
}
