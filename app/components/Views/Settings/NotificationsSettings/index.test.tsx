import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import NotificationsSettings from '.';
import { Props } from './NotificationsSettings.types';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../../util/test/accountsControllerTestUtils';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar';
import { NotificationSettingsViewSelectorsIDs } from './NotificationSettingsView.testIds';
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
} = {}) => ({
  settings: {
    avatarAccountType: AvatarAccountType.Maskicon,
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      NotificationServicesController: {
        ...backgroundState.NotificationServicesController,
        isNotificationServicesEnabled: notificationsEnabled,
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

jest.mock('../../../UI/Notification/SwitchLoadingModal', () => () => null);

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
      socialAI: {
        pushNotificationsEnabled: false,
        inAppNotificationsEnabled: false,
      },
      marketing: {
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

describe('NotificationsSettings', () => {
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
});
