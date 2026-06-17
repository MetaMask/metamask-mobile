import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { FeatureId, StatusTypes } from '@metamask/bridge-controller';
import { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import { BatchSell7702TransactionAssets } from './BatchSell7702TransactionAssets';

const mockTransactionTokenIcon = jest.fn(
  ({
    token,
    showNetworkBadge,
  }: {
    token: { symbol: string };
    showNetworkBadge?: boolean;
  }) => (
    <Text
      testID={`token-icon-${token.symbol}-${showNetworkBadge ? 'badge' : 'no-badge'}`}
    >
      {token.symbol}
    </Text>
  ),
);

jest.mock('./TransactionAsset', () => ({
  TransactionTokenIcon: (props: {
    token: { symbol: string };
    showNetworkBadge?: boolean;
  }) => mockTransactionTokenIcon(props),
}));

function createBatchSellHistoryItems(): BridgeHistoryItem[] {
  const batchId = '0xbatch123';

  return [
    {
      txMetaId: 'batch-sell-tx-id',
      account: '0x1234567890123456789012345678901234567890',
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
          txHash: '0xbatchsellhash',
        },
        destChain: {
          txHash: '0xdest',
        },
      },
      startTime: Date.now(),
      estimatedProcessingTimeInSeconds: 0,
    },
    {
      txMetaId: 'batch-sell-item-2',
      account: '0x1234567890123456789012345678901234567890',
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
  ] as BridgeHistoryItem[];
}

describe('BatchSell7702TransactionAssets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when batch sell history items are empty', () => {
    const { queryByText } = render(
      <BatchSell7702TransactionAssets batchSellHistoryItems={[]} />,
    );

    expect(queryByText('You swapped')).not.toBeOnTheScreen();
    expect(queryByText('You received')).not.toBeOnTheScreen();
  });

  it('renders swapped and received section headers', () => {
    const { getByText } = render(
      <BatchSell7702TransactionAssets
        batchSellHistoryItems={createBatchSellHistoryItems()}
      />,
    );

    expect(getByText('You swapped')).toBeOnTheScreen();
    expect(getByText('You received')).toBeOnTheScreen();
  });

  it('renders the summed destination amount with a plus prefix', () => {
    const { getByText } = render(
      <BatchSell7702TransactionAssets
        batchSellHistoryItems={createBatchSellHistoryItems()}
      />,
    );

    expect(getByText('+8.00000 USDC')).toBeOnTheScreen();
  });

  it('renders a source token icon for each batch sell history item', () => {
    const { getByTestId } = render(
      <BatchSell7702TransactionAssets
        batchSellHistoryItems={createBatchSellHistoryItems()}
      />,
    );

    expect(getByTestId('token-icon-LINK-no-badge')).toBeOnTheScreen();
    expect(getByTestId('token-icon-ARB-no-badge')).toBeOnTheScreen();
  });

  it('renders the destination token icon without a network badge', () => {
    render(
      <BatchSell7702TransactionAssets
        batchSellHistoryItems={createBatchSellHistoryItems()}
      />,
    );

    expect(mockTransactionTokenIcon).toHaveBeenCalledWith(
      expect.objectContaining({
        token: expect.objectContaining({ symbol: 'USDC' }),
        showNetworkBadge: false,
      }),
    );
  });

  it('does not show network badges on source token icons', () => {
    render(
      <BatchSell7702TransactionAssets
        batchSellHistoryItems={createBatchSellHistoryItems()}
      />,
    );

    expect(mockTransactionTokenIcon).toHaveBeenCalledWith(
      expect.objectContaining({
        token: expect.objectContaining({ symbol: 'LINK' }),
        showNetworkBadge: false,
      }),
    );
    expect(mockTransactionTokenIcon).toHaveBeenCalledWith(
      expect.objectContaining({
        token: expect.objectContaining({ symbol: 'ARB' }),
        showNetworkBadge: false,
      }),
    );
    expect(
      mockTransactionTokenIcon.mock.calls.every(
        ([props]) => props.showNetworkBadge === false,
      ),
    ).toBe(true);
  });
});
