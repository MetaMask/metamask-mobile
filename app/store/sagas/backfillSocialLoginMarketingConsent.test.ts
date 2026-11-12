import { expectSaga } from 'redux-saga-test-plan';
import { backfillSocialLoginMarketingConsentSaga } from './backfillSocialLoginMarketingConsent';
import initialRootState from '../../util/test/initial-root-state';
import { setPendingSocialLoginMarketingConsentBackfill } from '../../actions/onboarding';
import { setDataCollectionForMarketing } from '../../actions/security';
import { analytics } from '../../util/analytics/analytics';
import { UserActionType } from '../../actions/user';
import Logger from '../../util/Logger';
import { UserProfileProperty } from '../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';

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

jest.mock('../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    log: jest.fn(),
  },
}));

const loginAction = { type: UserActionType.LOGIN };

const buildState = (dataCollectionForMarketing: boolean | null) => ({
  ...initialRootState,
  security: {
    ...initialRootState.security,
    dataCollectionForMarketing,
  },
  onboarding: {
    ...initialRootState.onboarding,
    pendingSocialLoginMarketingConsentBackfill: 'google',
  },
});

describe('backfillSocialLoginMarketingConsent', () => {
  const mockedIdentify = jest.mocked(analytics.identify);
  const mockedTrackEvent = jest.mocked(analytics.trackEvent);
  const mockedLoggerError = jest.mocked(Logger.error);

  beforeEach(() => {
    jest.clearAllMocks();
    mockedTrackEvent.mockReset();
  });

  it('does nothing when no pending backfill marker exists', async () => {
    await expectSaga(backfillSocialLoginMarketingConsentSaga)
      .withState(initialRootState)
      .dispatch(loginAction)
      .not.put(setPendingSocialLoginMarketingConsentBackfill(null))
      .run();

    expect(mockedIdentify).not.toHaveBeenCalled();
    expect(mockedTrackEvent).not.toHaveBeenCalled();
  });

  it('tracks the backfill and clears the marker when marketing consent is true', async () => {
    await expectSaga(backfillSocialLoginMarketingConsentSaga)
      .withState(buildState(true))
      .dispatch(loginAction)
      .put(setDataCollectionForMarketing(true))
      .put(setPendingSocialLoginMarketingConsentBackfill(null))
      .run();

    expect(mockedIdentify).toHaveBeenCalledWith({
      [UserProfileProperty.HAS_MARKETING_CONSENT]: true,
    });
    expect(mockedTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({
          has_marketing_consent: true,
          is_metrics_opted_in: true,
          location: 'saga_backfill_marketing_consent',
          updated_after_onboarding: true,
          account_type: 'metamask_google',
        }),
      }),
    );
  });

  it.each([false, null])(
    'clears the marker without sending analytics when marketing consent is %s',
    async (dataCollectionForMarketing) => {
      await expectSaga(backfillSocialLoginMarketingConsentSaga)
        .withState(buildState(dataCollectionForMarketing))
        .dispatch(loginAction)
        .put(setPendingSocialLoginMarketingConsentBackfill(null))
        .not.put(setDataCollectionForMarketing(true))
        .not.put(setDataCollectionForMarketing(false))
        .run();

      expect(mockedIdentify).not.toHaveBeenCalled();
      expect(mockedTrackEvent).not.toHaveBeenCalled();
    },
  );

  it('logs the error and still clears the marker when trackEvent throws', async () => {
    mockedTrackEvent.mockImplementation(() => {
      throw new Error('track failed');
    });

    await expectSaga(backfillSocialLoginMarketingConsentSaga)
      .withState(buildState(true))
      .dispatch(loginAction)
      .put(setPendingSocialLoginMarketingConsentBackfill(null))
      .run();

    expect(mockedIdentify).toHaveBeenCalledWith({
      [UserProfileProperty.HAS_MARKETING_CONSENT]: true,
    });
    expect(mockedLoggerError).toHaveBeenCalledWith(
      expect.any(Error),
      'Failed to backfill social login marketing consent analytics',
    );
  });
});
