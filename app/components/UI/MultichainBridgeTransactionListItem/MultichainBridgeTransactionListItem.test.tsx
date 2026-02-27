import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Transaction, TransactionType } from '@metamask/keyring-api';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import MultichainBridgeTransactionListItem from '.';
import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import { StatusTypes } from '@metamask/bridge-controller';
import { MonetizedPrimitive } from '../../../core/Analytics/MetaMetrics.types';
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

describe('MultichainBridgeTransactionListItem', () => {
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

  const mockBridgeHistoryItem: BridgeHistoryItem = {
    txMetaId: 'test-tx-id',
    account: '0x1234567890123456789012345678901234567890',
    quote: {
      requestId: 'test-request-id',
      srcChainId: 1,
      srcAsset: {
        chainId: 1,
        address: '0x123',
        decimals: 18,
        symbol: 'ETH',
        name: 'Ethereum',
        assetId: 'eip155:1/erc20:0x123',
      },
      destChainId: 10,
      destAsset: {
        chainId: 10,
        address: '0x456',
        decimals: 18,
        symbol: 'ETH',
        name: 'Ethereum',
        assetId: 'eip155:10/erc20:0x456',
      },
      srcTokenAmount: '1000000000000000000',
      destTokenAmount: '2000000000000000000',
      minDestTokenAmount: '1900000000000000000',
      feeData: {
        metabridge: {
          amount: '1000000000000000',
          asset: {
            chainId: 1,
            address: '0x123',
            decimals: 18,
            symbol: 'ETH',
            name: 'Ethereum',
            assetId: 'eip155:1/erc20:0x123',
          },
        },
      },
      bridgeId: 'test-bridge',
      bridges: ['test-bridge'],
      steps: [],
    },
    status: {
      srcChain: {
        txHash: '0x123',
        chainId: 1,
      },
      destChain: {
        txHash: '0x456',
        chainId: 10,
      },
      status: StatusTypes.COMPLETE,
    },
    startTime: Date.now(),
    estimatedProcessingTimeInSeconds: 300,
    slippagePercentage: 0,
    hasApprovalTx: false,
  };

  it('renders a complete bridge transaction correctly', () => {
    const { getByText } = renderWithProvider(
      <MultichainBridgeTransactionListItem
        transaction={mockTransaction}
        bridgeHistoryItem={mockBridgeHistoryItem}
        navigation={mockNavigation as unknown as NavigationProp<ParamListBase>}
      />,
    );

    expect(
      getByText('bridge_transaction_details.bridge_to_chain'),
    ).toBeTruthy();
    expect(getByText('transaction.confirmed')).toBeTruthy();
    expect(getByText('1 ETH')).toBeTruthy();
    expect(getByText('Mar 15, 2025')).toBeTruthy();
  });

  it('renders a pending bridge transaction with segments', () => {
    const pendingBridgeHistoryItem = {
      ...mockBridgeHistoryItem,
      status: {
        srcChain: {
          txHash: '0x123',
          chainId: 1,
        },
        destChain: {
          txHash: undefined,
          chainId: 10,
        },
        status: StatusTypes.PENDING,
      },
    };

    const { getByText } = renderWithProvider(
      <MultichainBridgeTransactionListItem
        transaction={mockTransaction}
        bridgeHistoryItem={pendingBridgeHistoryItem}
        navigation={mockNavigation as unknown as NavigationProp<ParamListBase>}
      />,
    );

    expect(
      getByText('bridge_transaction_details.bridge_to_chain'),
    ).toBeTruthy();
    expect(getByText('Transaction 2 of 2')).toBeTruthy();
  });

  it('navigates to bridge transaction details when clicked', () => {
    const { getByTestId } = renderWithProvider(
      <MultichainBridgeTransactionListItem
        transaction={mockTransaction}
        bridgeHistoryItem={mockBridgeHistoryItem}
        navigation={mockNavigation as unknown as NavigationProp<ParamListBase>}
      />,
    );

    fireEvent.press(getByTestId('transaction-item-0'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      'BridgeTransactionDetails',
      {
        multiChainTx: mockTransaction,
      },
    );
  });

  it('displays less than threshold for very small amounts', () => {
    const verySmallAmountBridgeHistoryItem = {
      ...mockBridgeHistoryItem,
      quote: {
        ...mockBridgeHistoryItem.quote,
        srcTokenAmount: '123456789012',
        srcAsset: {
          ...mockBridgeHistoryItem.quote.srcAsset,
          decimals: 18,
        },
      },
    };

    const { getByText } = renderWithProvider(
      <MultichainBridgeTransactionListItem
        transaction={mockTransaction}
        bridgeHistoryItem={verySmallAmountBridgeHistoryItem}
        navigation={mockNavigation as unknown as NavigationProp<ParamListBase>}
      />,
    );

    expect(getByText(/< 0\.00001 ETH/)).toBeTruthy();
  });

  it('caps amount display at 5 decimal places for larger values', () => {
    const largerAmountBridgeHistoryItem = {
      ...mockBridgeHistoryItem,
      quote: {
        ...mockBridgeHistoryItem.quote,
        srcTokenAmount: '123456789012345',
        srcAsset: {
          ...mockBridgeHistoryItem.quote.srcAsset,
          decimals: 18,
        },
      },
    };

    const { getByText } = renderWithProvider(
      <MultichainBridgeTransactionListItem
        transaction={mockTransaction}
        bridgeHistoryItem={largerAmountBridgeHistoryItem}
        navigation={mockNavigation as unknown as NavigationProp<ParamListBase>}
      />,
    );

    expect(getByText(/0\.00012 ETH/)).toBeTruthy();
  });

  describe('analytics tracking', () => {
    it('tracks Transaction Detail List Item Clicked for a bridge transaction', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainBridgeTransactionListItem
          transaction={mockTransaction}
          bridgeHistoryItem={mockBridgeHistoryItem}
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
        transaction_type: 'bridge',
        transaction_status: 'confirmed',
        location: TransactionDetailLocation.Home,
        chain_id_source: '1',
        chain_id_destination: '10',
        monetized_primitive: MonetizedPrimitive.Swaps,
      });
      expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'test-event' });
    });

    it('tracks swap type when source and destination chain are the same', () => {
      const swapBridgeHistoryItem = {
        ...mockBridgeHistoryItem,
        quote: {
          ...mockBridgeHistoryItem.quote,
          destAsset: {
            ...mockBridgeHistoryItem.quote.destAsset,
            chainId: 1,
          },
        },
      };

      const { getByTestId } = renderWithProvider(
        <MultichainBridgeTransactionListItem
          transaction={mockTransaction}
          bridgeHistoryItem={swapBridgeHistoryItem}
          navigation={
            mockNavigation as unknown as NavigationProp<ParamListBase>
          }
        />,
      );

      fireEvent.press(getByTestId('transaction-item-0'));

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          transaction_type: 'swap',
          chain_id_source: '1',
          chain_id_destination: '1',
        }),
      );
    });

    it('tracks with asset_details location when provided', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainBridgeTransactionListItem
          transaction={mockTransaction}
          bridgeHistoryItem={mockBridgeHistoryItem}
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
