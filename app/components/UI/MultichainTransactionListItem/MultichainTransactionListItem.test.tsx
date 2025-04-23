import React from 'react';
import { TouchableHighlight } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { Transaction, TransactionType } from '@metamask/keyring-api';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import MultichainTransactionDetailsModal from '../MultichainTransactionDetailsModal';
import MultichainTransactionListItem from '../MultichainTransactionListItem';
import { useMultichainTransactionDisplay } from '../../hooks/useMultichainTransactionDisplay';
import { BridgeHistoryItem, FeeType, StatusTypes } from '@metamask/bridge-status-controller';

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

// Create a mock store with the necessary state
const createMockStore = () => configureStore({
  reducer: {
    user: (state = { appTheme: 'light' }) => state,
  },
});

const renderWithProvider = (ui: React.ReactElement) => {
  const store = createMockStore();
  return render(
    <Provider store={store}>
      {ui}
    </Provider>
  );
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
        [FeeType.METABRIDGE]: {
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
      steps: [
      ],
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
    const { getByText } = renderWithProvider(
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

    const { getByText } = renderWithProvider(
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

    const { getByText } = renderWithProvider(
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
    const { UNSAFE_getByType } = renderWithProvider(
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

    const { getByTestId } = renderWithProvider(
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

    const { getByText } = renderWithProvider(
      <MultichainTransactionListItem
        transaction={mockTransaction}
        selectedAddress="7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV"
        navigation={mockNavigation as unknown as NavigationProp<ParamListBase>}
      />,
    );

    expect(getByText('Send')).toBeTruthy();
    expect(getByText('1.5 SOL')).toBeTruthy();
  });

  describe('Bridge Transaction Tests', () => {
    it('renders a complete bridge transaction correctly', () => {
      (useMultichainTransactionDisplay as jest.Mock).mockReturnValue({
        type: TransactionType.Send,
        status: 'confirmed',
        to: { address: '5FHwkrdxD5AKmYrGNQYV66qPt3YxmkBzMJ8youBGNFAY' },
        from: { address: '7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV' },
        asset: { amount: '1.5', unit: 'SOL' },
      });

      const { getByText } = renderWithProvider(
        <MultichainTransactionListItem
          transaction={mockTransaction}
          bridgeHistoryItem={mockBridgeHistoryItem}
          selectedAddress="7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV"
          navigation={mockNavigation as unknown as NavigationProp<ParamListBase>}
        />,
      );

      expect(getByText('bridge_transaction_details.bridge_to_chain')).toBeTruthy();
      expect(getByText('1.5 SOL')).toBeTruthy();
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

      (useMultichainTransactionDisplay as jest.Mock).mockReturnValue({
        type: TransactionType.Send,
        status: 'pending',
        to: { address: '5FHwkrdxD5AKmYrGNQYV66qPt3YxmkBzMJ8youBGNFAY' },
        from: { address: '7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV' },
        asset: { amount: '1.5', unit: 'SOL' },
      });

      const { getByText } = renderWithProvider(
        <MultichainTransactionListItem
          transaction={mockTransaction}
          bridgeHistoryItem={pendingBridgeHistoryItem}
          selectedAddress="7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV"
          navigation={mockNavigation as unknown as NavigationProp<ParamListBase>}
        />,
      );

      expect(getByText('bridge_transaction_details.bridge_to_chain')).toBeTruthy();
      expect(getByText('Transaction 2 of 2')).toBeTruthy();
    });

    it('navigates to bridge transaction details when clicked', () => {
      const { UNSAFE_getByType } = renderWithProvider(
        <MultichainTransactionListItem
          transaction={mockTransaction}
          bridgeHistoryItem={mockBridgeHistoryItem}
          selectedAddress="7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV"
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

    it('does not show modal for bridge transactions', () => {
      const { UNSAFE_getByType } = renderWithProvider(
        <MultichainTransactionListItem
          transaction={mockTransaction}
          bridgeHistoryItem={mockBridgeHistoryItem}
          selectedAddress="7RoSF9fUNf1XgRYsb7Qh4SoVkRmirHzZVELGNiNQzZNV"
          navigation={mockNavigation as unknown as NavigationProp<ParamListBase>}
        />,
      );

      const touchable = UNSAFE_getByType(TouchableHighlight);
      fireEvent.press(touchable);

      const modal = UNSAFE_getByType(MultichainTransactionDetailsModal);
      expect(modal.props.isVisible).toBe(false);
    });

    it('handles missing bridge history item gracefully', () => {
      const { getByText } = renderWithProvider(
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
});
