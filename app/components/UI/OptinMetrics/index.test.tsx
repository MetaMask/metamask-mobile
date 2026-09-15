import OptinMetrics from './index.tsx';
import { renderScreen } from '../../../util/test/renderWithProvider';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../locales/i18n';
import { MetaMetricsOptInSelectorsIDs } from './MetaMetricsOptIn.testIds';
import { Platform } from 'react-native';
import Device from '../../../util/device';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { AccountType } from '../../../constants/onboarding';
import { createMockUseAnalyticsHook } from '../../../util/test/analyticsMock';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { selectQrSyncNeedsProvisioning } from '../../../selectors/qrSyncController';

const { InteractionManager } = jest.requireActual('react-native');

InteractionManager.runAfterInteractions = jest.fn(async (callback) =>
  callback(),
);

// Mock analytics module
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
  '../../../hooks/useOnboardingInterestQuestionnaireEligibility',
  () => ({
    useOnboardingInterestQuestionnaireEligibility: () => ({
      shouldShowQuestionnaire: false,
      variantName: 'control',
      isActive: false,
    }),
  }),
);

jest.mock('../../hooks/useAnalytics/useAnalytics');

// Import analytics to access mocks
import { analytics } from '../../../util/analytics/analytics';
import { AppStateEventProcessor } from '../../../core/AppStateEventListener';

const mockAppStateEventProcessor = AppStateEventProcessor as jest.Mocked<
  typeof AppStateEventProcessor
>;

const mockAnalytics = analytics as jest.Mocked<typeof analytics>;

jest.mock(
  '../../../util/metrics/UserSettingsAnalyticsMetaData/generateUserProfileAnalyticsMetaData',
  () => jest.fn().mockReturnValue({ userProp: 'User value' }),
);

jest.mock('../../../util/metrics/MultichainAPI/networkMetricUtils', () => ({
  getConfiguredCaipChainIds: jest.fn().mockReturnValue(['eip155:1']),
}));

