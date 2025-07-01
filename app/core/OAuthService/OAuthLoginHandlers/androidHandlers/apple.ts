import { ResponseType, AuthRequest } from 'expo-auth-session';
import {
  AuthConnection,
  AuthResponse,
  HandleFlowParams,
  LoginHandler,
  LoginHandlerCodeResult,
} from '../../OAuthInterface';
import { BaseHandlerOptions, BaseLoginHandler } from '../baseHandler';
import { OAuthError, OAuthErrorType } from '../../error';

export interface AndroidAppleLoginHandlerParams extends BaseHandlerOptions {
  clientId: string;
  redirectUri: string;
  appRedirectUri: string;
}

/**
 * AndroidAppleLoginHandler is the login handler for the Apple login on android.
 */
export class AndroidAppleLoginHandler
  extends BaseLoginHandler
  implements LoginHandler
{
  public readonly OAUTH_SERVER_URL = 'https://appleid.apple.com/auth/authorize';

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
    return 'api/v1/oauth/token';
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
    const { appRedirectUri, redirectUri, clientId } = params;
    this.clientId = clientId;
    this.redirectUri = redirectUri;
    this.appRedirectUri = appRedirectUri;
  }

  /**
   * This method is used to login with apple via customChromeTab via expo-auth-session.
   * It generates the auth url with server redirect uri and state.
   * It creates a client auth request instance so that the auth-session can return result on appRedirectUrl.
   * It then prompts the auth request via the client auth request instance with auth url generated with server redirect uri and state.
   *
   * Data flow:
   * App -> Apple -> AuthServer -> App
   *
   * @returns LoginHandlerCodeResult
   */
  async login(): Promise<LoginHandlerCodeResult> {
    const { codeVerifier, challenge } = this.generateCodeVerifierChallenge();

    const state = JSON.stringify({
      provider: this.authConnection,
      client_redirect_back_uri: this.appRedirectUri,
      redirectUri: this.redirectUri,
      clientId: this.clientId,
      random: this.nonce,
      code_challenge: challenge,
      nonce: this.nonce,
    });

    const authRequest = new AuthRequest({
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      scopes: this.#scope,
      responseType: ResponseType.Code,
      state,
      extraParams: {
        response_mode: 'form_post',
      },
    });
    // generate the auth url
    const authUrl = await authRequest.makeAuthUrlAsync({
      authorizationEndpoint: this.OAUTH_SERVER_URL,
    });

    // create a client auth request instance so that the auth-session can return result on appRedirectUrl
    const authRequestClient = new AuthRequest({
      clientId: this.clientId,
      redirectUri: this.appRedirectUri,
      state,
    });

    // prompt the auth request using generated auth url instead of the client auth request instance
    const result = await authRequestClient.promptAsync(
      {
        authorizationEndpoint: this.OAUTH_SERVER_URL,
      },
      {
        url: authUrl,
      },
    );
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
        OAuthErrorType.UnknownError,
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
      OAuthErrorType.UnknownError,
    );
  }

  async getAuthTokens(
    params: HandleFlowParams,
    authServerUrl: string,
  ): Promise<AuthResponse> {
    if (!('code' in params)) {
      throw new OAuthError(
        'Missing code params',
        OAuthErrorType.InvalidGetAuthTokenParams,
      );
    }
    const {
      code,
      codeVerifier,
      clientId,
      authConnection,
      redirectUri,
      web3AuthNetwork,
    } = params;

    const body = {
      code,
      client_id: clientId,
      login_provider: authConnection,
      network: web3AuthNetwork,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    };

    const res = await fetch(`${authServerUrl}/api/v1/oauth/callback/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.status === 200) {
      const data = (await res.json()) satisfies AuthResponse;
      if (data.success) {
        return data;
      }
      throw new OAuthError(data.message, OAuthErrorType.AuthServerError);
    }

    throw new OAuthError(
      `AuthServer Error, request failed with status: [${
        res.status
      }]: ${await res.text()}`,
      OAuthErrorType.AuthServerError,
    );
  }
}
