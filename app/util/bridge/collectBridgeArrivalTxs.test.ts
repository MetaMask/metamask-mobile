import {
  bridgeDestMatchesPageAsset,
  collectBridgeArrivalTxs,
  createBridgeHistoryFinder,
} from './collectBridgeArrivalTxs';

describe('bridgeDestMatchesPageAsset', () => {
  it('matches a native destination by configured native asset id', () => {
    expect(
      bridgeDestMatchesPageAsset({
        quote: {
          destChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          destAsset: {
            address: '0x0000000000000000000000000000000000000000',
            assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
          },
        },
        pageAsset: { isNative: true },
        nativeAssetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
      }),
    ).toBe(true);
  });
});

describe('collectBridgeArrivalTxs', () => {
  const evmBridgeTx = {
    id: 'evm-bridge-1',
    chainId: '0x2105',
    hash: '0xsource',
    status: 'confirmed',
    type: 'bridge',
    txParams: { from: '0xabc', to: '0xdef' },
  };

  const nevmSourceTx = {
    id: 'stellar-src-1',
    chain: 'stellar:pubnet',
    status: 'confirmed',
  };

  it('collects EVM source bridge txs arriving at a NEVM destination page', () => {
    const bridgeHistory = {
      'evm-bridge-1': {
        quote: {
          srcChainId: 8453,
          destChainId: 1151111081099710,
          destAsset: {
            assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
          },
        },
      },
    };

    const arrivals = collectBridgeArrivalTxs({
      bridgeHistory,
      evmTransactions: [evmBridgeTx],
      pageAsset: {
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        isNative: true,
      },
      isNonEvmAsset: true,
      nativeAssetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
      isBridgeTx: (tx) => tx.type === 'bridge',
      findHistoryForTx: createBridgeHistoryFinder(bridgeHistory),
    });

    expect(arrivals).toEqual([evmBridgeTx]);
  });

  it('collects NEVM source txs for a cross-NEVM destination page', () => {
    const arrivals = collectBridgeArrivalTxs({
      bridgeHistory: {
        'stellar-src-1': {
          txMetaId: 'stellar-src-1',
          quote: {
            srcChainId: 'stellar:pubnet',
            destChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            destAsset: {
              assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
            },
          },
          status: {
            srcChain: { txHash: 'stellar-src-1' },
          },
        },
      },
      evmTransactions: [],
      nonEvmTransactions: [nevmSourceTx],
      pageAsset: {
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        isNative: true,
      },
      isNonEvmAsset: true,
      nativeAssetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
      isBridgeTx: () => false,
      findHistoryForTx: () => undefined,
    });

    expect(arrivals).toEqual([nevmSourceTx]);
  });

  it('collects EVM dest fill txs for NEVM→EVM bridges on an EVM token page', () => {
    const evmDestFill = {
      id: '0xdestfill',
      chainId: '0x1',
      hash: '0xdestfill',
      status: 'confirmed',
      type: 'receive',
      txParams: { from: '0xbridge', to: '0xuser' },
    };

    const arrivals = collectBridgeArrivalTxs({
      bridgeHistory: {
        'stellar-src-1': {
          quote: {
            srcChainId: 'stellar:pubnet',
            destChainId: 1,
            destAsset: {
              address: '0x0000000000000000000000000000000000000000',
              assetId: 'eip155:1/slip44:60',
            },
          },
          status: {
            srcChain: { txHash: 'stellar-src-1' },
            destChain: { txHash: '0xdestfill' },
          },
        },
      },
      evmTransactions: [evmDestFill],
      nonEvmTransactions: [nevmSourceTx],
      pageAsset: {
        chainId: '0x1',
        isNative: true,
        isETH: true,
      },
      isNonEvmAsset: false,
      pageChainId: '0x1',
      nativeAssetId: 'eip155:1/slip44:60',
      isBridgeTx: () => false,
      findHistoryForTx: () => undefined,
    });

    expect(arrivals).toEqual([evmDestFill]);
  });
});
