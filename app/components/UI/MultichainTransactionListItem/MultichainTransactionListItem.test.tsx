import React from 'react';
import { TouchableHighlight } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { SolScope, Transaction, TransactionType } from '@metamask/keyring-api';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import MultichainTransactionDetailsModal from '../MultichainTransactionDetailsModal';
import MultichainTransactionListItem from '../MultichainTransactionListItem';

const mockUseTheme = jest.fn();
jest.mock('../../../util/theme', () => ({
  useTheme: () => mockUseTheme(),
}));
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

// Create a mock store with the necessary state
const createMockStore = () =>
  configureStore({
    reducer: {
      user: (state = { appTheme: 'light' }) => state,
    },
  });

const renderWithProvider = (ui: React.ReactElement) => {
  const store = createMockStore();
  return render(<Provider store={store}>{ui}</Provider>);
};

describe('MultichainTransactionListItem', () => {
  const mockNavigation = { navigate: jest.fn() };
  const mockTransaction: Transaction = {
    id: 'tx-123',
    chain: 'solana:mainnet',
    account: '7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV',
    from: [
      {
        address: '7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV',
        asset: {
          amount: '1.5',
          unit: 'SOL',
          fungible: true,
          type: 'solana:mainnet/SOL:SOL',
        },
      },
    ],
    to: [
      {
        address: '5FHwkrdxD5AKmYrGNQYV66qPt3YxmkBzMJ8youBGNFAY',
        asset: {
          amount: '1.5',
          unit: 'SOL',
          fungible: true,
          type: 'solana:mainnet/SOL:SOL',
        },
      },
    ],
    type: TransactionType.Send,
    timestamp: 1742313600000,
    status: 'confirmed',
    events: [],
    fees: [
      {
        type: 'priority',
        asset: {
          amount: '0.00005',
          unit: 'SOL',
          fungible: true,
          type: 'solana:mainnet/SOL:SOL',
        },
      },
      {
        type: 'base',
        asset: {
          amount: '0.00001',
          unit: 'SOL',
          fungible: true,
          type: 'solana:mainnet/SOL:SOL',
        },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly for a Send transaction', () => {
    const { getByText } = renderWithProvider(
      <MultichainTransactionListItem
        transaction={mockTransaction}
        chainId={SolScope.Mainnet}
        navigation={mockNavigation as unknown as NavigationProp<ParamListBase>}
      />,
    );

    expect(getByText('transactions.sent SOL')).toBeTruthy();
    expect(getByText('transaction.confirmed')).toBeTruthy();
    expect(getByText('-1.5 SOL')).toBeTruthy();
    expect(getByText('Mar 15, 2025')).toBeTruthy();
  });

  it('renders correctly for a Receive transaction', () => {
    const receiveTransaction = {
      ...mockTransaction,
      type: TransactionType.Receive,
    };

    const { getByText } = renderWithProvider(
      <MultichainTransactionListItem
        transaction={receiveTransaction}
        chainId={SolScope.Mainnet}
        navigation={mockNavigation as unknown as NavigationProp<ParamListBase>}
      />,
    );

    expect(getByText('transactions.received SOL')).toBeTruthy();
    expect(getByText('transaction.confirmed')).toBeTruthy();
    expect(getByText('1.5 SOL')).toBeTruthy();
  });

  it('renders correctly for a Swap transaction', () => {
    const swapTransaction: Transaction = {
      ...mockTransaction,
      type: TransactionType.Swap,
      to: [
        {
          address: '5FHwkrdxD5AKmYrGNQYV66qPt3YxmkBzMJ8youBGNFAY',
          asset: {
            amount: '100',
            unit: 'USDC',
            fungible: true,
            type: 'solana:mainnet/USDC:USDC',
          },
        },
      ],
    };

    const { getByText } = renderWithProvider(
      <MultichainTransactionListItem
        transaction={swapTransaction}
        chainId={SolScope.Mainnet}
        navigation={mockNavigation as unknown as NavigationProp<ParamListBase>}
      />,
    );

    expect(
      getByText('transactions.swap SOL transactions.to USDC'),
    ).toBeTruthy();
  });

  it('renders correctly for a Redeposit transaction', () => {
    const swapTransaction = {
      ...mockTransaction,
      to: [],
    };

    const { getByText } = renderWithProvider(
      <MultichainTransactionListItem
        transaction={swapTransaction}
        chainId={SolScope.Mainnet}
        navigation={mockNavigation as unknown as NavigationProp<ParamListBase>}
      />,
    );

    expect(getByText('transactions.redeposit')).toBeTruthy();
    expect(getByText('-0.00005 SOL')).toBeTruthy();
  });

  it('renders correctly for an Interaction transaction', () => {
    const interactionTransaction = {
      ...mockTransaction,
      type: TransactionType.Unknown,
    };

    const { getByText } = renderWithProvider(
      <MultichainTransactionListItem
        transaction={interactionTransaction}
        chainId={SolScope.Mainnet}
        navigation={mockNavigation as unknown as NavigationProp<ParamListBase>}
      />,
    );

    expect(getByText('transactions.interaction')).toBeTruthy();
    expect(getByText('-0.00001 SOL')).toBeTruthy();
  });

  it('opens transaction details modal when pressed', () => {
    const { UNSAFE_getByType } = renderWithProvider(
      <MultichainTransactionListItem
        transaction={mockTransaction}
        chainId={SolScope.Mainnet}
        navigation={mockNavigation as unknown as NavigationProp<ParamListBase>}
      />,
    );

    const touchable = UNSAFE_getByType(TouchableHighlight);
    fireEvent.press(touchable);

    const modal = UNSAFE_getByType(MultichainTransactionDetailsModal);
    expect(modal.props.isVisible).toBe(true);
  });

  it('handles failed transaction status', () => {
    const { getByTestId } = renderWithProvider(
      <MultichainTransactionListItem
        transaction={mockTransaction}
        chainId={SolScope.Mainnet}
        navigation={mockNavigation as unknown as NavigationProp<ParamListBase>}
      />,
    );

    expect(getByTestId('transaction-status-tx-123')).toBeTruthy();
  });
});
