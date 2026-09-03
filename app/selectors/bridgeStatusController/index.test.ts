import { FeatureId, StatusTypes } from '@metamask/bridge-controller';
import { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import {
  initialState,
  evmAccountAddress,
} from '../../components/UI/Bridge/_mocks_/initialState';
import { RootState } from '../../reducers';
import { selectBatchSellHistoryItemsForTxHash } from './index';

const batchTxHash = '0xbatchsellhash';
const batchTxId = 'batch-sell-tx-id';
const batchId = '0xbatch123';

const createBatchSellHistoryItem = (
  txMetaId: string,
  destTokenAmount: string,
  txHash?: string,
): BridgeHistoryItem =>
  ({
    txMetaId,
    account: evmAccountAddress,
    featureId: FeatureId.BATCH_SELL,
    batchId,
    quote: {
      requestId: `${txMetaId}-request`,
      srcChainId: 42161,
      destChainId: 42161,
      srcAsset: {
        chainId: 42161,
        address: '0xf97f4df75117a78c1a5a0dbb814af92458539fb4',
        decimals: 18,
        symbol: 'LINK',
        name: 'Chainlink',
        assetId:
          'eip155:42161/erc20:0xf97f4df75117a78c1a5a0dbb814af92458539fb4',
      },
      destAsset: {
        chainId: 42161,
        address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
        decimals: 6,
        symbol: 'USDC',
        name: 'USDC',
        assetId:
          'eip155:42161/erc20:0xaf88d065e77c8cc2239327c5edb3a432268e5831',
      },
      srcTokenAmount: '1000000000000000000',
      destTokenAmount,
      minDestTokenAmount: destTokenAmount,
      feeData: {
        metabridge: {
          amount: '0',
          asset: {
            chainId: 42161,
            address: '0xf97f4df75117a78c1a5a0dbb814af92458539fb4',
            decimals: 18,
            symbol: 'LINK',
            name: 'Chainlink',
            assetId:
              'eip155:42161/erc20:0xf97f4df75117a78c1a5a0dbb814af92458539fb4',
          },
        },
      },
      bridgeId: 'test-bridge',
      bridges: [],
      steps: [],
    },
    status: {
      status: StatusTypes.COMPLETE,
      srcChain: {
        chainId: 42161,
        txHash,
      },
      destChain: {
        chainId: 42161,
        txHash: '0xdest',
      },
    },
    startTime: Date.now(),
    estimatedProcessingTimeInSeconds: 0,
    slippagePercentage: 0,
    hasApprovalTx: false,
  }) as BridgeHistoryItem;

describe('selectBatchSellHistoryItemsForTxHash', () => {
  const batchSellState = {
    ...initialState,
    engine: {
      ...initialState.engine,
      backgroundState: {
        ...initialState.engine.backgroundState,
        BridgeStatusController: {
          quoteUpdateStatusStore: {},
          txHistory: {
            [batchTxId]: createBatchSellHistoryItem(
              batchTxId,
              '5000000',
              batchTxHash,
            ),
            'batch-sell-item-2': createBatchSellHistoryItem(
              'batch-sell-item-2',
              '3000000',
              '0xotherhash',
            ),
          },
        },
      },
    },
  } as unknown as RootState;

  it('returns empty history items when tx hash is undefined', () => {
    const result = selectBatchSellHistoryItemsForTxHash(batchSellState);

    expect(result).toEqual({
      historyItems: [],
      is7702Batch: false,
    });
  });

  it('returns all batch sell history items for a matching tx hash', () => {
    const result = selectBatchSellHistoryItemsForTxHash(
      batchSellState,
      batchTxHash,
    );

    expect(result.historyItems).toHaveLength(2);
    expect(result.historyItems.map((item) => item.txMetaId)).toEqual(
      expect.arrayContaining([batchTxId, 'batch-sell-item-2']),
    );
    expect(result.is7702Batch).toBe(false);
  });

  it('returns 7702 batch flag when parent history item has quoteIds', () => {
    const quoteIdsState = {
      ...batchSellState,
      engine: {
        ...batchSellState.engine,
        backgroundState: {
          ...batchSellState.engine.backgroundState,
          BridgeStatusController: {
            quoteUpdateStatusStore: {},
            txHistory: {
              [batchTxId]: {
                ...createBatchSellHistoryItem(
                  batchTxId,
                  '5000000',
                  batchTxHash,
                ),
                quoteIds: ['batch-sell-item-2'],
              },
              'batch-sell-item-2': createBatchSellHistoryItem(
                'batch-sell-item-2',
                '3000000',
                '0xotherhash',
              ),
            },
          },
        },
      },
    } as RootState;

    const result = selectBatchSellHistoryItemsForTxHash(
      quoteIdsState,
      batchTxHash,
    );

    expect(result.historyItems).toHaveLength(1);
    expect(result.historyItems[0].txMetaId).toBe('batch-sell-item-2');
    expect(result.is7702Batch).toBe(true);
  });
});
