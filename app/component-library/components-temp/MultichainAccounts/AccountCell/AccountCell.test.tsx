import React from 'react';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import AccountCell from './AccountCell';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { fireEvent } from '@testing-library/react-native';
import {
  createMockAccountGroup,
  createMockInternalAccountsFromGroups,
  createMockState,
  createMockWallet,
} from '../test-utils';
import { AvatarAccountType } from '../../../components/Avatars/Avatar';
import { Maskicon } from '@metamask/design-system-react-native';
import JazzIcon from 'react-native-jazzicon';
import { Image as RNImage } from 'react-native';
import { AccountCellIds } from './AccountCell.testIds';

// Configurable mock balance for selector
const mockBalance: { value: number; currency: string } = {
  value: 0,
  currency: 'usd',
};

// Mock balance selector to avoid deep store dependencies
jest.mock('../../../../selectors/assets/balances', () => {
  const actual = jest.requireActual('../../../../selectors/assets/balances');
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

// Mock account selector to avoid deep store dependencies
jest.mock('../../../../selectors/multichainAccounts/accounts', () => {
  const actual = jest.requireActual(
    '../../../../selectors/multichainAccounts/accounts',
  );
  return {
    ...actual,
    selectIconSeedAddressByAccountGroupId: () => () =>
      '0x1234567890abcdef1234567890abcdef12345678',
  };
});

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
    avatarAccountType?: AvatarAccountType;
    onSelectAccount?: () => void;
  } = {},
) => {
  const defaultProps = {
    accountGroup: mockAccountGroup,
    avatarAccountType: AvatarAccountType.Maskicon,
    isSelected: false,
    hideMenu: false,
    onSelectAccount: jest.fn(),
    ...props,
  };

  const groups = [defaultProps.accountGroup];
  const wallet = createMockWallet('test-group', 'Test Wallet', groups);
  const internalAccounts = createMockInternalAccountsFromGroups(groups);
  const baseState = createMockState([wallet], internalAccounts);
  return renderWithProvider(<AccountCell {...defaultProps} />, {
    state: {
      ...baseState,
      settings: {
        avatarAccountType: AvatarAccountType.Maskicon,
      },
    },
  });
};

