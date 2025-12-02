import {
  LoginHandlerCodeResult,
  AuthConnection,
  AuthRequestParams,
  HandleFlowParams,
} from '../../OAuthInterface';
import {
  AuthRequest,
  CodeChallengeMethod,
  ResponseType,
} from 'expo-auth-session';
import { BaseHandlerOptions, BaseLoginHandler } from '../baseHandler';
import { OAuthErrorType, OAuthError } from '../../error';

/**
 * AndroidGoogleFallbackLoginHandlerParams is the params for the Google browser fallback login handler
 */
export interface AndroidGoogleFallbackLoginHandlerParams
  extends BaseHandlerOptions {
  clientId: string;
  redirectUri: string;
}

/**
 * AndroidGoogleFallbackLoginHandler is the browser-based fallback handler for Google login on Android.
 * Used when Android Credential Manager (ACM) fails (e.g., no Google account on device).
 *
 * This handler:
 * - Opens the device's default browser for Google OAuth
 * - Uses PKCE for security (no client secret needed)
 * - Returns OAuth code (not ID token) which is exchanged for tokens via auth server
 * - Redirects back to app via Branch.io deep link (metamask://oauth-redirect)
 */
export class AndroidGoogleFallbackLoginHandler extends BaseLoginHandler {
  public readonly OAUTH_SERVER_URL =
    'https://accounts.google.com/o/oauth2/v2/auth';

  readonly #scope = ['email', 'profile', 'openid'];

  protected clientId: string;
  protected redirectUri: string;

  get authConnection() {
    return AuthConnection.Google;
  }

  get scope() {
    return this.#scope;
  }

  get authServerPath() {
    return 'api/v1/oauth/token';
  }

  /**
   * AndroidGoogleFallbackLoginHandler constructor.
   *
   * @param params.clientId - The Android clientId for the Google browser OAuth login.
   * @param params.redirectUri - The redirectUri for browser OAuth (handled by Branch.io).
   */
  constructor(params: AndroidGoogleFallbackLoginHandlerParams) {
    super({
      authServerUrl: params.authServerUrl,
      clientId: params.clientId,
      web3AuthNetwork: params.web3AuthNetwork,
    });
    this.clientId = params.clientId;
    this.redirectUri = params.redirectUri;
  }

  /**
   * This method is used to login with Google via browser using expo-auth-session.
   * Opens the device's default browser for OAuth, then redirects back via deep link.
   *
   * @returns LoginHandlerCodeResult
   */
  async login(): Promise<LoginHandlerCodeResult> {
    const state = JSON.stringify({
      nonce: this.nonce,
    });

    const authRequest = new AuthRequest({
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      scopes: this.#scope,
      responseType: ResponseType.Code,
      codeChallengeMethod: CodeChallengeMethod.S256,
      usePKCE: true,
      state,
    });

    const result = await authRequest.promptAsync({
      authorizationEndpoint: this.OAUTH_SERVER_URL,
    });

    if (result.type === 'success') {
      return {
        authConnection: this.authConnection,
        code: result.params.code,
        clientId: this.clientId,
        redirectUri: this.redirectUri,
        codeVerifier: authRequest.codeVerifier,
      };
    }

    if (result.type === 'cancel') {
      throw new OAuthError(
        'AndroidGoogleFallbackLoginHandler: User cancelled the login process',
        OAuthErrorType.UserCancelled,
      );
    }

    if (result.type === 'dismiss') {
      throw new OAuthError(
        'AndroidGoogleFallbackLoginHandler: User dismissed the login process',
        OAuthErrorType.UserDismissed,
      );
    }

    throw new OAuthError(
      'AndroidGoogleFallbackLoginHandler: Unknown error',
      OAuthErrorType.GoogleLoginError,
    );
  }

  getAuthTokenRequestData(params: HandleFlowParams): AuthRequestParams {
    if (!('code' in params)) {
      throw new OAuthError(
        'AndroidGoogleFallbackLoginHandler: Invalid params',
        OAuthErrorType.InvalidGetAuthTokenParams,
      );
    }
    const { redirectUri, code, clientId, codeVerifier, web3AuthNetwork } =
      params;
    return {
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
      login_provider: this.authConnection,
      network: web3AuthNetwork,
      code_verifier: codeVerifier,
    };
  }
}
