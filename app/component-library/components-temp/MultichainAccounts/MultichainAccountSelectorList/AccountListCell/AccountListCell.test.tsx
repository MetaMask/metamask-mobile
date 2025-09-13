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
import { RootState } from '../../../../../reducers';

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
        state: baseState,
      },
    );
    expect(getByText('Test Account')).toBeTruthy();
  });

  it('calls onSelectAccount when pressed', () => {
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
        state: baseState,
      },
    );
    // Given a rendered cell
    // When the user presses the account row
    // Then it calls onSelectAccount with the account group
    fireEvent.press(getByText('Test Account'));
    expect(mockOnSelectAccount).toHaveBeenCalledWith(mockAccountGroup);
  });

  describe('Checkbox functionality', () => {
    let baseState: RootState;

    beforeEach(() => {
      const groups = [mockAccountGroup];
      const wallet = createMockWallet('test-group', 'Test Wallet', groups);
      const internalAccounts = createMockInternalAccountsFromGroups(groups);
      baseState = createMockState([wallet], internalAccounts);
    });

    it('shows checkbox when showCheckbox prop is true', () => {
      const mockOnSelectAccount = jest.fn();
      const { getByTestId } = renderWithProvider(
        <AccountListCell
          accountGroup={mockAccountGroup}
          isSelected={false}
          onSelectAccount={mockOnSelectAccount}
          showCheckbox
          avatarAccountType={AvatarAccountType.Maskicon}
        />,
        { state: baseState },
      );

      expect(
        getByTestId(`account-checkbox-${mockAccountGroup.id}`),
      ).toBeTruthy();
    });

    it('hides checkbox when showCheckbox prop is false', () => {
      const mockOnSelectAccount = jest.fn();
      const { queryByTestId } = renderWithProvider(
        <AccountListCell
          accountGroup={mockAccountGroup}
          isSelected={false}
          onSelectAccount={mockOnSelectAccount}
          showCheckbox={false}
          avatarAccountType={AvatarAccountType.Maskicon}
        />,
        { state: baseState },
      );

      expect(
        queryByTestId(`account-checkbox-${mockAccountGroup.id}`),
      ).toBeFalsy();
    });

    it('hides checkbox by default when showCheckbox prop is not provided', () => {
      const mockOnSelectAccount = jest.fn();
      const { queryByTestId } = renderWithProvider(
        <AccountListCell
          accountGroup={mockAccountGroup}
          isSelected={false}
          onSelectAccount={mockOnSelectAccount}
          avatarAccountType={AvatarAccountType.Maskicon}
        />,
        { state: baseState },
      );

      expect(
        queryByTestId(`account-checkbox-${mockAccountGroup.id}`),
      ).toBeFalsy();
    });

    it('renders checked checkbox when isSelected is true', () => {
      const mockOnSelectAccount = jest.fn();
      const { getByTestId, getAllByTestId } = renderWithProvider(
        <AccountListCell
          accountGroup={mockAccountGroup}
          isSelected
          onSelectAccount={mockOnSelectAccount}
          showCheckbox
          avatarAccountType={AvatarAccountType.Maskicon}
        />,
        { state: baseState },
      );

      const checkboxElements = getAllByTestId(
        `account-checkbox-${mockAccountGroup.id}`,
      );
      expect(checkboxElements.length).toBeGreaterThan(0);
    });

    it('renders unchecked checkbox when isSelected is false', () => {
      const mockOnSelectAccount = jest.fn();
      const { getByTestId, queryByTestId } = renderWithProvider(
        <AccountListCell
          accountGroup={mockAccountGroup}
          isSelected={false}
          onSelectAccount={mockOnSelectAccount}
          showCheckbox
          avatarAccountType={AvatarAccountType.Maskicon}
        />,
        { state: baseState },
      );

      expect(
        getByTestId(`account-checkbox-${mockAccountGroup.id}`),
      ).toBeTruthy();
      expect(queryByTestId('checkbox-icon-component')).toBeFalsy();
    });

    it('calls onSelectAccount when checkbox is pressed', () => {
      const mockOnSelectAccount = jest.fn();
      const { getByTestId } = renderWithProvider(
        <AccountListCell
          accountGroup={mockAccountGroup}
          isSelected={false}
          onSelectAccount={mockOnSelectAccount}
          showCheckbox
          avatarAccountType={AvatarAccountType.Maskicon}
        />,
        { state: baseState },
      );

      const checkboxElement = getByTestId(
        `account-checkbox-${mockAccountGroup.id}`,
      );
      fireEvent.press(checkboxElement);

      expect(mockOnSelectAccount).toHaveBeenCalledWith(mockAccountGroup);
    });

    it('calls onSelectAccount when TouchableOpacity container is pressed with checkbox enabled', () => {
      const mockOnSelectAccount = jest.fn();
      const { getByText } = renderWithProvider(
        <AccountListCell
          accountGroup={mockAccountGroup}
          isSelected={false}
          onSelectAccount={mockOnSelectAccount}
          showCheckbox
          avatarAccountType={AvatarAccountType.Maskicon}
        />,
        { state: baseState },
      );

      fireEvent.press(getByText('Test Account'));

      expect(mockOnSelectAccount).toHaveBeenCalledWith(mockAccountGroup);
    });

    it('renders AccountCell with correct props when checkbox is shown', () => {
      const mockOnSelectAccount = jest.fn();
      const { getAllByTestId, getByTestId, getByText } = renderWithProvider(
        <AccountListCell
          accountGroup={mockAccountGroup}
          isSelected
          onSelectAccount={mockOnSelectAccount}
          showCheckbox
          avatarAccountType={AvatarAccountType.Maskicon}
        />,
        { state: baseState },
      );

      const checkboxes = getAllByTestId(
        `account-checkbox-${mockAccountGroup.id}`,
      );
      expect(checkboxes.length).toBeGreaterThan(0);
      const checkboxElements = getAllByTestId(
        `account-checkbox-${mockAccountGroup.id}`,
      );
      expect(checkboxElements.length).toBeGreaterThan(0); // Checkbox shown when checked
      expect(getByText('Test Account')).toBeTruthy();
    });
  });
});
