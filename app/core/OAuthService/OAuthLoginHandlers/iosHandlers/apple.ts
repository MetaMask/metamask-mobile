import {
  LoginHandlerIdTokenResult,
  AuthConnection,
} from '../../OAuthInterface';
import {
  signInAsync,
  AppleAuthenticationScope,
} from 'expo-apple-authentication';
import { BaseLoginHandler } from '../baseHandler';
import { OAuthErrorType, OAuthError } from '../../error';
import Logger from '../../../../util/Logger';

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
    try {
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
      throw new OAuthError(
        'handleIosAppleLogin: Unknown error',
        OAuthErrorType.UnknownError,
      );
    } catch (error) {
      Logger.log('handleIosAppleLogin: Error', error);

      if (error instanceof OAuthError) {
        throw error;
      } else if (error instanceof Error) {
        if (
          error.message.includes('The user canceled the authorization attempt')
        ) {
          throw new OAuthError(
            'handleIosAppleLogin: User canceled the authorization attempt',
            OAuthErrorType.UserCancelled,
          );
        } else {
          throw new OAuthError(error, OAuthErrorType.UnknownError);
        }
      } else {
        throw new OAuthError(
          'handleIosAppleLogin: Unknown error',
          OAuthErrorType.UnknownError,
        );
      }
    }
  }
}
