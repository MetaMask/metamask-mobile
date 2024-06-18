import OptinMetrics from './';
import { renderScreen } from '../../../util/test/renderWithProvider';
import { MetaMetrics, MetaMetricsEvents } from '../../../core/Analytics';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../locales/i18n';

const { InteractionManager } = jest.requireActual('react-native');

InteractionManager.runAfterInteractions = jest.fn(async (callback) =>
  callback(),
);

jest.mock('../../../core/Analytics/MetaMetrics');

const mockMetrics = {
  trackEvent: jest.fn().mockImplementation(() => Promise.resolve()),
  trackAnonymousEvent: jest.fn(),
  enable: jest.fn(() => Promise.resolve()),
  addTraitsToUser: jest.fn(() => Promise.resolve()),
  isEnabled: jest.fn(() => true),
};

(MetaMetrics.getInstance as jest.Mock).mockReturnValue(mockMetrics);

jest.mock(
  '../../../util/metrics/UserSettingsAnalyticsMetaData/generateUserProfileAnalyticsMetaData',
  () => jest.fn().mockReturnValue({ userProp: 'User value' }),
);

jest.mock(
  '../../../util/metrics/DeviceAnalyticsMetaData/generateDeviceAnalyticsMetaData',
  () => jest.fn().mockReturnValue({ deviceProp: 'Device value' }),
);

jest.mock('../../../reducers/legalNotices', () => ({
  isPastPrivacyPolicyDate: jest.fn().mockReturnValue(true),
}));

describe('OptinMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderScreen(
      OptinMetrics,
      { name: 'OptinMetrics' },
      { state: {} },
    );
    expect(toJSON()).toMatchSnapshot();
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
          MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED,
          {
            is_metrics_opted_in: true,
            location: 'onboarding_metametrics',
            updated_after_onboarding: false,
          },
          true,
        );
        expect(mockMetrics.addTraitsToUser).toHaveBeenNthCalledWith(1, {
          deviceProp: 'Device value',
          userProp: 'User value',
          is_metrics_opted_in: true,
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
          MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED,
          {
            has_marketing_consent: true,
            is_metrics_opted_in: true,
            location: 'onboarding_metametrics',
            updated_after_onboarding: false,
          },
          true,
        );
        expect(mockMetrics.addTraitsToUser).toHaveBeenNthCalledWith(1, {
          deviceProp: 'Device value',
          userProp: 'User value',
          is_metrics_opted_in: true,
          has_marketing_consent: true,
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
});
