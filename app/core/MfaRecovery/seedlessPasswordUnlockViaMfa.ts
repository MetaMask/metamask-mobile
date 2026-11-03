import type { AuthConnection as SeedlessAuthConnection } from '@metamask/seedless-onboarding-controller';
import type { Identifier } from '@metamask/mfa-recovery-controller';
import { setSeedlessOnboarding } from '../../actions/onboarding';
import { store } from '../../store';
import Engine from '../Engine';
import { AuthConnection } from '../OAuthService/OAuthInterface';
import OAuthLoginService from '../OAuthService/OAuthService';
import { AUTH_CONNECTION_OIDC_ISSUERS } from './identifierAuthProvider';

export interface SeedlessPasswordUnlockResult {
  type: 'success';
  existingUser: boolean;
  accountName?: string;
  /**
   * Session retained for a later `getRecoverySecret` without a second social prompt.
   */
  session: Awaited<
    ReturnType<
      (typeof Engine.context.MfaRecoveryController)['authenticateIdentifier']
    >
  >;
}

export interface AuthenticateSeedlessViaMfaIdentifierOptions {
  /**
   * Auth-server subject stored on SeedlessOnboardingController. Checked against
   * `seedlessAuthData.userId` after login so rehydration cannot continue as a
   * different social account. Not the provider ID-token `sub`.
   */
  expectedSeedlessUserId?: string;
}

/**
 * Seedless + password unlock start (social unlock work plan, left-hand path):
 * one `authenticateIdentifier` login with `requireSeedlessAuthData`, then
 * `SeedlessOnboardingController.authenticate` from `session.seedlessAuthData`.
 *
 * Does not open the password screen; callers continue with existing typed-password UX.
 * Does not call `OAuthService.handleOAuthLogin` (no second social start).
 */
export async function authenticateSeedlessViaMfaIdentifier(
  identifier: Identifier,
  options: AuthenticateSeedlessViaMfaIdentifierOptions = {},
): Promise<SeedlessPasswordUnlockResult> {
  const { MfaRecoveryController, SeedlessOnboardingController } =
    Engine.context;

  // eslint-disable-next-line no-console -- temporary MFA password-path E2E signal
  console.log('[MFA] password unlock via authenticateIdentifier', {
    identifierType: identifier.type,
    namespace: identifier.namespace,
    hasPreknownProviderSubject: Boolean(identifier.value),
    hasExpectedSeedlessUserId: Boolean(options.expectedSeedlessUserId),
    requireSeedlessAuthData: true,
  });

  const session = await MfaRecoveryController.authenticateIdentifier(
    identifier,
    { requireSeedlessAuthData: true },
  );

  if (!session.seedlessAuthData) {
    throw new Error(
      'MFA recovery: authenticateIdentifier did not return seedlessAuthData',
    );
  }

  if (
    options.expectedSeedlessUserId &&
    session.seedlessAuthData.userId !== options.expectedSeedlessUserId
  ) {
    throw new Error('MFA recovery: signed in with a different account');
  }

  const { authConnection, ...seedlessAuthFields } = session.seedlessAuthData;

  // eslint-disable-next-line no-console -- temporary MFA password-path E2E signal
  console.log('[MFA] seedless authenticate from session.seedlessAuthData', {
    authConnection,
    authConnectionId: seedlessAuthFields.authConnectionId,
    hasIdTokens: seedlessAuthFields.idTokens?.length > 0,
    hasRefreshToken: Boolean(seedlessAuthFields.refreshToken),
  });

  OAuthLoginService.updateLocalState({
    userId: seedlessAuthFields.userId,
    accountName: seedlessAuthFields.socialLoginEmail,
    loginInProgress: false,
    oauthLoginSuccess: true,
    oauthLoginError: null,
  });

  const result = await SeedlessOnboardingController.authenticate({
    ...seedlessAuthFields,
    authConnection: authConnection as SeedlessAuthConnection,
  });

  // eslint-disable-next-line no-console -- temporary MFA password-path E2E signal
  console.log('[MFA] seedless authenticate ok', {
    isNewUser: result.isNewUser,
    existingUser: !result.isNewUser,
  });
  store.dispatch(
    setSeedlessOnboarding({
      clientId: seedlessAuthFields.authConnectionId,
      authConnection: authConnection as AuthConnection,
    }),
  );

  return {
    type: 'success',
    existingUser: !result.isNewUser,
    accountName: seedlessAuthFields.socialLoginEmail,
    session,
  };
}

/**
 * Builds an OIDC recovery identifier. `providerSubject` must be the provider ID
 * token `sub` (Google / Apple / Telegram), not the auth-server / seedless
 * `userId`, unless those values are known to match.
 *
 * Pass an empty `providerSubject` for password-unlock rehydration when only the
 * seedless auth-server subject is known; the identifier auth provider discovers
 * the real provider `sub` from the ID token after login.
 */
export function buildOidcIdentifier(params: {
  authConnection: AuthConnection;
  providerSubject?: string;
  verifier?: unknown;
}): Identifier {
  return {
    // Core registry uses `social` (not legacy `oidc`) for key-bound OIDC.
    type: 'social',
    namespace: AUTH_CONNECTION_OIDC_ISSUERS[params.authConnection],
    value: params.providerSubject ?? '',
    verifier: params.verifier ?? null,
  };
}
