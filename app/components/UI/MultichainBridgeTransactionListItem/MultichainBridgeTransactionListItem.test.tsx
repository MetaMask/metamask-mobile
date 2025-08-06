import React from 'react';
import { TouchableHighlight } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { Transaction, TransactionType } from '@metamask/keyring-api';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import MultichainBridgeTransactionListItem from '.';
import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import { StatusTypes } from '@metamask/bridge-controller';

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
    expect(getByText('1.0 ETH')).toBeTruthy();
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
    const { UNSAFE_getByType } = renderWithProvider(
      <MultichainBridgeTransactionListItem
        transaction={mockTransaction}
        bridgeHistoryItem={mockBridgeHistoryItem}
        navigation={mockNavigation as unknown as NavigationProp<ParamListBase>}
      />,
    );

    const touchable = UNSAFE_getByType(TouchableHighlight);
    fireEvent.press(touchable);

    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      'BridgeTransactionDetails',
      {
        multiChainTx: mockTransaction,
      },
    );
  });
});
