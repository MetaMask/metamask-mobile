import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { Account } from '../../../../hooks/useAccounts';
import { AccountSelection } from './account-selection';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { createMockInternalAccount } from '../../../../../util/test/accountsControllerTestUtils';
import { KeyringTypes } from '@metamask/keyring-controller';
import { getAllByTestId, getByRole } from '@testing-library/react';
import { Hex } from '@metamask/utils';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

const mockAccounts = [
  {
    id: '94b520b3-a0c9-4cbd-a689-441a01630331',
    name: 'Account 1',
    address: '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
    type: 'HD Key Tree',
    isSelected: false,
    assets: { fiatBalance: '$ 0.26\n1.00003 ETH' },
  },
  {
    id: '023043ce-6c62-4cab-bf91-8939553a68f2',
    name: 'Account 2',
    address: '0x089595380921f555d52AB6f5a49defdAaB23B444',
    type: 'HD Key Tree',
    isSelected: true,
    assets: { fiatBalance: '$ 0.09\n0.00003 ETH' },
  },
  {
    id: '3fb381cd-76e5-4edb-81f4-b5133b115a8e',
    name: 'Account 3',
    address: '0xa4A80ce0AFDfb8E6bd1221D3b18a1653EEE6d19d',
    type: 'HD Key Tree',
    isSelected: false,
    assets: { fiatBalance: '$ 0.10\n0.00004 ETH' },
  },
];

const createInternalAccount = (account: Account) =>
  createMockInternalAccount(
    account.address,
    account.name,
    account.type as KeyringTypes,
  ) as InternalAccount;

const mockState = {
  engine: {
    backgroundState: {
      AccountsController: {
        internalAccounts: {
          accounts: {
            [mockAccounts[0].id]: createInternalAccount(
              mockAccounts[0] as Account,
            ),
            [mockAccounts[1].id]: createInternalAccount(
              mockAccounts[1] as Account,
            ),
            [mockAccounts[2].id]: createInternalAccount(
              mockAccounts[2] as Account,
            ),
          },
        },
      },
      KeyringController: {
        keyrings: [],
      },
      MultichainNetworkController: {
        networksWithTransactionActivity: {},
      },
    },
  },
};

const mockOnClose = jest.fn();
const mockSetSelectedAddresses = jest.fn();

const renderComponent = (selectedAddresses: Hex[] = []) =>
  renderWithProvider(
    <AccountSelection
      accounts={mockAccounts as Account[]}
      ensByAccountAddress={{}}
      onClose={mockOnClose}
      selectedAddresses={selectedAddresses}
      setSelectedAddresses={mockSetSelectedAddresses}
    />,
    {
      state: mockState,
    },
  );

describe('SmartContractWithLogo', () => {
  afterEach(() => {
    mockOnClose.mockClear();
    mockSetSelectedAddresses.mockClear();
  });

  it('renders correctly', () => {
    const { getByText } = renderComponent();
    expect(getByText('Edit Accounts')).toBeTruthy();
    expect(getByText('Select all')).toBeTruthy();
    expect(getByText('Account 1')).toBeTruthy();
    expect(getByText('Account 2')).toBeTruthy();
    expect(getByText('Account 3')).toBeTruthy();
  });

  it('calls onClose prop when close button is clicked', () => {
    const { getByTestId, getByText, queryByText } = renderComponent();

    fireEvent.press(getByTestId('account_selection_close'));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls mockSetSelectedAddresses with all account when select all is clicked', () => {
    const { getByTestId } = renderComponent();

    fireEvent.press(getByTestId('account_selection_select_all'));
    expect(mockSetSelectedAddresses).toHaveBeenCalledTimes(1);
    expect(mockSetSelectedAddresses).toHaveBeenCalledWith([
      '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
      '0x089595380921f555d52AB6f5a49defdAaB23B444',
      '0xa4A80ce0AFDfb8E6bd1221D3b18a1653EEE6d19d',
    ]);
  });

  it('calls mockSetSelectedAddresses with empty array is account were already selected and select all is clicked', () => {
    const { getAllByTestId } = renderComponent([
      mockAccounts[0].address as Hex,
      mockAccounts[1].address as Hex,
      mockAccounts[2].address as Hex,
    ]);

    fireEvent.press(getAllByTestId('account_selection_select_all')[0]);
    expect(mockSetSelectedAddresses).toHaveBeenCalledTimes(1);
    expect(mockSetSelectedAddresses).toHaveBeenCalledWith([]);
  });

  it('calls mockSetSelectedAddresses single account when an account checkbox is clicked', () => {
    const { getAllByTestId } = renderComponent();

    fireEvent.press(getAllByTestId('cellmultiselect')[0]);
    expect(mockSetSelectedAddresses).toHaveBeenCalledTimes(1);
    expect(mockSetSelectedAddresses).toHaveBeenCalledWith([
      mockAccounts[0].address,
    ]);
  });
});
