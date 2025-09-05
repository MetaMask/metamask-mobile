import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import AccountListCell from './AccountListCell';
import { createMockAccountGroup } from '../../test-utils';

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
  it('renders correctly with account data', () => {
    const mockOnSelectAccount = jest.fn();
    const { getByText } = renderWithProvider(
      <AccountListCell
        accountGroup={mockAccountGroup}
        isSelected={false}
        onSelectAccount={mockOnSelectAccount}
      />,
    );

    expect(getByText('Test Account')).toBeTruthy();
  });

  it('calls onSelectAccount when pressed', () => {
    const mockOnSelectAccount = jest.fn();
    const { getByText } = renderWithProvider(
      <AccountListCell
        accountGroup={mockAccountGroup}
        isSelected={false}
        onSelectAccount={mockOnSelectAccount}
      />,
    );

    fireEvent.press(getByText('Test Account'));
    expect(mockOnSelectAccount).toHaveBeenCalledWith(mockAccountGroup);
  });
});
