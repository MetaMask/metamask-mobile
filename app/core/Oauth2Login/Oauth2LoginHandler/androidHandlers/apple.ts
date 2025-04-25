import {
  CodeChallengeMethod,
  ResponseType,
  AuthRequest,
} from 'expo-auth-session';
import {
  AuthConnection,
  LoginHandler,
  LoginHandlerCodeResult,
} from '../../Oauth2loginInterface';
import { BaseLoginHandler } from '../baseHandler';
import { Oauth2LoginErrors, Oauth2LoginError } from '../../error';
export interface AndroidAppleLoginHandlerParams {
  clientId: string;
  redirectUri: string;
  appRedirectUri: string;
}

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
    return 'api/v1/oauth/id_token';
  }

  constructor(params: AndroidAppleLoginHandlerParams) {
    super();
    const { appRedirectUri, redirectUri, clientId } = params;
    this.clientId = clientId;
    this.redirectUri = redirectUri;
    this.appRedirectUri = appRedirectUri;
  }

  async login(): Promise<LoginHandlerCodeResult> {
    const state = JSON.stringify({
      provider: this.authConnection,
      client_redirect_back_uri: this.appRedirectUri,
      redirectUri: this.redirectUri,
      clientId: this.appRedirectUri,
      random: this.nonce,
    });
    const authRequest = new AuthRequest({
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      scopes: this.#scope,
      responseType: ResponseType.Code,
      codeChallengeMethod: CodeChallengeMethod.S256,
      usePKCE: false,
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
        code: result.params.code,
        clientId: this.clientId,
        redirectUri: this.redirectUri,
        codeVerifier: authRequest.codeVerifier,
      };
    }
    if (result.type === 'error') {
      if (result.error) {
        throw new Oauth2LoginError(
          result.error.message,
          Oauth2LoginErrors.LoginError,
        );
      }
      throw new Oauth2LoginError(
        'handleAndroidAppleLogin: Unknown error',
        Oauth2LoginErrors.UnknownError,
      );
    }
    if (result.type === 'cancel') {
      throw new Oauth2LoginError(
        'handleAndroidAppleLogin: User cancelled the login process',
        Oauth2LoginErrors.UserCancelled,
      );
    }
    if (result.type === 'dismiss') {
      throw new Oauth2LoginError(
        'handleAndroidAppleLogin: User dismissed the login process',
        Oauth2LoginErrors.UserDismissed,
      );
    }
    throw new Oauth2LoginError(
      'handleAndroidAppleLogin: Unknown error',
      Oauth2LoginErrors.UnknownError,
    );
  }
}
