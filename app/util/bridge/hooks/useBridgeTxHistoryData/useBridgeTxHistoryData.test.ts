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
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { Transaction } from '@metamask/keyring-api';
import { StatusTypes } from '@metamask/bridge-controller';

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
      });
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
      });
    });
  });
});
