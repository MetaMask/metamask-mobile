import { call, put, select, take } from 'redux-saga/effects';
import { AnalyticsEventBuilder } from '../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../util/analytics/analytics';
import { MetaMetricsEvents } from '../../core/Analytics';
import { UserProfileProperty } from '../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { getSocialAccountType } from '../../constants/onboarding';
import { setPendingSocialLoginMarketingConsentBackfill } from '../../actions/onboarding';
import Logger from '../../util/Logger';
import type { RootState } from '../../reducers';
import { selectPendingSocialLoginMarketingConsentBackfill } from '../../selectors/onboarding';
import { UserActionType } from '../../actions/user';
import OAuthService from '../../core/OAuthService/OAuthService';
import { setDataCollectionForMarketing } from '../../actions/security';
import Engine from '../../core/Engine';
import { containsErrorMessage } from '../../util/errorHandling';
import { ensureError } from '../../util/errorUtils';

const OAUTH_ACCESS_TOKEN_UNAVAILABLE_MESSAGE =
  'No access token found. User must be authenticated.';

export function* backfillSocialLoginMarketingConsentSaga() {
  yield take(UserActionType.LOGIN);

  const authConnection: RootState['onboarding']['pendingSocialLoginMarketingConsentBackfill'] =
    yield select(selectPendingSocialLoginMarketingConsentBackfill);

  if (!authConnection) {
    return;
  }

  let marketingConsent: RootState['security']['dataCollectionForMarketing'] =
    yield select(
      (state: RootState) => state.security?.dataCollectionForMarketing,
    );
  let fetchedMarketingConsent = false;

  try {
    if (marketingConsent !== true) {
      const accessToken: string | undefined = yield call([
        Engine.context.SeedlessOnboardingController,
        Engine.context.SeedlessOnboardingController.getAccessToken,
      ]);

      if (!accessToken) {
        return;
      }

      const marketingOptIn: Awaited<
        ReturnType<typeof OAuthService.getMarketingOptInStatus>
      > = yield call([OAuthService, OAuthService.getMarketingOptInStatus]);
      marketingConsent = marketingOptIn.is_opt_in;
      fetchedMarketingConsent = true;
    }

    const resolvedMarketingConsent = Boolean(marketingConsent);

    yield call([analytics, analytics.identify], {
      [UserProfileProperty.HAS_MARKETING_CONSENT]: resolvedMarketingConsent,
    });
    const event = AnalyticsEventBuilder.createEventBuilder(
      MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED,
    )
      .addProperties({
        [UserProfileProperty.HAS_MARKETING_CONSENT]: resolvedMarketingConsent,
        is_metrics_opted_in: true,
        location: 'saga_backfill_marketing_consent',
        updated_after_onboarding: true,
        account_type: getSocialAccountType(authConnection, false),
      })
      .build();

    yield call([analytics, analytics.trackEvent], event);

    yield put(setDataCollectionForMarketing(resolvedMarketingConsent));
    yield put(setPendingSocialLoginMarketingConsentBackfill(null));
  } catch (error) {
    const err = ensureError(error);

    if (containsErrorMessage(err, OAUTH_ACCESS_TOKEN_UNAVAILABLE_MESSAGE)) {
      return;
    }

    Logger.error(
      err,
      'Failed to backfill social login marketing consent analytics',
    );
    if (fetchedMarketingConsent) {
      yield put(setDataCollectionForMarketing(Boolean(marketingConsent)));
    }
    yield put(setPendingSocialLoginMarketingConsentBackfill(null));
  }
}
