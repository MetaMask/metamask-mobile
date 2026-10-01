import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import NotificationsSettings from '.';
import { Props } from './NotificationsSettings.types';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar';
import { NotificationSettingsViewSelectorsIDs } from './NotificationSettingsView.testIds';
import {
  markCategoriesFetchSettled,
  type NotificationCategoryMetadata,
} from '../../../../util/notifications/categories';
import Logger from '../../../../util/Logger';
import { strings } from '../../../../../locales/i18n';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('7.72.0'),
}));

jest.mock('../../../UI/Perps/selectors/featureFlags', () => ({
  selectPerpsEnabledFlag: jest.fn().mockReturnValue(true),
}));

const createMockState = ({
  notificationsEnabled = false,
  socialLeaderboardEnabled = false,
  categories = [] as NotificationCategoryMetadata[],
  isFetchingCategories = false,
} = {}) => ({
  settings: {
    avatarAccountType: AvatarAccountType.Maskicon,
    basicFunctionalityEnabled: true,
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      NotificationServicesController: {
        ...backgroundState.NotificationServicesController,
        isNotificationServicesEnabled: notificationsEnabled,
        metamaskNotificationsCategories: categories,
        isFetchingMetamaskNotificationsCategories: isFetchingCategories,
      },
      RemoteFeatureFlagController: {
        ...backgroundState.RemoteFeatureFlagController,
        remoteFeatureFlags: {
          ...backgroundState.RemoteFeatureFlagController.remoteFeatureFlags,
          aiSocialLeaderboardEnabled: {
            enabled: socialLeaderboardEnabled,
            minimumVersion: '0.0.1',
          },
        },
      },
    },
  },
});

const setOptions = jest.fn();

const renderNotificationsSettings = (
  state = createMockState(),
  navigation = {
    setOptions,
    goBack: jest.fn(),
    navigate: jest.fn(),
  } as unknown as Props['navigation'],
) =>
  renderWithProvider(
    <NotificationsSettings
      navigation={navigation}
      route={{} as unknown as Props['route']}
    />,
    {
      state,
    },
  );

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

jest.mock(
  '../../../../util/notifications/services/NotificationService',
  () => ({
    getAllPermissions: jest.fn(),
  }),
);

jest.mock('./hooks/useNotificationStoragePreferences', () => ({
  useNotificationStoragePreferences: () => ({
    preferences: {
      walletActivity: {
        pushNotificationsEnabled: false,
        inAppNotificationsEnabled: false,
      },
      perps: {
        pushNotificationsEnabled: false,
        inAppNotificationsEnabled: false,
      },
      agenticCli: {
        pushNotificationsEnabled: false,
        inAppNotificationsEnabled: false,
      },
      socialAI: {
        pushNotificationsEnabled: false,
        inAppNotificationsEnabled: false,
      },
      marketing: {
        pushNotificationsEnabled: false,
        inAppNotificationsEnabled: false,
      },
      priceAlerts: {
        pushNotificationsEnabled: false,
        inAppNotificationsEnabled: false,
      },
      card: {
        pushNotificationsEnabled: false,
        inAppNotificationsEnabled: false,
      },
      securityAlerts: {
        pushNotificationsEnabled: false,
        inAppNotificationsEnabled: false,
      },
    },
    isLoading: false,
    error: null,
    updatePreference: jest.fn(),
  }),
}));

const socialAISectionTitle = strings(
  'app_settings.notifications_opts.social_ai_title',
);
const priceAlertsSectionTitle = strings(
  'app_settings.notifications_opts.price_alerts_title',
);

describe('NotificationsSettings', () => {
  beforeAll(() => {
    markCategoriesFetchSettled();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders main notifications toggle', () => {
    const { getByTestId } = renderNotificationsSettings();

    expect(
      getByTestId(NotificationSettingsViewSelectorsIDs.NOTIFICATIONS_TOGGLE),
    ).toBeOnTheScreen();
  });

  it('renders social AI section when social leaderboard feature flag is enabled', () => {
    const state = createMockState({
      notificationsEnabled: true,
      socialLeaderboardEnabled: true,
    });

    const { getByText } = renderNotificationsSettings(state);

    expect(getByText(socialAISectionTitle)).toBeOnTheScreen();
  });

  it('hides social AI section when social leaderboard feature flag is disabled', () => {
    const state = createMockState({
      notificationsEnabled: true,
      socialLeaderboardEnabled: false,
    });

    const { queryByText } = renderNotificationsSettings(state);

    expect(queryByText(socialAISectionTitle)).toBeNull();
  });

  it('renders price alerts section when notifications are enabled', () => {
    const state = createMockState({
      notificationsEnabled: true,
      categories: [
        {
          category_id: 'price_alerts',
          aus_keys: ['priceAlerts'],
          visible_on: ['mobile'],
          notification_types: ['price_alerts'],
        },
      ],
    });

    const { getByText } = renderNotificationsSettings(state);

    expect(getByText(priceAlertsSectionTitle)).toBeOnTheScreen();
  });

  it('hides price alerts section when notifications are disabled', () => {
    const state = createMockState({
      notificationsEnabled: false,
    });

    const { queryByText } = renderNotificationsSettings(state);

    expect(queryByText(priceAlertsSectionTitle)).toBeNull();
  });

  describe('backend-driven rows', () => {
    const backendCategory = (
      category_id: string,
      aus_keys: string[],
      visible_on: NotificationCategoryMetadata['visible_on'] = ['mobile'],
    ): NotificationCategoryMetadata => ({
      category_id,
      aus_keys,
      visible_on,
      notification_types: [],
    });

    it('renders only backend categories, resolved by aus key', () => {
      const state = createMockState({
        notificationsEnabled: true,
        categories: [backendCategory('trading_activity', ['perps'])],
      });

      const { getByText, queryByText } = renderNotificationsSettings(state);

      expect(
        getByText(strings('app_settings.notifications_opts.perps_title')),
      ).toBeOnTheScreen();
      expect(queryByText(priceAlertsSectionTitle)).toBeNull();
    });

    it('logs once and hides a category with aus keys but no known section', () => {
      const loggerSpy = jest.spyOn(Logger, 'error').mockImplementation();
      const state = createMockState({
        notificationsEnabled: true,
        categories: [backendCategory('mystery', ['mystery'])],
      });

      renderNotificationsSettings(state);

      expect(loggerSpy).toHaveBeenCalledTimes(1);
    });

    it('silently skips display-only categories', () => {
      const loggerSpy = jest.spyOn(Logger, 'error').mockImplementation();
      const state = createMockState({
        notificationsEnabled: true,
        categories: [backendCategory('announcements', [])],
      });

      renderNotificationsSettings(state);

      expect(loggerSpy).not.toHaveBeenCalled();
    });

    it('shows no rows while categories are loading', () => {
      const state = createMockState({
        notificationsEnabled: true,
        isFetchingCategories: true,
      });

      const { queryByText } = renderNotificationsSettings(state);

      expect(queryByText(priceAlertsSectionTitle)).toBeNull();
    });
  });
});
