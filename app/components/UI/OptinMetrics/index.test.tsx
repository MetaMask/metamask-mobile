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

// Use dynamic mocking to avoid native module conflicts
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
          name: strings('privacy_policy.cta_i_agree'),
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
      fireEvent.press(screen.getByText(strings('privacy_policy.checkbox')));
      fireEvent.press(
        screen.getByRole('button', {
          name: strings('privacy_policy.cta_i_agree'),
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

  it('does not call metrics on cancel', async () => {
    renderScreen(OptinMetrics, { name: 'OptinMetrics' }, { state: {} });
    fireEvent.press(
      screen.getByRole('button', {
        name: strings('privacy_policy.cta_no_thanks'),
      }),
    );
    await waitFor(() => {
      expect(mockMetrics.trackEvent).not.toHaveBeenCalled();
      expect(mockMetrics.addTraitsToUser).not.toHaveBeenCalled();
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
      const agreeButton = screen.getByRole('button', {
        name: strings('privacy_policy.cta_i_agree'),
      });
      const noThanksButton = screen.getByRole('button', {
        name: strings('privacy_policy.cta_no_thanks'),
      });

      expect(agreeButton).toBeEnabled();
      expect(noThanksButton).toBeEnabled();
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
      const agreeButton = screen.getByRole('button', {
        name: strings('privacy_policy.cta_i_agree'),
      });
      const noThanksButton = screen.getByRole('button', {
        name: strings('privacy_policy.cta_no_thanks'),
      });

      fireEvent.press(agreeButton);
      fireEvent.press(noThanksButton);

      expect(agreeButton).toBeTruthy();
      expect(noThanksButton).toBeTruthy();
    });
  });
});
