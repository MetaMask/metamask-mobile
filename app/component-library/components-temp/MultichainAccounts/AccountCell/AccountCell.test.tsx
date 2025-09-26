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
  } = {},
) => {
  const defaultProps = {
    accountGroup: mockAccountGroup,
    avatarAccountType: AvatarAccountType.Maskicon,
    isSelected: false,
    hideMenu: false,
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
    expect(getByTestId('multichain-account-cell-menu')).toBeTruthy();
  });

  it('hides menu button when hideMenu is true', () => {
    const { queryByTestId } = renderAccountCell({ hideMenu: true });
    expect(queryByTestId('multichain-account-cell-menu')).toBeNull();
  });

  it('navigates to account group details when menu button is pressed', () => {
    const { getByTestId } = renderAccountCell();
    const menuButton = getByTestId('multichain-account-cell-menu');
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
});
