import { expectSaga } from 'redux-saga-test-plan';
import { updateDataRecordingFlag } from '../../util/analytics/analyticsDataDeletion';
import { backfillSocialLoginMarketingConsentSaga } from './backfillSocialLoginMarketingConsent';
import initialRootState from '../../util/test/initial-root-state';
import { setPendingSocialLoginMarketingConsentBackfill } from '../../actions/onboarding';
import { setDataCollectionForMarketing } from '../../actions/security';
import { analytics } from '../../util/analytics/analytics';
import { UserActionType } from '../../actions/user';
import OAuthService from '../../core/OAuthService/OAuthService';
import Logger from '../../util/Logger';

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

jest.mock('../../core/OAuthService/OAuthService', () => ({
  __esModule: true,
  default: {
    getMarketingOptInStatus: jest.fn().mockResolvedValue({ is_opt_in: false }),
  },
}));

const loginAction = { type: UserActionType.LOGIN };

describe('backfillSocialLoginMarketingConsent', () => {
  const mockedTrackEvent = jest.mocked(analytics.trackEvent);
  const mockedGetMarketingOptInStatus = jest.mocked(
    OAuthService.getMarketingOptInStatus,
  );
  const mockedLoggerError = jest.mocked(Logger.error);

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetMarketingOptInStatus.mockResolvedValue({ is_opt_in: false });
  });

  it('does nothing when no pending backfill marker exists', async () => {
    await expectSaga(backfillSocialLoginMarketingConsentSaga)
      .withState(initialRootState)
      .dispatch(loginAction)
      .run();

    expect(mockedTrackEvent).not.toHaveBeenCalled();
    expect(updateDataRecordingFlag).not.toHaveBeenCalled();
    expect(mockedGetMarketingOptInStatus).not.toHaveBeenCalled();
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

    await expectSaga(backfillSocialLoginMarketingConsentSaga)
      .withState(state)
      .dispatch(loginAction)
      .put(setPendingSocialLoginMarketingConsentBackfill(null))
      .put(setDataCollectionForMarketing(true))
      .run();

    expect(mockedGetMarketingOptInStatus).not.toHaveBeenCalled();
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

  it('uses OAuth marketing status when Redux dataCollectionForMarketing is not true', async () => {
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

    await expectSaga(backfillSocialLoginMarketingConsentSaga)
      .withState(state)
      .dispatch(loginAction)
      .put(setPendingSocialLoginMarketingConsentBackfill(null))
      .put(setDataCollectionForMarketing(false))
      .run();

    expect(mockedGetMarketingOptInStatus).toHaveBeenCalled();
    expect(mockedTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        saveDataRecording: true,
        properties: expect.objectContaining({
          has_marketing_consent: false,
          is_metrics_opted_in: true,
          location: 'saga_backfill_marketing_consent',
          updated_after_onboarding: true,
          account_type: 'metamask_google',
        }),
      }),
    );
    expect(updateDataRecordingFlag).toHaveBeenCalledWith(true);
  });

  it('uses OAuth opt-in when it is true even if Redux marketing flag is false', async () => {
    mockedGetMarketingOptInStatus.mockResolvedValueOnce({ is_opt_in: true });

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

    await expectSaga(backfillSocialLoginMarketingConsentSaga)
      .withState(state)
      .dispatch(loginAction)
      .put(setPendingSocialLoginMarketingConsentBackfill(null))
      .put(setDataCollectionForMarketing(true))
      .run();

    expect(mockedGetMarketingOptInStatus).toHaveBeenCalled();
    expect(mockedTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({
          has_marketing_consent: true,
        }),
      }),
    );
  });

  it('does not clear the marker when getMarketingOptInStatus rejects', async () => {
    mockedGetMarketingOptInStatus.mockRejectedValueOnce(
      new Error('no access token'),
    );

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

    await expectSaga(backfillSocialLoginMarketingConsentSaga)
      .withState(state)
      .dispatch(loginAction)
      .not.put(setPendingSocialLoginMarketingConsentBackfill(null))
      .run();

    expect(mockedLoggerError).toHaveBeenCalledWith(
      expect.any(Error),
      'Failed to backfill social login marketing consent analytics',
    );
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

    await expectSaga(backfillSocialLoginMarketingConsentSaga)
      .withState(state)
      .dispatch(loginAction)
      .not.put(setPendingSocialLoginMarketingConsentBackfill(null))
      .run();

    expect(updateDataRecordingFlag).not.toHaveBeenCalled();
  });
});
