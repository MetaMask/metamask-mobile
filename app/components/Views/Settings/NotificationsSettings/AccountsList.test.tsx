import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { AccountsList } from './AccountsList';
// eslint-disable-next-line import/no-namespace
import * as AccountListHooksModule from './AccountsList.hooks';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar';
// eslint-disable-next-line import/no-namespace
import * as useSwitchNotificationsModule from '../../../../util/notifications/hooks/useSwitchNotifications';
import {
  NOTIFICATION_OPTIONS_TOGGLE_LOADING_TEST_ID,
  NOTIFICATION_OPTIONS_TOGGLE_CONTAINER_TEST_ID,
} from './NotificationOptionToggle';
import { NotificationSettingsViewSelectorsIDs } from '../../../../../e2e/selectors/Notifications/NotificationSettingsView.selectors';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockVar = any;

jest.mock(
  '../../../../util/notifications/hooks/useSwitchNotifications',
  () => ({
    useAccountNotificationsToggle: jest.fn(),
  }),
);

const ADDRESS_1 = '0xb2B92547A92C1aC55EAe3F6632Fa1aF87dc05a29'.toLowerCase();
const ADDRESS_2 = '0x700CcD8172BC3807D893883a730A1E0E6630F8EC'.toLowerCase();

const ACCOUNT_1_TEST_ID = {
  item: NOTIFICATION_OPTIONS_TOGGLE_CONTAINER_TEST_ID(
    NotificationSettingsViewSelectorsIDs.ACCOUNT_NOTIFICATION_TOGGLE(ADDRESS_1),
  ),
  itemLoading: NOTIFICATION_OPTIONS_TOGGLE_LOADING_TEST_ID(
    NotificationSettingsViewSelectorsIDs.ACCOUNT_NOTIFICATION_TOGGLE(ADDRESS_1),
  ),
  itemSwitch:
    NotificationSettingsViewSelectorsIDs.ACCOUNT_NOTIFICATION_TOGGLE(ADDRESS_1),
};
const ACCOUNT_2_TEST_ID = {
  item: NOTIFICATION_OPTIONS_TOGGLE_CONTAINER_TEST_ID(
    NotificationSettingsViewSelectorsIDs.ACCOUNT_NOTIFICATION_TOGGLE(ADDRESS_2),
  ),
  itemLoading: NOTIFICATION_OPTIONS_TOGGLE_LOADING_TEST_ID(
    NotificationSettingsViewSelectorsIDs.ACCOUNT_NOTIFICATION_TOGGLE(ADDRESS_2),
  ),
  itemSwitch:
    NotificationSettingsViewSelectorsIDs.ACCOUNT_NOTIFICATION_TOGGLE(ADDRESS_2),
};

describe('AccountList', () => {
  const arrangeMocks = () => {
    const createMockAccounts = (addresses: string[]) =>
      addresses.map((address, idx) => ({
        address,
        name: `My Account ${idx}`,
      }));

    const mockUseAccountProps = jest
      .spyOn(AccountListHooksModule, 'useAccountProps')
      .mockReturnValue({
        accounts: createMockAccounts([ADDRESS_1, ADDRESS_2]) as MockVar,
        accountAvatarType: AvatarAccountType.JazzIcon,
        accountAddresses: [ADDRESS_1, ADDRESS_2],
      });

    const mockRefetchAccountSettings = jest.fn();
    const createUseNotificationAccountListProps = () => ({
      isAnyAccountLoading: false,
      refetchAccountSettings: mockRefetchAccountSettings,
      isAccountLoading: jest
        .fn()
        .mockImplementation((address) => address === ADDRESS_1),
      isAccountEnabled: jest
        .fn()
        .mockImplementation((address) => address === ADDRESS_1),
    });
    const mockUseNotificationAccountListProps = jest
      .spyOn(AccountListHooksModule, 'useNotificationAccountListProps')
      .mockReturnValue(createUseNotificationAccountListProps());

    const mockOnToggle = jest.fn();
    const mockUseUpdateAccountSettings = jest
      .spyOn(useSwitchNotificationsModule, 'useAccountNotificationsToggle')
      .mockReturnValue({
        onToggle: mockOnToggle,
        error: null,
        loading: false,
      });

    return {
      createMockAccounts,
      mockUseAccountProps,
      mockRefetchAccountSettings,
      createUseNotificationAccountListProps,
      mockUseNotificationAccountListProps,
      mockOnToggle,
      mockUseUpdateAccountSettings,
    };
  };

  it('renders correctly', async () => {
    arrangeMocks();
    const { getByTestId, queryByTestId } = render(<AccountsList />);

    // Assert - Items exist
    expect(getByTestId(ACCOUNT_1_TEST_ID.item)).toBeTruthy();
    expect(getByTestId(ACCOUNT_2_TEST_ID.item)).toBeTruthy();

    // Assert - Item Loading
    expect(getByTestId(ACCOUNT_1_TEST_ID.itemLoading)).toBeTruthy();

    expect(queryByTestId(ACCOUNT_2_TEST_ID.itemLoading)).toBe(null);

    // Assert - Item Switch
    expect(queryByTestId(ACCOUNT_1_TEST_ID.itemSwitch)).toBe(null); // We are loading, so this is null
    expect(getByTestId(ACCOUNT_2_TEST_ID.itemSwitch).props.value).toBe(false); // The switch is set to false
  });

  it('disable switches when any account is loading', () => {
    const mocks = arrangeMocks();
    mocks.mockUseNotificationAccountListProps.mockReturnValue({
      ...mocks.createUseNotificationAccountListProps(),
      isAnyAccountLoading: true,
      isAccountLoading: () => false,
    });

    const { getByTestId } = render(<AccountsList />);

    // Assert switches are disabled since we are loading
    expect(getByTestId(ACCOUNT_1_TEST_ID.itemSwitch).props.disabled).toBe(true);
    expect(getByTestId(ACCOUNT_2_TEST_ID.itemSwitch).props.disabled).toBe(true);
  });

  it('invokes switch toggle logic when clicked', async () => {
    const mocks = arrangeMocks();
    mocks.mockUseNotificationAccountListProps.mockReturnValue({
      ...mocks.createUseNotificationAccountListProps(),
      isAnyAccountLoading: false,
      isAccountLoading: () => false,
    });

    const { getByTestId } = render(<AccountsList />);

    // Act
    const toggleSwitch = getByTestId(ACCOUNT_1_TEST_ID.itemSwitch);
    fireEvent(toggleSwitch, 'onChange', { nativeEvent: { value: false } });

    // Assert account was toggled, and we refetch all account notification toggles
    await waitFor(() => {
      expect(mocks.mockOnToggle).toHaveBeenCalled();
      expect(mocks.mockRefetchAccountSettings).toHaveBeenCalled();
    });
  });
});
