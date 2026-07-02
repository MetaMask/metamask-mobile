import React from 'react';
import OptinMetrics from './index.tsx';
import { renderScreen } from '../../../util/test/renderWithProvider';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../locales/i18n';
import Device from '../../../util/device';
import { createMockUseAnalyticsHook } from '../../../util/test/analyticsMock';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import Routes from '../../../constants/navigation/Routes';
import { analytics } from '../../../util/analytics/analytics';
import Logger from '../../../util/Logger';
import { ONBOARDING_SUCCESS_FLOW } from '../../../constants/onboarding';

jest.mock('../../hooks/useAnalytics/useAnalytics');

jest.mock('../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const mockOptinMetricsTestOnboardingSlice = {
  events: [] as unknown[],
  accountType: undefined as string | undefined,
};

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  const rootState = jest.requireActual(
    '../../../util/test/initial-root-state',
  ).default;
  return {
    ...actual,
    useSelector: jest.fn((selector) =>
      selector({
        ...rootState,
        settings: { basicFunctionalityEnabled: true },
        onboarding: {
          ...rootState.onboarding,
          events: mockOptinMetricsTestOnboardingSlice.events,
          accountType: mockOptinMetricsTestOnboardingSlice.accountType,
        },
      }),
    ),
  };
});

const mockGetShouldShow = jest.fn();
jest.mock(
  '../../../hooks/useOnboardingInterestQuestionnaireEligibility',
  () => ({
    useOnboardingInterestQuestionnaireEligibility: () => mockGetShouldShow,
  }),
);

jest.mock('../../../util/analytics/walletSetupCompletedAttribution', () => ({
  getWalletSetupAttributionPropsFromStore: jest.fn().mockReturnValue({}),
  getWalletSetupCompletedAttributionAnalyticsProps: jest
    .fn()
    .mockReturnValue({}),
}));

jest.mock(
  '../../../util/analytics/walletSetupCompletedAttributionReplay',
  () => ({
    scheduleBufferedOnboardingEventReplay: jest.fn(),
  }),
);

jest.mock('../../../util/analytics/analytics', () => ({
  analytics: {
    isEnabled: jest.fn(() => true),
    trackEvent: jest.fn(),
    optIn: jest.fn().mockResolvedValue(undefined),
    optOut: jest.fn().mockResolvedValue(undefined),
    getAnalyticsId: jest
      .fn()
      .mockResolvedValue('123e4567-e89b-12d3-a456-426614174000'),
    identify: jest.fn(),
    trackView: jest.fn(),
    isOptedIn: jest.fn().mockResolvedValue(false),
  },
}));

jest.mock(
  '../../../util/metrics/UserSettingsAnalyticsMetaData/generateUserProfileAnalyticsMetaData',
  () => jest.fn().mockReturnValue({}),
);

jest.mock('../../../util/metrics/MultichainAPI/networkMetricUtils', () => ({
  getConfiguredCaipChainIds: jest.fn().mockReturnValue(['eip155:1']),
}));

jest.mock(
  '../../../util/metrics/DeviceAnalyticsMetaData/generateDeviceAnalyticsMetaData',
  () => jest.fn().mockReturnValue({}),
);

jest.mock('../../../reducers/legalNotices', () => ({
  isPastPrivacyPolicyDate: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../util/device', () => ({
  isMediumDevice: jest.fn(),
  isAndroid: jest.fn(),
  isIos: jest.fn(),
  isLargeDevice: jest.fn(),
  isIphoneX: jest.fn(),
}));

jest.mock('../../../core/Engine/Engine', () => ({
  context: {
    KeyringController: {
      state: {
        keyrings: [{ metadata: { id: 'mock-keyring-id' } }],
      },
    },
  },
}));

const mockDiscoverAccounts = jest.fn().mockResolvedValue(0);
jest.mock('../../../multichain-accounts/discovery', () => ({
  discoverAccounts: (...args: Parameters<typeof mockDiscoverAccounts>) =>
    mockDiscoverAccounts(...args),
}));

jest.mock('../../../util/metrics/metricsOptInUIUtils', () => ({
  markMetricsOptInUISeen: jest.fn().mockResolvedValue(undefined),
}));

const mockSetWalletHomeOnboardingStepsEligibleAction = jest
  .fn()
  .mockReturnValue({ type: 'SET_WALLET_HOME_ONBOARDING_STEPS_ELIGIBLE' });
jest.mock('../../../actions/onboarding', () => ({
  ...jest.requireActual('../../../actions/onboarding'),
  setWalletHomeOnboardingStepsEligible: (
    ...args: Parameters<typeof mockSetWalletHomeOnboardingStepsEligibleAction>
  ) => mockSetWalletHomeOnboardingStepsEligibleAction(...args),
  clearOnboardingEvents: jest
    .fn()
    .mockReturnValue({ type: 'CLEAR_ONBOARDING_EVENTS' }),
}));

