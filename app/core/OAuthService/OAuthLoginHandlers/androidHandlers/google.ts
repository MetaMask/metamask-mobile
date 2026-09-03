import {
  LoginHandlerIdTokenResult,
  AuthConnection,
  AuthRequestParams,
  HandleFlowParams,
} from '../../OAuthInterface';
import { signInWithGoogle } from '@metamask/react-native-acm';
import { BaseHandlerOptions, BaseLoginHandler } from '../baseHandler';
import {
  OAuthError,
  OAuthErrorType,
  isOAuthUserCancellationMessage,
} from '../../error';
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
 * 1. USER_CANCEL / NO_CREDENTIAL - user explicitly cancelled or dismissed the dialog; isOAuthUserCancellationMessage runs before regex branches, including One Tap cancel text
 * 2. USER_DISABLED_FEATURE - user disabled One Tap
 * 3. NO_MATCHING_CREDENTIAL - account exists but doesn't match (contains "matching credential")
 * 4. ONE_TAP_FAILURE - generic One Tap failure (catch-all for other One Tap issues)
 * 5. NO_PROVIDER_DEPENDENCIES - credential provider not available (e.g., missing Google Play Services)
 */
const ACM_ERRORS_REGEX = {
  NO_CREDENTIAL: /no credential/i,
  USER_DISABLED_FEATURE: /user disabled the feature/i,
  ONE_TAP_FAILURE: /failure response from one tap/i,
  NO_MATCHING_CREDENTIAL: /matching credential/i,
  NO_PROVIDER_DEPENDENCIES:
    /no provider dependencies|provider.{0,20}not available|provider.{0,20}configuration/i,
};

type AndroidGoogleAcmErrorKind =
  | 'no_credential'
  | 'user_disabled_feature'
  | 'no_provider_dependencies'
  | 'no_matching_credential'
  | 'one_tap_failure';

/** Bound Sentry context so a runaway native message cannot blow extras. */
const NATIVE_MESSAGE_SENTRY_MAX_CHARS = 500;

/**
 * Classify the native ACM / legacy Google error string for Sentry.
 * Login outcome mapping is unchanged: no-credential still throws UserCancelled.
 */
const classifyAndroidGoogleAcmError = (
  message: string,
): AndroidGoogleAcmErrorKind | undefined => {
  if (ACM_ERRORS_REGEX.NO_CREDENTIAL.test(message)) {
    return 'no_credential';
  }
  if (ACM_ERRORS_REGEX.USER_DISABLED_FEATURE.test(message)) {
    return 'user_disabled_feature';
  }
  if (ACM_ERRORS_REGEX.NO_PROVIDER_DEPENDENCIES.test(message)) {
    return 'no_provider_dependencies';
  }
  if (ACM_ERRORS_REGEX.NO_MATCHING_CREDENTIAL.test(message)) {
    return 'no_matching_credential';
  }
  if (ACM_ERRORS_REGEX.ONE_TAP_FAILURE.test(message)) {
    return 'one_tap_failure';
  }
  return undefined;
};

const reportAndroidGoogleAcmError = (
  nativeError: Error,
  kind: AndroidGoogleAcmErrorKind,
): void => {
  Logger.error(nativeError, {
    tags: {
      feature: 'onboarding',
      view: 'AndroidGoogleLogin',
      acm_error: kind,
    },
    context: {
      name: 'android_google_acm',
      data: {
        native_message: nativeError.message.slice(
          0,
          NATIVE_MESSAGE_SENTRY_MAX_CHARS,
        ),
      },
    },
  });
};

/**
 * Map a native ACM / legacy Google Error to OAuthError and report classified
 * strings to Sentry. UserCancelled is swallowed in Onboarding.
 */
const throwMappedNativeAcmError = (error: Error): never => {
  const acmKind = classifyAndroidGoogleAcmError(error.message);
  const mapsToUserCancelled =
    isOAuthUserCancellationMessage(error.message) ||
    ACM_ERRORS_REGEX.NO_CREDENTIAL.test(error.message);
  if (
    acmKind &&
    acmKind !== 'user_disabled_feature' &&
    (!mapsToUserCancelled || acmKind === 'no_credential')
  ) {
    reportAndroidGoogleAcmError(error, acmKind);
  }
  if (mapsToUserCancelled) {
    throw new OAuthError(
      'handleGoogleLogin: User cancelled the login process',
      OAuthErrorType.UserCancelled,
    );
  }
  if (ACM_ERRORS_REGEX.USER_DISABLED_FEATURE.test(error.message)) {
    throw new OAuthError(
      'handleGoogleLogin: User disabled One Tap sign-in feature',
      OAuthErrorType.GoogleLoginUserDisabledOneTapFeature,
    );
  }
  if (ACM_ERRORS_REGEX.NO_PROVIDER_DEPENDENCIES.test(error.message)) {
    throw new OAuthError(
      'handleGoogleLogin: Credential provider not available',
      OAuthErrorType.GoogleLoginNoProviderDependencies,
    );
  }
  if (ACM_ERRORS_REGEX.NO_MATCHING_CREDENTIAL.test(error.message)) {
    throw new OAuthError(
      'handleGoogleLogin: Google login has no matching credential',
      OAuthErrorType.GoogleLoginNoMatchingCredential,
    );
  }
  if (ACM_ERRORS_REGEX.ONE_TAP_FAILURE.test(error.message)) {
    throw new OAuthError(
      `handleGoogleLogin: One tap failure - ${error.message}`,
      OAuthErrorType.GoogleLoginOneTapFailure,
    );
  }
  throw new OAuthError(error, OAuthErrorType.UnknownError);
};

/**
 * AndroidGoogleLoginHandler is the login handler for the Google login on android.
 */
export class AndroidGoogleLoginHandler extends BaseLoginHandler {
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

      if (
        result?.type === 'cancel' ||
        result?.type === 'cancelled' ||
        result?.type === 'dismiss'
      ) {
        throw new OAuthError(
          'handleGoogleLogin: User cancelled the login process',
          OAuthErrorType.UserCancelled,
        );
      }

      throw new OAuthError(
        'handleGoogleLogin: Unknown error',
        OAuthErrorType.UnknownError,
      );
    } catch (error) {
      Logger.log(error, 'handleGoogleLogin: error');
      if (error instanceof OAuthError) {
        throw error;
      }
      if (error instanceof Error) {
        throwMappedNativeAcmError(error);
      }
      throw new OAuthError(
        'handleGoogleLogin: Unknown error',
        OAuthErrorType.UnknownError,
      );
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
