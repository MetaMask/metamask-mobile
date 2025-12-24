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
 * GoogleLoginHandlerParams is the params for Google login handlers
 */
export interface GoogleLoginHandlerParams extends BaseHandlerOptions {
  clientId: string;
  redirectUri: string;
}

/**
 * BaseGoogleLoginHandler is the shared base class for Google OAuth login handlers.
 * Used by both iOS and Android (fallback) handlers to reduce code duplication.
 *
 * This handler:
 * - Opens browser for Google OAuth using expo-auth-session
 * - Uses PKCE for security (no client secret needed)
 * - Returns OAuth code which is exchanged for tokens via auth server
 */
export abstract class BaseGoogleLoginHandler extends BaseLoginHandler {
  public readonly OAUTH_SERVER_URL =
    'https://accounts.google.com/o/oauth2/v2/auth';

  readonly #scope = ['email', 'profile', 'openid'];

  protected clientId: string;
  protected redirectUri: string;

  /**
   * Handler name for error messages (e.g., "IosGoogleLoginHandler")
   */
  protected abstract handlerName: string;

  get authConnection() {
    return AuthConnection.Google;
  }

  get scope() {
    return this.#scope;
  }

  get authServerPath() {
    return 'api/v1/oauth/token';
  }

  constructor(params: GoogleLoginHandlerParams) {
    super({
      authServerUrl: params.authServerUrl,
      clientId: params.clientId,
      web3AuthNetwork: params.web3AuthNetwork,
    });
    this.clientId = params.clientId;
    this.redirectUri = params.redirectUri;
  }

  /**
   * Login with Google via browser using expo-auth-session.
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
        `${this.handlerName}: User cancelled the login process`,
        OAuthErrorType.UserCancelled,
      );
    }

    if (result.type === 'dismiss') {
      throw new OAuthError(
        `${this.handlerName}: User dismissed the login process`,
        OAuthErrorType.UserDismissed,
      );
    }

    throw new OAuthError(
      `${this.handlerName}: Unknown error`,
      OAuthErrorType.GoogleLoginError,
    );
  }

  getAuthTokenRequestData(params: HandleFlowParams): AuthRequestParams {
    if (!('code' in params)) {
      throw new OAuthError(
        `${this.handlerName}: Invalid params`,
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
