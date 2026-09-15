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
import { ONBOARDING_SUCCESS_FLOW } from '../../../constants/onboarding';
import { selectQrSyncNeedsProvisioning } from '../../../selectors/qrSyncController';
import { MetaMetricsOptInSelectorsIDs } from './MetaMetricsOptIn.testIds';

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

jest.mock(
  '../../../hooks/useOnboardingInterestQuestionnaireEligibility',
  () => ({
    useOnboardingInterestQuestionnaireEligibility: () => ({
      shouldShowQuestionnaire: true,
      variantName: 'treatment',
      isActive: true,
    }),
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
    QrSyncProvisioningService: {
      provisionFromMetadata: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

jest.mock('../../../util/metrics/metricsOptInUIUtils', () => ({
  markMetricsOptInUISeen: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../selectors/qrSyncController', () => ({
  ...jest.requireActual('../../../selectors/qrSyncController'),
  selectQrSyncNeedsProvisioning: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockGoBack = jest.fn();

let mockRouteParams: Record<string, unknown> | undefined;

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      reset: mockReset,
      setOptions: jest.fn(),
      goBack: mockGoBack,
      dispatch: jest.fn(),
    }),
    useRoute: () => ({
      key: 'OptinMetrics',
      name: 'OptinMetrics',
      params: mockRouteParams,
    }),
  };
});

const mockAnalytics = analytics as jest.Mocked<typeof analytics>;

describe('OptinMetrics — marketing consent navigation branching', () => {
  beforeEach(() => {
    mockOptinMetricsTestOnboardingSlice.events = [];
    mockOptinMetricsTestOnboardingSlice.accountType = undefined;
    mockRouteParams = undefined;
    jest.clearAllMocks();
    jest.mocked(selectQrSyncNeedsProvisioning).mockReturnValue(false);
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

  it('does not navigate to marketing consent when basic usage is unchecked', async () => {
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
        Routes.ONBOARDING.MARKETING_CONSENT,
        expect.anything(),
      );
    });
  });

  it('navigates to marketing consent when basic usage is checked', async () => {
    renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

    fireEvent.press(
      screen.getByRole('button', {
        name: strings('privacy_policy.continue'),
      }),
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.ONBOARDING.MARKETING_CONSENT,
        expect.objectContaining({
          kind: 'srp',
        }),
      );
    });
  });

  it('forwards successFlow and accountType to marketing consent', async () => {
    mockRouteParams = {
      successFlow: ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE,
      accountType: 'imported',
    };

    renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

    fireEvent.press(
      screen.getByRole('button', {
        name: strings('privacy_policy.continue'),
      }),
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.ONBOARDING.MARKETING_CONSENT,
        expect.objectContaining({
          kind: 'srp',
          successFlow: ONBOARDING_SUCCESS_FLOW.IMPORT_FROM_SEED_PHRASE,
          accountType: 'imported',
        }),
      );
    });
  });

  it('navigates to the previous screen when the back button is pressed', () => {
    renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

    fireEvent.press(
      screen.getByTestId(MetaMetricsOptInSelectorsIDs.BACK_BUTTON_ID),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
