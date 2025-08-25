import { ResponseType, AuthRequest } from 'expo-auth-session';
import {
  AuthConnection,
  AuthRequestParams,
  HandleFlowParams,
  LoginHandler,
  LoginHandlerCodeResult,
} from '../../OAuthInterface';
import { BaseHandlerOptions, BaseLoginHandler } from '../baseHandler';
import { OAuthError, OAuthErrorType } from '../../error';

export interface AndroidAppleLoginHandlerParams extends BaseHandlerOptions {
  clientId: string;
  appRedirectUri: string;
}

/**
 * AndroidAppleLoginHandler is the login handler for the Apple login on android.
 */
export class AndroidAppleLoginHandler
  extends BaseLoginHandler
  implements LoginHandler
{
  public readonly OAUTH_SERVER_URL: string;
  readonly #scope = ['name', 'email'];

  protected clientId: string;
  protected redirectUri: string;
  protected appRedirectUri: string;

  get authConnection() {
    return AuthConnection.Apple;
  }

  get scope() {
    return this.#scope;
  }

  get authServerPath() {
    return 'api/v1/oauth/callback/verify';
  }

  /**
   * AndroidAppleLoginHandler constructor.
   *
   * @param params.clientId - The Service ID from the apple developer account for the app.
   * @param params.redirectUri - The server redirectUri for the Apple login to handle rest api login.
   * @param params.appRedirectUri - The Android App redirectUri for the customChromeTab to handle auth-session login.
   */
  constructor(params: AndroidAppleLoginHandlerParams) {
    super(params);
    const { appRedirectUri, clientId, authServerUrl } = params;
    this.clientId = clientId;
    this.redirectUri = `${authServerUrl}/api/v1/oauth/callback`;
    this.appRedirectUri = appRedirectUri;
    this.OAUTH_SERVER_URL = `${authServerUrl}/api/v1/oauth/initiate`;
  }

  /**
   * This method is used to login with apple via customChromeTab via expo-auth-session.
   * It generates the auth url with server redirect uri and state.
   * It creates a client auth request instance so that the auth-session can return result on appRedirectUrl.
   * It then prompts the auth request via the client auth request instance with auth url generated with server redirect uri and state.
   *
   * Data flow:
   * App -> AuthServer -> Apple -> AuthServer -> App
   *
   * @returns LoginHandlerCodeResult
   */
  async login(): Promise<LoginHandlerCodeResult> {
    const { codeVerifier, challenge } = this.generateCodeVerifierChallenge();

    const state = JSON.stringify({
      provider: this.authConnection,
      client_redirect_back_uri: this.appRedirectUri,
      clientId: this.clientId,
      code_challenge: challenge,
      nonce: this.nonce,
    });

    const authRequest = new AuthRequest({
      clientId: this.clientId,
      redirectUri: this.appRedirectUri,
      scopes: this.#scope,
      responseType: ResponseType.Code,
      usePKCE: false,
      state,
      extraParams: {
        response_mode: 'form_post',
      },
    });

    const result = await authRequest.promptAsync({
      authorizationEndpoint: this.OAUTH_SERVER_URL,
    });

    if (result.type === 'success') {
      return {
        authConnection: AuthConnection.Apple,
        code: challenge,
        clientId: this.clientId,
        redirectUri: this.redirectUri,
        codeVerifier,
      };
    }
    if (result.type === 'error') {
      if (result.error) {
        throw new OAuthError(result.error.message, OAuthErrorType.LoginError);
      }
      throw new OAuthError(
        'handleAndroidAppleLogin: Unknown error',
        OAuthErrorType.AppleLoginError,
      );
    }
    if (result.type === 'cancel') {
      throw new OAuthError(
        'handleAndroidAppleLogin: User cancelled the login process',
        OAuthErrorType.UserCancelled,
      );
    }
    if (result.type === 'dismiss') {
      throw new OAuthError(
        'handleAndroidAppleLogin: User dismissed the login process',
        OAuthErrorType.UserDismissed,
      );
    }
    throw new OAuthError(
      'handleAndroidAppleLogin: Unknown error',
      OAuthErrorType.AppleLoginError,
    );
  }

  getAuthTokenRequestData(params: HandleFlowParams): AuthRequestParams {
    if (!('code' in params)) {
      throw new OAuthError(
        'handleAndroidAppleLogin: Invalid params',
        OAuthErrorType.InvalidGetAuthTokenParams,
      );
    }
    const { code, clientId, codeVerifier, web3AuthNetwork, redirectUri } =
      params;
    return {
      client_id: clientId,
      code,
      login_provider: this.authConnection,
      network: web3AuthNetwork,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
    };
  }
}
