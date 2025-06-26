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
import { isE2E } from '../../../../util/test/utils';
import { SeedlessOnboardingTestUtilts } from '../../../../util/test/seedlessOnboardingTestUtilts';

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
          // Do mock response if running in e2e mode
      if (isE2E) {
        // check if there is a mock result
        const mockResult = await SeedlessOnboardingTestUtilts.getInstance().getMockedOAuthLoginResponse();

        // Only return mock result if it is not null, otherwise continue with the original flow
        if (mockResult) {
          return mockResult as LoginHandlerIdTokenResult;
        }
      }
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
