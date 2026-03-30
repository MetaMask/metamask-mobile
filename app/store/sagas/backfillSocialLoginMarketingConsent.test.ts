import { expectSaga } from 'redux-saga-test-plan';
import { updateDataRecordingFlag } from '../../util/analytics/analyticsDataDeletion';
import { backfillSocialLoginMarketingConsent } from './backfillSocialLoginMarketingConsent';
import { UserProfileProperty } from '../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
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
    identify: jest.fn(),
  },
}));

jest.mock('../../util/analytics/analyticsDataDeletion', () => ({
  updateDataRecordingFlag: jest.fn(),
}));

jest.mock(
  '../../util/metrics/UserSettingsAnalyticsMetaData/generateUserProfileAnalyticsMetaData',
  () => ({
    __esModule: true,
    default: jest.fn(),
  }),
);

jest.mock(
  '../../util/metrics/DeviceAnalyticsMetaData/generateDeviceAnalyticsMetaData',
  () => ({
    __esModule: true,
    default: jest.fn(),
  }),
);

jest.mock('../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    log: jest.fn(),
  },
}));

const mockUserProfileTraits = { theme: 'dark', token_detection_enable: 'ON' };
const mockDeviceTraits = { platform: 'ios', applicationVersion: '7.0.0' };

describe('backfillSocialLoginMarketingConsent', () => {
  const mockedTrackEvent = jest.mocked(analytics.trackEvent);
  const mockedIdentify = jest.mocked(analytics.identify);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing when no pending backfill marker exists', async () => {
    await expectSaga(backfillSocialLoginMarketingConsent)
      .withState(initialRootState)
      .run();

    expect(mockedIdentify).not.toHaveBeenCalled();
    expect(mockedTrackEvent).not.toHaveBeenCalled();
    expect(updateDataRecordingFlag).not.toHaveBeenCalled();
  });

  it('tracks the backfill and clears the onboarding seedless marker', async () => {
    const state = {
      ...initialRootState,
      security: {
        ...initialRootState.security,
        dataCollectionForMarketing: true,
      },
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

    expect(mockedIdentify).toHaveBeenCalledWith({
      ...mockUserProfileTraits,
      ...mockDeviceTraits,
    });
    expect(mockedTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        saveDataRecording: true,
        properties: expect.objectContaining({
          [UserProfileProperty.HAS_MARKETING_CONSENT]: UserProfileProperty.ON,
          is_metrics_opted_in: true,
          location: 'onboarding_choosePassword',
          updated_after_onboarding: false,
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
        seedless: {
          pendingSocialLoginMarketingConsentBackfill: 'google',
        },
      },
    };

    await expectSaga(backfillSocialLoginMarketingConsent)
      .withState(state)
      .put(setPendingSocialLoginMarketingConsentBackfill(null))
      .run();

    expect(mockedIdentify).not.toHaveBeenCalled();
    expect(mockedTrackEvent).not.toHaveBeenCalled();
    expect(updateDataRecordingFlag).not.toHaveBeenCalled();
  });

  it('does not clear the marker when identify throws', async () => {
    const state = {
      ...initialRootState,
      security: {
        ...initialRootState.security,
        dataCollectionForMarketing: true,
      },
      onboarding: {
        ...initialRootState.onboarding,
        seedless: {
          pendingSocialLoginMarketingConsentBackfill: 'google',
        },
      },
    };

    mockedIdentify.mockImplementation(() => {
      throw new Error('identify failed');
    });

    await expectSaga(backfillSocialLoginMarketingConsent)
      .withState(state)
      .not.put(setPendingSocialLoginMarketingConsentBackfill(null))
      .run();

    expect(updateDataRecordingFlag).not.toHaveBeenCalled();
  });

  it('does not clear the marker when trackEvent throws after identify succeeds', async () => {
    const state = {
      ...initialRootState,
      security: {
        ...initialRootState.security,
        dataCollectionForMarketing: true,
      },
      onboarding: {
        ...initialRootState.onboarding,
        seedless: {
          pendingSocialLoginMarketingConsentBackfill: 'google',
        },
      },
    };

    mockedIdentify.mockImplementation(() => undefined);
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
