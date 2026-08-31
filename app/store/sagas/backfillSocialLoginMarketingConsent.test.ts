import { expectSaga } from 'redux-saga-test-plan';
import { backfillSocialLoginMarketingConsentSaga } from './backfillSocialLoginMarketingConsent';
import initialRootState from '../../util/test/initial-root-state';
import { setPendingSocialLoginMarketingConsentBackfill } from '../../actions/onboarding';
import { setDataCollectionForMarketing } from '../../actions/security';
import { analytics } from '../../util/analytics/analytics';
import { UserActionType } from '../../actions/user';
import OAuthService from '../../core/OAuthService/OAuthService';
import Logger from '../../util/Logger';
import { UserProfileProperty } from '../../util/metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import Engine from '../../core/Engine';

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

jest.mock('../../core/OAuthService/OAuthService', () => ({
  __esModule: true,
  default: {
    getMarketingOptInStatus: jest.fn().mockResolvedValue({ is_opt_in: false }),
  },
}));

jest.mock('../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      SeedlessOnboardingController: {
        getAccessToken: jest.fn().mockResolvedValue('mock-access-token'),
      },
    },
  },
}));

const loginAction = { type: UserActionType.LOGIN };

describe('backfillSocialLoginMarketingConsent', () => {
  const mockedIdentify = jest.mocked(analytics.identify);
  const mockedTrackEvent = jest.mocked(analytics.trackEvent);
  const mockedGetMarketingOptInStatus = jest.mocked(
    OAuthService.getMarketingOptInStatus,
  );
  const mockedLoggerError = jest.mocked(Logger.error);

  const getMockedGetAccessToken = () =>
    jest.mocked(Engine.context.SeedlessOnboardingController.getAccessToken);

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetMarketingOptInStatus.mockResolvedValue({ is_opt_in: false });
    if (Engine.context.SeedlessOnboardingController?.getAccessToken) {
      getMockedGetAccessToken().mockResolvedValue('mock-access-token');
    }
  });

  it('does nothing when no pending backfill marker exists', async () => {
    await expectSaga(backfillSocialLoginMarketingConsentSaga)
      .withState(initialRootState)
      .dispatch(loginAction)
      .run();

    expect(mockedIdentify).not.toHaveBeenCalled();
    expect(mockedTrackEvent).not.toHaveBeenCalled();
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
      .put(setDataCollectionForMarketing(true))
      .put(setPendingSocialLoginMarketingConsentBackfill(null))
      .run();

    expect(mockedGetMarketingOptInStatus).not.toHaveBeenCalled();
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
      .put(setDataCollectionForMarketing(false))
      .put(setPendingSocialLoginMarketingConsentBackfill(null))
      .run();

    expect(mockedGetMarketingOptInStatus).toHaveBeenCalled();
    expect(mockedIdentify).toHaveBeenCalledWith({
      [UserProfileProperty.HAS_MARKETING_CONSENT]: false,
    });
    expect(mockedTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({
          has_marketing_consent: false,
          is_metrics_opted_in: true,
          location: 'saga_backfill_marketing_consent',
          updated_after_onboarding: true,
          account_type: 'metamask_google',
        }),
      }),
    );
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
      .put(setDataCollectionForMarketing(true))
      .put(setPendingSocialLoginMarketingConsentBackfill(null))
      .run();

    expect(mockedGetMarketingOptInStatus).toHaveBeenCalled();
    expect(mockedIdentify).toHaveBeenCalledWith({
      [UserProfileProperty.HAS_MARKETING_CONSENT]: true,
    });
    expect(mockedTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: expect.objectContaining({
          has_marketing_consent: true,
        }),
      }),
    );
  });

  it('keeps the marker when OAuth access token is unavailable', async () => {
    getMockedGetAccessToken().mockResolvedValueOnce(undefined);

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

    expect(mockedGetMarketingOptInStatus).not.toHaveBeenCalled();
    expect(mockedLoggerError).not.toHaveBeenCalled();
    expect(mockedIdentify).not.toHaveBeenCalled();
    expect(mockedTrackEvent).not.toHaveBeenCalled();
  });

  it('keeps the marker when SeedlessOnboardingController is missing', async () => {
    const originalController = Engine.context.SeedlessOnboardingController;
    // Simulate Engine.context without SeedlessOnboardingController.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Engine.context as any).SeedlessOnboardingController = undefined;

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

    try {
      await expectSaga(backfillSocialLoginMarketingConsentSaga)
        .withState(state)
        .dispatch(loginAction)
        .not.put(setPendingSocialLoginMarketingConsentBackfill(null))
        .run();

      expect(mockedGetMarketingOptInStatus).not.toHaveBeenCalled();
      expect(mockedLoggerError).not.toHaveBeenCalled();
      expect(mockedIdentify).not.toHaveBeenCalled();
      expect(mockedTrackEvent).not.toHaveBeenCalled();
    } finally {
      Engine.context.SeedlessOnboardingController = originalController;
    }
  });

  it('keeps the marker when getMarketingOptInStatus rejects with no access token', async () => {
    mockedGetMarketingOptInStatus.mockRejectedValueOnce(
      new Error('No access token found. User must be authenticated.'),
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

    // Pre-check passed (token present); API was called and failed with the
    // known no-access-token message — catch path preserves the marker.
    expect(mockedGetMarketingOptInStatus).toHaveBeenCalledTimes(1);
    expect(mockedLoggerError).not.toHaveBeenCalled();
    expect(mockedIdentify).not.toHaveBeenCalled();
    expect(mockedTrackEvent).not.toHaveBeenCalled();
  });

  it('clears the marker when getMarketingOptInStatus rejects with an unexpected error', async () => {
    mockedGetMarketingOptInStatus.mockRejectedValueOnce(
      new Error('marketing opt-in request failed'),
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
      .put(setPendingSocialLoginMarketingConsentBackfill(null))
      .run();

    expect(mockedLoggerError).toHaveBeenCalledWith(
      expect.any(Error),
      'Failed to backfill social login marketing consent analytics',
    );
    expect(mockedIdentify).not.toHaveBeenCalled();
    expect(mockedTrackEvent).not.toHaveBeenCalled();
  });

  it('clears the marker when trackEvent throws', async () => {
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
      .put(setPendingSocialLoginMarketingConsentBackfill(null))
      .run();

    expect(mockedIdentify).toHaveBeenCalledWith({
      [UserProfileProperty.HAS_MARKETING_CONSENT]: true,
    });
  });

  it('persists fetched OAuth marketing consent before clearing the marker when analytics fails', async () => {
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

    mockedGetMarketingOptInStatus.mockResolvedValueOnce({ is_opt_in: true });
    mockedTrackEvent.mockImplementation(() => {
      throw new Error('track failed');
    });

    await expectSaga(backfillSocialLoginMarketingConsentSaga)
      .withState(state)
      .dispatch(loginAction)
      .put(setDataCollectionForMarketing(true))
      .put(setPendingSocialLoginMarketingConsentBackfill(null))
      .run();
  });
});
