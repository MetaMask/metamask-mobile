import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AccountListCell from './AccountListCell';
import { createMockAccountGroup } from '../../test-utils';

const mockAccountGroup = createMockAccountGroup(
  'keyring:test-group/ethereum',
  'Test Account',
  ['account-1'],
);

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
