import { expectSaga } from 'redux-saga-test-plan';
import { updateDataRecordingFlag } from '../../util/analytics/analyticsDataDeletion';
import { backfillSocialLoginMarketingConsent } from './backfillSocialLoginMarketingConsent';
import initialRootState from '../../util/test/initial-root-state';
import { setPendingSocialLoginMarketingConsentBackfill } from '../../actions/onboarding';
import { analytics } from '../../util/analytics/analytics';

jest.mock('../../core/Analytics', () => ({
  __esModule: true,
  MetaMetricsEvents: {
    ANALYTICS_PREFERENCE_SELECTED: 'Analytics Preference Selected',
  },
}));

jest.mock('../../util/analytics/analytics', () => ({
  analytics: {
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
  const mockedTrackEvent = jest.mocked(analytics.trackEvent);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing when no pending backfill marker exists', async () => {
    await expectSaga(backfillSocialLoginMarketingConsent)
      .withState(initialRootState)
      .run();

    expect(mockedTrackEvent).not.toHaveBeenCalled();
    expect(updateDataRecordingFlag).not.toHaveBeenCalled();
  });

  it('tracks the backfill and clears the onboarding marker', async () => {
    const state = {
      ...initialRootState,
      security: {
        ...initialRootState.security,
        dataCollectionForMarketing: true,
      },
      onboarding: {
        ...initialRootState.onboarding,
        pendingSocialLoginMarketingConsentBackfill: 'google',
      },
    };

    await expectSaga(backfillSocialLoginMarketingConsent)
      .withState(state)
      .put(setPendingSocialLoginMarketingConsentBackfill(null))
      .run();

    expect(mockedTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        saveDataRecording: true,
        properties: expect.objectContaining({
          has_marketing_consent: true,
          is_metrics_opted_in: true,
          location: 'saga_backfill_marketing_consent',
          updated_after_onboarding: true,
          account_type: 'metamask_google',
        }),
      }),
    );
    expect(updateDataRecordingFlag).toHaveBeenCalledWith(true);
  });

  it('clears stale marker without sending analytics when marketing consent is no longer enabled', async () => {
    const state = {
      ...initialRootState,
      security: {
        ...initialRootState.security,
        dataCollectionForMarketing: false,
      },
      onboarding: {
        ...initialRootState.onboarding,
        pendingSocialLoginMarketingConsentBackfill: 'google',
      },
    };

    await expectSaga(backfillSocialLoginMarketingConsent)
      .withState(state)
      .put(setPendingSocialLoginMarketingConsentBackfill(null))
      .run();

    expect(mockedTrackEvent).not.toHaveBeenCalled();
    expect(updateDataRecordingFlag).not.toHaveBeenCalled();
  });

  it('does not clear the marker when trackEvent throws', async () => {
    const state = {
      ...initialRootState,
      security: {
        ...initialRootState.security,
        dataCollectionForMarketing: true,
      },
      onboarding: {
        ...initialRootState.onboarding,
        pendingSocialLoginMarketingConsentBackfill: 'google',
      },
    };

    mockedTrackEvent.mockImplementation(() => {
      throw new Error('track failed');
    });

    await expectSaga(backfillSocialLoginMarketingConsent)
      .withState(state)
      .not.put(setPendingSocialLoginMarketingConsentBackfill(null))
      .run();

    expect(updateDataRecordingFlag).not.toHaveBeenCalled();
  });
});
