import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useBridgeTxHistoryData } from '../useBridgeTxHistoryData';
import { waitFor } from '@testing-library/react-native';
import {
  initialState,
  evmAccountAddress,
} from '../../../../components/UI/Bridge/_mocks_/initialState';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { Transaction } from '@metamask/keyring-api';
import { StatusTypes, FeatureId } from '@metamask/bridge-controller';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: jest.fn(),
}));

describe('useBridgeTxHistoryData', () => {
  const mockChainId = '0x1' as Hex;
  const mockTxId = 'test-tx-id';
  const mockTxHash = '0x123';

  it('should return undefined bridgeTxHistoryItem and null isBridgeComplete when no transaction is provided', async () => {
    const { result } = renderHookWithProvider(
      () => useBridgeTxHistoryData({}),
      {
        state: initialState,
      },
    );

    await waitFor(() => {
      expect(result.current).toEqual({
        bridgeTxHistoryItem: undefined,
        isBridgeComplete: null,
        batchSellHistoryItems: [],
        is7702Batch: false,
        batchTotalDestAmount: 0,
      });
    });
  });

  it('should find bridge history item by EVM transaction ID', async () => {
    const tx: TransactionMeta = {
      id: mockTxId,
      status: TransactionStatus.confirmed,
      chainId: mockChainId,
      networkClientId: 'mainnet',
      time: Date.now(),
      txParams: {
        to: '0x123',
        from: '0x456',
        value: '0x0',
        data: '0x',
      },
    };

    const { result } = renderHookWithProvider(
      () => useBridgeTxHistoryData({ evmTxMeta: tx }),
      {
        state: initialState,
      },
    );

    await waitFor(() => {
      expect(result.current).toEqual({
        bridgeTxHistoryItem: {
          txMetaId: mockTxId,
          account: evmAccountAddress,
          quote: {
            requestId: 'test-request-id',
            srcChainId: 1,
            srcAsset: {
              chainId: 1,
              address: '0x123',
              decimals: 18,
              name: 'Token One',
              symbol: 'TOKEN1',
            },
            destChainId: 10,
            destAsset: {
              chainId: 10,
              address: '0x456',
              decimals: 18,
              name: 'Token Two',
              symbol: 'TOKEN2',
            },
            srcTokenAmount: '1000000000000000000',
            destTokenAmount: '2000000000000000000',
          },
          status: {
            status: StatusTypes.COMPLETE,
            srcChain: {
              txHash: mockTxHash,
            },
            destChain: {
              txHash: '0x456',
            },
          },
          startTime: expect.any(Number),
          estimatedProcessingTimeInSeconds: 300,
        },
        isBridgeComplete: true,
        batchSellHistoryItems: [],
        is7702Batch: false,
        batchTotalDestAmount: 0,
      });
    });
  });

  it('should find bridge history item by EVM transaction hash', async () => {
    const tx: TransactionMeta = {
      id: 'api-normalized-transaction-id',
      hash: mockTxHash,
      status: TransactionStatus.confirmed,
      chainId: mockChainId,
      networkClientId: 'mainnet',
      time: Date.now(),
      txParams: {
        to: '0x123',
        from: '0x456',
        value: '0x0',
        data: '0x',
      },
    };

    const { result } = renderHookWithProvider(
      () => useBridgeTxHistoryData({ evmTxMeta: tx }),
      {
        state: initialState,
      },
    );

    await waitFor(() => {
      expect(result.current.bridgeTxHistoryItem?.txMetaId).toBe(mockTxId);
      expect(result.current.isBridgeComplete).toBe(true);
      expect(result.current.batchSellHistoryItems).toStrictEqual([]);
      expect(result.current.is7702Batch).toBe(false);
      expect(result.current.batchTotalDestAmount).toBe(0);
    });
  });

  it('should find bridge history item by multi-chain transaction hash', async () => {
    const multiChainTx: Transaction = {
      id: mockTxHash,
      chain: 'eip155:1',
      account: evmAccountAddress,
      status: 'confirmed',
      timestamp: Date.now(),
      type: 'send',
      from: [
        {
          address: '0x123',
          asset: {
            unit: 'ETH',
            type: 'eip155:1/slip44:60',
            amount: '1000000000000000000',
            fungible: true,
          },
        },
      ],
      to: [
        {
          address: '0x456',
          asset: {
            unit: 'ETH',
            type: 'eip155:1/slip44:60',
            amount: '1000000000000000000',
            fungible: true,
          },
        },
      ],
      fees: [
        {
          type: 'base',
          asset: {
            unit: 'ETH',
            type: 'eip155:1/slip44:60',
            amount: '21000000000000',
            fungible: true,
          },
        },
      ],
      events: [
        {
          status: 'confirmed',
          timestamp: Date.now(),
        },
      ],
    };

    const { result } = renderHookWithProvider(
      () => useBridgeTxHistoryData({ multiChainTx }),
      {
        state: initialState,
      },
    );

    await waitFor(() => {
      expect(result.current).toEqual({
        bridgeTxHistoryItem: {
          txMetaId: mockTxId,
          account: evmAccountAddress,
          quote: {
            requestId: 'test-request-id',
            srcChainId: 1,
            srcAsset: {
              chainId: 1,
              address: '0x123',
              decimals: 18,
              name: 'Token One',
              symbol: 'TOKEN1',
            },
            destChainId: 10,
            destAsset: {
              chainId: 10,
              address: '0x456',
              decimals: 18,
              name: 'Token Two',
              symbol: 'TOKEN2',
            },
            srcTokenAmount: '1000000000000000000',
            destTokenAmount: '2000000000000000000',
          },
          status: {
            status: StatusTypes.COMPLETE,
            srcChain: {
              txHash: mockTxHash,
            },
            destChain: {
              txHash: '0x456',
            },
          },
          startTime: expect.any(Number),
          estimatedProcessingTimeInSeconds: 300,
        },
        isBridgeComplete: true,
        batchSellHistoryItems: [],
        is7702Batch: false,
        batchTotalDestAmount: 0,
      });
    });
  });

  it('should return undefined bridgeTxHistoryItem and null isBridgeComplete when no matching bridge history item is found', async () => {
    const tx: TransactionMeta = {
      id: 'non-existent-tx-id',
      status: TransactionStatus.confirmed,
      chainId: mockChainId,
      networkClientId: 'mainnet',
      time: Date.now(),
      txParams: {
        to: '0x123',
        from: '0x456',
        value: '0x0',
        data: '0x',
      },
    };

    const { result } = renderHookWithProvider(
      () => useBridgeTxHistoryData({ evmTxMeta: tx }),
      {
        state: initialState,
      },
    );

    await waitFor(() => {
      expect(result.current).toEqual({
        bridgeTxHistoryItem: undefined,
        isBridgeComplete: null,
        batchSellHistoryItems: [],
        is7702Batch: false,
        batchTotalDestAmount: 0,
      });
    });
  });

  it('should find bridge history item by actionId when not found by transaction ID', async () => {
    const mockActionId = 'test-action-id';
    const stateWithActionIdHistory = {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          BridgeStatusController: {
            txHistory: {
              [mockActionId]: {
                txMetaId: mockActionId,
                account: evmAccountAddress,
                quote: {
                  requestId: 'action-request-id',
                  srcChainId: 1,
                  srcAsset: {
                    chainId: 1,
                    address: '0xabc',
                    decimals: 18,
                    symbol: 'SRC',
                    name: 'Source Token',
                  },
                  destChainId: 137,
                  destAsset: {
                    chainId: 137,
                    address: '0xdef',
                    decimals: 18,
                    symbol: 'DST',
                    name: 'Dest Token',
                  },
                  srcTokenAmount: '500000000000000000',
                  destTokenAmount: '1000000000000000000',
                },
                status: {
                  status: StatusTypes.COMPLETE,
                  srcChain: {
                    txHash: '0xsrchash',
                  },
                  destChain: {
                    txHash: '0xdesthash',
                  },
                },
                startTime: Date.now(),
                estimatedProcessingTimeInSeconds: 180,
              },
            },
          },
        },
      },
    };

    const tx: TransactionMeta = {
      id: 'different-tx-id', // Different from the key in txHistory
      actionId: mockActionId, // Matches the key in txHistory
      status: TransactionStatus.confirmed,
      chainId: mockChainId,
      networkClientId: 'mainnet',
      time: Date.now(),
      txParams: {
        to: '0x123',
        from: '0x456',
        value: '0x0',
        data: '0x',
      },
    };

    const { result } = renderHookWithProvider(
      () => useBridgeTxHistoryData({ evmTxMeta: tx }),
      {
        state: stateWithActionIdHistory,
      },
    );

    await waitFor(() => {
      expect(result.current).toEqual({
        bridgeTxHistoryItem: {
          txMetaId: mockActionId,
          account: evmAccountAddress,
          quote: {
            requestId: 'action-request-id',
            srcChainId: 1,
            srcAsset: {
              chainId: 1,
              address: '0xabc',
              decimals: 18,
              symbol: 'SRC',
              name: 'Source Token',
            },
            destChainId: 137,
            destAsset: {
              chainId: 137,
              address: '0xdef',
              decimals: 18,
              symbol: 'DST',
              name: 'Dest Token',
            },
            srcTokenAmount: '500000000000000000',
            destTokenAmount: '1000000000000000000',
          },
          status: {
            status: StatusTypes.COMPLETE,
            srcChain: {
              txHash: '0xsrchash',
            },
            destChain: {
              txHash: '0xdesthash',
            },
          },
          startTime: expect.any(Number),
          estimatedProcessingTimeInSeconds: 180,
        },
        isBridgeComplete: true,
        batchSellHistoryItems: [],
        is7702Batch: false,
        batchTotalDestAmount: 0,
      });
    });
  });

  it('returns batch sell data for 7702 batch transactions', async () => {
    const batchTxHash = '0xbatchsellhash';
    const batchTxId = 'batch-sell-tx-id';
    const batchId = '0xbatch123';
    const stateWithBatchSellHistory = {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
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

    const tx: TransactionMeta = {
      id: batchTxId,
      hash: batchTxHash,
      status: TransactionStatus.confirmed,
      chainId: mockChainId,
      networkClientId: 'mainnet',
      time: Date.now(),
      nestedTransactions: [
        { type: TransactionType.swap },
        { type: TransactionType.swapApproval },
      ],
      txParams: {
        to: '0x123',
        from: '0x456',
        value: '0x0',
        data: '0x',
      },
    };

    const { result } = renderHookWithProvider(
      () => useBridgeTxHistoryData({ evmTxMeta: tx }),
      {
        state: stateWithBatchSellHistory,
      },
    );

    await waitFor(() => {
      expect(result.current.bridgeTxHistoryItem?.txMetaId).toBe(batchTxId);
      expect(result.current.is7702Batch).toBe(true);
      expect(result.current.batchSellHistoryItems).toHaveLength(2);
      expect(result.current.batchTotalDestAmount).toBe(8000000);
      expect(result.current.isBridgeComplete).toBe(true);
    });
  });

  it('returns is7702Batch false when nested transactions are not present', async () => {
    const batchTxHash = '0xbatchsellhash';
    const batchTxId = 'batch-sell-tx-id';

    const stateWithBatchSellHistory = {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          BridgeStatusController: {
            txHistory: {
              [batchTxId]: {
                txMetaId: batchTxId,
                account: evmAccountAddress,
                featureId: FeatureId.BATCH_SELL,
                quote: {
                  requestId: 'batch-request-id',
                  srcChainId: 1,
                  destChainId: 1,
                  srcAsset: {
                    chainId: 1,
                    address: '0x123',
                    decimals: 18,
                    symbol: 'TOKEN1',
                    name: 'Token One',
                  },
                  destAsset: {
                    chainId: 1,
                    address: '0x456',
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
            },
          },
        },
      },
    };

    const tx: TransactionMeta = {
      id: batchTxId,
      hash: batchTxHash,
      status: TransactionStatus.confirmed,
      chainId: mockChainId,
      networkClientId: 'mainnet',
      time: Date.now(),
      txParams: {
        to: '0x123',
        from: '0x456',
        value: '0x0',
        data: '0x',
      },
    };

    const { result } = renderHookWithProvider(
      () => useBridgeTxHistoryData({ evmTxMeta: tx }),
      {
        state: stateWithBatchSellHistory,
      },
    );

    await waitFor(() => {
      expect(result.current.is7702Batch).toBe(false);
      expect(result.current.batchSellHistoryItems).toStrictEqual([]);
      expect(result.current.batchTotalDestAmount).toBe(0);
    });
  });
});
