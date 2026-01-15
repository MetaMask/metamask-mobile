import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
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
import { NotificationSettingsViewSelectorsIDs } from './NotificationSettingsView.testIds';
import { toFormattedAddress } from '../../../../util/address';
import { AccountGroupType, AccountWalletType } from '@metamask/account-api';
import renderWithProvider from '../../../../util/test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import * as AccountSelectorsModule from '../../../../selectors/multichainAccounts/accounts';
import initialRootState from '../../../../util/test/initial-root-state';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MockVar = any;

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

const ADDRESS_1 = '0xb2B92547A92C1aC55EAe3F6632Fa1aF87dc05a29'.toLowerCase();
const ADDRESS_2 = '0x700CcD8172BC3807D893883a730A1E0E6630F8EC'.toLowerCase();

// The component uses toFormattedAddress for testIDs, so we need the checksummed versions
const CHECKSUMMED_ADDRESS_1 = toFormattedAddress(ADDRESS_1);
const CHECKSUMMED_ADDRESS_2 = toFormattedAddress(ADDRESS_2);

const ACCOUNT_1_TEST_ID = {
  item: NOTIFICATION_OPTIONS_TOGGLE_CONTAINER_TEST_ID(
    NotificationSettingsViewSelectorsIDs.ACCOUNT_NOTIFICATION_TOGGLE(
      CHECKSUMMED_ADDRESS_1,
    ),
  ),
  itemLoading: NOTIFICATION_OPTIONS_TOGGLE_LOADING_TEST_ID(
    NotificationSettingsViewSelectorsIDs.ACCOUNT_NOTIFICATION_TOGGLE(
      CHECKSUMMED_ADDRESS_1,
    ),
  ),
  itemSwitch: NotificationSettingsViewSelectorsIDs.ACCOUNT_NOTIFICATION_TOGGLE(
    CHECKSUMMED_ADDRESS_1,
  ),
};
const ACCOUNT_2_TEST_ID = {
  item: NOTIFICATION_OPTIONS_TOGGLE_CONTAINER_TEST_ID(
    NotificationSettingsViewSelectorsIDs.ACCOUNT_NOTIFICATION_TOGGLE(
      CHECKSUMMED_ADDRESS_2,
    ),
  ),
  itemLoading: NOTIFICATION_OPTIONS_TOGGLE_LOADING_TEST_ID(
    NotificationSettingsViewSelectorsIDs.ACCOUNT_NOTIFICATION_TOGGLE(
      CHECKSUMMED_ADDRESS_2,
    ),
  ),
  itemSwitch: NotificationSettingsViewSelectorsIDs.ACCOUNT_NOTIFICATION_TOGGLE(
    CHECKSUMMED_ADDRESS_2,
  ),
};

describe('AccountList', () => {
  const arrangeSelectors = () => {
    jest
      .spyOn(AccountSelectorsModule, 'selectIconSeedAddressByAccountGroupId')
      .mockReturnValue((() => ADDRESS_1) as MockVar);
  };

  const arrangeMocks = () => {
    arrangeSelectors();

    const createMockAccounts = (addresses: string[]) =>
      addresses.map((address, idx) => ({
        address,
        name: `My Account ${idx}`,
      }));

    const createMockAccountGroup = (
      idx: number,
      accounts: [string, ...string[]],
    ) =>
      ({
        accounts,
        id: `entropy:111/${idx}`,
        type: AccountGroupType.MultichainAccount,
        metadata: {
          entropy: {
            groupIndex: idx,
          },
          hidden: false,
          name: `Account ${idx}`,
          pinned: false,
        },
      }) as const;

    const group1 = createMockAccountGroup(0, [
      `MOCK-ID-FOR-${CHECKSUMMED_ADDRESS_1}`,
      'MOCK-ID-FOR-63jw5Q7pJXeHgHSvfTmKytUQ19hQgiAJQ5LZykmSMGRY',
    ]);
    const group2 = createMockAccountGroup(1, [
      `MOCK-ID-FOR-${CHECKSUMMED_ADDRESS_2}`,
      'MOCK-ID-FOR-Agsjd8HjGH5DxiXLMWc8fR4jjgHhvJG3TXcCpc1ieD9B',
    ]);

    const mockUseAccountProps = jest
      .spyOn(AccountListHooksModule, 'useAccountProps')
      .mockReturnValue({
        accountAvatarType: AvatarAccountType.JazzIcon,
        firstHDWalletGroups: {
          title: 'Wallet 1',
          wallet: {
            id: 'entropy:wallet-1',
            type: AccountWalletType.Entropy,
            metadata: {
              entropy: {
                id: '',
              },
              name: 'Wallet 1',
            },
            status: 'ready',
            groups: {
              [group1.id]: group1,
              [group2.id]: group2,
            },
          },
          data: [group1, group2],
        },
      });

    const mockRefetchAccountSettings = jest.fn();
    const createUseNotificationAccountListProps = () => ({
      isAnyAccountLoading: false,
      refetchAccountSettings: mockRefetchAccountSettings,
      isAccountLoading: jest
        .fn()
        .mockImplementation((accountIds: string[]) =>
          accountIds.includes(`MOCK-ID-FOR-${CHECKSUMMED_ADDRESS_1}`),
        ),
      isAccountEnabled: jest
        .fn()
        .mockImplementation((accountIds: string[]) =>
          accountIds.includes(`MOCK-ID-FOR-${CHECKSUMMED_ADDRESS_1}`),
        ),
      getEvmAddress: jest
        .fn()
        .mockImplementation((accountIds: string) =>
          accountIds.at(0)?.replace('MOCK-ID-FOR-', ''),
        ),
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
    const { getByTestId, queryByTestId } = renderWithProvider(
      <AccountsList />,
      { state: initialRootState },
    );

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

    const { getByTestId } = renderWithProvider(<AccountsList />, {
      state: initialRootState,
    });

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

    const { getByTestId } = renderWithProvider(<AccountsList />, {
      state: initialRootState,
    });

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