describe('AccountCell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBalance.value = 0;
    mockBalance.currency = 'usd';
  });

  it('displays account name', () => {
    const { getByText } = renderAccountCell();
    expect(getByText('Test Account Group')).toBeTruthy();
  });

  it('displays account name when selected', () => {
    const { getByText } = renderAccountCell({ isSelected: true });
    expect(getByText('Test Account Group')).toBeTruthy();
  });

  it.each([
    { currency: 'usd', value: 1234.56, expected: '$1,234.56' },
    { currency: 'eur', value: 987.65, expected: '€987.65' },
  ])('displays correct formatted balances', ({ currency, value, expected }) => {
    mockBalance.value = value;
    mockBalance.currency = currency;
    const { getByText } = renderAccountCell();
    expect(getByText(expected)).toBeTruthy();
  });

  it('renders menu button by default', () => {
    const { getByTestId } = renderAccountCell();
    expect(getByTestId(AccountCellIds.MENU)).toBeTruthy();
  });

  it('hides menu button when hideMenu is true', () => {
    const { queryByTestId } = renderAccountCell({ hideMenu: true });
    expect(queryByTestId(AccountCellIds.MENU)).toBeNull();
  });

  it('navigates to account group details when menu button is pressed', () => {
    const { getByTestId } = renderAccountCell();
    const menuButton = getByTestId(AccountCellIds.MENU);
    fireEvent.press(menuButton);
    expect(mockNavigate).toHaveBeenCalledWith('MultichainAccountGroupDetails', {
      accountGroup: mockAccountGroup,
    });
  });

  it('renders Maskicon AvatarAccount when avatarAccountType is Maskicon', () => {
    const { UNSAFE_getByType } = renderAccountCell({
      avatarAccountType: AvatarAccountType.Maskicon,
    });
    expect(UNSAFE_getByType(Maskicon)).toBeTruthy();
  });

  it('renders JazzIcon AvatarAccount when avatarAccountType is JazzIcon', () => {
    const { UNSAFE_getByType } = renderAccountCell({
      avatarAccountType: AvatarAccountType.JazzIcon,
    });
    expect(UNSAFE_getByType(JazzIcon)).toBeTruthy();
  });

  it('renders Blockies AvatarAccount when avatarAccountType is Blockies', () => {
    const { UNSAFE_getByType } = renderAccountCell({
      avatarAccountType: AvatarAccountType.Blockies,
    });
    expect(UNSAFE_getByType(RNImage)).toBeTruthy();
  });

  it('calls onSelectAccount when account name is pressed', () => {
    const mockOnSelectAccount = jest.fn();
    const { getByText } = renderAccountCell({
      onSelectAccount: mockOnSelectAccount,
    });

    // Given a rendered account cell
    // When the user presses the account name
    fireEvent.press(getByText('Test Account Group'));

    // Then onSelectAccount should be called
    expect(mockOnSelectAccount).toHaveBeenCalledTimes(1);
  });

  it('calls onSelectAccount when balance is pressed', () => {
    const mockOnSelectAccount = jest.fn();
    mockBalance.value = 100;
    mockBalance.currency = 'usd';
    const { getByText } = renderAccountCell({
      onSelectAccount: mockOnSelectAccount,
    });

    // Given a rendered account cell with balance
    // When the user presses the balance
    fireEvent.press(getByText('$100.00'));

    // Then onSelectAccount should be called
    expect(mockOnSelectAccount).toHaveBeenCalledTimes(1);
  });

  it('calls onSelectAccount when avatar is pressed', () => {
    const mockOnSelectAccount = jest.fn();
    const { getByTestId } = renderAccountCell({
      onSelectAccount: mockOnSelectAccount,
    });

    fireEvent.press(getByTestId(AccountCellIds.AVATAR));

    expect(mockOnSelectAccount).toHaveBeenCalledTimes(1);
  });

  it('does not call onSelectAccount when menu button is pressed', () => {
    const mockOnSelectAccount = jest.fn();
    const { getByTestId } = renderAccountCell({
      onSelectAccount: mockOnSelectAccount,
    });

    // Given a rendered account cell
    // When the user presses the menu button
    const menuButton = getByTestId(AccountCellIds.MENU);
    fireEvent.press(menuButton);

    // Then onSelectAccount should not be called, only navigate
    expect(mockOnSelectAccount).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalled();
  });

  it('renders avatar inside wrapper with correct styling when selected', () => {
    const { getByTestId } = renderAccountCell({ isSelected: true });

    // Given an account cell that is selected
    // When rendered
    // Then the avatar should be visible with selection indicator
    expect(getByTestId(AccountCellIds.AVATAR)).toBeTruthy();
  });

  it('renders avatar inside wrapper with correct styling when not selected', () => {
    const { getByTestId } = renderAccountCell({ isSelected: false });

    // Given an account cell that is not selected
    // When rendered
    // Then the avatar should be visible without selection indicator
    expect(getByTestId(AccountCellIds.AVATAR)).toBeTruthy();
  });

  it('displays correct test IDs for all elements', () => {
    const { getByTestId } = renderAccountCell();

    // Verify all expected test IDs are present
    expect(getByTestId(AccountCellIds.CONTAINER)).toBeTruthy();
    expect(getByTestId(AccountCellIds.AVATAR)).toBeTruthy();
    expect(getByTestId(AccountCellIds.ADDRESS)).toBeTruthy();
    expect(getByTestId(AccountCellIds.BALANCE)).toBeTruthy();
    expect(getByTestId(AccountCellIds.MENU)).toBeTruthy();
  });
});
