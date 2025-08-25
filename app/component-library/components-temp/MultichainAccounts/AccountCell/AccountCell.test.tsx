import React from 'react';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import AccountCell from './AccountCell';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { fireEvent } from '@testing-library/react-native';
import { createMockAccountGroup } from '../test-utils';

// Mock navigation
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockAccountGroup = createMockAccountGroup(
  'keyring:test-group/ethereum',
  'Test Account Group',
  ['account-1'],
);

const renderAccountCell = (
  props: {
    accountGroup?: AccountGroupObject;
    isSelected?: boolean;
    hideMenu?: boolean;
  } = {},
) => {
  const defaultProps = {
    accountGroup: mockAccountGroup,
    isSelected: false,
    hideMenu: false,
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

  it('renders menu button by default', () => {
    const { getByTestId } = renderAccountCell();
    expect(getByTestId('multichain-account-cell-menu')).toBeTruthy();
  });

  it('hides menu button when hideMenu is true', () => {
    const { queryByTestId } = renderAccountCell({ hideMenu: true });
    expect(queryByTestId('multichain-account-cell-menu')).toBeNull();
  });

  it('navigates to account actions when menu button is pressed', () => {
    const { getByTestId } = renderAccountCell();
    const menuButton = getByTestId('multichain-account-cell-menu');
    fireEvent.press(menuButton);
    expect(mockNavigate).toHaveBeenCalledWith('MultichainAccountActions', {
      accountGroup: mockAccountGroup,
    });
  });
});
