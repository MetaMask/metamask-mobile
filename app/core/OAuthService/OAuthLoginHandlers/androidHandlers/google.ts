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

/**
 * Regex patterns for Android Credential Manager (ACM) error messages.
 *
 * IMPORTANT: The order of checks in the login() catch block matters!
 * Some error messages contain multiple matching patterns. For example:
 * "During begin signin, failure response from one tap. 16: [28433] Cannot find matching credential error"
 * matches both ONE_TAP_FAILURE and NO_MATCHING_CREDENTIAL.
 *
 * Current priority order (more specific patterns first):
 * 1. CANCEL - user explicitly cancelled
 * 2. USER_DISABLED_FEATURE - user disabled One Tap
 * 3. NO_CREDENTIAL - no Google account available
 * 4. NO_MATCHING_CREDENTIAL - account exists but doesn't match (contains "matching credential")
 * 5. ONE_TAP_FAILURE - generic One Tap failure (catch-all for other One Tap issues)
 *
 * If you modify these patterns or add new ones, ensure the check order in login()
 * handles overlapping matches correctly.
 */
const ACM_ERRORS_REGEX = {
  CANCEL: /cancel/i,
  NO_CREDENTIAL: /no credential/i,
  NO_MATCHING_CREDENTIAL: /matching credential/i,
  USER_DISABLED_FEATURE: /user disabled the feature/i,
  ONE_TAP_FAILURE: /failure response from one tap/i,
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
        } else if (ACM_ERRORS_REGEX.USER_DISABLED_FEATURE.test(error.message)) {
          // User has disabled One Tap sign-in feature - treat as user cancellation
          // This should not be sent to Sentry as it's a user preference
          throw new OAuthError(
            'handleGoogleLogin: User disabled One Tap sign-in feature',
            OAuthErrorType.GoogleLoginUserDisabledOneTapFeature,
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
        } else if (ACM_ERRORS_REGEX.ONE_TAP_FAILURE.test(error.message)) {
          if (!this.retried) {
            this.retried = true;
            return await this.login();
          }
          throw new OAuthError(
            `handleGoogleLogin: One tap failure - ${error.message}`,
            OAuthErrorType.GoogleLoginOneTapFailure,
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
