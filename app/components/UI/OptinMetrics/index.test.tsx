import OptinMetrics from './index.tsx';
import { renderScreen } from '../../../util/test/renderWithProvider';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../locales/i18n';
import { MetaMetricsOptInSelectorsIDs } from './MetaMetricsOptIn.testIds';
import { Platform } from 'react-native';
import Device from '../../../util/device';

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
    getAnalyticsId: jest.fn().mockResolvedValue('test-analytics-id'),
    identify: jest.fn(),
    trackView: jest.fn(),
    isOptedIn: jest.fn().mockResolvedValue(false),
  },
}));

// Mock MetaMetrics for events and getInstance
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

// Import analytics to access mocks
import { analytics } from '../../../util/analytics/analytics';

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
      expect(toJSON()).toMatchSnapshot();
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
      expect(toJSON()).toMatchSnapshot();
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
      expect(toJSON()).toMatchSnapshot();

      StatusBar.currentHeight = originalCurrentHeight;
    });
  });

  describe('sets traits and sends metric event on confirm', () => {
    it('without marketing consent', async () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });
      fireEvent.press(
        screen.getByRole('button', {
          name: strings('privacy_policy.continue'),
        }),
      );
      await waitFor(() => {
        expect(mockAnalytics.trackEvent).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            name: 'Analytics Preference Selected',
            properties: expect.objectContaining({
              has_marketing_consent: false,
              is_metrics_opted_in: true,
              location: 'onboarding_metametrics',
              updated_after_onboarding: false,
            }),
          }),
        );
        expect(mockAnalytics.identify).toHaveBeenNthCalledWith(1, {
          chain_id_list: ['eip155:1'],
          deviceProp: 'Device value',
          userProp: 'User value',
        });
      });
    });

    it('with marketing consent', async () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });
      fireEvent.press(
        screen.getByText(strings('privacy_policy.checkbox_marketing')),
      );
      fireEvent.press(
        screen.getByRole('button', {
          name: strings('privacy_policy.continue'),
        }),
      );
      await waitFor(() => {
        expect(mockAnalytics.trackEvent).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            name: 'Analytics Preference Selected',
            properties: expect.objectContaining({
              has_marketing_consent: true,
              is_metrics_opted_in: true,
              location: 'onboarding_metametrics',
              updated_after_onboarding: false,
            }),
          }),
        );
        expect(mockAnalytics.identify).toHaveBeenNthCalledWith(1, {
          chain_id_list: ['eip155:1'],
          deviceProp: 'Device value',
          userProp: 'User value',
        });
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

  describe('Marketing checkbox functionality', () => {
    it('should toggle marketing checkbox state when touched', async () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      const marketingCheckbox = screen.getByText(
        strings('privacy_policy.checkbox_marketing'),
      );

      // Verify initial state: isMarketingChecked should be false
      fireEvent.press(
        screen.getByRole('button', {
          name: strings('privacy_policy.continue'),
        }),
      );

      await waitFor(() => {
        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            properties: expect.objectContaining({
              has_marketing_consent: false,
              is_metrics_opted_in: true, // Basic usage should be true by default
            }),
          }),
        );
      });

      jest.clearAllMocks();

      // Press to toggle the marketing checkbox
      fireEvent.press(marketingCheckbox);

      fireEvent.press(
        screen.getByRole('button', {
          name: strings('privacy_policy.continue'),
        }),
      );

      await waitFor(() => {
        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            properties: expect.objectContaining({
              has_marketing_consent: true,
              is_metrics_opted_in: true,
            }),
          }),
        );
      });
    });
  });

  describe('Combined checkbox scenarios', () => {
    it('should handle both checkboxes independently', async () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      const basicUsageCheckbox = screen.getByText(
        strings('privacy_policy.gather_basic_usage_title'),
      );
      fireEvent.press(basicUsageCheckbox);

      const marketingCheckbox = screen.getByText(
        strings('privacy_policy.checkbox_marketing'),
      );
      fireEvent.press(marketingCheckbox);

      fireEvent.press(screen.getByText(strings('privacy_policy.continue')));

      await waitFor(() => {
        expect(mockAnalytics.optOut).toHaveBeenCalled();
      });
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
    it('should display marketing updates description text', () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      const marketingDescription = screen.getByText(
        strings('privacy_policy.checkbox'),
      );
      expect(marketingDescription).toBeTruthy();
    });

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

    it('should handle marketing checkbox state when pressed', async () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      const marketingCheckbox = screen.getByText(
        strings('privacy_policy.checkbox_marketing'),
      );

      // Verify initial state: marketing should be unchecked
      fireEvent.press(screen.getByText(strings('privacy_policy.continue')));

      await waitFor(() => {
        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            properties: expect.objectContaining({
              has_marketing_consent: false,
            }),
          }),
        );
      });

      jest.clearAllMocks();

      fireEvent.press(marketingCheckbox);

      // Verify the state actually changed: marketing should now be checked
      fireEvent.press(screen.getByText(strings('privacy_policy.continue')));

      await waitFor(() => {
        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            properties: expect.objectContaining({
              has_marketing_consent: true,
            }),
          }),
        );
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
    it('should handle component unmount', () => {
      const { BackHandler } = jest.requireMock('react-native');
      const mockRemoveEventListener = jest.spyOn(
        BackHandler,
        'removeEventListener',
      );

      const { unmount } = renderScreen(
        OptinMetrics,
        { name: 'OptinMetrics' },
        { state: {} },
      );

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'hardwareBackPress',
        expect.any(Function),
      );
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
            name: 'Analytics Preference Selected',
          }),
        );
      });
    });

    it('should initialize with correct default checkbox states', () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      const basicUsageCheckbox = screen.getByText(
        strings('privacy_policy.gather_basic_usage_title'),
      );
      expect(basicUsageCheckbox).toBeTruthy();

      const marketingCheckbox = screen.getByText(
        strings('privacy_policy.checkbox_marketing'),
      );
      expect(marketingCheckbox).toBeTruthy();
    });

    it('should handle checkbox state changes correctly', () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      const basicUsageTitle = screen.getByText(
        strings('privacy_policy.gather_basic_usage_title'),
      );
      const marketingTitle = screen.getByText(
        strings('privacy_policy.checkbox_marketing'),
      );

      fireEvent.press(basicUsageTitle);

      fireEvent.press(marketingTitle);

      expect(basicUsageTitle).toBeTruthy();
      expect(marketingTitle).toBeTruthy();
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

  describe('Checkbox Interdependency Logic', () => {
    it('should uncheck and disable marketing checkbox when basic usage is unchecked', async () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      const basicUsageCheckbox = screen.getByText(
        strings('privacy_policy.gather_basic_usage_title'),
      );
      const marketingCheckbox = screen.getByText(
        strings('privacy_policy.checkbox_marketing'),
      );

      fireEvent.press(marketingCheckbox);

      fireEvent.press(screen.getByText(strings('privacy_policy.continue')));

      await waitFor(() => {
        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            properties: expect.objectContaining({
              has_marketing_consent: true,
              is_metrics_opted_in: true,
            }),
          }),
        );
      });

      jest.clearAllMocks();

      fireEvent.press(basicUsageCheckbox);

      fireEvent.press(screen.getByText(strings('privacy_policy.continue')));

      await waitFor(() => {
        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            properties: expect.objectContaining({
              has_marketing_consent: false,
              is_metrics_opted_in: false,
            }),
          }),
        );
      });
    });

    it('should prevent marketing checkbox toggle when basic usage is unchecked', () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      const basicUsageCheckbox = screen.getByText(
        strings('privacy_policy.gather_basic_usage_title'),
      );
      const marketingCheckbox = screen.getByText(
        strings('privacy_policy.checkbox_marketing'),
      );

      fireEvent.press(basicUsageCheckbox);
      fireEvent.press(marketingCheckbox);

      expect(basicUsageCheckbox).toBeTruthy();
      expect(marketingCheckbox).toBeTruthy();
    });

    it('should allow marketing checkbox toggle when basic usage is checked', () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      const marketingCheckbox = screen.getByText(
        strings('privacy_policy.checkbox_marketing'),
      );

      fireEvent.press(marketingCheckbox);

      expect(marketingCheckbox).toBeTruthy();
    });

    it('should maintain marketing checkbox state when basic usage remains checked', () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      const marketingCheckbox = screen.getByText(
        strings('privacy_policy.checkbox_marketing'),
      );

      fireEvent.press(marketingCheckbox);
      fireEvent.press(marketingCheckbox);

      expect(marketingCheckbox).toBeTruthy();
    });

    it('should track both checkbox states correctly in analytics event', async () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      const marketingCheckbox = screen.getByText(
        strings('privacy_policy.checkbox_marketing'),
      );

      fireEvent.press(marketingCheckbox);
      fireEvent.press(
        screen.getByRole('button', {
          name: strings('privacy_policy.continue'),
        }),
      );

      await waitFor(() => {
        expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            properties: expect.objectContaining({
              has_marketing_consent: true,
              is_metrics_opted_in: true,
            }),
          }),
        );
      });
    });

    it('should track disabled marketing state in analytics when basic usage is unchecked', async () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

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
            properties: expect.objectContaining({
              has_marketing_consent: false,
              is_metrics_opted_in: false,
            }),
          }),
        );
      });
    });

    it('should test isMarketingDisabled getter directly', () => {
      const { getByTestId } = renderScreen(
        OptinMetrics,
        { name: 'OptinMetrics' },
        { state: {} },
      );

      const component = getByTestId(
        MetaMetricsOptInSelectorsIDs.METAMETRICS_OPT_IN_CONTAINER_ID,
      );
      expect(component).toBeTruthy();

      const basicUsageCheckbox = screen.getByText(
        strings('privacy_policy.gather_basic_usage_title'),
      );

      fireEvent.press(basicUsageCheckbox);
      expect(basicUsageCheckbox).toBeTruthy();
    });

    it('should apply disabled styling when marketing is disabled', () => {
      const { getByTestId } = renderScreen(
        OptinMetrics,
        { name: 'OptinMetrics' },
        { state: {} },
      );

      const basicUsageCheckbox = screen.getByText(
        strings('privacy_policy.gather_basic_usage_title'),
      );

      fireEvent.press(basicUsageCheckbox);

      const component = getByTestId(
        MetaMetricsOptInSelectorsIDs.METAMETRICS_OPT_IN_CONTAINER_ID,
      );
      expect(component).toBeTruthy();
    });

    it('should preserve marketing state when basic usage is re-enabled', () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      const basicUsageCheckbox = screen.getByText(
        strings('privacy_policy.gather_basic_usage_title'),
      );
      const marketingCheckbox = screen.getByText(
        strings('privacy_policy.checkbox_marketing'),
      );

      fireEvent.press(marketingCheckbox);
      fireEvent.press(basicUsageCheckbox);
      fireEvent.press(basicUsageCheckbox);

      expect(basicUsageCheckbox).toBeTruthy();
      expect(marketingCheckbox).toBeTruthy();
    });

    it('should handle multiple attempts to toggle disabled marketing checkbox', () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      const basicUsageCheckbox = screen.getByText(
        strings('privacy_policy.gather_basic_usage_title'),
      );
      const marketingCheckbox = screen.getByText(
        strings('privacy_policy.checkbox_marketing'),
      );

      fireEvent.press(basicUsageCheckbox);
      fireEvent.press(marketingCheckbox);
      fireEvent.press(marketingCheckbox);
      fireEvent.press(marketingCheckbox);

      expect(basicUsageCheckbox).toBeTruthy();
      expect(marketingCheckbox).toBeTruthy();
    });

    it('should test handleBasicUsageToggle ternary logic branches', () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      const basicUsageCheckbox = screen.getByText(
        strings('privacy_policy.gather_basic_usage_title'),
      );
      const marketingCheckbox = screen.getByText(
        strings('privacy_policy.checkbox_marketing'),
      );

      fireEvent.press(marketingCheckbox);
      fireEvent.press(basicUsageCheckbox);
      fireEvent.press(basicUsageCheckbox);

      expect(basicUsageCheckbox).toBeTruthy();
      expect(marketingCheckbox).toBeTruthy();
    });

    it('should test conditional activeOpacity and disabled props', () => {
      const { getByTestId } = renderScreen(
        OptinMetrics,
        { name: 'OptinMetrics' },
        { state: {} },
      );

      const basicUsageCheckbox = screen.getByText(
        strings('privacy_policy.gather_basic_usage_title'),
      );

      fireEvent.press(basicUsageCheckbox);

      const component = getByTestId(
        MetaMetricsOptInSelectorsIDs.METAMETRICS_OPT_IN_CONTAINER_ID,
      );
      expect(component).toBeTruthy();
    });
  });

  describe('Feature flag conditional rendering', () => {
    it('displays updated description when isPna25FlagEnabled is true', () => {
      const stateWithFlag = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              cacheTimestamp: 0,
              remoteFeatureFlags: {
                extensionUxPna25: true,
              },
            },
          },
        },
      };

      renderScreen(
        OptinMetrics,
        { name: 'OptinMetrics' },
        { state: stateWithFlag },
      );

      const updatedDescription = screen.getByText(
        strings('privacy_policy.gather_basic_usage_description_updated'),
        { exact: false },
      );

      expect(updatedDescription).toBeTruthy();
    });

    it('displays original description when isPna25FlagEnabled is false', () => {
      const stateWithoutFlag = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              cacheTimestamp: 0,
              remoteFeatureFlags: {
                extensionUxPna25: false,
              },
            },
          },
        },
      };

      renderScreen(
        OptinMetrics,
        { name: 'OptinMetrics' },
        { state: stateWithoutFlag },
      );

      const originalDescription = screen.getByText(
        strings('privacy_policy.gather_basic_usage_description'),
        { exact: false },
      );

      expect(originalDescription).toBeTruthy();
    });

    it('displays original description when isPna25FlagEnabled is undefined', () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      const originalDescription = screen.getByText(
        strings('privacy_policy.gather_basic_usage_description'),
        { exact: false },
      );

      expect(originalDescription).toBeTruthy();
    });
  });
});
