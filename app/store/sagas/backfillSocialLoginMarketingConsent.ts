import { call, put, select, take } from 'redux-saga/effects';
import { AnalyticsEventBuilder } from '../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../util/analytics/analytics';
import { MetaMetricsEvents } from '../../core/Analytics';
import { UserProfileProperty } from '../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { getSocialAccountType } from '../../constants/onboarding';
import { updateDataRecordingFlag } from '../../util/analytics/analyticsDataDeletion';
import { setPendingSocialLoginMarketingConsentBackfill } from '../../actions/onboarding';
import Logger from '../../util/Logger';
import type { RootState } from '../../reducers';
import { selectPendingSocialLoginMarketingConsentBackfill } from '../../selectors/onboarding';
import { UserActionType } from '../../actions/user';
import OAuthService from '../../core/OAuthService/OAuthService';
import { setDataCollectionForMarketing } from '../../actions/security';

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

  try {
    if (marketingConsent !== true) {
      const marketingOptIn: Awaited<
        ReturnType<typeof OAuthService.getMarketingOptInStatus>
      > = yield call([OAuthService, OAuthService.getMarketingOptInStatus]);
      marketingConsent = marketingOptIn.is_opt_in;
    }

    const event = AnalyticsEventBuilder.createEventBuilder(
      MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED,
    )
      .setSaveDataRecording(true)
      .addProperties({
        [UserProfileProperty.HAS_MARKETING_CONSENT]: Boolean(marketingConsent),
        is_metrics_opted_in: true,
        location: 'saga_backfill_marketing_consent',
        updated_after_onboarding: true,
        account_type: getSocialAccountType(authConnection, false),
      })
      .build();

    yield call([analytics, analytics.trackEvent], event);

    yield call(updateDataRecordingFlag, true);
    yield put(setPendingSocialLoginMarketingConsentBackfill(null));
    yield put(setDataCollectionForMarketing(marketingConsent));
  } catch (error) {
    Logger.error(
      error as Error,
      'Failed to backfill social login marketing consent analytics',
    );
  }
}
