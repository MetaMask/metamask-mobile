import { renderScreen } from '../../../../../../util/test/renderWithProvider';

import initialBackgroundState from '../../../../../../util/test/initial-background-state.json';

import MetaMetricsAndDataCollectionSection from './MetaMetricsAndDataCollectionSection';
import { SecurityPrivacyViewSelectorsIDs } from '../../../../../../../e2e/selectors/Settings/SecurityAndPrivacy/SecurityPrivacyView.selectors';
import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  MetaMetrics,
  MetaMetricsEvents,
} from '../../../../../../core/Analytics';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';

const { InteractionManager, Alert, Linking } =
  jest.requireActual('react-native');

InteractionManager.runAfterInteractions = jest.fn(async (callback) =>
  callback(),
);

const mockAlert = jest.fn();
Alert.alert = mockAlert;

const mockLinking = jest.fn();
Linking.openURL = mockLinking;

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../../../../../core/Analytics/MetaMetrics');

const mockMetrics = {
  trackEvent: jest.fn(),
  trackAnonymousEvent: jest.fn(),
  enable: jest.fn(() => Promise.resolve()),
  addTraitsToUser: jest.fn(() => Promise.resolve()),
  isEnabled: jest.fn(() => false),
};

(MetaMetrics.getInstance as jest.Mock).mockReturnValue(mockMetrics);

jest.mock(
  '../../../../../../util/metrics/UserSettingsAnalyticsMetaData/generateUserProfileAnalyticsMetaData',
  () => jest.fn().mockReturnValue({ userProp: 'User value' }),
);

jest.mock(
  '../../../../../../util/metrics/DeviceAnalyticsMetaData/generateDeviceAnalyticsMetaData',
  () => jest.fn().mockReturnValue({ deviceProp: 'Device value' }),
);

const initialStateMarketingTrue = {
  engine: {
    backgroundState: initialBackgroundState,
  },
  security: {
    dataCollectionForMarketing: true,
  },
};

const initialStateMarketingFalse = {
  engine: {
    backgroundState: initialBackgroundState,
  },
  security: {
    dataCollectionForMarketing: false,
  },
};

describe('MetaMetricsAndDataCollectionSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderScreen(
      MetaMetricsAndDataCollectionSection,
      { name: 'MetaMetricsAndDataCollectionSection' },
      { state: initialStateMarketingTrue },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  describe('MetaMetrics section', () => {
    it('links to support', async () => {
      const { getByRole } = renderScreen(
        MetaMetricsAndDataCollectionSection,
        { name: 'MetaMetricsAndDataCollectionSection' },
        { state: initialStateMarketingTrue },
      );

      const metaMetricsLearnMoreButton = await getByRole('link', {
        name: strings('app_settings.learn_more'),
      });

      expect(metaMetricsLearnMoreButton).toBeTruthy();

      fireEvent.press(metaMetricsLearnMoreButton);

      await waitFor(() => {
        expect(mockLinking).toHaveBeenCalled();
      });
    });

    describe('switch', () => {
      it('on when MetaMetrics initially enabled', async () => {
        mockMetrics.isEnabled.mockReturnValueOnce(true);

        const { findByTestId } = renderScreen(
          MetaMetricsAndDataCollectionSection,
          { name: 'MetaMetricsAndDataCollectionSection' },
          { state: initialStateMarketingTrue },
        );

        const metaMetricsSwitch = await findByTestId(
          SecurityPrivacyViewSelectorsIDs.METAMETRICS_SWITCH,
        );

        expect(metaMetricsSwitch).toBeTruthy();
        expect(metaMetricsSwitch.props.value).toBe(true);
      });

      it('off when MetaMetrics initially disabled', async () => {
        const { findByTestId } = renderScreen(
          MetaMetricsAndDataCollectionSection,
          { name: 'MetaMetricsAndDataCollectionSection' },
          { state: initialStateMarketingTrue },
        );

        const metaMetricsSwitch = await findByTestId(
          SecurityPrivacyViewSelectorsIDs.METAMETRICS_SWITCH,
        );

        expect(metaMetricsSwitch).toBeTruthy();
        expect(metaMetricsSwitch.props.value).toBe(false);
      });

      it('alerts and disables when turned off', async () => {
        mockMetrics.isEnabled.mockReturnValueOnce(true);
        const { findByTestId } = renderScreen(
          MetaMetricsAndDataCollectionSection,
          { name: 'MetaMetricsAndDataCollectionSection' },
          { state: initialStateMarketingTrue },
        );

        const metaMetricsSwitch = await findByTestId(
          SecurityPrivacyViewSelectorsIDs.METAMETRICS_SWITCH,
        );

        expect(metaMetricsSwitch).toBeTruthy();
        expect(metaMetricsSwitch.props.value).toBe(true);

        fireEvent(metaMetricsSwitch, 'valueChange', false);

        await waitFor(() => {
          expect(metaMetricsSwitch.props.value).toBe(false);
          expect(mockMetrics.enable).toHaveBeenCalledWith(false);
          expect(mockAlert).toHaveBeenCalled();
          expect(mockMetrics.addTraitsToUser).not.toHaveBeenCalled();
          expect(mockMetrics.trackEvent).not.toHaveBeenCalled();
        });
      });

      it('traits added to user and event tracked when turned on', async () => {
        const { findByTestId } = renderScreen(
          MetaMetricsAndDataCollectionSection,
          { name: 'MetaMetricsAndDataCollectionSection' },
          { state: initialStateMarketingTrue },
        );

        const metaMetricsSwitch = await findByTestId(
          SecurityPrivacyViewSelectorsIDs.METAMETRICS_SWITCH,
        );

        expect(metaMetricsSwitch).toBeTruthy();
        expect(metaMetricsSwitch.props.value).toBe(false);

        fireEvent(metaMetricsSwitch, 'valueChange', true);

        await waitFor(() => {
          expect(metaMetricsSwitch.props.value).toBe(true);
          expect(mockMetrics.enable).toHaveBeenCalledWith();
          expect(mockAlert).not.toHaveBeenCalled();
          expect(mockMetrics.addTraitsToUser).toHaveBeenCalledWith({
            deviceProp: 'Device value',
            userProp: 'User value',
            is_metrics_opted_in: true,
          });
          expect(mockMetrics.trackEvent).toHaveBeenCalledWith(
            MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED,
            { is_metrics_opted_in: true, updated_after_onboarding: true },
            true,
          );
        });
      });
    });
  });

  describe('Marketing section', () => {
    describe('switch', () => {
      it('on when Marketing initially enabled', async () => {
        const { findByTestId } = renderScreen(
          MetaMetricsAndDataCollectionSection,
          { name: 'MetaMetricsAndDataCollectionSection' },
          { state: initialStateMarketingTrue },
        );

        const marketingSwitch = await findByTestId(
          SecurityPrivacyViewSelectorsIDs.DATA_COLLECTION_SWITCH,
        );

        expect(marketingSwitch).toBeTruthy();
        expect(marketingSwitch.props.value).toBe(true);
      });

      it('off when Marketing initially disabled', async () => {
        const { findByTestId } = renderScreen(
          MetaMetricsAndDataCollectionSection,
          { name: 'MetaMetricsAndDataCollectionSection' },
          { state: initialStateMarketingFalse },
        );

        const marketingSwitch = await findByTestId(
          SecurityPrivacyViewSelectorsIDs.DATA_COLLECTION_SWITCH,
        );

        expect(marketingSwitch).toBeTruthy();
        expect(marketingSwitch.props.value).toBe(false);
      });

      it('turns MetaMetrics switch on when turned on', async () => {
        const { findByTestId } = renderScreen(
          MetaMetricsAndDataCollectionSection,
          { name: 'MetaMetricsAndDataCollectionSection' },
          { state: initialStateMarketingFalse },
        );

        const metaMetricsSwitch = await findByTestId(
          SecurityPrivacyViewSelectorsIDs.METAMETRICS_SWITCH,
        );

        const marketingSwitch = await findByTestId(
          SecurityPrivacyViewSelectorsIDs.DATA_COLLECTION_SWITCH,
        );

        expect(metaMetricsSwitch).toBeTruthy();
        expect(marketingSwitch).toBeTruthy();

        expect(metaMetricsSwitch.props.value).toBe(false);
        expect(marketingSwitch.props.value).toBe(false);

        fireEvent(marketingSwitch, 'valueChange', true);

        await waitFor(() => {
          expect(marketingSwitch.props.value).toBe(true);
          expect(metaMetricsSwitch.props.value).toBe(true);
          expect(mockMetrics.enable).toHaveBeenCalledWith();
          expect(mockAlert).not.toHaveBeenCalled();
          expect(mockMetrics.addTraitsToUser).toHaveBeenNthCalledWith(1, {
            deviceProp: 'Device value',
            userProp: 'User value',
            is_metrics_opted_in: true,
          });
          expect(mockMetrics.addTraitsToUser).toHaveBeenNthCalledWith(2, {
            has_marketing_consent: true,
          });

          expect(mockMetrics.trackEvent).toHaveBeenNthCalledWith(
            1,
            MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED,
            { is_metrics_opted_in: true, updated_after_onboarding: true },
            true,
          );
          expect(mockMetrics.trackEvent).toHaveBeenNthCalledWith(
            2,
            MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED,
            { has_marketing_consent: true, location: 'settings' },
            true,
          );
        });
      });

      it('keep MetaMetrics switch on when turned off', async () => {
        mockMetrics.isEnabled.mockReturnValueOnce(true);

        const { findByTestId } = renderScreen(
          MetaMetricsAndDataCollectionSection,
          { name: 'MetaMetricsAndDataCollectionSection' },
          { state: initialStateMarketingTrue },
        );

        const metaMetricsSwitch = await findByTestId(
          SecurityPrivacyViewSelectorsIDs.METAMETRICS_SWITCH,
        );

        const marketingSwitch = await findByTestId(
          SecurityPrivacyViewSelectorsIDs.DATA_COLLECTION_SWITCH,
        );

        expect(metaMetricsSwitch).toBeTruthy();
        expect(marketingSwitch).toBeTruthy();

        expect(metaMetricsSwitch.props.value).toBe(true);
        expect(marketingSwitch.props.value).toBe(true);

        fireEvent(marketingSwitch, 'valueChange', false);

        await waitFor(() => {
          expect(marketingSwitch.props.value).toBe(false);
          expect(metaMetricsSwitch.props.value).toBe(true);
          expect(mockMetrics.enable).not.toHaveBeenCalled();
          expect(mockAlert).not.toHaveBeenCalled();
          expect(mockMetrics.addTraitsToUser).toHaveBeenCalledTimes(1);
          expect(mockMetrics.addTraitsToUser).toHaveBeenCalledWith({
            has_marketing_consent: false,
          });
          expect(mockMetrics.trackEvent).toHaveBeenCalledTimes(1);
          expect(mockMetrics.trackEvent).toHaveBeenCalledWith(
            MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED,
            { has_marketing_consent: false, location: 'settings' },
            true,
          );
          expect(mockNavigate).toHaveBeenCalledWith(
            Routes.MODAL.ROOT_MODAL_FLOW,
            {
              screen: Routes.SHEET.DATA_COLLECTION,
            },
          );
        });
      });
    });
  });
});
