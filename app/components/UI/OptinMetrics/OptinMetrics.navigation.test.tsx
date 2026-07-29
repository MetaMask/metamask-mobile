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
import { selectQrSyncNeedsProvisioning } from '../../../selectors/qrSyncController';

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

const mockEligibility = {
  shouldShowQuestionnaire: true,
  variantName: 'treatment',
  isActive: true,
};
jest.mock(
  '../../../hooks/useOnboardingInterestQuestionnaireEligibility',
  () => ({
    useOnboardingInterestQuestionnaireEligibility: () => mockEligibility,
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

const mockProvisionFromMetadata = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../core/Engine/Engine', () => ({
  context: {
    KeyringController: {
      state: {
        keyrings: [{ metadata: { id: 'mock-keyring-id' } }],
      },
    },
    QrSyncProvisioningService: {
      provisionFromMetadata: (...args: unknown[]) =>
        mockProvisionFromMetadata(...args),
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

jest.mock('../../../selectors/qrSyncController', () => ({
  ...jest.requireActual('../../../selectors/qrSyncController'),
  selectQrSyncNeedsProvisioning: jest.fn(),
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
    mockEligibility.shouldShowQuestionnaire = true;
    mockEligibility.variantName = 'treatment';
    mockEligibility.isActive = true;
    jest.clearAllMocks();
    jest.mocked(selectQrSyncNeedsProvisioning).mockReturnValue(false);
    mockProvisionFromMetadata.mockResolvedValue(undefined);
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
      mockEligibility.shouldShowQuestionnaire = true;

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

  describe('when basic usage data is checked and AB test assigns treatment', () => {
    it('navigates to the interest questionnaire', async () => {
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
  });

  describe('when basic usage data is checked and AB test assigns control', () => {
    it('skips the interest questionnaire and continues navigation', async () => {
      mockEligibility.shouldShowQuestionnaire = false;
      mockEligibility.variantName = 'control';
      mockEligibility.isActive = false;

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
      });
    });
  });

  describe('interest questionnaire navigation params', () => {
    it('navigates to the interest questionnaire with onComplete callback', async () => {
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

    it('navigates to interest questionnaire then dispatches setWalletHomeOnboardingStepsEligible on onComplete', async () => {
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

      await onComplete();

      await waitFor(() => {
        expect(
          mockSetWalletHomeOnboardingStepsEligibleAction,
        ).toHaveBeenCalledWith(true, { skipInitialBalanceWait: true });
      });
    });

    it('calls discoverAccounts via onComplete when successFlow is IMPORT_FROM_SEED_PHRASE', async () => {
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

      await onComplete();

      await waitFor(() => {
        expect(mockDiscoverAccounts).toHaveBeenCalledWith('mock-keyring-id');
      });
      expect(mockProvisionFromMetadata).not.toHaveBeenCalled();
    });

    it('calls provisionFromMetadata instead of discoverAccounts for QR sync users via onComplete', async () => {
      jest.mocked(selectQrSyncNeedsProvisioning).mockReturnValue(true);

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

      await onComplete();

      await waitFor(() => {
        expect(mockProvisionFromMetadata).toHaveBeenCalledTimes(1);
      });
      expect(mockDiscoverAccounts).not.toHaveBeenCalled();
    });

    it('logs provisionFromMetadata failure without blocking navigation via onComplete', async () => {
      jest.mocked(selectQrSyncNeedsProvisioning).mockReturnValue(true);
      mockProvisionFromMetadata.mockRejectedValueOnce(
        new Error('provisioning failed'),
      );

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

      await onComplete();

      await waitFor(() => {
        expect(mockOnContinue).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(Logger.error).toHaveBeenCalledWith(
          expect.objectContaining({ message: 'provisioning failed' }),
          expect.objectContaining({
            tags: expect.objectContaining({
              feature: 'qr-sync',
              surface: 'import',
              operation: 'provision_from_metadata',
              source: 'finalizeOnboardingCompletion',
              syncFlow: 'new_user',
            }),
          }),
        );
      });
    });

    it('calls onContinue via onComplete after running handleOnDone logic', async () => {
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

      await onComplete();

      await waitFor(() => {
        expect(mockOnContinue).toHaveBeenCalled();
      });
    });

    it('logs discoverAccounts failure without blocking navigation via onComplete', async () => {
      mockDiscoverAccounts.mockRejectedValueOnce(new Error('discovery failed'));

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

      await onComplete();

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
