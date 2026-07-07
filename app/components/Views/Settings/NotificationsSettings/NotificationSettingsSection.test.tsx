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
let mockIsUpdatingPreferences = false;

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
  agenticCli: {
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
    isUpdatingPreferences: mockIsUpdatingPreferences,
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
    mockIsUpdatingPreferences = false;
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
      title: 'Wallet activity',
      description: 'Buy, sells, transfers, swaps',
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
      title: 'Wallet activity',
      description: 'Buy, sells, transfers, swaps',
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

  it('keeps channel toggles enabled while preference save is in flight', () => {
    mockIsUpdatingPreferences = true;
    renderSection();

    const pushToggle = screen.getByTestId(
      NotificationSettingsViewSelectorsIDs.PUSH_NOTIFICATIONS_TOGGLE,
    );
    const inAppToggle = screen.getByTestId(
      NotificationSettingsViewSelectorsIDs.FEATURE_ANNOUNCEMENTS_TOGGLE,
    );

    expect(pushToggle.props.disabled).not.toBe(true);
    expect(inAppToggle.props.disabled).not.toBe(true);
  });

  it('keeps channel toggle value optimistic while preference save is in flight without disabling toggles', async () => {
    let resolveUpdate: () => void = () => undefined;
    mockUpdateSectionChannel.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveUpdate = resolve;
      }),
    );
    renderSection({
      type: 'walletActivity',
      title: 'Wallet activity',
      description: 'Buy, sells, transfers, swaps',
    });

    const pushToggle = screen.getByTestId(
      NotificationSettingsViewSelectorsIDs.PUSH_NOTIFICATIONS_TOGGLE,
    );
    const inAppToggle = screen.getByTestId(
      NotificationSettingsViewSelectorsIDs.FEATURE_ANNOUNCEMENTS_TOGGLE,
    );

    fireEvent(pushToggle, 'onValueChange', false);

    await waitFor(() => {
      expect(pushToggle.props.value).toBe(false);
      expect(pushToggle.props.disabled).not.toBe(true);
      expect(inAppToggle.props.disabled).not.toBe(true);
    });
    expect(mockUpdateSectionChannel).toHaveBeenCalledWith(
      'walletActivity',
      'pushNotificationsEnabled',
      false,
    );

    await act(async () => {
      resolveUpdate();
      await Promise.resolve();
    });
  });

  it('keeps the latest rapid channel toggle intent visible while writes are pending', async () => {
    let resolveFirstUpdate: () => void = () => undefined;
    mockUpdateSectionChannel
      .mockReturnValueOnce(
        new Promise<void>((resolve) => {
          resolveFirstUpdate = resolve;
        }),
      )
      .mockResolvedValueOnce(undefined);
    renderSection({
      type: 'walletActivity',
      title: 'Wallet activity',
      description: 'Buy, sells, transfers, swaps',
    });

    fireEvent(
      screen.getByTestId(
        NotificationSettingsViewSelectorsIDs.PUSH_NOTIFICATIONS_TOGGLE,
      ),
      'onValueChange',
      false,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId(
          NotificationSettingsViewSelectorsIDs.PUSH_NOTIFICATIONS_TOGGLE,
        ).props.value,
      ).toBe(false);
    });

    fireEvent(
      screen.getByTestId(
        NotificationSettingsViewSelectorsIDs.PUSH_NOTIFICATIONS_TOGGLE,
      ),
      'onValueChange',
      true,
    );

    await waitFor(() => {
      expect(mockUpdateSectionChannel).toHaveBeenCalledTimes(2);
      expect(
        screen.getByTestId(
          NotificationSettingsViewSelectorsIDs.PUSH_NOTIFICATIONS_TOGGLE,
        ).props.value,
      ).toBe(true);
    });
    expect(mockUpdateSectionChannel).toHaveBeenNthCalledWith(
      1,
      'walletActivity',
      'pushNotificationsEnabled',
      false,
    );
    expect(mockUpdateSectionChannel).toHaveBeenNthCalledWith(
      2,
      'walletActivity',
      'pushNotificationsEnabled',
      true,
    );

    await act(async () => {
      resolveFirstUpdate();
      await Promise.resolve();
    });
  });
});
