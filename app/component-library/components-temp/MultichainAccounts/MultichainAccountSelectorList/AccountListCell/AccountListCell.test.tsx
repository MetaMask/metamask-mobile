import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import { AccountGroupType } from '@metamask/account-api';

import AccountListCell from './AccountListCell';

const mockAccountGroup: AccountGroupObject = {
  id: 'keyring:test-group/ethereum' as const,
  type: AccountGroupType.SingleAccount,
  accounts: ['account-1'] as [string],
  metadata: {
    name: 'Test Account',
    pinned: false,
    hidden: false,
  },
};

describe('AccountListCell', () => {
  it('renders correctly with account data', () => {
    const mockOnSelectAccount = jest.fn();
    const { getByText } = render(
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
    const { getByText } = render(
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
