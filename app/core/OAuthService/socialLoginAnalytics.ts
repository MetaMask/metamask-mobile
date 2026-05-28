import { getSocialAccountType } from '../../constants/onboarding';
import { analytics } from '../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../util/analytics/AnalyticsEventBuilder';
import { MetaMetricsEvents } from '../Analytics/MetaMetrics.events';
import { OAuthError, OAuthErrorType } from './error';

export type SocialLoginFailureErrorCategory =
  | 'provider_login'
  | 'get_auth_tokens'
  | 'seedless_auth';

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
      })
      .build(),
  );
}
