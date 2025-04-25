import {
  LoginHandlerIdTokenResult,
  AuthConnection,
} from '../../OAuthInterface';
import {
  signInAsync,
  AppleAuthenticationScope,
} from 'expo-apple-authentication';
import { BaseLoginHandler } from '../baseHandler';
import { Oauth2LoginErrors, Oauth2LoginError } from '../../error';

/**
 * IosAppleLoginHandler is the login handler for the Apple login on ios.
 */
export class IosAppleLoginHandler extends BaseLoginHandler {
  readonly #scope = [
    AppleAuthenticationScope.FULL_NAME,
    AppleAuthenticationScope.EMAIL,
  ];

  protected clientId: string;

  get authConnection() {
    return AuthConnection.Apple;
  }

  get scope() {
    return this.#scope.map((scope) => scope.toString());
  }

  get authServerPath() {
    return 'api/v1/oauth/id_token';
  }

  /**
   * This constructor is used to initialize the clientId.
   *
   * @param params.clientId - The Bundle ID from the apple developer account for the app.
   */
  constructor(params: { clientId: string }) {
    super();
    this.clientId = params.clientId;
  }

  /**
   * This method is used to login with apple via expo-apple-authentication.
   *
   * @returns LoginHandlerIdTokenResult
   */
  async login(): Promise<LoginHandlerIdTokenResult | undefined> {
    const credential = await signInAsync({
      requestedScopes: this.#scope,
    });

    if (credential.identityToken) {
      return {
        authConnection: this.authConnection,
        idToken: credential.identityToken,
        clientId: this.clientId,
      };
    }
    throw new Oauth2LoginError(
      'handleIosAppleLogin: Unknown error',
      Oauth2LoginErrors.UnknownError,
    );
  }
}
