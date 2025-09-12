import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import AccountListCell from './AccountListCell';
import {
  createMockAccountGroup,
  createMockInternalAccountsFromGroups,
  createMockState,
  createMockWallet,
} from '../../test-utils';
import { AvatarAccountType } from '../../../../components/Avatars/Avatar';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// Configurable mock balance for selector, avoids deep store dependencies
const mockBalance = { value: 0, currency: 'usd' };

jest.mock('../../../../../selectors/assets/balances', () => {
  const actual = jest.requireActual('../../../../../selectors/assets/balances');
  return {
    ...actual,
    selectBalanceByAccountGroup: (groupId: string) => () => ({
      walletId: groupId.split('/')[0],
      groupId,
      totalBalanceInUserCurrency: mockBalance.value,
      userCurrency: mockBalance.currency,
    }),
  };
});

const mockAccountGroup = createMockAccountGroup(
  'keyring:test-group/ethereum',
  'Test Account',
  ['account-1'],
);

describe('AccountListCell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with account data', () => {
    const mockOnSelectAccount = jest.fn();
    const groups = [mockAccountGroup];
    const wallet = createMockWallet('test-group', 'Test Wallet', groups);
    const internalAccounts = createMockInternalAccountsFromGroups(groups);
    const baseState = createMockState([wallet], internalAccounts);
    const { getByText } = renderWithProvider(
      <AccountListCell
        accountGroup={mockAccountGroup}
        avatarAccountType={AvatarAccountType.Maskicon}
        isSelected={false}
        onSelectAccount={mockOnSelectAccount}
      />,
      {
        state: {
          ...baseState,
          settings: { avatarAccountType: 'Maskicon' },
        },
      },
    );
    expect(getByText('Test Account')).toBeTruthy();
  });

  it('calls onSelectAccount when pressed', () => {
    const mockOnSelectAccount = jest.fn();
    const groups2 = [mockAccountGroup];
    const wallet2 = createMockWallet('test-group', 'Test Wallet', groups2);
    const internalAccounts2 = createMockInternalAccountsFromGroups(groups2);
    const baseState2 = createMockState([wallet2], internalAccounts2);
    const { getByText } = renderWithProvider(
      <AccountListCell
        accountGroup={mockAccountGroup}
        avatarAccountType={AvatarAccountType.Maskicon}
        isSelected={false}
        onSelectAccount={mockOnSelectAccount}
      />,
      {
        state: {
          ...baseState2,
          settings: { avatarAccountType: 'Maskicon' },
        },
      },
    );
    // Given a rendered cell
    // When the user presses the account row
    // Then it calls onSelectAccount with the account group
    fireEvent.press(getByText('Test Account'));
    expect(mockOnSelectAccount).toHaveBeenCalledWith(mockAccountGroup);
  });
});
