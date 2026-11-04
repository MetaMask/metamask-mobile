import Engine from '../Engine';
import {
  AuthConnection,
  type AuthResponse,
  OAuthLoginResultType,
} from '../OAuthService/OAuthInterface';
import OAuthLoginService from '../OAuthService/OAuthService';
import { AUTH_CONNECTION_OIDC_ISSUERS } from './identifierAuthProvider';
import type {
  Identifier,
  MfaRecoveryControllerLike,
  MfaRecoveryAuthenticateIdentifierSession,
  SeedlessAuthData,
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
  /**
   * OAuth client id from the login handler (same value {@link OAuthService}
   * persists via `setSeedlessOnboarding`). Required for iOS Google refresh.
   */
  clientId: string;
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

const toAuthResponse = (seedlessAuthData: SeedlessAuthData): AuthResponse => {
  const idToken = seedlessAuthData.idTokens[0];
  if (!idToken) {
    throw new Error('MFA recovery: seedlessAuthData is missing idTokens');
  }
  if (!seedlessAuthData.revokeToken) {
    throw new Error('MFA recovery: seedlessAuthData is missing revokeToken');
  }

  return {
    id_token: idToken,
    access_token: seedlessAuthData.accessToken,
    metadata_access_token: seedlessAuthData.metadataAccessToken,
    refresh_token: seedlessAuthData.refreshToken,
    revoke_token: seedlessAuthData.revokeToken,
    indexes: [],
    endpoints: {},
    ...(seedlessAuthData.socialLoginEmail
      ? { account_name: seedlessAuthData.socialLoginEmail }
      : {}),
  };
};

/**
 * Seedless + password unlock start (social unlock work plan, left-hand path):
 * one `authenticateIdentifier` login with `requireSeedlessAuthData`, then
 * {@link OAuthService.handleSeedlessAuthenticate}.
 *
 * Does not manage `oauthLoginSuccess` / `setSeedlessOnboarding` — callers
 * (prefer {@link OAuthService.handleMfaSeedlessPasswordUnlock}) own that
 * lifecycle so success is only marked after authenticate completes.
 *
 * Requires `Engine.context.MfaRecoveryController` (preview package wired locally
 * for testing; not committed to CI).
 */
export async function authenticateSeedlessViaMfaIdentifier(
  identifier: Identifier,
  options: AuthenticateSeedlessViaMfaIdentifierOptions,
): Promise<SeedlessPasswordUnlockResult> {
  const MfaRecoveryController = getMfaRecoveryController();

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

  const { authConnection, socialLoginEmail, userId } = session.seedlessAuthData;
  const typedAuthConnection = authConnection as AuthConnection;

  // handleSeedlessAuthenticate reads userId / accountName from localState.
  OAuthLoginService.updateLocalState({
    userId,
    accountName: socialLoginEmail,
  });

  const result = await OAuthLoginService.handleSeedlessAuthenticate(
    toAuthResponse(session.seedlessAuthData),
    typedAuthConnection,
    options.clientId,
  );

  if (result.type !== OAuthLoginResultType.SUCCESS) {
    throw new Error(result.error ?? 'Seedless authenticate failed');
  }

  return {
    type: 'success',
    existingUser: result.existingUser,
    accountName: socialLoginEmail,
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
