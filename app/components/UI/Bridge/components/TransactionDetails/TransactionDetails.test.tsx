import React from 'react';
import { BridgeTransactionDetails } from './TransactionDetails';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import Routes from '../../../../../constants/navigation/Routes';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { initialState, evmAccountAddress } from '../../_mocks_/initialState';
import { fireEvent } from '@testing-library/react-native';
import { Transaction } from '@metamask/keyring-api';
import { isHardwareAccount } from '../../../../../util/address';
import { FeatureId, StatusTypes } from '@metamask/bridge-controller';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

jest.mock('../../../../../util/address', () => ({
  ...jest.requireActual('../../../../../util/address'),
  isHardwareAccount: jest.fn(),
}));

const mockIsHardwareAccount = jest.mocked(isHardwareAccount);

describe('BridgeTransactionDetails', () => {
  const mockEVMTx = {
    id: 'test-tx-id',
    chainId: '0x1',
    hash: '0x123',
    networkClientId: 'mainnet',
    time: Date.now(),
    txParams: {
      from: '0x123',
      to: '0x456',
      value: '0x0',
      data: '0x',
    },
    status: TransactionStatus.submitted,
  } as TransactionMeta;

  const mockMultiChainTx = {
    id: 'solana-tx-hash-123', // Must match status.srcChain.txHash
    status: 'confirmed',
    type: 'swap',
    from: [
      {
        address: 'So11111111111111111111111111111111111111112',
        asset: null,
      },
    ],
    to: [
      {
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        asset: null,
      },
    ],
    chain: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    events: [],
    fees: [],
    account: 'pXwSggYaFeUryz86UoCs9ugZ4VWoZ7R1U5CVhxYjL61', // Solana account from initialState
    timestamp: Date.now(),
  } as Transaction;

  const mockState = initialState;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows header with back navigation when bridge history is missing', () => {
    const { getByTestId, getByText } = renderScreen(
      () => (
        <BridgeTransactionDetails
          route={{
            params: {
              evmTxMeta: { ...mockEVMTx, id: 'missing-bridge-history-id' },
            },
          }}
        />
      ),
      {
        name: Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS,
      },
      { state: mockState },
    );

    expect(getByText('Transaction details')).toBeTruthy();
    fireEvent.press(getByTestId('bridge-transaction-details-back-button'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('navigates back when header back button is pressed', () => {
    const { getByTestId } = renderScreen(
      () => (
        <BridgeTransactionDetails
          route={{ params: { evmTxMeta: mockEVMTx } }}
        />
      ),
      {
        name: Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS,
      },
      { state: mockState },
    );

    fireEvent.press(getByTestId('bridge-transaction-details-back-button'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders without crashing', () => {
    const { getByText } = renderScreen(
      () => (
        <BridgeTransactionDetails
          route={{ params: { evmTxMeta: mockEVMTx } }}
        />
      ),
      {
        name: Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS,
      },
      { state: mockState },
    );
    expect(getByText('Status')).toBeTruthy();
  });

  it('displays source and destination token information', () => {
    const { getByText } = renderScreen(
      () => (
        <BridgeTransactionDetails
          route={{ params: { evmTxMeta: mockEVMTx } }}
        />
      ),
      {
        name: Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS,
      },
      { state: mockState },
    );
    expect(getByText(/1\.00000\s+TOKEN1/)).toBeTruthy();
    expect(getByText(/2\.00000\s+TOKEN2/)).toBeTruthy();
  });

  it('displays submission date', () => {
    const { getByText } = renderScreen(
      () => (
        <BridgeTransactionDetails
          route={{ params: { evmTxMeta: mockEVMTx } }}
        />
      ),
      {
        name: Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS,
      },
      { state: mockState },
    );
    expect(getByText(/date/i)).toBeTruthy();
  });

  it('shows total gas fee', () => {
    const { getByText } = renderScreen(
      () => (
        <BridgeTransactionDetails
          route={{ params: { evmTxMeta: mockEVMTx } }}
        />
      ),
      {
        name: Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS,
      },
      { state: mockState },
    );
    expect(getByText(/total gas fee/i)).toBeTruthy();
  });

  it('displays block explorer button', () => {
    const { getByText } = renderScreen(
      () => (
        <BridgeTransactionDetails
          route={{ params: { evmTxMeta: mockEVMTx } }}
        />
      ),
      {
        name: Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS,
      },
      { state: mockState },
    );
    expect(getByText(/view on block explorer/i)).toBeTruthy();
  });

  it('navigates to block explorer modal for cross-chain bridge with evmTxMeta', () => {
    const { getByText } = renderScreen(
      () => (
        <BridgeTransactionDetails
          route={{ params: { evmTxMeta: mockEVMTx } }}
        />
      ),
      {
        name: Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS,
      },
      { state: mockState },
    );

    const blockExplorerButton = getByText(/view on block explorer/i);
    fireEvent.press(blockExplorerButton);

    // Should navigate to bridge modal stack, not directly to webview
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.TRANSACTION_DETAILS_BLOCK_EXPLORER,
      params: expect.objectContaining({
        evmTxMeta: mockEVMTx,
      }),
    });
  });

  it('navigates directly to browser for same-chain swaps with multiChainTx', () => {
    const { getByText } = renderScreen(
      () => (
        <BridgeTransactionDetails
          route={{ params: { multiChainTx: mockMultiChainTx } }}
        />
      ),
      {
        name: Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS,
      },
      { state: mockState },
    );

    const blockExplorerButton = getByText(/view on block explorer/i);
    fireEvent.press(blockExplorerButton);

    // Should navigate to webview, not to the modal
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: expect.objectContaining({
        url: expect.stringContaining('solana-tx-hash-123'),
      }),
    });
  });

  it('does not show "Paid by MetaMask" when sender is a hardware wallet', () => {
    mockIsHardwareAccount.mockReturnValue(true);

    const hwSponsoredTx = {
      ...mockEVMTx,
      isGasFeeSponsored: true,
      status: TransactionStatus.failed,
    } as TransactionMeta;

    const { queryByTestId } = renderScreen(
      () => (
        <BridgeTransactionDetails
          route={{ params: { evmTxMeta: hwSponsoredTx } }}
        />
      ),
      {
        name: Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS,
      },
      { state: mockState },
    );

    expect(queryByTestId('paid-by-metamask')).not.toBeOnTheScreen();
  });

  it('displays full amount from pricingData.amountSent when gas is sponsored', () => {
    mockIsHardwareAccount.mockReturnValue(false);

    const gasSponsoredTx = {
      ...mockEVMTx,
      id: 'gas-sponsored-tx-id',
      isGasFeeSponsored: true,
    } as TransactionMeta;

    const { getByText } = renderScreen(
      () => (
        <BridgeTransactionDetails
          route={{ params: { evmTxMeta: gasSponsoredTx } }}
        />
      ),
      {
        name: Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS,
      },
      { state: mockState },
    );

    // Should display "1.00000 SEI" (from pricingData.amountSent),
    // not "0.99125 SEI" (from srcTokenAmount)
    expect(getByText(/1\.00000\s+SEI/)).toBeOnTheScreen();
  });

  it('shows "Paid by MetaMask" when gas is sponsored and sender is not a hardware wallet', () => {
    mockIsHardwareAccount.mockReturnValue(false);

    const sponsoredTx = {
      ...mockEVMTx,
      isGasFeeSponsored: true,
    } as TransactionMeta;

    const { getByTestId } = renderScreen(
      () => (
        <BridgeTransactionDetails
          route={{ params: { evmTxMeta: sponsoredTx } }}
        />
      ),
      {
        name: Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS,
      },
      { state: mockState },
    );

    expect(getByTestId('paid-by-metamask')).toBeOnTheScreen();
  });

  it('does not show "Paid by MetaMask" for a sponsored revoke delegation transaction', () => {
    mockIsHardwareAccount.mockReturnValue(false);

    const sponsoredRevokeDelegationTx = {
      ...mockEVMTx,
      isGasFeeSponsored: true,
      type: TransactionType.revokeDelegation,
    } as TransactionMeta;

    const { queryByTestId } = renderScreen(
      () => (
        <BridgeTransactionDetails
          route={{ params: { evmTxMeta: sponsoredRevokeDelegationTx } }}
        />
      ),
      {
        name: Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS,
      },
      { state: mockState },
    );

    expect(queryByTestId('paid-by-metamask')).not.toBeOnTheScreen();
  });

  it('displays batch sell 7702 swapped and received sections', () => {
    const batchTxHash = '0xbatchsellhash';
    const batchTxId = 'batch-sell-tx-id';
    const batchId = '0xbatch123';
    const batchSellState = {
      ...mockState,
      engine: {
        ...mockState.engine,
        backgroundState: {
          ...mockState.engine.backgroundState,
          BridgeStatusController: {
            txHistory: {
              [batchTxId]: {
                txMetaId: batchTxId,
                account: evmAccountAddress,
                featureId: FeatureId.BATCH_SELL,
                batchId,
                quote: {
                  requestId: 'batch-request-id',
                  srcChainId: 42161,
                  destChainId: 42161,
                  srcAsset: {
                    chainId: 42161,
                    address: '0xf97f4df75117a78c1a5a0dbb814af92458539fb4',
                    decimals: 18,
                    symbol: 'LINK',
                    name: 'Chainlink',
                  },
                  destAsset: {
                    chainId: 42161,
                    address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
                    decimals: 6,
                    symbol: 'USDC',
                    name: 'USDC',
                  },
                  srcTokenAmount: '1000000000000000000',
                  destTokenAmount: '5000000',
                },
                status: {
                  status: StatusTypes.COMPLETE,
                  srcChain: {
                    txHash: batchTxHash,
                  },
                  destChain: {
                    txHash: '0xdest',
                  },
                },
                startTime: Date.now(),
                estimatedProcessingTimeInSeconds: 0,
              },
              'batch-sell-item-2': {
                txMetaId: 'batch-sell-item-2',
                account: evmAccountAddress,
                featureId: FeatureId.BATCH_SELL,
                batchId,
                quote: {
                  requestId: 'batch-request-id-2',
                  srcChainId: 42161,
                  destChainId: 42161,
                  srcAsset: {
                    chainId: 42161,
                    address: '0xddb46999f8891663a8f2828d25298f70416d7610',
                    decimals: 18,
                    symbol: 'ARB',
                    name: 'Arbitrum',
                  },
                  destAsset: {
                    chainId: 42161,
                    address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
                    decimals: 6,
                    symbol: 'USDC',
                    name: 'USDC',
                  },
                  srcTokenAmount: '1000000000000000000',
                  destTokenAmount: '3000000',
                },
                status: {
                  status: StatusTypes.COMPLETE,
                  srcChain: {
                    txHash: '0xotherhash',
                  },
                  destChain: {
                    txHash: '0xdest2',
                  },
                },
                startTime: Date.now(),
                estimatedProcessingTimeInSeconds: 0,
              },
            },
          },
        },
      },
    };

    const batchSellTx = {
      id: batchTxId,
      hash: batchTxHash,
      status: TransactionStatus.confirmed,
      chainId: '0xa4b1',
      networkClientId: 'arbitrum',
      time: Date.now(),
      nestedTransactions: [
        { type: TransactionType.swap },
        { type: TransactionType.swapApproval },
      ],
      txParams: {
        to: '0x123',
        from: evmAccountAddress,
        value: '0x0',
        data: '0x',
      },
    } as TransactionMeta;

    const { getByText } = renderScreen(
      () => (
        <BridgeTransactionDetails
          route={{ params: { evmTxMeta: batchSellTx } }}
        />
      ),
      {
        name: Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS,
      },
      { state: batchSellState },
    );

    expect(getByText('You swapped')).toBeOnTheScreen();
    expect(getByText('You received')).toBeOnTheScreen();
    expect(getByText('+8.00000 USDC')).toBeOnTheScreen();
    expect(getByText('Network')).toBeOnTheScreen();
    expect(getByText('Arbitrum')).toBeOnTheScreen();
  });
});
