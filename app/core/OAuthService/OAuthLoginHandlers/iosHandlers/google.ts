import { AuthConnection } from '@metamask/seedless-onboarding-controller';
import { BaseHandlerOptions, BaseLoginHandler } from '../baseHandler';
import {
  AuthRequestParams,
  HandleFlowParams,
  LoginHandlerIdTokenResult,
} from '../../OAuthInterface';
import { signInWithGoogle } from '@metamask/react-native-acm';
import { OAuthError, OAuthErrorMessages, OAuthErrorType } from '../../error';
import Logger from '../../../../util/Logger';
import { getToken, initializeAppCheck } from '@react-native-firebase/app-check';
import { Alert } from 'react-native';
import { getApp } from '@react-native-firebase/app';

/**
 * IosGoogleLoginHandler is the Google login handler for iOS.
 *
 * This handler extends BaseGoogleLoginHandler and inherits all Google OAuth logic.
 * Difference from Android fallback handler is the handler name used in error messages.
 */
// export class IosGoogleLoginHandler extends BaseGoogleLoginHandler {
//   protected handlerName = 'IosGoogleLoginHandler';
// }

export class IosGoogleLoginHandler extends BaseLoginHandler {
  protected handlerName = 'IosGoogleLoginHandler';

  readonly #scope = ['email', 'profile', 'openid'];

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
      const appCheckInstance = getApp().appCheck();
      const { token } = await getToken(appCheckInstance, false);
      Alert.alert(token);

      const result = await signInWithGoogle({
        iosClientId: this.clientId,
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

      const { token: token2 } = await getToken(appCheckInstance, false);
      Alert.alert(token2);
      throw new OAuthError(
        'handleGoogleLogin: Unknown error',
        OAuthErrorType.UnknownError,
      );
    } catch (error) {
      Logger.log(error, 'handleGoogleLogin: error');
      throw error;
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
