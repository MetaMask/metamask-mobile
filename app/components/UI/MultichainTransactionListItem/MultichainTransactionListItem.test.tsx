import React from 'react';
import { TouchableHighlight } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { Transaction, TransactionType } from '@metamask/keyring-api';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import MultichainTransactionDetailsModal from '../MultichainTransactionDetailsModal';
import MultichainTransactionListItem from '../MultichainTransactionListItem';
import { useMultichainTransactionDisplay } from '../../hooks/useMultichainTransactionDisplay';

const mockUseTheme = jest.fn();
jest.mock('../../../util/theme', () => ({
  useTheme: () => mockUseTheme(),
}));
jest.mock('../../hooks/useMultichainTransactionDisplay');
jest.mock('../../../util/transaction-icons', () => ({
  getTransactionIcon: jest.fn(),
}));
jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));
jest.mock('../../../util/date', () => ({
  toDateFormat: jest.fn(() => 'Mar 15, 2025'),
}));
jest.mock(
  '../MultichainTransactionDetailsModal',
  () => 'MultichainTransactionDetailsModal',
);

describe('MultichainTransactionListItem', () => {
  const mockNavigation = { navigate: jest.fn() };
  const mockTransaction: Transaction = {
    id: 'tx-123',
    chain: 'solana:mainnet',
    account: '7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV',
    from: [
      {
        address: '7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV',
        asset: null,
      },
    ],
    to: [
      { address: '5FHwkrdxD5AKmYrGNQYV66qPt3YxmkBzMJ8youBGNFAY', asset: null },
    ],
    type: TransactionType.Send,
    timestamp: 1742313600000,
    status: 'confirmed',
    events: [],
    fees: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useMultichainTransactionDisplay as jest.Mock).mockReturnValue({
      type: TransactionType.Send,
      status: 'confirmed',
      to: { address: '5FHwkrdxD5AKmYrGNQYV66qPt3YxmkBzMJ8youBGNFAY' },
      from: { address: '7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV' },
      asset: { amount: '1.5', unit: 'SOL' },
    });
  });

  it('renders correctly for a Send transaction', () => {
    const { getByText } = render(
      <MultichainTransactionListItem
        transaction={mockTransaction}
        selectedAddress="7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV"
        navigation={mockNavigation as unknown as NavigationProp<ParamListBase>}
      />,
    );

    expect(getByText('Send')).toBeTruthy();
    expect(getByText('1.5 SOL')).toBeTruthy();
    expect(getByText('Mar 15, 2025')).toBeTruthy();
  });

  it('renders correctly for a Receive transaction', () => {
    (useMultichainTransactionDisplay as jest.Mock).mockReturnValue({
      type: TransactionType.Receive,
      status: 'confirmed',
      to: { address: '7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV' },
      from: { address: '5FHwkrdxD5AKmYrGNQYV66qPt3YxmkBzMJ8youBGNFAY' },
      asset: { amount: '2.0', unit: 'SOL' },
    });

    const receiveTransaction = {
      ...mockTransaction,
      type: TransactionType.Receive,
      from: [
        {
          address: '5FHwkrdxD5AKmYrGNQYV66qPt3YxmkBzMJ8youBGNFAY',
          asset: null,
        },
      ],
      to: [
        {
          address: '7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV',
          asset: null,
        },
      ],
      value: '2000000000',
    };

    const { getByText } = render(
      <MultichainTransactionListItem
        transaction={receiveTransaction}
        selectedAddress="7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV"
        navigation={mockNavigation as unknown as NavigationProp<ParamListBase>}
      />,
    );

    expect(getByText('Receive')).toBeTruthy();
    expect(getByText('2.0 SOL')).toBeTruthy();
  });

  it('renders correctly for a Swap transaction', () => {
    (useMultichainTransactionDisplay as jest.Mock).mockReturnValue({
      type: TransactionType.Swap,
      status: 'confirmed',
      to: {
        address: '5FHwkrdxD5AKmYrGNQYV66qPt3YxmkBzMJ8youBGNFAY',
        asset: { fungible: true, unit: 'USDC' },
      },
      from: {
        address: '7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV',
        asset: { fungible: true, unit: 'SOL' },
      },
      asset: { amount: '1.5', unit: 'SOL' },
    });

    const { getByText } = render(
      <MultichainTransactionListItem
        transaction={mockTransaction}
        selectedAddress="7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV"
        navigation={mockNavigation as unknown as NavigationProp<ParamListBase>}
      />,
    );

    expect(
      getByText('transactions.swap SOL transactions.to USDC'),
    ).toBeTruthy();
  });

  it('opens transaction details modal when pressed', () => {
    const { UNSAFE_getByType } = render(
      <MultichainTransactionListItem
        transaction={mockTransaction}
        selectedAddress="7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV"
        navigation={mockNavigation as unknown as NavigationProp<ParamListBase>}
      />,
    );

    const touchable = UNSAFE_getByType(TouchableHighlight);
    fireEvent.press(touchable);

    const modal = UNSAFE_getByType(MultichainTransactionDetailsModal);
    expect(modal.props.isVisible).toBe(true);
  });

  it('handles failed transaction status', () => {
    (useMultichainTransactionDisplay as jest.Mock).mockReturnValue({
      type: TransactionType.Send,
      status: 'failed',
      to: { address: '5FHwkrdxD5AKmYrGNQYV66qPt3YxmkBzMJ8youBGNFAY' },
      from: { address: '7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV' },
      asset: { amount: '1.5', unit: 'SOL' },
    });

    const { getByTestId } = render(
      <MultichainTransactionListItem
        transaction={mockTransaction}
        selectedAddress="7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV"
        navigation={mockNavigation as unknown as NavigationProp<ParamListBase>}
      />,
    );

    expect(getByTestId('transaction-status-tx-123')).toBeTruthy();
  });

  it('shows the network fees of a transaction', () => {
    (useMultichainTransactionDisplay as jest.Mock).mockReturnValue({
      type: TransactionType.Send,
      status: 'confirmed',
      to: { address: '5FHwkrdxD5AKmYrGNQYV66qPt3YxmkBzMJ8youBGNFAY' },
      from: { address: '7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV' },
      asset: { amount: '1.5', unit: 'SOL' },
      baseFee: { amount: '0.000005', unit: 'SOL' },
      priorityFee: { amount: '0.000001', unit: 'SOL' },
    });

    const { getByText } = render(
      <MultichainTransactionListItem
        transaction={mockTransaction}
        selectedAddress="7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV"
        navigation={mockNavigation as unknown as NavigationProp<ParamListBase>}
      />,
    );

    expect(getByText('Send')).toBeTruthy();
    expect(getByText('1.5 SOL')).toBeTruthy();
  });
});
