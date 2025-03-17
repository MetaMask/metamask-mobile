import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { act, render } from '@testing-library/react-native';
import { TransactionType } from '@metamask/keyring-api';
import MultichainTransactionsView from './MultichainTransactionsView';
import { selectSolanaAccountTransactions } from '../../../selectors/multichain';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';

jest.useFakeTimers();

const mockUseTheme = jest.fn();
jest.mock('../../../util/theme', () => ({
  useTheme: () => mockUseTheme(),
}));
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));
jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));
jest.mock(
  '../../UI/MultichainTransactionListItem',
  () => 'MultichainTransactionListItem',
);

describe('MultichainTransactionsView', () => {
  const mockNavigation = { navigate: jest.fn() };
  const mockSelectedAddress = '7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV';

  const mockTransactions = [
    {
      id: 'tx-123',
      chainId: 'solana:mainnet',
      from: [{ address: '7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV' }],
      to: [{ address: '5FHwkrdxD5AKmYrGNQYV66qPt3YxmkBzMJ8youBGNFAY' }],
      value: '1500000000',
      type: TransactionType.Send,
      timestamp: 1742313600000,
    },
    {
      id: 'tx-456',
      chainId: 'solana:mainnet',
      from: [{ address: '5FHwkrdxD5AKmYrGNQYV66qPt3YxmkBzMJ8youBGNFAY' }],
      to: [{ address: '7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV' }],
      value: '2000000000',
      type: TransactionType.Receive,
      timestamp: 1742400000000,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectSelectedInternalAccountFormattedAddress) {
        return mockSelectedAddress;
      }
      if (selector === selectSolanaAccountTransactions) {
        return { transactions: mockTransactions };
      }
      return null;
    });
  });

  it('renders loading state initially', () => {
    const { getByTestId } = render(<MultichainTransactionsView />);
    expect(getByTestId('transactions-loading-indicator')).toBeTruthy();
  });

  it('handles case when transactions data is not available', async () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectSelectedInternalAccountFormattedAddress) {
        return mockSelectedAddress;
      }
      if (selector === selectSolanaAccountTransactions) {
        return null;
      }
      return null;
    });

    const { getByText, queryByTestId } = render(<MultichainTransactionsView />);

    act(() => {
      jest.runAllTimers();
    });

    expect(queryByTestId('transactions-loading-indicator')).toBeNull();
    expect(getByText('wallet.no_transactions')).toBeTruthy();
  });
});
