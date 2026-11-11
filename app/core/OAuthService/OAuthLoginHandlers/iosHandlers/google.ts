import {
  AuthRequest,
  CodeChallengeMethod,
  exchangeCodeAsync,
  Prompt,
  ResponseType,
} from 'expo-auth-session';
import { BaseGoogleLoginHandler } from '../shared/GoogleLoginHandler';
import { OAuthError, OAuthErrorType } from '../../error';
import { IosGID, IosGoogleRedirectUri } from '../constants';
import { MfaRecoveryControllerError } from '../../../Engine/controllers/mfa-recovery-controller/errors';

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

/**
 * IosGoogleLoginHandler is the Google login handler for iOS.
 *
 * This handler extends BaseGoogleLoginHandler and inherits all Google OAuth logic.
 * Difference from Android fallback handler is the handler name used in error messages.
 */
export class IosGoogleLoginHandler extends BaseGoogleLoginHandler {
  protected handlerName = 'IosGoogleLoginHandler';

  /**
   * Returns the Google ID token whose nonce claim is this handler's nonce.
   *
   * Runs the same PKCE browser flow as login(), but sends the nonce to Google and
   * exchanges the code directly with Google's token endpoint, so the provider-issued
   * id_token is returned instead of the auth server's token.
   *
   * @returns The Google ID token.
   */
  async getProviderIdToken(): Promise<string> {
    // The web client used by login() on iOS 17.4+ is confidential and Google rejects
    // its code exchange without a client_secret; the native iOS client is public.
    if (!IosGID || !IosGoogleRedirectUri) {
      throw new MfaRecoveryControllerError(
        `${this.handlerName}: iOS Google client is not configured`,
        'social_sign_in_unavailable',
      );
    }
    const clientId = IosGID;
    const redirectUri = IosGoogleRedirectUri;

    const authRequest = new AuthRequest({
      clientId,
      redirectUri,
      scopes: this.scope,
      responseType: ResponseType.Code,
      codeChallengeMethod: CodeChallengeMethod.S256,
      usePKCE: true,
      extraParams: { nonce: this.nonce },
      prompt: [Prompt.SelectAccount],
    });

    const result = await authRequest.promptAsync(
      { authorizationEndpoint: this.OAUTH_SERVER_URL },
      { preferUniversalLinks: true },
    );

    if (result.type === 'cancel') {
      throw new OAuthError(
        `${this.handlerName}: User cancelled the login process`,
        OAuthErrorType.UserCancelled,
      );
    }

    if (result.type !== 'success') {
      throw new OAuthError(
        `${this.handlerName}: Unknown error`,
        OAuthErrorType.GoogleLoginError,
      );
    }

    const tokenResponse = await exchangeCodeAsync(
      {
        clientId,
        code: result.params.code,
        redirectUri,
        extraParams: { code_verifier: authRequest.codeVerifier ?? '' },
      },
      { tokenEndpoint: GOOGLE_TOKEN_ENDPOINT },
    );

    if (!tokenResponse.idToken) {
      throw new OAuthError(
        `${this.handlerName}: Missing ID token in token response`,
        OAuthErrorType.GoogleLoginError,
      );
    }

    return tokenResponse.idToken;
  }
}
