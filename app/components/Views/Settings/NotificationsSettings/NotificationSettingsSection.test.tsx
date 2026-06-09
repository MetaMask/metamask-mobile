import React from 'react';
import { StackActions } from '@react-navigation/native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import Routes from '../../../../constants/navigation/Routes';
import { NotificationSettingsViewSelectorsIDs } from './NotificationSettingsView.testIds';
import NotificationSettingsSection, {
  type NotificationSettingsSectionProps,
} from './NotificationSettingsSection';

const mockDispatch = jest.fn();
const mockGoBack = jest.fn();
const mockUpdateSectionChannel = jest.fn();
const mockToggleAllAccounts = jest.fn();
let mockIsMetamaskNotificationsEnabled = true;
let mockHasEnabledAccount = true;
let mockHasNotificationAccounts = true;
let mockIsUpdatingAllAccounts = false;

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
    updateSectionChannel: mockUpdateSectionChannel,
  }),
}));

jest.mock('./SocialAINotificationPreferencesContent', () => () => null);
jest.mock('./AccountsList', () => ({
  AccountsList: () => null,
}));
jest.mock('./AccountsList.hooks', () => ({
  useWalletActivityAccountSelection: () => ({
    accountProps: {},
    notificationAccountListProps: {},
    hasEnabledAccount: mockHasEnabledAccount,
    hasNotificationAccounts: mockHasNotificationAccounts,
    isUpdatingAllAccounts: mockIsUpdatingAllAccounts,
    toggleAllAccounts: mockToggleAllAccounts,
  }),
}));

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
    mockUpdateSectionChannel.mockResolvedValue(undefined);
    mockIsMetamaskNotificationsEnabled = true;
    mockHasEnabledAccount = true;
    mockHasNotificationAccounts = true;
    mockIsUpdatingAllAccounts = false;
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

  it('renders a wallet activity deselect all button when any account is enabled', () => {
    renderSection({
      type: 'walletActivity',
      title: 'Wallet Activity',
      description: 'Buy, sells, transfers, swaps and rewards',
    });

    const button = screen.getByTestId(
      NotificationSettingsViewSelectorsIDs.ACCOUNT_NOTIFICATIONS_SELECT_ALL,
    );
    expect(screen.getByText('Deselect all')).toBeOnTheScreen();

    fireEvent.press(button);

    expect(mockToggleAllAccounts).toHaveBeenCalledTimes(1);
  });

  it('renders a wallet activity select all button when every account is disabled', () => {
    mockHasEnabledAccount = false;

    renderSection({
      type: 'walletActivity',
      title: 'Wallet Activity',
      description: 'Buy, sells, transfers, swaps and rewards',
    });

    expect(screen.getByText('Select all')).toBeOnTheScreen();
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

  it('uses explicit next value for push notifications toggle', async () => {
    renderSection();

    const pushToggle = screen.getByTestId(
      NotificationSettingsViewSelectorsIDs.PUSH_NOTIFICATIONS_TOGGLE,
    );
    await act(async () => {
      fireEvent(pushToggle, 'onValueChange', false);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockUpdateSectionChannel).toHaveBeenCalledWith(
        'socialAI',
        'pushNotificationsEnabled',
        false,
      );
    });
  });

  it('uses explicit next value for in-app notifications toggle', async () => {
    renderSection();

    const inAppToggle = screen.getByTestId(
      NotificationSettingsViewSelectorsIDs.FEATURE_ANNOUNCEMENTS_TOGGLE,
    );
    await act(async () => {
      fireEvent(inAppToggle, 'onValueChange', false);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockUpdateSectionChannel).toHaveBeenCalledWith(
        'socialAI',
        'inAppNotificationsEnabled',
        false,
      );
    });
  });

  it('forwards rapid toggle events in order', async () => {
    renderSection();

    const pushToggle = screen.getByTestId(
      NotificationSettingsViewSelectorsIDs.PUSH_NOTIFICATIONS_TOGGLE,
    );
    await act(async () => {
      fireEvent(pushToggle, 'onValueChange', false);
      fireEvent(pushToggle, 'onValueChange', true);
      await Promise.resolve();
    });

    expect(mockUpdateSectionChannel).toHaveBeenNthCalledWith(
      1,
      'socialAI',
      'pushNotificationsEnabled',
      false,
    );
    await waitFor(() => {
      expect(mockUpdateSectionChannel).toHaveBeenCalledTimes(2);
    });
    expect(mockUpdateSectionChannel).toHaveBeenNthCalledWith(
      2,
      'socialAI',
      'pushNotificationsEnabled',
      true,
    );
  });
});
