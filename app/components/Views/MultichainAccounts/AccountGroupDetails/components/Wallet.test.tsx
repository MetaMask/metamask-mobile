import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { Wallet } from './Wallet';
import { strings } from '../../../../../../locales/i18n';
import { AccountDetailsIds } from '../../AccountDetails.testIds';
import { AccountWalletObject } from '@metamask/account-tree-controller';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

const mockWallet = {
  id: 'keyring:mock-wallet-id',
  metadata: {
    name: 'Test Wallet',
    keyring: {
      type: 'simple',
    },
  },
  type: 'keyring',
  groups: {},
} as unknown as AccountWalletObject;

describe('Wallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with wallet', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <Wallet wallet={mockWallet} />,
    );

    expect(
      getByText(strings('multichain_accounts.account_details.wallet')),
    ).toBeTruthy();
    expect(getByText('Test Wallet')).toBeTruthy();
    expect(getByTestId(AccountDetailsIds.WALLET_NAME_LINK)).toBeTruthy();
  });

  it('navigates to wallet details when pressed', () => {
    const { getByTestId } = renderWithProvider(<Wallet wallet={mockWallet} />);

    const button = getByTestId(AccountDetailsIds.WALLET_NAME_LINK);
    fireEvent.press(button);

    expect(mockNavigate).toHaveBeenCalledWith('MultichainWalletDetails', {
      walletId: 'keyring:mock-wallet-id',
    });
  });

  it('handles null wallet gracefully', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <Wallet wallet={null} />,
    );

    expect(
      getByText(strings('multichain_accounts.account_details.wallet')),
    ).toBeTruthy();
    expect(getByTestId(AccountDetailsIds.WALLET_NAME_LINK)).toBeTruthy();
  });
});
