import {
  LoginHandlerIdTokenResult,
  AuthConnection,
  AuthRequestParams,
  HandleFlowParams,
} from '../../OAuthInterface';
import { signInWithGoogle } from '@metamask/react-native-acm';
import { BaseHandlerOptions, BaseLoginHandler } from '../baseHandler';
import { OAuthErrorType, OAuthError } from '../../error';
import Logger from '../../../../util/Logger';

const ACM_ERRORS_REGEX = {
  CANCEL: /cancel/i,
  NO_CREDENTIAL: /no credential/i,
  NO_MATCHING_CREDENTIAL: /matching credential/i,
};

/**
 * AndroidGoogleLoginHandler is the login handler for the Google login on android.
 */
export class AndroidGoogleLoginHandler extends BaseLoginHandler {
  readonly #scope = ['email', 'profile', 'openid'];

  private retried: boolean = false;

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
  constructor(params: BaseHandlerOptions) {
    super(params);
    this.clientId = params.clientId;
  }

  /**
   * This method is used to login with google seemsless via react-native-google-acm.
   *
   * @returns LoginHandlerIdTokenResult
   */
  async login(): Promise<LoginHandlerIdTokenResult> {
    try {
      const result = await signInWithGoogle({
        serverClientId: this.clientId,
        nonce: this.nonce,
        autoSelectEnabled: true,
        filterByAuthorizedAccounts: false,
      });

      if (result?.type === 'google-signin') {
        return {
          authConnection: this.authConnection,
          idToken: result.idToken,
          clientId: this.clientId,
        };
      }

      throw new OAuthError(
        'handleGoogleLogin: Unknown error',
        OAuthErrorType.UnknownError,
      );
    } catch (error) {
      Logger.log(error, 'handleGoogleLogin: error');
      if (error instanceof OAuthError) {
        throw error;
      } else if (error instanceof Error) {
        if (ACM_ERRORS_REGEX.CANCEL.test(error.message)) {
          throw new OAuthError(
            'handleGoogleLogin: User cancelled the login process',
            OAuthErrorType.UserCancelled,
          );
        } else if (ACM_ERRORS_REGEX.NO_CREDENTIAL.test(error.message)) {
          if (!this.retried) {
            this.retried = true;
            return await this.login();
          }
          throw new OAuthError(
            'handleGoogleLogin: Google login has no credential',
            OAuthErrorType.GoogleLoginNoCredential,
          );
        } else if (
          ACM_ERRORS_REGEX.NO_MATCHING_CREDENTIAL.test(error.message)
        ) {
          if (!this.retried) {
            this.retried = true;
            return await this.login();
          }
          throw new OAuthError(
            'handleGoogleLogin: Google login has no matching credential',
            OAuthErrorType.GoogleLoginNoMatchingCredential,
          );
        } else {
          throw new OAuthError(error, OAuthErrorType.UnknownError);
        }
      } else {
        throw new OAuthError(
          'handleGoogleLogin: Unknown error',
          OAuthErrorType.UnknownError,
        );
      }
    }
  }

  getAuthTokenRequestData(params: HandleFlowParams): AuthRequestParams {
    if (!('idToken' in params)) {
      throw new OAuthError(
        'handleAndroidGoogleLogin: Invalid params',
        OAuthErrorType.InvalidGetAuthTokenParams,
      );
    }
    const { idToken, clientId, web3AuthNetwork } = params;
    return {
      client_id: clientId,
      id_token: idToken,
      login_provider: this.authConnection,
      network: web3AuthNetwork,
    };
  }
}
