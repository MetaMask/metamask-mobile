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
import { setDataCollectionForMarketing } from '../../actions/security';
import { ensureError } from '../../util/errorUtils';

export function* backfillSocialLoginMarketingConsentSaga() {
  yield take(UserActionType.LOGIN);

  const authConnection: RootState['onboarding']['pendingSocialLoginMarketingConsentBackfill'] =
    yield select(selectPendingSocialLoginMarketingConsentBackfill);

  if (!authConnection) {
    return;
  }

  const hasMarketingConsent: boolean = yield select(
    (state: RootState) => state.security?.dataCollectionForMarketing === true,
  );

  if (hasMarketingConsent) {
    try {
      yield call([analytics, analytics.identify], {
        [UserProfileProperty.HAS_MARKETING_CONSENT]: true,
      });
      const event = AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED,
      )
        .addProperties({
          [UserProfileProperty.HAS_MARKETING_CONSENT]: true,
          is_metrics_opted_in: true,
          location: 'saga_backfill_marketing_consent',
          updated_after_onboarding: true,
          account_type: getSocialAccountType(authConnection, false),
        })
        .build();

      yield call([analytics, analytics.trackEvent], event);

      yield put(setDataCollectionForMarketing(true));
    } catch (error) {
      Logger.error(
        ensureError(error),
        'Failed to backfill social login marketing consent analytics',
      );
    }
  }

  yield put(setPendingSocialLoginMarketingConsentBackfill(null));
}
