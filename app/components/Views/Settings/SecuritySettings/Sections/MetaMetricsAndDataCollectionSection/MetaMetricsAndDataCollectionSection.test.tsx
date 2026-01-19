import { renderScreen } from '../../../../../../util/test/renderWithProvider';

import { backgroundState } from '../../../../../../util/test/initial-root-state';

import MetaMetricsAndDataCollectionSection from './MetaMetricsAndDataCollectionSection';
import { SecurityPrivacyViewSelectorsIDs } from '../../SecurityPrivacyView.testIds';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import OAuthService from '../../../../../../core/OAuthService/OAuthService';
import Logger from '../../../../../../util/Logger';
import { selectSeedlessOnboardingLoginFlow } from '../../../../../../selectors/seedlessOnboardingController';
import { selectIsPna25Acknowledged } from '../../../../../../selectors/legalNotices';
import { selectIsPna25FlagEnabled } from '../../../../../../selectors/featureFlagController/legalNotices';
import { storePna25Acknowledged } from '../../../../../../actions/legalNotices';

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

// Mock analytics module
jest.mock('../../../../../../util/analytics/analytics', () => ({
  analytics: {
    isEnabled: jest.fn(() => false),
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
jest.mock('../../../../../../core/Analytics/MetaMetrics', () => {
  const mockInstance = {
    createDataDeletionTask: jest.fn(),
    checkDataDeleteStatus: jest.fn(),
    getDeleteRegulationCreationDate: jest.fn(),
    getDeleteRegulationId: jest.fn(),
    isDataRecorded: jest.fn(),
    updateDataRecordingFlag: jest.fn(),
  };
  return {
    __esModule: true,
    default: {
      getInstance: jest.fn(() => mockInstance),
    },
    MetaMetricsEvents: jest.requireActual(
      '../../../../../../core/Analytics/MetaMetrics.events',
    ).MetaMetricsEvents,
  };
});

jest.mock('../../../../../../core/OAuthService/OAuthService', () => ({
  updateMarketingOptInStatus: jest.fn(),
  getMarketingOptInStatus: jest.fn(),
}));

jest.mock('../../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const mockAutoSignIn = jest.fn();
jest.mock('../../../../../../util/identity/hooks/useAuthentication', () => ({
  useAutoSignIn: () => ({
    autoSignIn: mockAutoSignIn,
  }),
}));

// Import analytics to access mocks
import { analytics } from '../../../../../../util/analytics/analytics';

const mockAnalytics = analytics as jest.Mocked<typeof analytics>;
// Alias for tests that reference mockMetrics
const mockMetrics = mockAnalytics;

const mockUpdateMarketingOptInStatus =
  OAuthService.updateMarketingOptInStatus as jest.MockedFunction<
    typeof OAuthService.updateMarketingOptInStatus
  >;

const mockGetMarketingOptInStatus =
  OAuthService.getMarketingOptInStatus as jest.MockedFunction<
    typeof OAuthService.getMarketingOptInStatus
  >;

jest.mock('../../../../../../selectors/seedlessOnboardingController', () => ({
  selectSeedlessOnboardingLoginFlow: jest.fn(),
}));

const mockSelectSeedlessOnboardingLoginFlow =
  selectSeedlessOnboardingLoginFlow as jest.MockedFunction<
    typeof selectSeedlessOnboardingLoginFlow
  >;

jest.mock('../../../../../../selectors/legalNotices', () => ({
  selectIsPna25Acknowledged: jest.fn(),
}));

jest.mock(
  '../../../../../../selectors/featureFlagController/legalNotices',
  () => ({
    selectIsPna25FlagEnabled: jest.fn(),
  }),
);

jest.mock('../../../../../../actions/legalNotices', () => ({
  storePna25Acknowledged: jest.fn(() => ({ type: 'STORE_PNA25_ACKNOWLEDGED' })),
}));

const mockSelectIsPna25Acknowledged =
  selectIsPna25Acknowledged as jest.MockedFunction<
    typeof selectIsPna25Acknowledged
  >;

const mockSelectIsPna25FlagEnabled =
  selectIsPna25FlagEnabled as jest.MockedFunction<
    typeof selectIsPna25FlagEnabled
  >;

const mockStorePna25Acknowledged =
  storePna25Acknowledged as jest.MockedFunction<typeof storePna25Acknowledged>;

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
    mockUpdateMarketingOptInStatus.mockClear();
    mockSelectSeedlessOnboardingLoginFlow.mockClear();
    (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(false);
    (mockAnalytics.trackEvent as jest.Mock).mockClear();
    (mockAnalytics.optIn as jest.Mock).mockClear();
    (mockAnalytics.optOut as jest.Mock).mockClear();
    (mockAnalytics.identify as jest.Mock).mockClear();
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
        (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(true);

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
        (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(false);
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
        (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(true);
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
        (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(false);
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
        (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(true);
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
          expect(mockAnalytics.optOut).toHaveBeenCalled();
          expect(mockAlert).toHaveBeenCalled();
          expect(mockAnalytics.identify).not.toHaveBeenCalled();
          expect(mockAnalytics.trackEvent).not.toHaveBeenCalled();
        });
      });

      it('keeps marketing off, adds traits to user and tracks event when turned on', async () => {
        (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(false);

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
          expect(mockAnalytics.optIn).toHaveBeenCalled();
          expect(mockAlert).not.toHaveBeenCalled();
          expect(mockAnalytics.identify).toHaveBeenCalledWith({
            deviceProp: 'Device value',
            userProp: 'User value',
          });
          expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
            expect.objectContaining({
              name: MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED.category,
              properties: expect.objectContaining({
                is_metrics_opted_in: true,
                updated_after_onboarding: true,
                location: 'settings',
              }),
            }),
          );
        });
      });

      it('dispatches storePna25Acknowledged when flag is enabled and user enables metrics', async () => {
        (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(false);
        mockSelectIsPna25FlagEnabled.mockReturnValue(true);
        mockSelectIsPna25Acknowledged.mockReturnValue(false);

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
          expect(mockStorePna25Acknowledged).toHaveBeenCalled();
        });
      });

      it('does not dispatch storePna25Acknowledged when flag is disabled', async () => {
        (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(false);
        mockSelectIsPna25FlagEnabled.mockReturnValue(false);
        mockSelectIsPna25Acknowledged.mockReturnValue(false);

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
          expect(mockStorePna25Acknowledged).not.toHaveBeenCalled();
        });
      });

      it('does not dispatch storePna25Acknowledged when already acknowledged', async () => {
        (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(false);
        mockSelectIsPna25FlagEnabled.mockReturnValue(true);
        mockSelectIsPna25Acknowledged.mockReturnValue(true);

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
          expect(mockStorePna25Acknowledged).not.toHaveBeenCalled();
        });
      });

      it('does not dispatch storePna25Acknowledged when user disables metrics', async () => {
        (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(true);
        mockSelectIsPna25FlagEnabled.mockReturnValue(true);
        mockSelectIsPna25Acknowledged.mockReturnValue(false);

        const { findByTestId } = renderScreen(
          MetaMetricsAndDataCollectionSection,
          { name: 'MetaMetricsAndDataCollectionSection' },
          { state: initialStateMarketingTrue },
        );

        const metaMetricsSwitch = await findByTestId(
          SecurityPrivacyViewSelectorsIDs.METAMETRICS_SWITCH,
        );

        fireEvent(metaMetricsSwitch, 'valueChange', false);

        await waitFor(() => {
          expect(mockStorePna25Acknowledged).not.toHaveBeenCalled();
        });
      });

      // --- Additional test cases for isSocialLoginFlow === true ---

      describe('when isSocialLoginFlow is true', () => {
        beforeEach(() => {
          mockSelectSeedlessOnboardingLoginFlow.mockReturnValue(true);
        });

        it('enables social login metrics when toggling MetaMetrics switch on', async () => {
          (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(false);

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
            expect(mockAnalytics.optIn).toHaveBeenCalled();
            expect(mockAlert).not.toHaveBeenCalled();
            expect(mockAnalytics.identify).toHaveBeenCalled();
            expect(mockAnalytics.trackEvent).toHaveBeenCalled();
          });
        });

        it('disables social login metrics and disables marketing when toggling MetaMetrics switch off', async () => {
          (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(true);

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
            expect(mockAnalytics.optOut).toHaveBeenCalled();
            expect(mockAlert).toHaveBeenCalled();
            expect(mockAnalytics.identify).not.toHaveBeenCalled();
            expect(mockAnalytics.trackEvent).not.toHaveBeenCalled();
          });
        });

        it('keeps marketing off, adds traits to user and tracks event when turned on (social login flow)', async () => {
          (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(false);

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
            expect(mockAnalytics.optIn).toHaveBeenCalled();
            expect(mockAlert).not.toHaveBeenCalled();
            expect(mockAnalytics.identify).toHaveBeenCalled();
            expect(mockAnalytics.trackEvent).toHaveBeenCalled();
          });
        });
      });
    });
  });

  describe('Marketing section', () => {
    beforeEach(() => {
      mockSelectSeedlessOnboardingLoginFlow.mockReturnValue(false);
    });
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
            expect(mockAnalytics.optIn).toHaveBeenCalled();
            expect(mockAnalytics.identify).toHaveBeenNthCalledWith(1, {
              deviceProp: 'Device value',
              userProp: 'User value',
            });
            expect(mockAnalytics.trackEvent).toHaveBeenNthCalledWith(
              1,
              expect.objectContaining({
                name: MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED.category,
                properties: expect.objectContaining({
                  is_metrics_opted_in: true,
                  location: 'settings',
                  updated_after_onboarding: true,
                }),
              }),
            );
          }

          expect(mockAnalytics.identify).toHaveBeenNthCalledWith(
            // if MetaMetrics is initially disabled, addTraitsToUser is called twice and this is 2nd call
            !metaMetricsInitiallyEnabled ? 2 : 1,
            {
              has_marketing_consent: 'ON',
            },
          );
          expect(mockAnalytics.trackEvent).toHaveBeenNthCalledWith(
            // if MetaMetrics is initially disabled, trackEvent is called twice and this is 2nd call
            !metaMetricsInitiallyEnabled ? 2 : 1,
            expect.objectContaining({
              name: MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED.category,
              properties: expect.objectContaining({
                has_marketing_consent: true,
                location: 'settings',
                updated_after_onboarding: true,
              }),
            }),
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
          expect(mockAnalytics.optIn).not.toHaveBeenCalled();
          expect(mockAnalytics.optOut).not.toHaveBeenCalled();
          expect(mockAlert).not.toHaveBeenCalled();
          expect(mockAnalytics.identify).toHaveBeenCalledTimes(1);
          expect(mockAnalytics.identify).toHaveBeenCalledWith({
            has_marketing_consent: 'OFF',
          });
          expect(mockAnalytics.trackEvent).toHaveBeenCalledTimes(1);
          expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
            expect.objectContaining({
              name: MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED.category,
              properties: expect.objectContaining({
                has_marketing_consent: false,
                location: 'settings',
                updated_after_onboarding: true,
              }),
            }),
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

  describe('Marketing API Integration', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockUpdateMarketingOptInStatus.mockClear();
    });

    it('should call updateMarketingOptInStatus API when marketing switch is turned on for social login users', async () => {
      mockMetrics.isEnabled.mockReturnValue(false);
      mockUpdateMarketingOptInStatus.mockResolvedValue(undefined);
      mockSelectSeedlessOnboardingLoginFlow.mockReturnValue(true);

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

      fireEvent(marketingSwitch, 'valueChange', true);

      await waitFor(() => {
        expect(marketingSwitch.props.value).toBe(true);
        expect(mockUpdateMarketingOptInStatus).toHaveBeenCalledWith(true);
      });
    });

    it('should call updateMarketingOptInStatus API when marketing switch is turned off for social login users', async () => {
      mockMetrics.isEnabled.mockReturnValue(true);
      mockUpdateMarketingOptInStatus.mockResolvedValue(undefined);
      mockSelectSeedlessOnboardingLoginFlow.mockReturnValue(true);

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

      fireEvent(marketingSwitch, 'valueChange', false);

      await waitFor(() => {
        expect(marketingSwitch.props.value).toBe(false);
        expect(mockUpdateMarketingOptInStatus).toHaveBeenCalledWith(false);
      });
    });

    it('should NOT call updateMarketingOptInStatus API for SRP users', async () => {
      mockMetrics.isEnabled.mockReturnValue(false);
      mockSelectSeedlessOnboardingLoginFlow.mockReturnValue(false);

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

      fireEvent(marketingSwitch, 'valueChange', true);

      await waitFor(() => {
        expect(marketingSwitch.props.value).toBe(true);
        expect(mockUpdateMarketingOptInStatus).not.toHaveBeenCalled();
      });
    });
  });

  describe('Marketing opt-in status fetch on mount', () => {
    it('updates Redux state with API value when API resolves for social login users', async () => {
      mockGetMarketingOptInStatus.mockResolvedValue({ is_opt_in: true });
      mockSelectSeedlessOnboardingLoginFlow.mockReturnValue(true);

      const { findByTestId, store } = renderScreen(
        MetaMetricsAndDataCollectionSection,
        { name: 'MetaMetricsAndDataCollectionSection' },
        { state: initialStateMarketingFalse },
      );

      await findByTestId(
        SecurityPrivacyViewSelectorsIDs.DATA_COLLECTION_SWITCH,
      );

      await waitFor(() => {
        expect(mockGetMarketingOptInStatus).toHaveBeenCalledTimes(1);
        expect(store.getState().security.dataCollectionForMarketing).toBe(true);
      });
    });

    it('does not call API for non-social login users', async () => {
      mockSelectSeedlessOnboardingLoginFlow.mockReturnValue(false);

      const { findByTestId } = renderScreen(
        MetaMetricsAndDataCollectionSection,
        { name: 'MetaMetricsAndDataCollectionSection' },
        { state: initialStateMarketingFalse },
      );

      await findByTestId(
        SecurityPrivacyViewSelectorsIDs.DATA_COLLECTION_SWITCH,
      );

      await waitFor(() => {
        expect(mockGetMarketingOptInStatus).not.toHaveBeenCalled();
      });
    });

    it('logs error when API call fails for social login users', async () => {
      const error = new Error('Network error');
      mockGetMarketingOptInStatus.mockRejectedValue(error);
      mockSelectSeedlessOnboardingLoginFlow.mockReturnValue(true);

      const { findByTestId } = renderScreen(
        MetaMetricsAndDataCollectionSection,
        { name: 'MetaMetricsAndDataCollectionSection' },
        { state: initialStateMarketingFalse },
      );

      await findByTestId(
        SecurityPrivacyViewSelectorsIDs.DATA_COLLECTION_SWITCH,
      );

      await waitFor(() => {
        expect(Logger.error).toHaveBeenCalledWith(error);
      });
    });
  });
});
