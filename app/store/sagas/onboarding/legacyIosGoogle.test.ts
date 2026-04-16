import { expectSaga } from 'redux-saga-test-plan';
import initialRootState from '../../../util/test/initial-root-state';
import { UserActionType } from '../../../actions/user';
import { AuthConnection } from '../../../core/OAuthService/OAuthInterface';
import { setIosGoogleWarningSheetLastDismissedAt } from '../../../actions/onboarding';
import {
  IOS_GOOGLE_WARNING_SHEET_REMINDER_INTERVAL_MS,
  promptIosGoogleWarningSheetSaga,
} from './legacyIosGoogle';
import { presentIosGoogleLoginVersionWarningSheetReminder } from '../../../components/Views/Onboarding/OnboardingIosPrompt';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import Device from '../../../util/device';

jest.mock('../../../core/NavigationService', () => ({
  __esModule: true,
  default: {
    navigation: { navigate: jest.fn(), reset: jest.fn() },
  },
}));

jest.mock('../../../components/Views/Onboarding/OnboardingIosPrompt', () => ({
  presentIosGoogleLoginVersionWarningSheetReminder: jest
    .fn()
    .mockResolvedValue(undefined),
}));

jest.mock('../../../util/device', () => ({
  __esModule: true,
  default: {
    isIos: jest.fn(),
    isAndroid: jest.fn(),
    comparePlatformVersionTo: jest.fn(),
  },
}));

jest.mock('../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    log: jest.fn(),
  },
}));

jest.mock('../../../util/analytics/analytics', () => ({
  __esModule: true,
  analytics: {
    isEnabled: jest.fn(() => false),
    trackEvent: jest.fn(),
    trackView: jest.fn(),
    identify: jest.fn(),
    optIn: jest.fn(),
    optOut: jest.fn(),
    getAnalyticsId: jest.fn(),
    isOptedIn: jest.fn(),
  },
}));

const loginAction = { type: UserActionType.LOGIN };

const fixedNow = 1_700_000_000_000;

const googleSeedlessState = {
  ...initialRootState,
  onboarding: {
    ...initialRootState.onboarding,
    iosGoogleWarningSheetLastDismissedAt: null as number | null,
  },
  engine: {
    ...initialRootState.engine,
    backgroundState: {
      ...initialRootState.engine.backgroundState,
      SeedlessOnboardingController: {
        ...initialRootState.engine.backgroundState.SeedlessOnboardingController,
        vault: 'encrypted-vault',
        authConnection: AuthConnection.Google,
      },
    },
  },
};

