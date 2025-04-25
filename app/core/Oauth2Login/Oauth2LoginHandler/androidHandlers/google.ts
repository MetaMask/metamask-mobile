import Logger from '../../../../util/Logger';
import {
  LoginHandlerIdTokenResult,
  AuthConnection,
} from '../../Oauth2loginInterface';
import { signInWithGoogle } from 'react-native-google-acm';
import { BaseLoginHandler } from '../baseHandler';
import { Oauth2LoginErrors, Oauth2LoginError } from '../../error';

/**
 * AndroidGoogleLoginHandler is the login handler for the Google login on android.
 */
export class AndroidGoogleLoginHandler extends BaseLoginHandler {
  readonly #scope = ['email', 'profile'];

  protected clientId: string;

  get authConnection() {
    return AuthConnection.Google;
  }

  get scope() {
    return this.#scope;
  }

  get authServerPath() {
    return 'api/v1/oauth/id_token';
  }

  /**
   * This constructor is used to initialize the clientId.
   *
   * @param params.clientId - The web clientId for the Google login.
   * Note: The android clientId must be created from the same OAuth clientId in the web.
   */
  constructor(params: { clientId: string }) {
    super();
    this.clientId = params.clientId;
  }

  /**
   * This method is used to login with google seemsless via react-native-google-acm.
   *
   * @returns LoginHandlerIdTokenResult
   */
  async login(): Promise<LoginHandlerIdTokenResult> {
    const result = await signInWithGoogle({
      serverClientId: this.clientId,
      nonce: this.nonce,
      autoSelectEnabled: true,
      filterByAuthorizedAccounts: false,
    });
    Logger.log('handleGoogleLogin: result', result);

    if (result.type === 'google-signin') {
      return {
        authConnection: this.authConnection,
        idToken: result.idToken,
        clientId: this.clientId,
      };
    }
    throw new Oauth2LoginError(
      'handleGoogleLogin: Unknown error',
      Oauth2LoginErrors.UnknownError,
    );
  }
}
