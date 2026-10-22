import React from 'react';
import { Text } from 'react-native';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';

import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { analyticsControllerWithMarketingConsent } from '../../../../../../util/test/marketingConsentState';

import MetaMetricsAndDataCollectionSection, {
  MARKETING_CONSENT_OPT_OUT_SHEET_TEST_ID,
} from './MetaMetricsAndDataCollectionSection';
import { SecurityPrivacyViewSelectorsIDs } from '../../SecurityPrivacyView.testIds';

const MetaMetricsScreenWithParams = ({
  route,
}: {
  route?: { params?: Record<string, unknown> };
}) => <MetaMetricsAndDataCollectionSection {...(route?.params || {})} />;
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { strings } from '../../../../../../../locales/i18n';
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

const mockMessengerCall = jest.fn();
jest.mock('../../../../../../core/Engine', () => ({
  controllerMessenger: {
    call: (...args: unknown[]) => mockMessengerCall(...args),
  },
}));

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
    backgroundState: {
      ...backgroundState,
      AnalyticsController: {
        ...backgroundState.AnalyticsController,
        ...analyticsControllerWithMarketingConsent(true),
      },
    },
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
    backgroundState: {
      ...backgroundState,
      AnalyticsController: {
        ...backgroundState.AnalyticsController,
        ...analyticsControllerWithMarketingConsent(false),
      },
    },
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

      it('alerts and keeps marketing on when turned off', async () => {
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
          expect(marketingSwitch.props.value).toBe(true);
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
    it('renders under its own heading, after the content passed between the sections', () => {
      const SectionWithChildren = () => (
        <MetaMetricsAndDataCollectionSection>
          <Text>Delete MetaMetrics data</Text>
        </MetaMetricsAndDataCollectionSection>
      );
      const { getByText } = renderScreen(
        SectionWithChildren,
        { name: 'MetaMetricsAndDataCollectionSection' },
        { state: initialStateMarketingTrue },
      );

      expect(getByText('Delete MetaMetrics data')).toBeOnTheScreen();
      expect(
        getByText(strings('app_settings.marketing_subheading')),
      ).toBeOnTheScreen();
    });

    it('hides the marketing heading with the marketing section', () => {
      const SectionWithoutMarketing = () => (
        <MetaMetricsAndDataCollectionSection hideMarketingSection />
      );
      const { queryByText } = renderScreen(
        SectionWithoutMarketing,
        { name: 'MetaMetricsAndDataCollectionSection' },
        { state: initialStateMarketingTrue },
      );

      expect(
        queryByText(strings('app_settings.marketing_subheading')),
      ).not.toBeOnTheScreen();
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

      it('is disabled and keeps marketing consent when basic functionality is disabled', async () => {
        const { findByTestId, store } = renderScreen(
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
        expect(marketingSwitch.props.value).toBe(true);
        // Basic Functionality only disables the toggle; it never revokes consent.
        expect(store.getState().security.dataCollectionForMarketing).toBe(true);
      });

      const turnMarketingOn = async (metaMetricsEnabled: boolean) => {
        mockMetrics.isEnabled.mockReturnValue(metaMetricsEnabled);

        const { findByTestId, store } = renderScreen(
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

        fireEvent(marketingSwitch, 'valueChange', true);

        return { metaMetricsSwitch, store };
      };

      it('turns marketing on without turning MetaMetrics on', async () => {
        const { metaMetricsSwitch, store } = await turnMarketingOn(false);

        await waitFor(() => {
          expect(store.getState().security.dataCollectionForMarketing).toBe(
            true,
          );
          expect(metaMetricsSwitch.props.value).toBe(false);
          expect(mockAnalytics.optIn).not.toHaveBeenCalled();
          expect(mockAnalytics.identify).not.toHaveBeenCalled();
          expect(mockAnalytics.trackEvent).not.toHaveBeenCalled();
        });
      });

      it('keeps MetaMetrics switch on, adds traits to user and tracks event when turned on', async () => {
        const { metaMetricsSwitch, store } = await turnMarketingOn(true);

        await waitFor(() => {
          expect(store.getState().security.dataCollectionForMarketing).toBe(
            true,
          );
          expect(metaMetricsSwitch.props.value).toBe(true);
          expect(mockAlert).not.toHaveBeenCalled();
          expect(mockAnalytics.optIn).not.toHaveBeenCalled();
          expect(mockAnalytics.identify).toHaveBeenCalledWith({
            has_marketing_consent: true,
          });
          expect(mockAnalytics.trackEvent).toHaveBeenCalledWith(
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
      });

      it('keeps MetaMetrics switch on and adds traits when turned off', async () => {
        mockMetrics.isEnabled.mockReturnValueOnce(true);

        const { findByTestId, queryByTestId, store } = renderScreen(
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
          expect(store.getState().security.dataCollectionForMarketing).toBe(
            false,
          );
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
        });
        expect(
          queryByTestId(MARKETING_CONSENT_OPT_OUT_SHEET_TEST_ID),
        ).not.toBeOnTheScreen();
      });
    });

    describe('opt-out sheet', () => {
      const GET_NOTIFICATION_PREFERENCES_ACTION =
        'AuthenticatedUserStorageService:getNotificationPreferences';
      const SET_MARKETING_CONSENT_ACTION =
        'MarketingConsentController:setMarketingConsent';

      const buildState = (isSignedIn: boolean) => ({
        ...initialStateMarketingTrue,
        engine: {
          backgroundState: {
            ...initialStateMarketingTrue.engine.backgroundState,
            AuthenticationController: {
              ...backgroundState.AuthenticationController,
              isSignedIn,
            },
          },
        },
      });

      const arrangeNotificationPreferences = (
        marketing: {
          pushNotificationsEnabled: boolean;
          inAppNotificationsEnabled: boolean;
        } | null,
      ) => {
        mockMessengerCall.mockImplementation(async (action: string) => {
          if (action === GET_NOTIFICATION_PREFERENCES_ACTION) {
            return marketing ? { marketing } : null;
          }
          return undefined;
        });
      };

      const turnMarketingOff = async (isSignedIn: boolean) => {
        const utils = renderScreen(
          MetaMetricsAndDataCollectionSection,
          { name: 'MetaMetricsAndDataCollectionSection' },
          { state: buildState(isSignedIn) },
        );
        const marketingSwitch = await utils.findByTestId(
          SecurityPrivacyViewSelectorsIDs.DATA_COLLECTION_SWITCH,
        );

        fireEvent(marketingSwitch, 'valueChange', false);

        return utils;
      };

      it('opens the opt-out sheet without saving when a marketing notification channel is on', async () => {
        arrangeNotificationPreferences({
          pushNotificationsEnabled: true,
          inAppNotificationsEnabled: false,
        });

        const { findByTestId, store } = await turnMarketingOff(true);

        expect(
          await findByTestId(MARKETING_CONSENT_OPT_OUT_SHEET_TEST_ID),
        ).toBeOnTheScreen();
        expect(store.getState().security.dataCollectionForMarketing).toBe(true);
        expect(mockMessengerCall).not.toHaveBeenCalledWith(
          SET_MARKETING_CONSENT_ACTION,
          expect.anything(),
        );
        expect(mockAnalytics.identify).not.toHaveBeenCalled();
      });

      it('disables the switch while the notification channels are read', async () => {
        let resolvePreferences: (value: unknown) => void = () => undefined;
        mockMessengerCall.mockImplementation((action: string) =>
          action === GET_NOTIFICATION_PREFERENCES_ACTION
            ? new Promise((resolve) => {
                resolvePreferences = resolve;
              })
            : Promise.resolve(undefined),
        );

        const { getByTestId } = await turnMarketingOff(true);
        const marketingSwitch = getByTestId(
          SecurityPrivacyViewSelectorsIDs.DATA_COLLECTION_SWITCH,
        );

        expect(marketingSwitch).toHaveProp('disabled', true);

        await act(async () => {
          resolvePreferences(null);
        });

        expect(marketingSwitch).toHaveProp('disabled', false);
      });

      it('saves the opt-out and adds traits when the opt-out sheet is confirmed', async () => {
        mockMetrics.isEnabled.mockReturnValue(true);
        arrangeNotificationPreferences({
          pushNotificationsEnabled: false,
          inAppNotificationsEnabled: true,
        });
        const { findByTestId, queryByTestId } = await turnMarketingOff(true);

        fireEvent.press(
          await findByTestId(
            `${MARKETING_CONSENT_OPT_OUT_SHEET_TEST_ID}-confirm`,
          ),
        );

        await waitFor(() => {
          expect(mockMessengerCall).toHaveBeenCalledWith(
            SET_MARKETING_CONSENT_ACTION,
            false,
          );
          expect(mockAnalytics.identify).toHaveBeenCalledWith({
            has_marketing_consent: false,
          });
          expect(
            queryByTestId(MARKETING_CONSENT_OPT_OUT_SHEET_TEST_ID),
          ).not.toBeOnTheScreen();
        });
      });

      it('keeps the opt-out sheet open with an error when saving the opt-out fails', async () => {
        mockMessengerCall.mockImplementation(async (action: string) => {
          if (action === GET_NOTIFICATION_PREFERENCES_ACTION) {
            return {
              marketing: {
                pushNotificationsEnabled: true,
                inAppNotificationsEnabled: true,
              },
            };
          }
          throw new Error('AUS error');
        });
        const { findByTestId, getByTestId } = await turnMarketingOff(true);

        fireEvent.press(
          await findByTestId(
            `${MARKETING_CONSENT_OPT_OUT_SHEET_TEST_ID}-confirm`,
          ),
        );

        expect(
          await findByTestId(
            `${MARKETING_CONSENT_OPT_OUT_SHEET_TEST_ID}-error`,
          ),
        ).toBeOnTheScreen();
        expect(
          getByTestId(MARKETING_CONSENT_OPT_OUT_SHEET_TEST_ID),
        ).toBeOnTheScreen();
        expect(mockAnalytics.identify).not.toHaveBeenCalled();
      });

      it.each([
        {
          scenario: 'signed in with no marketing notification channel on',
          isSignedIn: true,
          arrange: () =>
            arrangeNotificationPreferences({
              pushNotificationsEnabled: false,
              inAppNotificationsEnabled: false,
            }),
        },
        {
          scenario: 'signed in without stored notification preferences',
          isSignedIn: true,
          arrange: () => arrangeNotificationPreferences(null),
        },
        {
          scenario: 'signed in and reading notification preferences fails',
          isSignedIn: true,
          arrange: () =>
            mockMessengerCall.mockRejectedValue(new Error('AUS error')),
        },
        {
          scenario: 'signed out',
          isSignedIn: false,
          arrange: () =>
            arrangeNotificationPreferences({
              pushNotificationsEnabled: true,
              inAppNotificationsEnabled: true,
            }),
        },
      ])(
        'turns marketing off without the opt-out sheet when $scenario',
        async ({ isSignedIn, arrange }) => {
          arrange();

          const { queryByTestId, store } = await turnMarketingOff(isSignedIn);

          await waitFor(() => {
            expect(store.getState().security.dataCollectionForMarketing).toBe(
              false,
            );
          });
          expect(
            queryByTestId(MARKETING_CONSENT_OPT_OUT_SHEET_TEST_ID),
          ).not.toBeOnTheScreen();
          if (!isSignedIn) {
            expect(mockMessengerCall).not.toHaveBeenCalledWith(
              GET_NOTIFICATION_PREFERENCES_ACTION,
            );
          }
        },
      );
    });
  });
});
