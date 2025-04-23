import { getBridgeTxActivityTitle } from './transaction-history';
import { BridgeHistoryItem, StatusTypes } from '@metamask/bridge-status-controller';
import { ChainId } from '@metamask/bridge-controller';

// Mock the strings function
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((_key, params) => `bridge_to_${params.chainName}`),
}));

describe('getBridgeTxActivityTitle', () => {
  it('should return undefined when destChainName is not found in NETWORK_TO_SHORT_NETWORK_NAME_MAP', () => {
    const bridgeHistoryItem: BridgeHistoryItem = {
      txMetaId: 'test-tx-id',
      account: '0x123',
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        destChainId: 999 as any, // Non-existent chain ID
        destAsset: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          chainId: 999 as any,
          address: '0x456',
          decimals: 18,
          symbol: 'TOKEN',
          name: 'Test Token',
          assetId: 'eip155:999/erc20:0x456',
        },
        srcTokenAmount: '1000000000000000000',
        destTokenAmount: '2000000000000000000',
        feeData: {
          metabridge: {
            amount: '0',
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
        bridges: [],
        steps: [],
      },
      status: {
        srcChain: {
          chainId: 1,
          txHash: '0x123',
        },
        destChain: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          chainId: 999 as any,
          txHash: '0x456',
        },
        status: StatusTypes.COMPLETE,
      },
      startTime: Date.now(),
      estimatedProcessingTimeInSeconds: 300,
      slippagePercentage: 0,
      hasApprovalTx: false,
    };

    const result = getBridgeTxActivityTitle(bridgeHistoryItem);
    expect(result).toBeUndefined();
  });

  it('should return formatted title for EVM chain', () => {
    const bridgeHistoryItem: BridgeHistoryItem = {
      txMetaId: 'test-tx-id',
      account: '0x123',
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
        destChainId: 10, // Optimism chain ID
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
            amount: '0',
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
        bridges: [],
        steps: [],
      },
      status: {
        srcChain: {
          chainId: 1,
          txHash: '0x123',
        },
        destChain: {
          chainId: 10,
          txHash: '0x456',
        },
        status: StatusTypes.COMPLETE,
      },
      startTime: Date.now(),
      estimatedProcessingTimeInSeconds: 300,
      slippagePercentage: 0,
      hasApprovalTx: false,
    };

    const result = getBridgeTxActivityTitle(bridgeHistoryItem);
    expect(result).toBe('bridge_to_Optimism');
  });

  it('should return formatted title for Solana chain', () => {
    const bridgeHistoryItem: BridgeHistoryItem = {
      txMetaId: 'test-tx-id',
      account: '0x123',
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
        destChainId: ChainId.SOLANA,
        destAsset: {
          chainId: ChainId.SOLANA,
          address: '0x456',
          decimals: 18,
          symbol: 'SOL',
          name: 'Solana',
          assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
        },
        srcTokenAmount: '1000000000000000000',
        destTokenAmount: '2000000000000000000',
        feeData: {
          metabridge: {
            amount: '0',
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
        bridges: [],
        steps: [],
      },
      status: {
        srcChain: {
          chainId: 1,
          txHash: '0x123',
        },
        destChain: {
          chainId: ChainId.SOLANA,
          txHash: '0x456',
        },
        status: StatusTypes.COMPLETE,
      },
      startTime: Date.now(),
      estimatedProcessingTimeInSeconds: 300,
      slippagePercentage: 0,
      hasApprovalTx: false,
    };

    const result = getBridgeTxActivityTitle(bridgeHistoryItem);
    expect(result).toBe('bridge_to_Solana');
  });
});
