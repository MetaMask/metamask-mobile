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
      { state: initialStateMarketingFalse },
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
      it('is on when MetaMetrics is initially enabled', async () => {
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

      it('is off when MetaMetrics is initially disabled', async () => {
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

      it('alerts and disables marketing when turned off', async () => {
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

        fireEvent(metaMetricsSwitch, 'valueChange', false);

        await waitFor(() => {
          expect(metaMetricsSwitch.props.value).toBe(false);
          expect(marketingSwitch.props.value).toBe(false);
          expect(mockMetrics.enable).toHaveBeenCalledWith(false);
          expect(mockAlert).toHaveBeenCalled();
          expect(mockMetrics.addTraitsToUser).not.toHaveBeenCalled();
          expect(mockMetrics.trackEvent).not.toHaveBeenCalled();
        });
      });

      it('keeps marketing off, adds traits to user and tracks event when turned on', async () => {
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

        fireEvent(metaMetricsSwitch, 'valueChange', true);

        await waitFor(() => {
          expect(metaMetricsSwitch.props.value).toBe(true);
          expect(marketingSwitch.props.value).toBe(false);
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
      it('is on when Marketing is initially enabled', async () => {
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

      it('is off when Marketing is initially disabled', async () => {
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

      // testing the interaction between MetaMetrics and Marketing switches
      const testMarketingSwitchWithMetaMetricsSwitch = async (
        metaMetricsInitiallyEnabled: boolean,
      ) => {
        mockMetrics.isEnabled.mockReturnValueOnce(metaMetricsInitiallyEnabled);

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

        expect(metaMetricsSwitch.props.value).toBe(metaMetricsInitiallyEnabled);
        expect(marketingSwitch.props.value).toBe(false);

        fireEvent(marketingSwitch, 'valueChange', true);

        await waitFor(() => {
          expect(marketingSwitch.props.value).toBe(true);
          expect(metaMetricsSwitch.props.value).toBe(true);

          expect(mockAlert).not.toHaveBeenCalled();

          // Not called when MetaMetrics is initially enabled
          if (!metaMetricsInitiallyEnabled) {
            expect(mockMetrics.enable).toHaveBeenCalledWith();
            expect(mockMetrics.addTraitsToUser).toHaveBeenNthCalledWith(1, {
              deviceProp: 'Device value',
              userProp: 'User value',
              is_metrics_opted_in: true,
            });
            expect(mockMetrics.trackEvent).toHaveBeenNthCalledWith(
              1,
              MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED,
              { is_metrics_opted_in: true, updated_after_onboarding: true },
              true,
            );
          }

          expect(mockMetrics.addTraitsToUser).toHaveBeenNthCalledWith(
            // if MetaMetrics is initially disabled, addTraitsToUser is called twice and this is 2nd call
            !metaMetricsInitiallyEnabled ? 2 : 1,
            {
              has_marketing_consent: true,
            },
          );
          expect(mockMetrics.trackEvent).toHaveBeenNthCalledWith(
            // if MetaMetrics is initially disabled, trackEvent is called twice and this is 2nd call
            !metaMetricsInitiallyEnabled ? 2 : 1,
            MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED,
            { has_marketing_consent: true, location: 'settings' },
            true,
          );
        });
      };

      it('change MetaMetrics switch to on, adds traits to user and tracks event when turned on', async () => {
        await testMarketingSwitchWithMetaMetricsSwitch(false);
      });

      it('keeps MetaMetrics switch on, adds traits to user and tracks event when turned on', async () => {
        await testMarketingSwitchWithMetaMetricsSwitch(true);
      });

      it('keeps MetaMetrics switch on and display modal when turned off', async () => {
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
