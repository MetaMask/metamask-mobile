import type { AuthConnection as SeedlessAuthConnection } from '@metamask/seedless-onboarding-controller';
import { setSeedlessOnboarding } from '../../actions/onboarding';
import { store } from '../../store';
import Engine from '../Engine';
import { AuthConnection } from '../OAuthService/OAuthInterface';
import OAuthLoginService from '../OAuthService/OAuthService';
import { AUTH_CONNECTION_OIDC_ISSUERS } from './identifierAuthProvider';
import type {
  Identifier,
  MfaRecoveryControllerLike,
  MfaRecoveryAuthenticateIdentifierSession,
} from './types';

export interface SeedlessPasswordUnlockResult {
  type: 'success';
  existingUser: boolean;
  accountName?: string;
  /**
   * Session retained for a later recovery-secret read without a second social
   * prompt (when Cubist / getRecoverySecret is wired).
   */
  session: MfaRecoveryAuthenticateIdentifierSession;
}

export interface AuthenticateSeedlessViaMfaIdentifierOptions {
  /**
   * Auth-server subject stored on SeedlessOnboardingController. Checked against
   * `seedlessAuthData.userId` after login so rehydration cannot continue as a
   * different social account. Not the provider ID-token `sub`.
   */
  expectedSeedlessUserId?: string;
}

const getMfaRecoveryController = (): MfaRecoveryControllerLike => {
  const controller = (
    Engine.context as { MfaRecoveryController?: MfaRecoveryControllerLike }
  ).MfaRecoveryController;
  if (!controller) {
    throw new Error(
      'MfaRecoveryController is not on Engine.context. For local testing, wire the mfa-recovery-controller preview (see .local-mfa-preview-testing/).',
    );
  }
  return controller;
};

/**
 * Seedless + password unlock start (social unlock work plan, left-hand path):
 * one `authenticateIdentifier` login with `requireSeedlessAuthData`, then
 * `SeedlessOnboardingController.authenticate` from `session.seedlessAuthData`.
 *
 * Does not open the password screen; callers continue with existing typed-password UX.
 * Does not call `OAuthService.handleOAuthLogin` (no second social start).
 *
 * Requires `Engine.context.MfaRecoveryController` (preview package wired locally
 * for testing; not committed to CI).
 */
export async function authenticateSeedlessViaMfaIdentifier(
  identifier: Identifier,
  options: AuthenticateSeedlessViaMfaIdentifierOptions = {},
): Promise<SeedlessPasswordUnlockResult> {
  const MfaRecoveryController = getMfaRecoveryController();
  const { SeedlessOnboardingController } = Engine.context;

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