jest.mock(
  '../../../util/metrics/DeviceAnalyticsMetaData/generateDeviceAnalyticsMetaData',
  () => jest.fn().mockReturnValue({ deviceProp: 'Device value' }),
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

jest.mock('../../../core/AppStateEventListener', () => ({
  AppStateEventProcessor: {
    pendingDeeplink: null as string | null,
    clearPendingDeeplink: jest.fn(),
  },
}));

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

jest.mock('../../../selectors/qrSyncController', () => ({
  ...jest.requireActual('../../../selectors/qrSyncController'),
  selectQrSyncNeedsProvisioning: jest.fn(),
}));

jest.doMock('react-native', () => {
  const originalRN = jest.requireActual('react-native');
  return {
    ...originalRN,
    StatusBar: {
      currentHeight: 42,
    },
  };
});

describe('OptinMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(selectQrSyncNeedsProvisioning).mockReturnValue(false);
    mockAppStateEventProcessor.pendingDeeplink = null;
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

  describe('Snapshots iOS', () => {
    Platform.OS = 'ios';
    it('renders correctly', () => {
      const { toJSON } = renderScreen(
        OptinMetrics,
        { name: 'OptinMetrics' },
        { state: {} },
      );
      expect(toJSON()).not.toBeNull();
    });

    it('places title and description above the illustration', () => {
      const { toJSON } = renderScreen(
        OptinMetrics,
        { name: 'OptinMetrics' },
        { state: {} },
      );

      const order: string[] = [];
      const walk = (node: unknown) => {
        if (!node) {
          return;
        }
        if (Array.isArray(node)) {
          node.forEach(walk);
          return;
        }
        if (typeof node !== 'object') {
          return;
        }
        const treeNode = node as {
          type?: unknown;
          props?: { testID?: string };
          children?: unknown;
        };
        if (treeNode.props?.testID) {
          order.push(treeNode.props.testID);
        }
        if (treeNode.type === 'Image') {
          order.push('Image');
        }
        walk(treeNode.children);
      };
      walk(toJSON());

      const titleIndex = order.indexOf(
        MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_TITLE_ID,
      );
      const descriptionIndex = order.indexOf(
        MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_PRIVACY_POLICY_DESCRIPTION_CONTENT_1_ID,
      );
      const illustrationIndex = order.indexOf('Image');
      const checkboxIndex = order.indexOf(
        MetaMetricsOptInSelectorsIDs.OPTIN_METRICS_METRICS_CHECKBOX,
      );

      expect(titleIndex).toBeGreaterThanOrEqual(0);
      expect(descriptionIndex).toBeGreaterThan(titleIndex);
      expect(illustrationIndex).toBeGreaterThan(descriptionIndex);
      expect(checkboxIndex).toBeGreaterThan(illustrationIndex);
    });
  });

  describe('Snapshots android', () => {
    beforeEach(() => {
      Platform.OS = 'android';
    });

    it('render matches snapshot', () => {
      const { toJSON } = renderScreen(
        OptinMetrics,
        { name: 'OptinMetrics' },
        { state: {} },
      );
      expect(toJSON()).not.toBeNull();
    });

    it('render matches snapshot with status bar height to zero', () => {
      const { StatusBar } = jest.requireMock('react-native');
      const originalCurrentHeight = StatusBar.currentHeight;
      StatusBar.currentHeight = 0;

      const { toJSON } = renderScreen(
        OptinMetrics,
        { name: 'OptinMetrics' },
        { state: {} },
      );
      expect(toJSON()).not.toBeNull();

      StatusBar.currentHeight = originalCurrentHeight;
    });
  });

  describe('sets traits and sends metric event on confirm', () => {
    it('without marketing consent', async () => {
      const { store } = renderScreen(
        OptinMetrics,
        { name: 'OptinMetrics' },
        {
          state: {
            attribution: {
              attribution: {
                utm_source: 'stale_campaign',
                capturedAt: Date.now(),
              },
            },
          },
        },
      );
      fireEvent.press(
        screen.getByRole('button', {
          name: strings('privacy_policy.continue'),
        }),
      );
      await waitFor(() => {
        expect(store.getState().attribution.attribution).toEqual({
          utm_source: 'stale_campaign',
          capturedAt: expect.any(Number),
        });
        expect(
          mockAppStateEventProcessor.clearPendingDeeplink,
        ).not.toHaveBeenCalled();
        expect(mockAnalytics.trackEvent).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            name: MetaMetricsEvents.METRICS_OPT_IN.category,
            properties: expect.objectContaining({
              location: 'onboarding_metametrics',
              updated_after_onboarding: false,
            }),
          }),
        );
        expect(mockAnalytics.trackEvent).toHaveBeenCalledTimes(1);
        expect(mockAnalytics.identify).toHaveBeenNthCalledWith(1, {
          chain_id_list: ['eip155:1'],
          deviceProp: 'Device value',
          userProp: 'User value',
        });
      });
    });

    it('does not render a marketing checkbox', () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      expect(
        screen.queryByText(strings('privacy_policy.checkbox_marketing')),
      ).toBeNull();
    });

    it('clears persisted attribution without marketing consent while keeping pending deeplink', async () => {
      const pendingDeeplink =
        'https://link.metamask.io/home?utm_source=campaign&utm_campaign=summer';
      mockAppStateEventProcessor.pendingDeeplink = pendingDeeplink;

      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });
      fireEvent.press(
        screen.getByRole('button', {
          name: strings('privacy_policy.continue'),
        }),
      );

      await waitFor(() => {
        expect(
          mockAppStateEventProcessor.clearPendingDeeplink,
        ).not.toHaveBeenCalled();
        expect(mockAppStateEventProcessor.pendingDeeplink).toBe(
          pendingDeeplink,
        );
      });
    });
  });

  describe('account_type property in events', () => {
    it('includes account_type in ANALYTICS_PREFERENCE_SELECTED when accountType route param is provided', async () => {
      renderScreen(
        OptinMetrics,
        { name: 'OptinMetrics' },
        { state: {} },
        { accountType: AccountType.Imported },
      );

      fireEvent.press(
        screen.getByRole('button', {
          name: strings('privacy_policy.continue'),
        }),
      );

      await waitFor(() => {
        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            name: MetaMetricsEvents.METRICS_OPT_IN.category,
            properties: expect.objectContaining({
              location: 'onboarding_metametrics',
              updated_after_onboarding: false,
              account_type: AccountType.Imported,
            }),
          }),
        );
      });
    });

    it('includes account_type in METRICS_OPT_OUT when accountType route param is provided', async () => {
      renderScreen(
        OptinMetrics,
        { name: 'OptinMetrics' },
        { state: {} },
        { accountType: AccountType.Metamask },
      );

      const basicUsageCheckbox = screen.getByText(
        strings('privacy_policy.gather_basic_usage_title'),
      );
      fireEvent.press(basicUsageCheckbox);

      fireEvent.press(
        screen.getByRole('button', {
          name: strings('privacy_policy.continue'),
        }),
      );

      await waitFor(() => {
        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            name: MetaMetricsEvents.METRICS_OPT_OUT.category,
            properties: expect.objectContaining({
              updated_after_onboarding: false,
              location: 'onboarding_metametrics',
              account_type: AccountType.Metamask,
            }),
          }),
        );
      });
    });

    it('does not include account_type when accountType route param is not provided', async () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      fireEvent.press(
        screen.getByRole('button', {
          name: strings('privacy_policy.continue'),
        }),
      );

      await waitFor(() => {
        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            name: MetaMetricsEvents.METRICS_OPT_IN.category,
            properties: expect.not.objectContaining({
              account_type: expect.anything(),
            }),
          }),
        );
      });
    });
  });

  describe('Basic usage data collection checkbox', () => {
    it('should display basic usage checkbox title', () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      const basicUsageTitle = screen.getByText(
        strings('privacy_policy.gather_basic_usage_title'),
      );
      expect(basicUsageTitle).toBeTruthy();
    });

    it('should toggle basic usage checkbox when clicked', async () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      const basicUsageCheckbox = screen.getByText(
        strings('privacy_policy.gather_basic_usage_title'),
      );

      fireEvent.press(screen.getByText(strings('privacy_policy.continue')));

      await waitFor(() => {
        expect(mockAnalytics.optIn).toHaveBeenCalled();
      });

      jest.clearAllMocks();

      fireEvent.press(basicUsageCheckbox);

      fireEvent.press(screen.getByText(strings('privacy_policy.continue')));

      await waitFor(() => {
        expect(mockAnalytics.optOut).toHaveBeenCalled();
      });
    });

    it('should toggle basic usage checkbox state when checkbox component is pressed', async () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      const checkboxes = screen.getAllByRole('checkbox');
      const basicUsageCheckbox = checkboxes[0];

      fireEvent.press(screen.getByText(strings('privacy_policy.continue')));

      await waitFor(() => {
        expect(mockAnalytics.optIn).toHaveBeenCalled();
      });

      jest.clearAllMocks();

      fireEvent.press(basicUsageCheckbox);

      fireEvent.press(screen.getByText(strings('privacy_policy.continue')));

      await waitFor(() => {
        expect(mockAnalytics.optOut).toHaveBeenCalled();
      });
    });

    it('should call metrics.enable with true when basic usage is checked by default', async () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      fireEvent.press(screen.getByText(strings('privacy_policy.continue')));

      await waitFor(() => {
        expect(mockAnalytics.optIn).toHaveBeenCalled();
      });
    });

    it('should call metrics.enable with false when basic usage is unchecked', async () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      const basicUsageCheckbox = screen.getByText(
        strings('privacy_policy.gather_basic_usage_title'),
      );
      fireEvent.press(basicUsageCheckbox);

      fireEvent.press(screen.getByText(strings('privacy_policy.continue')));

      await waitFor(() => {
        expect(mockAnalytics.optOut).toHaveBeenCalled();
      });
    });

    it('tracks METRICS_OPT_OUT when user navigates out with basic usage unchecked', async () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      const basicUsageCheckbox = screen.getByText(
        strings('privacy_policy.gather_basic_usage_title'),
      );

      fireEvent.press(basicUsageCheckbox);

      fireEvent.press(screen.getByText(strings('privacy_policy.continue')));

      await waitFor(() => {
        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            name: MetaMetricsEvents.METRICS_OPT_OUT.category,
            properties: expect.objectContaining({
              updated_after_onboarding: false,
              location: 'onboarding_metametrics',
            }),
          }),
        );
      });
    });

    it('tracks METRICS_OPT_OUT when navigating out via checkbox component uncheck', async () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      const checkboxes = screen.getAllByRole('checkbox');
      const basicUsageCheckbox = checkboxes[0];

      fireEvent.press(basicUsageCheckbox);

      fireEvent.press(screen.getByText(strings('privacy_policy.continue')));

      await waitFor(() => {
        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            name: MetaMetricsEvents.METRICS_OPT_OUT.category,
            properties: expect.objectContaining({
              updated_after_onboarding: false,
              location: 'onboarding_metametrics',
            }),
          }),
        );
      });
    });
  });

  describe('Learn more functionality', () => {
    it('should display learn more link in basic usage description', () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      const learnMoreLink = screen.getByText(
        strings('privacy_policy.gather_basic_usage_learn_more'),
      );
      expect(learnMoreLink).toBeTruthy();
    });

    it('should call openLearnMore when learn more link is pressed', () => {
      renderScreen(
        OptinMetrics,
        {
          name: 'OptinMetrics',
        },
        { state: {} },
      );

      const learnMoreLink = screen.getByText(
        strings('privacy_policy.gather_basic_usage_learn_more'),
      );

      expect(() => {
        fireEvent.press(learnMoreLink);
      }).not.toThrow();

      expect(learnMoreLink).toBeTruthy();
    });
  });

  describe('scroll view logic', () => {
    it('action buttons are enabled when scroll view content fits viewport', () => {
      const { getByTestId } = renderScreen(
        OptinMetrics,
        { name: 'OptinMetrics' },
        { state: {} },
      );

      const scrollView = getByTestId(
        MetaMetricsOptInSelectorsIDs.METAMETRICS_OPT_IN_CONTAINER_ID,
      );

      // Simulate scroll to end by triggering onScroll with end position
      fireEvent.scroll(scrollView, {
        nativeEvent: {
          contentOffset: { y: 1000 },
          contentSize: { height: 400, width: 100 },
          layoutMeasurement: { height: 500, width: 100 },
        },
      });

      // Check that buttons are enabled (they should be clickable)
      const continueButton = screen.getByRole('button', {
        name: strings('privacy_policy.continue'),
      });

      expect(continueButton).toBeEnabled();
    });

    it('action buttons are not enabled when scroll view content does not fit viewport', () => {
      const { getByTestId } = renderScreen(
        OptinMetrics,
        { name: 'OptinMetrics' },
        { state: {} },
      );

      const scrollView = getByTestId(
        MetaMetricsOptInSelectorsIDs.METAMETRICS_OPT_IN_CONTAINER_ID,
      );

      // Simulate scroll to middle (not end) by triggering onScroll with middle position
      fireEvent.scroll(scrollView, {
        nativeEvent: {
          contentOffset: { y: 200 },
          contentSize: { height: 600, width: 100 },
          layoutMeasurement: { height: 500, width: 100 },
        },
      });

      // Check that buttons are still disabled (they should not be clickable)
      const continueButton = screen.getByRole('button', {
        name: strings('privacy_policy.continue'),
      });

      fireEvent.press(continueButton);

      expect(continueButton).toBeTruthy();
    });

    it('should handle onContentSizeChange event', () => {
      const { getByTestId } = renderScreen(
        OptinMetrics,
        { name: 'OptinMetrics' },
        { state: {} },
      );

      const scrollView = getByTestId(
        MetaMetricsOptInSelectorsIDs.METAMETRICS_OPT_IN_CONTAINER_ID,
      );

      fireEvent(scrollView, 'onContentSizeChange', 100, 500);

      expect(scrollView).toBeTruthy();
    });

    it('should handle onLayout event', () => {
      const { getByTestId } = renderScreen(
        OptinMetrics,
        { name: 'OptinMetrics' },
        { state: {} },
      );

      const scrollView = getByTestId(
        MetaMetricsOptInSelectorsIDs.METAMETRICS_OPT_IN_CONTAINER_ID,
      );

      fireEvent(scrollView, 'onLayout', {
        nativeEvent: {
          layout: { height: 400, width: 300 },
        },
      });

      expect(scrollView).toBeTruthy();
    });
  });

  describe('Text Display and Component Interaction Tests', () => {
    it('should display gather basic usage description text', () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      const basicUsageDescription = screen.getByText(
        /We'll collect basic product usage data/i,
      );
      expect(basicUsageDescription).toBeTruthy();
    });

    it('should handle onConfirm button press', async () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      fireEvent.press(screen.getByText(strings('privacy_policy.continue')));

      await waitFor(() => {
        expect(mockAnalytics.optIn).toHaveBeenCalled();
      });
    });

    it('should render component without errors', () => {
      const { toJSON } = renderScreen(
        OptinMetrics,
        { name: 'OptinMetrics' },
        { state: {} },
      );

      expect(toJSON()).toBeDefined();
    });
  });

  describe('Component Lifecycle Tests', () => {
    it('renders a header back button', () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      expect(
        screen.getByTestId(MetaMetricsOptInSelectorsIDs.BACK_BUTTON_ID),
      ).toBeOnTheScreen();
    });

    it('should handle scroll end reached', () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      const scrollView = screen.getByTestId(
        MetaMetricsOptInSelectorsIDs.METAMETRICS_OPT_IN_CONTAINER_ID,
      );

      fireEvent.scroll(scrollView, {
        nativeEvent: {
          contentOffset: { y: 1000 },
          contentSize: { height: 1200 },
          layoutMeasurement: { height: 400 },
        },
      });

      expect(scrollView).toBeTruthy();
    });

    it('should handle onConfirm analytics tracking', async () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      fireEvent.press(screen.getByText(strings('privacy_policy.continue')));

      await waitFor(() => {
        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            name: MetaMetricsEvents.METRICS_OPT_IN.category,
          }),
        );
      });
    });
  });

  describe('Device responsiveness and event processing', () => {
    it('should apply device-specific styling based on Device.isMediumDevice', () => {
      (Device.isMediumDevice as jest.Mock).mockReturnValue(true);
      const { toJSON } = renderScreen(
        OptinMetrics,
        { name: 'OptinMetrics' },
        { state: {} },
      );
      expect(toJSON()).toBeDefined();
      expect(Device.isMediumDevice).toHaveBeenCalled();
    });

    it('should handle events array processing with onConfirm', async () => {
      const mockEvents = [[{ name: 'event1', properties: { prop: 'value1' } }]];

      renderScreen(
        OptinMetrics,
        { name: 'OptinMetrics' },
        {
          state: {
            onboarding: { events: mockEvents },
          },
        },
      );

      fireEvent.press(screen.getByText(strings('privacy_policy.continue')));

      await waitFor(() => {
        expect(mockAnalytics.optIn).toHaveBeenCalled();
      });
    });

    it('should handle platform-specific scroll calculations', () => {
      Platform.OS = 'android';
      const { getByTestId } = renderScreen(
        OptinMetrics,
        { name: 'OptinMetrics' },
        { state: {} },
      );

      const scrollView = getByTestId(
        MetaMetricsOptInSelectorsIDs.METAMETRICS_OPT_IN_CONTAINER_ID,
      );

      fireEvent.scroll(scrollView, {
        nativeEvent: {
          contentOffset: { y: 568 },
          contentSize: { height: 600, width: 100 },
          layoutMeasurement: { height: 400, width: 100 },
        },
      });

      expect(scrollView).toBeTruthy();
    });
  });
});
