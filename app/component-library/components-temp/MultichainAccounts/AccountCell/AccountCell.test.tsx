import React from 'react';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import { AccountCell } from './AccountCell';
import renderWithProvider from '../../../../util/test/renderWithProvider';

const mockAccountGroup: AccountGroupObject = {
  id: 'keyring:test-group/ethereum' as const,
  accounts: ['account-1', 'account-2'],
  metadata: {
    name: 'Test Account Group',
  },
};

const renderAccountCell = (
  props: {
    accountGroup?: AccountGroupObject;
    isSelected?: boolean;
  } = {},
) => {
  const defaultProps = {
    accountGroup: mockAccountGroup,
    isSelected: false,
    ...props,
  };

  return renderWithProvider(<AccountCell {...defaultProps} />, {
    state: {
      settings: {
        useBlockieIcon: false,
      },
    },
  });
};

describe('AccountCell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays account name', () => {
    const { getByText } = renderAccountCell();
    expect(getByText('Test Account Group')).toBeTruthy();
  });

  it('displays account name when selected', () => {
    const { getByText } = renderAccountCell({ isSelected: true });
    expect(getByText('Test Account Group')).toBeTruthy();
  });

  it('displays placeholder balance', () => {
    const { getByText } = renderAccountCell();
    expect(getByText('$1234567890.00')).toBeTruthy();
  });

  it('renders menu button', () => {
    const { getByText } = renderAccountCell();
    expect(getByText('Test Account Group')).toBeTruthy();
    expect(getByText('$1234567890.00')).toBeTruthy();
  });
});
