import { LoginHandlerCodeResult, AuthConnection } from '../../OAuthInterface';
import {
  AuthRequest,
  CodeChallengeMethod,
  ResponseType,
} from 'expo-auth-session';
import { BaseLoginHandler } from '../baseHandler';
import { OAuthErrorType, OAuthError } from '../../error';

/**
 * IosGoogleLoginHandlerParams is the params for the Google login handler
 */
export interface IosGoogleLoginHandlerParams {
  clientId: string;
  redirectUri: string;
}

/**
 * IosGoogleLoginHandler is the login handler for the Google login
 */
export class IosGoogleLoginHandler extends BaseLoginHandler {
  public readonly OAUTH_SERVER_URL =
    'https://accounts.google.com/o/oauth2/v2/auth';

  readonly #scope = ['email', 'profile'];

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
   * IosGoogleLoginHandler constructor.
   *
   * @param params.clientId - The iOS clientId for the Google login.
   * @param params.redirectUri - The iOS redirectUri for the Google login.
   */
  constructor(params: IosGoogleLoginHandlerParams) {
    super();
    this.clientId = params.clientId;
    this.redirectUri = params.redirectUri;
  }

  /**
   * This method is used to login with Google via expo-auth-session.
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
        code: result.params.code, // result.params.idToken
        clientId: this.clientId,
        redirectUri: this.redirectUri,
        codeVerifier: authRequest.codeVerifier,
      };
    }
    if (result.type === 'cancel') {
      throw new OAuthError(
        'handleIosGoogleLogin: User cancelled the login process',
        OAuthErrorType.UserCancelled,
      );
    }
    if (result.type === 'dismiss') {
      throw new OAuthError(
        'handleIosGoogleLogin: User dismissed the login process',
        OAuthErrorType.UserDismissed,
      );
    }
    throw new OAuthError(
      'handleIosGoogleLogin: Unknown error',
      OAuthErrorType.UnknownError,
    );
  }
}