describe('promptIosGoogleWarningSheetSaga', () => {
  const mockedPresentSheet = jest.mocked(
    presentIosGoogleLoginVersionWarningSheetReminder,
  );
  const mockedIsIos = jest.mocked(Device.isIos);
  const mockedIsAndroid = jest.mocked(Device.isAndroid);
  const mockedCompareVersion = jest.mocked(Device.comparePlatformVersionTo);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(Date, 'now').mockReturnValue(fixedNow);
    mockedIsIos.mockReturnValue(true);
    mockedIsAndroid.mockReturnValue(false);
    mockedCompareVersion.mockReturnValue(-1);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('presents the sheet on iOS below 17.4 for Google seedless accounts', async () => {
    const runPromise = expectSaga(promptIosGoogleWarningSheetSaga)
      .withState(googleSeedlessState)
      .dispatch(loginAction)
      .put(setIosGoogleWarningSheetLastDismissedAt(fixedNow))
      .run({ timeout: false });

    await jest.advanceTimersByTimeAsync(5000);
    await runPromise;

    expect(mockedPresentSheet).toHaveBeenCalledTimes(1);
  });

  it('does not present the sheet when last dismissed is within 7 days', async () => {
    const state = {
      ...googleSeedlessState,
      onboarding: {
        ...googleSeedlessState.onboarding,
        iosGoogleWarningSheetLastDismissedAt:
          fixedNow - IOS_GOOGLE_WARNING_SHEET_REMINDER_INTERVAL_MS + 1000,
      },
    };

    const runPromise = expectSaga(promptIosGoogleWarningSheetSaga)
      .withState(state)
      .dispatch(loginAction)
      .not.put(setIosGoogleWarningSheetLastDismissedAt(fixedNow))
      .run({ timeout: false });

    await jest.advanceTimersByTimeAsync(5000);
    await runPromise;

    expect(mockedPresentSheet).not.toHaveBeenCalled();
  });

  it('presents the sheet when last dismissed is at least 7 days ago', async () => {
    const state = {
      ...googleSeedlessState,
      onboarding: {
        ...googleSeedlessState.onboarding,
        iosGoogleWarningSheetLastDismissedAt:
          fixedNow - IOS_GOOGLE_WARNING_SHEET_REMINDER_INTERVAL_MS,
      },
    };

    const runPromise = expectSaga(promptIosGoogleWarningSheetSaga)
      .withState(state)
      .dispatch(loginAction)
      .put(setIosGoogleWarningSheetLastDismissedAt(fixedNow))
      .run({ timeout: false });

    await jest.advanceTimersByTimeAsync(5000);
    await runPromise;

    expect(mockedPresentSheet).toHaveBeenCalledTimes(1);
  });

  it('does not present the sheet when Google login iOS unsupported blocking is enabled', async () => {
    const state = {
      ...googleSeedlessState,
      engine: {
        ...googleSeedlessState.engine,
        backgroundState: {
          ...googleSeedlessState.engine.backgroundState,
          RemoteFeatureFlagController: {
            ...googleSeedlessState.engine.backgroundState
              .RemoteFeatureFlagController,
            remoteFeatureFlags: {
              ...googleSeedlessState.engine.backgroundState
                .RemoteFeatureFlagController.remoteFeatureFlags,
              [FeatureFlagNames.googleLoginIosUnsupportedBlockingEnabled]: true,
            },
          },
        },
      },
    };

    const runPromise = expectSaga(promptIosGoogleWarningSheetSaga)
      .withState(state)
      .dispatch(loginAction)
      .not.put(setIosGoogleWarningSheetLastDismissedAt(fixedNow))
      .run({ timeout: false });

    await jest.advanceTimersByTimeAsync(5000);
    await runPromise;

    expect(mockedPresentSheet).not.toHaveBeenCalled();
  });

  it('does not present the sheet when the user is not on the seedless Google flow', async () => {
    const state = {
      ...initialRootState,
      onboarding: {
        ...initialRootState.onboarding,
        iosGoogleWarningSheetLastDismissedAt: null,
      },
      engine: {
        ...initialRootState.engine,
        backgroundState: {
          ...initialRootState.engine.backgroundState,
          SeedlessOnboardingController: {
            ...initialRootState.engine.backgroundState
              .SeedlessOnboardingController,
            vault: undefined,
            authConnection: undefined,
          },
        },
      },
    };

    const runPromise = expectSaga(promptIosGoogleWarningSheetSaga)
      .withState(state)
      .dispatch(loginAction)
      .not.put(setIosGoogleWarningSheetLastDismissedAt(fixedNow))
      .run({ timeout: false });

    await jest.advanceTimersByTimeAsync(5000);
    await runPromise;

    expect(mockedPresentSheet).not.toHaveBeenCalled();
  });

  it('does not present the sheet for Apple seedless accounts', async () => {
    const state = {
      ...initialRootState,
      onboarding: {
        ...initialRootState.onboarding,
        iosGoogleWarningSheetLastDismissedAt: null,
      },
      engine: {
        ...initialRootState.engine,
        backgroundState: {
          ...initialRootState.engine.backgroundState,
          SeedlessOnboardingController: {
            ...initialRootState.engine.backgroundState
              .SeedlessOnboardingController,
            vault: 'encrypted-vault',
            authConnection: AuthConnection.Apple,
          },
        },
      },
    };

    const runPromise = expectSaga(promptIosGoogleWarningSheetSaga)
      .withState(state)
      .dispatch(loginAction)
      .not.put(setIosGoogleWarningSheetLastDismissedAt(fixedNow))
      .run({ timeout: false });

    await jest.advanceTimersByTimeAsync(5000);
    await runPromise;

    expect(mockedPresentSheet).not.toHaveBeenCalled();
  });
});
