import React from 'react';
import { StackActions } from '@react-navigation/native';
import { screen, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import Routes from '../../../../constants/navigation/Routes';
import NotificationSettingsSection, {
  type NotificationSettingsSectionProps,
} from './NotificationSettingsSection';

const mockDispatch = jest.fn();
const mockGoBack = jest.fn();
const mockUpdatePreference = jest.fn();
let mockIsMetamaskNotificationsEnabled = true;

const mockPreferences = {
  walletActivity: {
    pushNotificationsEnabled: true,
    inAppNotificationsEnabled: true,
    accounts: [],
  },
  perps: {
    pushNotificationsEnabled: true,
    inAppNotificationsEnabled: true,
  },
  socialAI: {
    pushNotificationsEnabled: true,
    inAppNotificationsEnabled: true,
    txAmountLimit: 500,
    mutedTraderProfileIds: [],
  },
  marketing: {
    pushNotificationsEnabled: false,
    inAppNotificationsEnabled: false,
  },
};

jest.mock('../../../../selectors/notifications', () => ({
  selectIsMetamaskNotificationsEnabled: () =>
    mockIsMetamaskNotificationsEnabled,
}));

jest.mock('./hooks/useNotificationStoragePreferences', () => ({
  useNotificationStoragePreferences: () => ({
    preferences: mockPreferences,
    updatePreference: mockUpdatePreference,
  }),
}));

jest.mock('./SocialAINotificationPreferencesContent', () => () => null);

const marketingDisclaimer =
  'By turning this on, you agree to receive product news and marketing updates from MetaMask.';

const renderSection = (
  params: NotificationSettingsSectionProps['route']['params'] = {
    type: 'socialAI',
    title: 'Trading Signals',
    description: 'SocialAI notification preferences',
  },
) =>
  renderWithProvider(
    <NotificationSettingsSection
      navigation={
        {
          dispatch: mockDispatch,
          goBack: mockGoBack,
        } as unknown as NotificationSettingsSectionProps['navigation']
      }
      route={
        {
          params,
        } as unknown as NotificationSettingsSectionProps['route']
      }
    />,
  );

describe('NotificationSettingsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsMetamaskNotificationsEnabled = true;
  });

  it('renders section preferences when global notifications are enabled', () => {
    renderSection();

    expect(screen.getByText('Notifications')).toBeOnTheScreen();
    expect(screen.getByText('Trading Signals')).toBeOnTheScreen();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('renders the marketing disclaimer for marketing preferences', () => {
    renderSection({
      type: 'marketing',
      title: 'Updates and Rewards',
      description: 'Product updates, feature announcements, and new releases',
    });

    expect(screen.getByText(marketingDisclaimer)).toBeOnTheScreen();
  });

  it('redirects to notification settings when global notifications are disabled', async () => {
    mockIsMetamaskNotificationsEnabled = false;

    renderSection();

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        StackActions.replace(Routes.SETTINGS.NOTIFICATIONS),
      );
    });
    expect(screen.queryByText('Trading Signals')).toBeNull();
  });
});
