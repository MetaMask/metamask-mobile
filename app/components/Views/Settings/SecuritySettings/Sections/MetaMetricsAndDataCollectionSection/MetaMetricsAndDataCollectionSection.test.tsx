import { renderScreen } from '../../../../../../util/test/renderWithProvider';

import { backgroundState } from '../../../../../../util/test/initial-root-state';

import MetaMetricsAndDataCollectionSection from './MetaMetricsAndDataCollectionSection';
import { SecurityPrivacyViewSelectorsIDs } from '../../../../../../../e2e/selectors/Settings/SecurityAndPrivacy/SecurityPrivacyView.selectors';
import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  MetaMetrics,
  MetaMetricsEvents,
} from '../../../../../../core/Analytics';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import { MetricsEventBuilder } from '../../../../../../core/Analytics/MetricsEventBuilder';

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

const mockAutoSignIn = jest.fn();
jest.mock('../../../../../../util/identity/hooks/useAuthentication', () => ({
  useAutoSignIn: () => ({
    autoSignIn: mockAutoSignIn,
  }),
}));

const mockMetrics = {
  trackEvent: jest.fn(),
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
    backgroundState,
  },
  settings: {
    basicFunctionalityEnabled: true,
  },
  security: {
    dataCollectionForMarketing: true,
  },
};

const initialStateMarketingFalse = {
  engine: {
    backgroundState,
  },
  settings: {
    basicFunctionalityEnabled: true,
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
        mockMetrics.isEnabled.mockReturnValue(true);

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
        mockMetrics.isEnabled.mockReturnValue(false);
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

      it('is disabled when basic functionality is disabled', async () => {
        mockMetrics.isEnabled.mockReturnValue(true);
        const { findByTestId } = renderScreen(
          MetaMetricsAndDataCollectionSection,
          { name: 'MetaMetricsAndDataCollectionSection' },
          {
            state: {
              ...initialStateMarketingTrue,
              settings: { basicFunctionalityEnabled: false },
            },
          },
        );

        const metaMetricsSwitch = await findByTestId(
          SecurityPrivacyViewSelectorsIDs.METAMETRICS_SWITCH,
        );
        expect(metaMetricsSwitch).toBeTruthy();
        expect(metaMetricsSwitch.props.disabled).toBe(true);
        expect(metaMetricsSwitch.props.value).toBe(false);
      });

      it('calls autoSignIn when toggling the switch', async () => {
        mockMetrics.isEnabled.mockReturnValue(false);
        const { findByTestId } = renderScreen(
          MetaMetricsAndDataCollectionSection,
          { name: 'MetaMetricsAndDataCollectionSection' },
          { state: initialStateMarketingFalse },
        );
        const metaMetricsSwitch = await findByTestId(
          SecurityPrivacyViewSelectorsIDs.METAMETRICS_SWITCH,
        );

        fireEvent(metaMetricsSwitch, 'valueChange', true);
        await waitFor(() => {
          expect(mockAutoSignIn).toHaveBeenCalled();
        });
      });

      it('alerts and disables marketing when turned off', async () => {
        mockMetrics.isEnabled.mockReturnValue(true);
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
        mockMetrics.isEnabled.mockReturnValue(false);
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
          });
          expect(mockMetrics.trackEvent).toHaveBeenCalledWith(
            MetricsEventBuilder.createEventBuilder(
              MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED,
            )
              .addProperties({
                is_metrics_opted_in: true,
                updated_after_onboarding: true,
                location: 'settings',
              })
              .build(),
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

      it('is disabled when basic functionality is disabled', async () => {
        const { findByTestId } = renderScreen(
          MetaMetricsAndDataCollectionSection,
          { name: 'MetaMetricsAndDataCollectionSection' },
          {
            state: {
              ...initialStateMarketingTrue,
              settings: { basicFunctionalityEnabled: false },
            },
          },
        );

        const marketingSwitch = await findByTestId(
          SecurityPrivacyViewSelectorsIDs.DATA_COLLECTION_SWITCH,
        );
        expect(marketingSwitch).toBeTruthy();
        expect(marketingSwitch.props.disabled).toBe(true);
        expect(marketingSwitch.props.value).toBe(false);
      });

      // testing the interaction between MetaMetrics and Marketing switches
      const testMarketingSwitchWithMetaMetricsSwitch = async (
        metaMetricsInitiallyEnabled: boolean,
      ) => {
        mockMetrics.isEnabled.mockReturnValue(metaMetricsInitiallyEnabled);

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
            });
            expect(mockMetrics.trackEvent).toHaveBeenNthCalledWith(
              1,
              MetricsEventBuilder.createEventBuilder(
                MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED,
              )
                .addProperties({
                  is_metrics_opted_in: true,
                  location: 'settings',
                  updated_after_onboarding: true,
                })
                .build(),
            );
          }

          expect(mockMetrics.addTraitsToUser).toHaveBeenNthCalledWith(
            // if MetaMetrics is initially disabled, addTraitsToUser is called twice and this is 2nd call
            !metaMetricsInitiallyEnabled ? 2 : 1,
            {
              has_marketing_consent: 'ON',
            },
          );
          expect(mockMetrics.trackEvent).toHaveBeenNthCalledWith(
            // if MetaMetrics is initially disabled, trackEvent is called twice and this is 2nd call
            !metaMetricsInitiallyEnabled ? 2 : 1,
            MetricsEventBuilder.createEventBuilder(
              MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED,
            )
              .addProperties({
                has_marketing_consent: true,
                location: 'settings',
                updated_after_onboarding: true,
              })
              .build(),
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
            has_marketing_consent: 'OFF',
          });
          expect(mockMetrics.trackEvent).toHaveBeenCalledTimes(1);
          expect(mockMetrics.trackEvent).toHaveBeenCalledWith(
            MetricsEventBuilder.createEventBuilder(
              MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED,
            )
              .addProperties({
                has_marketing_consent: false,
                location: 'settings',
                updated_after_onboarding: true,
              })
              .build(),
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
