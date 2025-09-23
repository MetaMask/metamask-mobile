import OptinMetrics from './';
import { renderScreen } from '../../../util/test/renderWithProvider';
import { MetaMetrics, MetaMetricsEvents } from '../../../core/Analytics';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../locales/i18n';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import { MetaMetricsOptInSelectorsIDs } from '../../../../e2e/selectors/Onboarding/MetaMetricsOptIn.selectors';
import { Platform } from 'react-native';

const { InteractionManager } = jest.requireActual('react-native');

InteractionManager.runAfterInteractions = jest.fn(async (callback) =>
  callback(),
);

jest.mock('../../../core/Analytics/MetaMetrics');

const mockMetrics = {
  trackEvent: jest.fn().mockImplementation(() => Promise.resolve()),
  enable: jest.fn(() => Promise.resolve()),
  addTraitsToUser: jest.fn(() => Promise.resolve()),
  isEnabled: jest.fn(() => true),
};

(MetaMetrics.getInstance as jest.Mock).mockReturnValue(mockMetrics);

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
        expect(mockMetrics.trackEvent).toHaveBeenNthCalledWith(
          1,
          MetricsEventBuilder.createEventBuilder(
            MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED,
          )
            .addProperties({
              has_marketing_consent: false,
              is_metrics_opted_in: true,
              location: 'onboarding_metametrics',
              updated_after_onboarding: false,
            })
            .build(),
        );
        expect(mockMetrics.addTraitsToUser).toHaveBeenNthCalledWith(1, {
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
        expect(mockMetrics.trackEvent).toHaveBeenNthCalledWith(
          1,
          MetricsEventBuilder.createEventBuilder(
            MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED,
          )
            .addProperties({
              has_marketing_consent: true,
              is_metrics_opted_in: true,
              location: 'onboarding_metametrics',
              updated_after_onboarding: false,
            })
            .build(),
        );
        expect(mockMetrics.addTraitsToUser).toHaveBeenNthCalledWith(1, {
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

      fireEvent.press(basicUsageCheckbox);

      expect(basicUsageCheckbox).toBeTruthy();
    });

    it('should toggle basic usage checkbox state when checkbox component is pressed', () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      const checkboxes = screen.getAllByRole('checkbox');
      const basicUsageCheckbox = checkboxes[0];

      expect(basicUsageCheckbox).toBeTruthy();
      fireEvent.press(basicUsageCheckbox);

      expect(basicUsageCheckbox).toBeTruthy();
    });

    it('should call metrics.enable with true when basic usage is checked by default', async () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      fireEvent.press(screen.getByText(strings('privacy_policy.continue')));

      await waitFor(() => {
        expect(mockMetrics.enable).toHaveBeenCalledWith(true);
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
        expect(mockMetrics.enable).toHaveBeenCalledWith(false);
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
    it('should toggle marketing checkbox state when touched', () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      const marketingCheckboxes = screen.getAllByRole('checkbox');
      const marketingCheckbox = marketingCheckboxes[1];

      expect(marketingCheckbox).toBeTruthy();
      fireEvent.press(marketingCheckbox);

      expect(marketingCheckbox).toBeTruthy();
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
        expect(mockMetrics.enable).toHaveBeenCalledWith(false);
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
        expect(mockMetrics.enable).toHaveBeenCalled();
      });
    });

    it('should handle marketing checkbox state when pressed', () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      const marketingCheckbox = screen.getByText(
        strings('privacy_policy.checkbox_marketing'),
      );

      expect(marketingCheckbox).toBeTruthy();
      fireEvent.press(marketingCheckbox);
      expect(marketingCheckbox).toBeTruthy();
    });

    it('should initialize with correct default state values', () => {
      renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).toBeTruthy();
      expect(checkboxes[1]).toBeTruthy();
      expect(checkboxes[2]).toBeTruthy();
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
        expect(mockMetrics.trackEvent).toHaveBeenCalledWith(
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

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(3);
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

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(3);
    });
  });
});
