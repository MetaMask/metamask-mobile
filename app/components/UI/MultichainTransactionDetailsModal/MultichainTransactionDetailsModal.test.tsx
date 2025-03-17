import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TransactionType } from '@metamask/keyring-api';
import MultichainTransactionDetailsModal from './MultichainTransactionDetailsModal';
import { useMultichainTransactionDisplay } from '../../hooks/useMultichainTransactionDisplay';

const mockUseTheme = jest.fn();
jest.mock('../../../util/theme', () => ({
  useTheme: () => mockUseTheme(),
}));

jest.mock('../../hooks/useMultichainTransactionDisplay');
jest.mock('../../../util/date', () => ({
  toDateFormat: jest.fn(() => 'Mar 15, 2025'),
}));
jest.mock('../../../util/address', () => ({
  formatAddress: jest.fn(
    (address) =>
      address.substring(0, 6) + '...' + address.substring(address.length - 4),
  ),
}));
jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));
jest.mock('../../../core/Multichain/utils', () => ({
  getAddressUrl: jest.fn(() => 'https://explorer.solana.com/address/123'),
  getTransactionUrl: jest.fn(() => 'https://explorer.solana.com/tx/123'),
}));

describe('MultichainTransactionDetailsModal', () => {
  const mockNavigation = { navigate: jest.fn() };
  const mockOnClose = jest.fn();
  const mockTransaction = {
    id: 'tx-123',
    chainId: 'solana:mainnet',
    from: [{ address: '7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV' }],
    to: [{ address: '5FHwkrdxD5AKmYrGNQYV66qPt3YxmkBzMJ8youBGNFAY' }],
    value: '1500000000',
    type: TransactionType.Send,
    timestamp: 1742313600000,
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    (useMultichainTransactionDisplay as jest.Mock).mockReturnValue({
      id: 'tx-123',
      type: TransactionType.Send,
      status: 'confirmed',
      timestamp: 1742313600000,
      chain: 'solana:mainnet',
      to: { address: '5FHwkrdxD5AKmYrGNQYV66qPt3YxmkBzMJ8youBGNFAY' },
      from: { address: '7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV' },
      asset: { amount: '1.5', unit: 'SOL' },
    });
  });

  it('renders correctly a transaction', () => {
    const { getByText } = render(
      <MultichainTransactionDetailsModal
        isVisible={true}
        onClose={mockOnClose}
        transaction={mockTransaction}
        userAddress="7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV"
        navigation={mockNavigation as any}
      />,
    );

    expect(getByText('transaction.send')).toBeTruthy();
    expect(getByText('Mar 15, 2025')).toBeTruthy();
    expect(getByText('transactions.transaction_id')).toBeTruthy();
    expect(getByText('transactions.from')).toBeTruthy();
    expect(getByText('transactions.to')).toBeTruthy();
    expect(getByText('transactions.amount')).toBeTruthy();
    expect(getByText('1.5 SOL')).toBeTruthy();
  });

  it('calls onClose when close button is pressed', () => {
    const { getByTestId } = render(
      <MultichainTransactionDetailsModal
        isVisible={true}
        onClose={mockOnClose}
        transaction={mockTransaction}
        userAddress="7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV"
        navigation={mockNavigation as any}
      />,
    );

    const closeButton = getByTestId('transaction-details-close-button');
    fireEvent.press(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders network fees when present', () => {
    (useMultichainTransactionDisplay as jest.Mock).mockReturnValue({
      id: 'tx-123',
      type: TransactionType.Send,
      status: 'confirmed',
      timestamp: 1672531200,
      chain: 'solana:mainnet',
      to: { address: '5FHwkrdxD5AKmYrGNQYV66qPt3YxmkBzMJ8youBGNFAY' },
      from: { address: '7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV' },
      asset: { amount: '1.5', unit: 'SOL' },
      baseFee: { amount: '0.000005', unit: 'SOL' },
      priorityFee: { amount: '0.000001', unit: 'SOL' },
    });

    const { getByText } = render(
      <MultichainTransactionDetailsModal
        isVisible={true}
        onClose={mockOnClose}
        transaction={mockTransaction}
        userAddress="7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV"
        navigation={mockNavigation as any}
      />,
    );

    expect(getByText('transactions.network_fee')).toBeTruthy();
    expect(getByText('0.000005 SOL')).toBeTruthy();
    expect(getByText('transactions.priority_fee')).toBeTruthy();
    expect(getByText('0.000001 SOL')).toBeTruthy();
  });

  it('navigates to block explorer when view details is pressed', () => {
    const { getByText } = render(
      <MultichainTransactionDetailsModal
        isVisible={true}
        onClose={mockOnClose}
        transaction={mockTransaction}
        userAddress="7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV"
        navigation={mockNavigation as any}
      />,
    );

    const viewDetailsButton = getByText('networks.view_details');
    fireEvent.press(viewDetailsButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: { url: 'https://explorer.solana.com/tx/123' },
    });
  });

  it('navigates to address explorer when address link is pressed', () => {
    const { getAllByText } = render(
      <MultichainTransactionDetailsModal
        isVisible={true}
        onClose={mockOnClose}
        transaction={mockTransaction}
        userAddress="7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV"
        navigation={mockNavigation as any}
      />,
    );

    const fromAddressLinks = getAllByText('7RoSF9...zZNV');
    fireEvent.press(fromAddressLinks[0]);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: { url: 'https://explorer.solana.com/address/123' },
    });
  });
});
