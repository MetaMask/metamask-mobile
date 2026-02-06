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
 * 6. TIMEOUT - timeout errors for slow devices
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
  TIMEOUT: /timeout|timed out/i,
};

/**
 * Wraps a promise with a timeout to prevent infinite hangs on slow devices
 *
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param errorMessage - Error message if timeout occurs
 * @returns The promise result or throws timeout error
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Delay helper for retry logic
 *
 * @param ms - Delay in milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * AndroidGoogleLoginHandler is the login handler for the Google login on android.
 * Includes timeout and retry logic optimized for low-end devices.
 */
export class AndroidGoogleLoginHandler extends BaseLoginHandler {
  readonly #scope = ['email', 'profile', 'openid'];

  private retryCount: number = 0;

  // Configuration for low-end device support
  private readonly MAX_RETRIES = 2;
  private readonly RETRY_DELAY_MS = 2000; // 2 seconds between retries
  private readonly LOGIN_TIMEOUT_MS = 45000; // 45 second timeout for login

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
   * Reset retry state - call this before starting a new login flow
   */
  resetRetryState(): void {
    this.retryCount = 0;
  }

  /**
   * Check if error is retryable (transient errors that may succeed on retry)
   *
   * @param errorMessage - The error message to check
   * @returns true if the error is retryable
   */
  private isRetryableError(errorMessage: string): boolean {
    return (
      ACM_ERRORS_REGEX.NO_CREDENTIAL.test(errorMessage) ||
      ACM_ERRORS_REGEX.NO_MATCHING_CREDENTIAL.test(errorMessage) ||
      ACM_ERRORS_REGEX.ONE_TAP_FAILURE.test(errorMessage) ||
      ACM_ERRORS_REGEX.TIMEOUT.test(errorMessage)
    );
  }

  /**
   * Perform the actual Google sign-in with timeout wrapper
   * This prevents infinite hangs on low-end devices where the native
   * Android Credential Manager may be slow to respond.
   *
   * @returns LoginHandlerIdTokenResult on success
   */
  private async performSignIn(): Promise<LoginHandlerIdTokenResult> {
    const signInPromise = signInWithGoogle({
      serverClientId: this.clientId,
      nonce: this.nonce,
      autoSelectEnabled: true,
      filterByAuthorizedAccounts: false,
    });

    // Wrap with timeout for low-end devices
    const result = await withTimeout(
      signInPromise,
      this.LOGIN_TIMEOUT_MS,
      `Google sign-in timed out after ${this.LOGIN_TIMEOUT_MS / 1000} seconds`,
    );

    if (result?.type === 'google-signin') {
      return {
        authConnection: this.authConnection,
        idToken: result.idToken,
        clientId: this.clientId,
      };
    }

    throw new OAuthError(
      'handleGoogleLogin: Invalid response from Google sign-in',
      OAuthErrorType.UnknownError,
    );
  }

  /**
   * This method is used to login with google seamlessly via react-native-google-acm.
   * Includes timeout and retry logic for better support on low-end devices.
   *
   * @returns LoginHandlerIdTokenResult
   */
  async login(): Promise<LoginHandlerIdTokenResult> {
    try {
      const result = await this.performSignIn();
      // Reset retry count on success
      this.retryCount = 0;
      return result;
    } catch (error) {
      Logger.log(
        error,
        `handleGoogleLogin: error (attempt ${this.retryCount + 1})`,
      );

      if (error instanceof OAuthError) {
        throw error;
      }

      if (error instanceof Error) {
        const errorMessage = error.message;

        // Handle user cancellation - don't retry
        if (ACM_ERRORS_REGEX.CANCEL.test(errorMessage)) {
          throw new OAuthError(
            'handleGoogleLogin: User cancelled the login process',
            OAuthErrorType.UserCancelled,
          );
        }

        // Handle user disabled feature - don't retry
        if (ACM_ERRORS_REGEX.USER_DISABLED_FEATURE.test(errorMessage)) {
          throw new OAuthError(
            'handleGoogleLogin: User disabled One Tap sign-in feature',
            OAuthErrorType.GoogleLoginUserDisabledOneTapFeature,
          );
        }

        // Check if we should retry (with delay for low-end devices)
        if (
          this.isRetryableError(errorMessage) &&
          this.retryCount < this.MAX_RETRIES
        ) {
          this.retryCount++;
          Logger.log(
            `handleGoogleLogin: Retrying (${this.retryCount}/${this.MAX_RETRIES}) after ${this.RETRY_DELAY_MS}ms delay`,
          );
          await delay(this.RETRY_DELAY_MS);
          return await this.login();
        }

        // Map to specific error types after retries exhausted
        if (ACM_ERRORS_REGEX.TIMEOUT.test(errorMessage)) {
          throw new OAuthError(
            'handleGoogleLogin: Google sign-in timed out. Please try again.',
            OAuthErrorType.GoogleLoginOneTapFailure,
          );
        }

        if (ACM_ERRORS_REGEX.NO_CREDENTIAL.test(errorMessage)) {
          throw new OAuthError(
            'handleGoogleLogin: Google login has no credential',
            OAuthErrorType.GoogleLoginNoCredential,
          );
        }

        if (ACM_ERRORS_REGEX.NO_MATCHING_CREDENTIAL.test(errorMessage)) {
          throw new OAuthError(
            'handleGoogleLogin: Google login has no matching credential',
            OAuthErrorType.GoogleLoginNoMatchingCredential,
          );
        }

        if (ACM_ERRORS_REGEX.ONE_TAP_FAILURE.test(errorMessage)) {
          throw new OAuthError(
            `handleGoogleLogin: One tap failure - ${errorMessage}`,
            OAuthErrorType.GoogleLoginOneTapFailure,
          );
        }

        throw new OAuthError(error, OAuthErrorType.UnknownError);
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
