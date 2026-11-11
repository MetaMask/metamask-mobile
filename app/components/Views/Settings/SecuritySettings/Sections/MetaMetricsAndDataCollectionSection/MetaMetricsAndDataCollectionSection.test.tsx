import React from 'react';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';

import { backgroundState } from '../../../../../../util/test/initial-root-state';

import MetaMetricsAndDataCollectionSection from './MetaMetricsAndDataCollectionSection';
import { SecurityPrivacyViewSelectorsIDs } from '../../SecurityPrivacyView.testIds';

const MetaMetricsScreenWithParams = ({
  route,
}: {
  route?: { params?: Record<string, unknown> };
}) => <MetaMetricsAndDataCollectionSection {...(route?.params || {})} />;
import { fireEvent, waitFor } from '@testing-library/react-native';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import OAuthService from '../../../../../../core/OAuthService/OAuthService';
import { selectIsPna25Acknowledged } from '../../../../../../selectors/legalNotices';
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

jest.mock('../../../../../../core/OAuthService/OAuthService', () => ({
  updateMarketingOptInStatus: jest.fn(),
  getMarketingOptInStatus: jest.fn(),
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

jest.mock('../../../../../../selectors/onboarding', () => ({
  selectOnboardingAccountType: jest.fn(),
}));

import { selectOnboardingAccountType } from '../../../../../../selectors/onboarding';
import { AccountType } from '../../../../../../constants/onboarding';

const mockSelectOnboardingAccountType =
  selectOnboardingAccountType as jest.MockedFunction<
    typeof selectOnboardingAccountType
  >;

jest.mock('../../../../../../selectors/legalNotices', () => ({
  selectIsPna25Acknowledged: jest.fn(),
}));

jest.mock('../../../../../../actions/legalNotices', () => ({
  storePna25Acknowledged: jest.fn(() => ({ type: 'STORE_PNA25_ACKNOWLEDGED' })),
}));

const mockSelectIsPna25Acknowledged =
  selectIsPna25Acknowledged as jest.MockedFunction<
    typeof selectIsPna25Acknowledged
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

const initialStateSocialLogin = (dataCollectionForMarketing: boolean) => ({
  engine: {
    backgroundState: {
      ...backgroundState,
      SeedlessOnboardingController: {
        ...backgroundState.SeedlessOnboardingController,
        vault: 'vault',
      },
    },
  },
  settings: {
    basicFunctionalityEnabled: true,
  },
  security: {
    dataCollectionForMarketing,
  },
});

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
    (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(false);
    (mockAnalytics.trackEvent as jest.Mock).mockClear();
    (mockAnalytics.optIn as jest.Mock).mockClear();
    (mockAnalytics.optOut as jest.Mock).mockClear();
    (mockAnalytics.identify as jest.Mock).mockClear();
  });

  it('render matches snapshot', () => {
    const { getByText } = renderScreen(
      MetaMetricsAndDataCollectionSection,
      { name: 'MetaMetricsAndDataCollectionSection' },
      { state: initialStateMarketingFalse },
    );
    expect(
      getByText(strings('app_settings.metametrics_title')),
    ).toBeOnTheScreen();
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
        expect(metaMetricsSwitch).toHaveProp('disabled', true);
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
          expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
            expect.objectContaining({
              name: MetaMetricsEvents.METRICS_OPT_OUT.category,
              properties: expect.objectContaining({
                updated_after_onboarding: true,
                location: 'settings',
              }),
            }),
          );
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
          expect(mockAnalytics.trackEvent).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
              name: MetaMetricsEvents.METRICS_OPT_IN.category,
              properties: expect.objectContaining({
                updated_after_onboarding: true,
                location: 'settings',
              }),
            }),
          );
          expect(mockAnalytics.trackEvent).toHaveBeenNthCalledWith(
            2,
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

      it('tracks ANALYTICS_PREFERENCE_SELECTED with onboarding_default_settings when turned on from onboarding', async () => {
        (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(false);

        const { findByTestId } = renderScreen(
          MetaMetricsScreenWithParams,
          { name: 'MetaMetricsAndDataCollectionSection' },
          { state: initialStateMarketingFalse },
          { analyticsLocation: 'onboarding_default_settings' },
        );

        const metaMetricsSwitch = await findByTestId(
          SecurityPrivacyViewSelectorsIDs.METAMETRICS_SWITCH,
        );

        fireEvent(metaMetricsSwitch, 'valueChange', true);

        await waitFor(() => {
          expect(mockAnalytics.trackEvent).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
              name: MetaMetricsEvents.METRICS_OPT_IN.category,
              properties: expect.objectContaining({
                updated_after_onboarding: true,
                location: 'onboarding_default_settings',
              }),
            }),
          );
          expect(mockAnalytics.trackEvent).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
              name: MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED.category,
              properties: expect.objectContaining({
                is_metrics_opted_in: true,
                updated_after_onboarding: true,
                location: 'onboarding_default_settings',
              }),
            }),
          );
        });
      });

      it('tracks METRICS_OPT_OUT with onboarding_default_settings when turned off from onboarding', async () => {
        (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(true);
        const { findByTestId } = renderScreen(
          MetaMetricsScreenWithParams,
          { name: 'MetaMetricsAndDataCollectionSection' },
          { state: initialStateMarketingTrue },
          { analyticsLocation: 'onboarding_default_settings' },
        );

        const metaMetricsSwitch = await findByTestId(
          SecurityPrivacyViewSelectorsIDs.METAMETRICS_SWITCH,
        );

        fireEvent(metaMetricsSwitch, 'valueChange', false);

        await waitFor(() => {
          expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
            expect.objectContaining({
              name: MetaMetricsEvents.METRICS_OPT_OUT.category,
              properties: expect.objectContaining({
                updated_after_onboarding: true,
                location: 'onboarding_default_settings',
              }),
            }),
          );
        });
      });

      it('includes account_type in ANALYTICS_PREFERENCE_SELECTED when accountType is in Redux state', async () => {
        (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(false);
        mockSelectOnboardingAccountType.mockReturnValue(
          AccountType.MetamaskGoogle,
        );

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
          expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
            expect.objectContaining({
              name: MetaMetricsEvents.METRICS_OPT_IN.category,
              properties: expect.objectContaining({
                updated_after_onboarding: true,
                location: 'settings',
                account_type: AccountType.MetamaskGoogle,
              }),
            }),
          );
          expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
            expect.objectContaining({
              name: MetaMetricsEvents.ANALYTICS_PREFERENCE_SELECTED.category,
              properties: expect.objectContaining({
                is_metrics_opted_in: true,
                updated_after_onboarding: true,
                location: 'settings',
                account_type: AccountType.MetamaskGoogle,
              }),
            }),
          );
        });
      });

      it('includes account_type in METRICS_OPT_OUT when accountType is in Redux state', async () => {
        (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(true);
        mockSelectOnboardingAccountType.mockReturnValue(AccountType.Imported);

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
          expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
            expect.objectContaining({
              name: MetaMetricsEvents.METRICS_OPT_OUT.category,
              properties: expect.objectContaining({
                updated_after_onboarding: true,
                location: 'settings',
                account_type: AccountType.Imported,
              }),
            }),
          );
        });
      });

      it('dispatches storePna25Acknowledged when user enables metrics', async () => {
        (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(false);
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

      it('does not dispatch storePna25Acknowledged when already acknowledged', async () => {
        (mockAnalytics.isEnabled as jest.Mock).mockReturnValue(false);
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
        expect(marketingSwitch).toHaveProp('disabled', true);
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
                name: MetaMetricsEvents.METRICS_OPT_IN.category,
                properties: expect.objectContaining({
                  location: 'settings',
                  updated_after_onboarding: true,
                }),
              }),
            );
            expect(mockAnalytics.trackEvent).toHaveBeenNthCalledWith(
              2,
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
            // if MetaMetrics is initially disabled, identify is called twice and this is 2nd call
            !metaMetricsInitiallyEnabled ? 2 : 1,
            {
              has_marketing_consent: true,
            },
          );
          expect(mockAnalytics.trackEvent).toHaveBeenNthCalledWith(
            // if MetaMetrics is initially disabled, marketing consent is the 3rd trackEvent
            !metaMetricsInitiallyEnabled ? 3 : 1,
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
            has_marketing_consent: false,
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

  describe('Marketing OAuth backend sync', () => {
    beforeEach(() => {
      mockUpdateMarketingOptInStatus.mockResolvedValue(undefined);
    });

    it.each([true, false])(
      'posts the marketing switch value to the OAuth backend without reverting when set to %s for social login users',
      async (value) => {
        mockMetrics.isEnabled.mockReturnValue(true);

        const { findByTestId } = renderScreen(
          MetaMetricsAndDataCollectionSection,
          { name: 'MetaMetricsAndDataCollectionSection' },
          { state: initialStateSocialLogin(!value) },
        );

        const marketingSwitch = await findByTestId(
          SecurityPrivacyViewSelectorsIDs.DATA_COLLECTION_SWITCH,
        );
        expect(marketingSwitch.props.value).toBe(!value);

        fireEvent(marketingSwitch, 'valueChange', value);

        await waitFor(() => {
          expect(marketingSwitch.props.value).toBe(value);
        });
        expect(mockUpdateMarketingOptInStatus).toHaveBeenCalledWith(value);
        expect(mockGetMarketingOptInStatus).not.toHaveBeenCalled();
      },
    );

    it('keeps the local marketing decision when the OAuth backend sync fails', async () => {
      mockMetrics.isEnabled.mockReturnValue(true);
      mockUpdateMarketingOptInStatus.mockRejectedValue(
        new Error('sync failed'),
      );

      const { findByTestId, store } = renderScreen(
        MetaMetricsAndDataCollectionSection,
        { name: 'MetaMetricsAndDataCollectionSection' },
        { state: initialStateSocialLogin(true) },
      );

      const marketingSwitch = await findByTestId(
        SecurityPrivacyViewSelectorsIDs.DATA_COLLECTION_SWITCH,
      );

      fireEvent(marketingSwitch, 'valueChange', false);

      await waitFor(() => {
        expect(marketingSwitch.props.value).toBe(false);
      });
      expect(mockUpdateMarketingOptInStatus).toHaveBeenCalledWith(false);
      expect(store.getState().security.dataCollectionForMarketing).toBe(false);
    });

    it('does not fetch the marketing opt-in status on mount for social login users', async () => {
      const { findByTestId, store } = renderScreen(
        MetaMetricsAndDataCollectionSection,
        { name: 'MetaMetricsAndDataCollectionSection' },
        { state: initialStateSocialLogin(false) },
      );

      await findByTestId(
        SecurityPrivacyViewSelectorsIDs.DATA_COLLECTION_SWITCH,
      );

      expect(mockGetMarketingOptInStatus).not.toHaveBeenCalled();
      expect(store.getState().security.dataCollectionForMarketing).toBe(false);
    });
  });
});
