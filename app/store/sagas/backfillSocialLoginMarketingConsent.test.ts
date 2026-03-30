import { expectSaga } from 'redux-saga-test-plan';
import { analytics } from '../../util/analytics/analytics';
import { updateDataRecordingFlag } from '../../util/analytics/analyticsDataDeletion';
import { backfillSocialLoginMarketingConsent } from './backfillSocialLoginMarketingConsent';
import { UserProfileProperty } from '../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import initialRootState from '../../util/test/initial-root-state';
import { setPendingSocialLoginMarketingConsentBackfill } from '../../actions/onboarding';

jest.mock('../../core/Analytics', () => ({
  __esModule: true,
  MetaMetricsEvents: {
    ANALYTICS_PREFERENCE_SELECTED: 'Analytics Preference Selected',
  },
}));

jest.mock('../../util/analytics/analytics', () => ({
  analytics: {
    identify: jest.fn(),
    trackEvent: jest.fn(),
  },
}));

jest.mock('../../util/analytics/analyticsDataDeletion', () => ({
  updateDataRecordingFlag: jest.fn(),
}));

jest.mock('../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    log: jest.fn(),
  },
}));

describe('backfillSocialLoginMarketingConsent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing when no pending backfill marker exists', async () => {
    await expectSaga(backfillSocialLoginMarketingConsent)
      .withState(initialRootState)
      .run();

    expect(analytics.identify).not.toHaveBeenCalled();
    expect(analytics.trackEvent).not.toHaveBeenCalled();
    expect(updateDataRecordingFlag).not.toHaveBeenCalled();
  });

  it('tracks the backfill and clears the onboarding seedless marker', async () => {
    const state = {
      ...initialRootState,
      onboarding: {
        ...initialRootState.onboarding,
        seedless: {
          pendingSocialLoginMarketingConsentBackfill: 'google',
        },
      },
    };

    await expectSaga(backfillSocialLoginMarketingConsent)
      .withState(state)
      .put(setPendingSocialLoginMarketingConsentBackfill(null))
      .run();

    expect(analytics.identify).toHaveBeenCalledWith({
      [UserProfileProperty.HAS_MARKETING_CONSENT]: UserProfileProperty.ON,
    });
    expect(analytics.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        saveDataRecording: true,
        properties: expect.objectContaining({
          [UserProfileProperty.HAS_MARKETING_CONSENT]: true,
          is_metrics_opted_in: true,
          location: 'onboarding_choosePassword',
          updated_after_onboarding: false,
          account_type: 'metamask_google',
        }),
      }),
    );
    expect(updateDataRecordingFlag).toHaveBeenCalledWith(true);
  });
});
