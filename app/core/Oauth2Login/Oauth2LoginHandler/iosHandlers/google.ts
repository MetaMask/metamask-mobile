import {
  LoginHandlerCodeResult,
  AuthConnection,
} from '../../Oauth2loginInterface';
import {
  AuthRequest,
  CodeChallengeMethod,
  ResponseType,
} from 'expo-auth-session';
import { BaseLoginHandler } from '../baseHandler';

export interface IosGoogleLoginHandlerParams {
  clientId: string;
  redirectUri: string;
}

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

  constructor(params: IosGoogleLoginHandlerParams) {
    super();
    this.clientId = params.clientId;
    this.redirectUri = params.redirectUri;
  }

  async login(): Promise<LoginHandlerCodeResult> {
    const state = JSON.stringify({
      random: this.nonce,
    });
    const authRequest = new AuthRequest({
      clientId: this.clientId,
      redirectUri: this.redirectUri,
      scopes: this.#scope,
      responseType: ResponseType.Code,
      codeChallengeMethod: CodeChallengeMethod.S256,
      usePKCE: true,
      state,
      //   extraParams: {
      //     access_type: 'offline',
      //   },
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
    if (result.type === 'error') {
      if (result.error) {
        throw result.error;
      }
      throw new Error('handleIosGoogleLogin: Unknown error');
    }
    if (result.type === 'cancel') {
      throw new Error('handleIosGoogleLogin: User cancelled the login process');
    }
    if (result.type === 'dismiss') {
      throw new Error('handleIosGoogleLogin: User dismissed the login process');
    }
    throw new Error('handleIosGoogleLogin: Unknown error');
  }
}