const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockDispatchAction = jest.fn();

let mockRouteParams: Record<string, unknown> | undefined;

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      reset: mockReset,
      setOptions: jest.fn(),
      goBack: jest.fn(),
      dispatch: mockDispatchAction,
    }),
    useRoute: () => ({
      key: 'OptinMetrics',
      name: 'OptinMetrics',
      params: mockRouteParams,
    }),
  };
});

const mockAnalytics = analytics as jest.Mocked<typeof analytics>;

describe('OptinMetrics — interest questionnaire navigation branching', () => {
  beforeEach(() => {
    mockOptinMetricsTestOnboardingSlice.events = [];
    mockOptinMetricsTestOnboardingSlice.accountType = undefined;
    mockRouteParams = undefined;
    jest.clearAllMocks();
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: (event) => mockAnalytics.trackEvent(event),
        createEventBuilder: AnalyticsEventBuilder.createEventBuilder,
        enable: async (enable) => {
          if (enable === false) {
            await mockAnalytics.optOut();
          } else {
            await mockAnalytics.optIn();
          }
        },
        identify: async (traits) => {
          mockAnalytics.identify(traits);
        },
        isEnabled: () => mockAnalytics.isEnabled(),
        getAnalyticsId: () => mockAnalytics.getAnalyticsId(),
      }),
    );
    (Device.isMediumDevice as jest.Mock).mockReturnValue(false);
    (Device.isAndroid as jest.Mock).mockReturnValue(false);
    (Device.isIos as jest.Mock).mockReturnValue(true);
    (Device.isLargeDevice as jest.Mock).mockReturnValue(false);
    (Device.isIphoneX as jest.Mock).mockReturnValue(false);
  });

  describe('when basic usage data is unchecked', () => {
    it('does not navigate to the interest questionnaire regardless of eligibility', async () => {
      mockGetShouldShow.mockResolvedValue(true);

      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      fireEvent.press(
        screen.getByText(strings('privacy_policy.gather_basic_usage_title')),
      );

      fireEvent.press(
        screen.getByRole('button', {
          name: strings('privacy_policy.continue'),
        }),
      );

      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalledWith(
          Routes.ONBOARDING.INTEREST_QUESTIONNAIRE,
          expect.anything(),
        );
      });
    });
  });

  describe('when basic usage data is checked and eligibility returns false', () => {
    it('calls navigation reset to HomeNav instead of navigating to questionnaire', async () => {
      mockGetShouldShow.mockResolvedValue(false);

      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      fireEvent.press(
        screen.getByRole('button', {
          name: strings('privacy_policy.continue'),
        }),
      );

      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalledWith(
          Routes.ONBOARDING.INTEREST_QUESTIONNAIRE,
          expect.anything(),
        );
        expect(mockReset).toHaveBeenCalledWith(
          expect.objectContaining({
            routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
          }),
        );
      });
    });
  });

  describe('when basic usage data is checked and eligibility throws', () => {
    it('falls back to resetting navigation so onboarding is not blocked', async () => {
      mockGetShouldShow.mockRejectedValue(new Error('eligibility failed'));

      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      fireEvent.press(
        screen.getByRole('button', {
          name: strings('privacy_policy.continue'),
        }),
      );

      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalledWith(
          Routes.ONBOARDING.INTEREST_QUESTIONNAIRE,
          expect.anything(),
        );
        expect(mockReset).toHaveBeenCalledWith(
          expect.objectContaining({
            routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
          }),
        );
      });
    });

    it('logs Error rejections from the eligibility check', async () => {
      mockGetShouldShow.mockRejectedValue(new Error('eligibility failed'));

      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      fireEvent.press(
        screen.getByRole('button', {
          name: strings('privacy_policy.continue'),
        }),
      );

      await waitFor(() => {
        expect(Logger.error).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'eligibility failed' }),
          'OptinMetrics: interest questionnaire eligibility check failed',
        );
      });
    });

    it('wraps non-Error rejections before logging', async () => {
      mockGetShouldShow.mockRejectedValue('string failure');

      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      fireEvent.press(
        screen.getByRole('button', {
          name: strings('privacy_policy.continue'),
        }),
      );

      await waitFor(() => {
        expect(Logger.error).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'string failure' }),
          'OptinMetrics: interest questionnaire eligibility check failed',
        );
      });
    });
  });

  describe('when basic usage data is checked and eligibility returns true', () => {
    it('navigates to the interest questionnaire with onComplete callback', async () => {
      mockGetShouldShow.mockResolvedValue(true);

      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      fireEvent.press(
        screen.getByRole('button', {
          name: strings('privacy_policy.continue'),
        }),
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.ONBOARDING.INTEREST_QUESTIONNAIRE,
          expect.objectContaining({
            onComplete: expect.any(Function),
          }),
        );
      });
    });

    it('includes accountType in navigation params when onboarding account type is set in Redux', async () => {
      mockGetShouldShow.mockResolvedValue(true);
      mockOptinMetricsTestOnboardingSlice.accountType = 'imported';

      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      fireEvent.press(
        screen.getByRole('button', {
          name: strings('privacy_policy.continue'),
        }),
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.ONBOARDING.INTEREST_QUESTIONNAIRE,
          expect.objectContaining({
            onComplete: expect.any(Function),
            accountType: 'imported',
          }),
        );
      });
    });

    it('onComplete callback resets navigation to HOME_NAV via continueNavigation', async () => {
      mockGetShouldShow.mockResolvedValue(true);

      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      fireEvent.press(
        screen.getByRole('button', {
          name: strings('privacy_policy.continue'),
        }),
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.ONBOARDING.INTEREST_QUESTIONNAIRE,
          expect.objectContaining({
            onComplete: expect.any(Function),
          }),
        );
      });

      const navCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.ONBOARDING.INTEREST_QUESTIONNAIRE,
      );
      const onComplete = navCall?.[1]?.onComplete;

      mockReset.mockClear();
      await onComplete();

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalledWith(
          expect.objectContaining({
            routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
          }),
        );
      });
    });
  });

  describe('SRP import flow with successFlow param', () => {
    const mockOnContinue = jest.fn();

    beforeEach(() => {
      mockRouteParams = {
        successFlow: ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE,
        onContinue: mockOnContinue,
        accountType: 'imported',
      };
    });

    it('dispatches setWalletHomeOnboardingStepsEligible when successFlow is IMPORT_FROM_SEED_PHRASE', async () => {
      mockGetShouldShow.mockResolvedValue(false);

      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      fireEvent.press(
        screen.getByRole('button', {
          name: strings('privacy_policy.continue'),
        }),
      );

      await waitFor(() => {
        expect(
          mockSetWalletHomeOnboardingStepsEligibleAction,
        ).toHaveBeenCalledWith(true, { skipInitialBalanceWait: true });
      });
    });

    it('calls discoverAccounts when successFlow is IMPORT_FROM_SEED_PHRASE', async () => {
      mockGetShouldShow.mockResolvedValue(false);

      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      fireEvent.press(
        screen.getByRole('button', {
          name: strings('privacy_policy.continue'),
        }),
      );

      await waitFor(() => {
        expect(mockDiscoverAccounts).toHaveBeenCalledWith('mock-keyring-id');
      });
    });

    it('calls onContinue after running handleOnDone logic', async () => {
      mockGetShouldShow.mockResolvedValue(false);

      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      fireEvent.press(
        screen.getByRole('button', {
          name: strings('privacy_policy.continue'),
        }),
      );

      await waitFor(() => {
        expect(mockOnContinue).toHaveBeenCalled();
      });
    });

    it('runs handleOnDone logic before onComplete when interest questionnaire is shown', async () => {
      mockGetShouldShow.mockResolvedValue(true);

      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      fireEvent.press(
        screen.getByRole('button', {
          name: strings('privacy_policy.continue'),
        }),
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.ONBOARDING.INTEREST_QUESTIONNAIRE,
          expect.objectContaining({ onComplete: expect.any(Function) }),
        );
      });

      const navCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.ONBOARDING.INTEREST_QUESTIONNAIRE,
      );
      const onComplete = navCall?.[1]?.onComplete;
      mockSetWalletHomeOnboardingStepsEligibleAction.mockClear();
      mockDiscoverAccounts.mockClear();

      await onComplete();

      await waitFor(() => {
        expect(
          mockSetWalletHomeOnboardingStepsEligibleAction,
        ).toHaveBeenCalledWith(true, { skipInitialBalanceWait: true });
        expect(mockDiscoverAccounts).toHaveBeenCalledWith('mock-keyring-id');
        expect(mockOnContinue).toHaveBeenCalled();
      });
    });

    it('logs discoverAccounts failure without blocking navigation', async () => {
      mockGetShouldShow.mockResolvedValue(false);
      mockDiscoverAccounts.mockRejectedValueOnce(new Error('discovery failed'));

      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      fireEvent.press(
        screen.getByRole('button', {
          name: strings('privacy_policy.continue'),
        }),
      );

      await waitFor(() => {
        expect(mockOnContinue).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(Logger.error).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'discovery failed' }),
          'OptinMetrics: discoverAccounts failed',
        );
      });
    });
  });
});
