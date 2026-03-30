import { call, put, select } from 'redux-saga/effects';
import { AnalyticsEventBuilder } from '../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../util/analytics/analytics';
import { MetaMetricsEvents } from '../../core/Analytics';
import { UserProfileProperty } from '../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { getSocialAccountType } from '../../constants/onboarding';
import { updateDataRecordingFlag } from '../../util/analytics/analyticsDataDeletion';
import { setPendingSocialLoginMarketingConsentBackfill } from '../../actions/onboarding';
import Logger from '../../util/Logger';
import type { RootState } from '../../reducers';
import { selectPendingSocialLoginMarketingConsentBackfill } from '../../selectors/seedlessOnboardingController';

export function* backfillSocialLoginMarketingConsent() {
  const authConnection: RootState['onboarding']['seedless']['pendingSocialLoginMarketingConsentBackfill'] =
    yield select(selectPendingSocialLoginMarketingConsentBackfill);
  const marketingConsent: RootState['security']['dataCollectionForMarketing'] =
    yield select(
      (state: RootState) => state.security?.dataCollectionForMarketing,
    );

  if (!authConnection) {
    return;
  }

  if (marketingConsent !== true) {
    yield put(setPendingSocialLoginMarketingConsentBackfill(null));
    return;
  }

  try {
    const event = AnalyticsEventBuilder.createEventBuilder(
      MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED,
    )
      .setSaveDataRecording(true)
      .addProperties({
        [UserProfileProperty.HAS_MARKETING_CONSENT]: UserProfileProperty.ON,
        is_metrics_opted_in: true,
        location: 'onboarding_choosePassword',
        updated_after_onboarding: false,
        account_type: getSocialAccountType(authConnection, false),
      })
      .build();

    yield call([analytics, analytics.trackEvent], event);

    yield call(updateDataRecordingFlag, true);
    yield put(setPendingSocialLoginMarketingConsentBackfill(null));
  } catch (error) {
    Logger.error(
      error as Error,
      'Failed to backfill social login marketing consent analytics',
    );
  }
}
