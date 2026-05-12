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

jest.mock('../../hooks/useAnalytics/useAnalytics');

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
  '../../Views/OnboardingInterestQuestionnaire/useOnboardingInterestQuestionnaireEligibility',
  () => ({
    useOnboardingInterestQuestionnaireEligibility: () => mockGetShouldShow,
  }),
);

jest.mock('../../../util/analytics/analytics', () => ({
  analytics: {
    isEnabled: jest.fn(() => true),
    trackEvent: jest.fn(),
    optIn: jest.fn().mockResolvedValue(undefined),
    optOut: jest.fn().mockResolvedValue(undefined),
    getAnalyticsId: jest.fn().mockResolvedValue('test-analytics-id'),
    identify: jest.fn(),
    trackView: jest.fn(),
    isOptedIn: jest.fn().mockResolvedValue(false),
  },
}));

jest.mock('../../../core/Analytics/MetaMetrics', () => ({
  MetaMetricsEvents: jest.requireActual('../../../core/Analytics/MetaMetrics')
    .MetaMetricsEvents,
  getInstance: jest.fn(() => ({
    createDataDeletionTask: jest.fn(),
    checkDataDeleteStatus: jest.fn(),
    getDeleteRegulationCreationDate: jest.fn(),
    getDeleteRegulationId: jest.fn(),
    isDataRecorded: jest.fn(),
    updateDataRecordingFlag: jest.fn(),
  })),
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

const mockNavigate = jest.fn();
const mockReset = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      reset: mockReset,
      setOptions: jest.fn(),
      goBack: jest.fn(),
      dispatch: jest.fn(),
    }),
    useRoute: () => ({
      key: 'OptinMetrics',
      name: 'OptinMetrics',
      params: undefined,
    }),
  };
});

const mockAnalytics = analytics as jest.Mocked<typeof analytics>;

describe('OptinMetrics — interest questionnaire navigation branching', () => {
  beforeEach(() => {
    mockOptinMetricsTestOnboardingSlice.events = [];
    mockOptinMetricsTestOnboardingSlice.accountType = undefined;
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
  });
});
