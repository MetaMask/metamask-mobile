import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SolScope, Transaction, TransactionType } from '@metamask/keyring-api';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import MultichainTransactionListItem from '../MultichainTransactionListItem';
import Routes from '../../../constants/navigation/Routes';
import {
  TRANSACTION_DETAIL_EVENTS,
  TransactionDetailLocation,
} from '../../../core/Analytics/events/transactions';

const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn().mockReturnThis();
const mockBuild = jest.fn(() => ({ name: 'test-event' }));
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
  build: mockBuild,
}));

jest.mock('../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

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

  it('navigates to transaction details sheet when pressed', () => {
    const { getByTestId } = renderWithProvider(
      <MultichainTransactionListItem
        transaction={mockTransaction}
        chainId={SolScope.Mainnet}
        navigation={mockNavigation as unknown as NavigationProp<ParamListBase>}
      />,
    );

    fireEvent.press(getByTestId('transaction-item-0'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      Routes.MODAL.ROOT_MODAL_FLOW,
      expect.objectContaining({
        screen: Routes.SHEET.MULTICHAIN_TRANSACTION_DETAILS,
        params: expect.objectContaining({
          transaction: mockTransaction,
        }),
      }),
    );
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

  describe('analytics tracking', () => {
    it('tracks Transaction Detail List Item Clicked with default home location', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainTransactionListItem
          transaction={mockTransaction}
          chainId={SolScope.Mainnet}
          navigation={
            mockNavigation as unknown as NavigationProp<ParamListBase>
          }
        />,
      );

      fireEvent.press(getByTestId('transaction-item-0'));

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        TRANSACTION_DETAIL_EVENTS.LIST_ITEM_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        transaction_type: 'send',
        transaction_status: 'confirmed',
        location: TransactionDetailLocation.Home,
        chain_id_source: String(SolScope.Mainnet),
        chain_id_destination: String(SolScope.Mainnet),
      });
      expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'test-event' });
    });

    it('tracks with asset_details location when provided', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainTransactionListItem
          transaction={mockTransaction}
          chainId={SolScope.Mainnet}
          navigation={
            mockNavigation as unknown as NavigationProp<ParamListBase>
          }
          location={TransactionDetailLocation.AssetDetails}
        />,
      );

      fireEvent.press(getByTestId('transaction-item-0'));

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          location: TransactionDetailLocation.AssetDetails,
        }),
      );
    });
  });
});
