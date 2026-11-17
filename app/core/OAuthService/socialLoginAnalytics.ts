import { Platform } from 'react-native';
import { getSocialAccountType } from '../../constants/onboarding';
import { analytics } from '../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../util/analytics/AnalyticsEventBuilder';
import { MetaMetricsEvents } from '../Analytics/MetaMetrics.events';
import { AuthConnection } from './OAuthInterface';
import { OAuthError, OAuthErrorType } from './error';
import {
  getOAuthBackgroundAnalyticsProperties,
  OAUTH_RESUME_OUTCOME,
} from './oauthLifecycleTracking';

export type SocialLoginFailureErrorCategory =
  | 'provider_login'
  | 'get_auth_tokens'
  | 'seedless_auth';

const ANDROID_GOOGLE_BROWSER_FALLBACK_ERROR_CODES: ReadonlySet<OAuthErrorType> =
  new Set([
    OAuthErrorType.GoogleLoginNoCredential,
    OAuthErrorType.GoogleLoginNoMatchingCredential,
    OAuthErrorType.GoogleLoginUserDisabledOneTapFeature,
    OAuthErrorType.GoogleLoginOneTapFailure,
    OAuthErrorType.GoogleLoginNoProviderDependencies,
    OAuthErrorType.UnknownError,
  ]);

/**
 * Android Google One Tap failures retry in the system browser. Skip terminal
 * Social Login Failed for these errors so a successful fallback is not paired
 * with a Failed event for the same attempt.
 */
export function shouldAttemptAndroidGoogleBrowserFallback(
  error: unknown,
  socialConnectionType: string,
): boolean {
  return (
    Platform.OS === 'android' &&
    socialConnectionType === AuthConnection.Google &&
    error instanceof OAuthError &&
    ANDROID_GOOGLE_BROWSER_FALLBACK_ERROR_CODES.has(error.code)
  );
}

/**
 * OAuth failures that occur in Onboarding before {@link OAuthService.handleOAuthLogin}
 * is invoked (e.g. invalid/disabled provider from {@link createLoginHandler}).
 */
export function isPreOAuthSocialLoginFailure(error: OAuthError): boolean {
  return (
    error.code === OAuthErrorType.InvalidProvider ||
    error.code === OAuthErrorType.UnsupportedPlatform
  );
}

const MFA_PROVIDER_LOGIN_ERROR_CODES: ReadonlySet<OAuthErrorType> = new Set([
  OAuthErrorType.UserCancelled,
  OAuthErrorType.UserDismissed,
  OAuthErrorType.InvalidProvider,
  OAuthErrorType.UnsupportedPlatform,
  OAuthErrorType.GoogleLoginError,
  OAuthErrorType.AppleLoginError,
  OAuthErrorType.TelegramLoginError,
  OAuthErrorType.GoogleLoginNoCredential,
  OAuthErrorType.GoogleLoginNoMatchingCredential,
  OAuthErrorType.GoogleLoginUserDisabledOneTapFeature,
  OAuthErrorType.GoogleLoginOneTapFailure,
  OAuthErrorType.GoogleLoginNoProviderDependencies,
]);

const MFA_GET_AUTH_TOKENS_ERROR_CODES: ReadonlySet<OAuthErrorType> = new Set([
  OAuthErrorType.AuthServerError,
  OAuthErrorType.InvalidGetAuthTokenParams,
]);

/**
 * Classifies failures from {@link OAuthService.handleMfaSeedlessPasswordUnlock}.
 * Provider cancel / login and auth-token exchange happen inside
 * `authenticateIdentifier`, so they must not all be labeled `seedless_auth`.
 */
export function getMfaSeedlessPasswordUnlockErrorCategory(
  error: unknown,
): SocialLoginFailureErrorCategory {
  if (error instanceof OAuthError) {
    if (MFA_PROVIDER_LOGIN_ERROR_CODES.has(error.code)) {
      return 'provider_login';
    }
    if (MFA_GET_AUTH_TOKENS_ERROR_CODES.has(error.code)) {
      return 'get_auth_tokens';
    }
  }
  return 'seedless_auth';
}

/**
 * Tracks the Social Login Failed analytics event.
 */
export function trackSocialLoginFailed({
  authConnection,
  isRehydration,
  errorCategory,
  error,
}: {
  authConnection: string;
  isRehydration?: boolean;
  errorCategory: SocialLoginFailureErrorCategory;
  error: unknown;
}): void {
  const isUserCancelled =
    error instanceof OAuthError &&
    (error.code === OAuthErrorType.UserCancelled ||
      error.code === OAuthErrorType.UserDismissed);

  let isRehydrationValue: 'true' | 'false' | 'unknown' = 'unknown';
  if (isRehydration !== undefined) {
    isRehydrationValue = isRehydration ? 'true' : 'false';
  }

  const oauthErrorCode =
    error instanceof OAuthError ? String(error.code) : undefined;

  analytics.trackEvent(
    AnalyticsEventBuilder.createEventBuilder(
      MetaMetricsEvents.SOCIAL_LOGIN_FAILED,
    )
      .addProperties({
        account_type: getSocialAccountType(
          authConnection,
          isRehydration === true,
        ),
        is_rehydration: isRehydrationValue,
        failure_type: isUserCancelled ? 'user_cancelled' : 'error',
        error_category: errorCategory,
        ...(oauthErrorCode !== undefined && {
          oauth_error_code: oauthErrorCode,
        }),
        ...getOAuthBackgroundAnalyticsProperties(
          isUserCancelled
            ? OAUTH_RESUME_OUTCOME.DISMISSED
            : OAUTH_RESUME_OUTCOME.FAILED,
        ),
      })
      .build(),
  );
}
