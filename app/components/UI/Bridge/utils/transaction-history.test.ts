/* eslint-disable @typescript-eslint/no-explicit-any */
import '../_mocks_/initialState';
import {
  decodeBridgeTx,
  decodeSwapsTx,
  getSwapBridgeTxActivityTitle,
  handleUnifiedSwapsTxHistoryItemClick,
} from './transaction-history';
import {
  BridgeHistoryItem,
  MAX_ATTEMPTS,
} from '@metamask/bridge-status-controller';
import { ChainId, StatusTypes } from '@metamask/bridge-controller';
import { TransactionType } from '@metamask/transaction-controller';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../../core/Engine';

// Mock dependencies
jest.mock('../../../../core/Engine', () => ({
  context: {
    BridgeStatusController: {
      restartPollingForFailedAttempts: jest.fn(),
    },
  },
}));

describe('getBridgeTxActivityTitle', () => {
  it('should return undefined when destChainName is not found in NETWORK_TO_SHORT_NETWORK_NAME_MAP', () => {
    const bridgeHistoryItem: BridgeHistoryItem = {
      txMetaId: 'test-tx-id',
      account: '0x123',
      quote: {
        requestId: 'test-request-id',
        minDestTokenAmount: '1000000000000000000',
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
        minDestTokenAmount: '1900000000000000000',
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

    const result = getSwapBridgeTxActivityTitle(bridgeHistoryItem);
    expect(result).toBeUndefined();
  });

  it('should return formatted title for EVM chain', () => {
    const bridgeHistoryItem: BridgeHistoryItem = {
      txMetaId: 'test-tx-id',
      account: '0x123',
      quote: {
        requestId: 'test-request-id',
        minDestTokenAmount: '1000000000000000000',
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
        minDestTokenAmount: '1900000000000000000',
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

    const result = getSwapBridgeTxActivityTitle(bridgeHistoryItem);
    expect(result).toBe('Bridge to Optimism');
  });

  it('should return formatted title for Solana chain', () => {
    const bridgeHistoryItem: BridgeHistoryItem = {
      txMetaId: 'test-tx-id',
      account: '0x123',
      quote: {
        requestId: 'test-request-id',
        minDestTokenAmount: '1000000000000000000',
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
        minDestTokenAmount: '1900000000000000000',
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

    const result = getSwapBridgeTxActivityTitle(bridgeHistoryItem);
    expect(result).toBe('Bridge to Solana');
  });
});

describe('decodeSwapsTx', () => {
  it('should return transaction element and details', () => {
    const args = {
      tx: {
        actionId: '1750349559763.205',
        chainId: '0x1',
        id: '38f29d20-4d28-11f0-b3a2-cfbee34c3b0d',
        networkClientId: 'mainnet',
        origin: 'metamask',
        status: 'confirmed',
        time: 1750349559794,
        txParams: {
          from: '0xc5fe6ef47965741f6f7a4734bf784bf3ae3f2452',
          data: '0x5f5755290000000000000000000000000000000000000000000000000000000000000080000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000004c4b4000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000136f6e65496e6368563546656544796e616d6963000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004c4b400000000000000000000000000000000000000000000000000006fd85b6e562df000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000fe03c450534000000000000000000000000f326e4de8f66a0bdc0970b79e0924e33c79f1915000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000c80502b1c5000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000004c4b4000000000000000000000000000000000000000000000000000070d51a0f1bdcf0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000140000000000000003b6d03403aa370aacf4cb08c7e1e7aa8e8ff9418d73c7e0f7dcbea7c000000000000000000000000000000000000000000000000f1aa19bd59d3b42df5ac1e82bbb87248d8f937ff385b4235698a44609a7c8744635d151f16a3a991297b331e018f11f1977cedea9fdb572cf95ede52efcf0f601b',
          gas: '0x409db',
          gasLimit: '0x409db',
          nonce: '0x5ba',
          to: '0x881d40237659c251811cec9c364ef91dc08d300c',
          value: '0x0',
          maxFeePerGas: '0x1cf3b9c98',
          maxPriorityFeePerGas: '0x77359400',
          type: '0x2',
        },
        type: 'swap',
        defaultGasEstimates: {
          gas: '0x409db',
          maxFeePerGas: '0x1cf3b9c98',
          maxPriorityFeePerGas: '0x77359400',
          estimateType: 'medium',
        },
        rawTx:
          '0x02f90395018205ba84773594008501cf3b9c98830409db94881d40237659c251811cec9c364ef91dc08d300c80b903255f5755290000000000000000000000000000000000000000000000000000000000000080000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000004c4b4000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000136f6e65496e6368563546656544796e616d6963000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004c4b400000000000000000000000000000000000000000000000000006fd85b6e562df000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000fe03c450534000000000000000000000000f326e4de8f66a0bdc0970b79e0924e33c79f1915000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000c80502b1c5000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000004c4b4000000000000000000000000000000000000000000000000000070d51a0f1bdcf0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000140000000000000003b6d03403aa370aacf4cb08c7e1e7aa8e8ff9418d73c7e0f7dcbea7c000000000000000000000000000000000000000000000000f1aa19bd59d3b42df5ac1e82bbb87248d8f937ff385b4235698a44609a7c8744635d151f16a3a991297b331e018f11f1977cedea9fdb572cf95ede52efcf0f601bc080a0212e3a68c67c7381090e5a092d551b5db4bee663b470d9c4d7000d8c3291da0aa01280909274c0dfaad55fd75be97409864c4988b7921da79f82f2de02d57dee51',
        gasFeeEstimates: {
          type: 'fee-market',
          low: {
            maxFeePerGas: '0x9594d846',
            maxPriorityFeePerGas: '0x186a0',
          },
          medium: {
            maxFeePerGas: '0xfdd1449b',
            maxPriorityFeePerGas: '0x27ecae91',
          },
          high: {
            maxFeePerGas: '0x1cf3b9c98',
            maxPriorityFeePerGas: '0x77359400',
          },
        },
        gasFeeEstimatesLoaded: true,
        hash: '0xac561978ed01a8828e30c193c8368b0baec0f8c8c85c933c324c06352a16aeb6',
        submittedTime: 1750349563369,
        preTxBalance: '0x9853b640d6115',
        baseFeePerGas: '0x868d62db',
        blockTimestamp: '0x6854373b',
        postTxBalance: '0xce14a010524b1',
      },
      txChainId: '0x1',
      ticker: 'ETH',
      currentCurrency: 'usd',
      contractExchangeRates: {
        '0x0000000000000000000000000000000000000000': {
          tokenAddress: '0x0000000000000000000000000000000000000000',
          currency: 'ETH',
          id: 'ethereum',
          price: 1.000007799378825,
        },
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': {
          tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          currency: 'ETH',
          id: 'usd-coin',
          price: 0.00039927436751183577,
        },
      },
      conversionRate: 2507.74,
      primaryCurrency: 'ETH',
      bridgeTxHistoryData: {
        bridgeTxHistoryItem: {
          txMetaId: '38f29d20-4d28-11f0-b3a2-cfbee34c3b0d',
          quote: {
            requestId:
              '0x1d5a02ce9441ad962b3e2415e1caf86fd6c591e5ef26dc4d898f4f7a255f9c5f',
            bridgeId: '1inch',
            srcChainId: 1,
            destChainId: 1,
            srcAsset: {
              address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
              chainId: 1,
              assetId:
                'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
              symbol: 'USDC',
              decimals: 6,
              name: 'USDC',
              iconUrl:
                'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
            },
            srcTokenAmount: '5000000',
            destAsset: {
              address: '0x0000000000000000000000000000000000000000',
              chainId: 1,
              assetId: 'eip155:1/slip44:60',
              symbol: 'ETH',
              decimals: 18,
              name: 'Ethereum',
              iconUrl:
                'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
              metadata: {},
            },
            destTokenAmount: '1967600601227999',
            minDestTokenAmount: '1872000581163199',
            walletAddress: '0xC5FE6EF47965741f6f7A4734Bf784bf3ae3f2452',
            destWalletAddress: '0xC5FE6EF47965741f6f7A4734Bf784bf3ae3f2452',
            feeData: {
              metabridge: {
                amount: '17455758247220',
                asset: {
                  address: '0x0000000000000000000000000000000000000000',
                  chainId: 1,
                  assetId: 'eip155:1/slip44:60',
                  symbol: 'ETH',
                  decimals: 18,
                  name: 'Ethereum',
                  iconUrl:
                    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
                },
              },
            },
            bridges: ['1inch'],
            protocols: ['1inch'],
            steps: [],
            priceData: {
              totalFromAmountUsd: '4.99899',
              totalToAmountUsd: '4.915361441957726',
              priceImpact: '0.016729090884813485',
            },
          },
          startTime: 1750349558653,
          estimatedProcessingTimeInSeconds: 0,
          slippagePercentage: 0,
          pricingData: {
            amountSent: '17455763.24722',
            amountSentInUsd: '17452621.2098355004',
            quotedGasInUsd: '3.42027182428729424088',
            quotedReturnInUsd: '4.91728969054692914087',
          },
          account: '0xc5fe6ef47965741f6f7a4734bf784bf3ae3f2452',
          status: {
            status: 'PENDING',
            srcChain: {
              chainId: 1,
            },
          },
          hasApprovalTx: true,
          approvalTxId: '384482d0-4d28-11f0-b3a2-cfbee34c3b0d',
          isStxEnabled: true,
        },
        isBridgeComplete: false,
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = decodeSwapsTx(args as unknown as any);
    expect(res).toEqual([
      {
        renderTo: '0x881d40237659c251811cec9c364ef91dc08d300c',
        renderFrom: '0xc5fe6ef47965741f6f7a4734bf784bf3ae3f2452',
        actionKey: 'Swap USDC to ETH',
        notificationKey: 'Swap complete (USDC to ETH)',
        value: '-5.0 USDC',
        fiatValue: '$5.01',
        transactionType: 'swaps_transaction',
      },
      {
        renderFrom: '0xc5fe6ef47965741f6f7a4734bf784bf3ae3f2452',
        renderTo: '0x881d40237659c251811cec9c364ef91dc08d300c',
        hash: '0xac561978ed01a8828e30c193c8368b0baec0f8c8c85c933c324c06352a16aeb6',
        renderValue: '5.0 USDC',
        renderGas: 264667,
        renderGasPrice: undefined,
        renderTotalGas: '0.00053 ETH',
        txChainId: '0x1',
        summaryAmount: '5.0 USDC',
        summaryFee: '0.00053 ETH',
        summaryTotalAmount: '5.00053 ETH',
        summarySecondaryTotalAmount: '$6.33',
      },
    ]);
  });
});

describe('decodeBridgeTx', () => {
  it('should return transaction element and details', () => {
    const args = {
      tx: {
        actionId: '1750370771969.0476',
        chainId: '0x1',
        id: '9c931b80-4d59-11f0-ad4f-2591c68e24b1',
        networkClientId: 'mainnet',
        origin: 'metamask',
        status: 'confirmed',
        time: 1750370772280,
        txParams: {
          from: '0xc5fe6ef47965741f6f7a4734bf784bf3ae3f2452',
          data: '0x3ce33bff0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000038d7ea4c6800000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000000d6c6966694164617074657256320000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001e000000000000000000000000021a786957c69424a4353afe743242bd9db3cc07b00000000000000000000000021a786957c69424a4353afe743242bd9db3cc07b000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000038589602234000000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000007f544a44c00000000000000000000000000e6b738da243e8fa2a0ed5915645789add5de5152000000000000000000000000000000000000000000000000000000000000008cdf834e154a9ca644d41a9dcec5fe6ef47965741f6f7a4734bf784bf3ae3f2452c5fe6ef47965741f6f7a4734bf784bf3ae3f24520000000a42000000000000000000000000000000000000060000000000000000000000000000000000000000000000000003854f51f3c8380000000000000000000000000000000000000000685488d76854acf70000000000000000000000000000000000000000000000004404b840bc3737784220324b740d6aa57a13f00ce656fc50d163cd267775b6db389acbe19aac5dcc475ca45a428529a6c8c4335b7b0026a8325b332d26f0e4051b',
          gas: '0x26c67',
          gasLimit: '0x26c67',
          nonce: '0x5c6',
          to: '0x0439e60f02a8900a951603950d8d4527f400c3f1',
          value: '0x38d7ea4c68000',
          maxFeePerGas: '0xd0929e94',
          maxPriorityFeePerGas: '0x77359400',
          type: '0x2',
        },
        type: 'bridge',
        defaultGasEstimates: {
          gas: '0x26c67',
          maxFeePerGas: '0xd0929e94',
          maxPriorityFeePerGas: '0x77359400',
          estimateType: 'medium',
        },
        gasFeeEstimates: {
          type: 'fee-market',
          low: {
            maxFeePerGas: '0x26dc10ca',
            maxPriorityFeePerGas: '0x186a0',
          },
          medium: {
            maxFeePerGas: '0x555cf242',
            maxPriorityFeePerGas: '0x1dcd6500',
          },
          high: {
            maxFeePerGas: '0xd0929e94',
            maxPriorityFeePerGas: '0x77359400',
          },
        },
        gasFeeEstimatesLoaded: true,
        rawTx:
          '0x02f9037b018205c6847735940084d0929e9483026c67940439e60f02a8900a951603950d8d4527f400c3f187038d7ea4c68000b903053ce33bff0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000038d7ea4c6800000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000000d6c6966694164617074657256320000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001e000000000000000000000000021a786957c69424a4353afe743242bd9db3cc07b00000000000000000000000021a786957c69424a4353afe743242bd9db3cc07b000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000038589602234000000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000007f544a44c00000000000000000000000000e6b738da243e8fa2a0ed5915645789add5de5152000000000000000000000000000000000000000000000000000000000000008cdf834e154a9ca644d41a9dcec5fe6ef47965741f6f7a4734bf784bf3ae3f2452c5fe6ef47965741f6f7a4734bf784bf3ae3f24520000000a42000000000000000000000000000000000000060000000000000000000000000000000000000000000000000003854f51f3c8380000000000000000000000000000000000000000685488d76854acf70000000000000000000000000000000000000000000000004404b840bc3737784220324b740d6aa57a13f00ce656fc50d163cd267775b6db389acbe19aac5dcc475ca45a428529a6c8c4335b7b0026a8325b332d26f0e4051bc001a0905706b97b52614a31e670bc9c4315883accd362b65af070a06964055db393aea04374cb79abb1c6b62cf2c3ffd97d73a38512b5753b31b0337b2f41dcdef3ac12',
        hash: '0x423c2fdcb339d575a494f9db7131963fa6848ed55e76f24a85b344a2622abf1c',
        submittedTime: 1750370774155,
        baseFeePerGas: '0x2769a25e',
        blockTimestamp: '0x685489df',
      },
      currentCurrency: 'usd',
      contractExchangeRates: {
        '0x0000000000000000000000000000000000000000': {
          tokenAddress: '0x0000000000000000000000000000000000000000',
          currency: 'ETH',
          id: 'ethereum',
          price: 0.999970810346375,
        },
      },
      conversionRate: 2514.87,
      bridgeTxHistoryData: {
        bridgeTxHistoryItem: {
          txMetaId: '9c931b80-4d59-11f0-ad4f-2591c68e24b1',
          quote: {
            bridgeId: 'lifi',
            requestId:
              '0x16b2218808e54d1b0c01c49ef8ee886e20e1a7051a2ce438b72473e54da0a14c',
            aggregator: 'lifi',
            srcChainId: 1,
            srcTokenAmount: '991250000000000',
            srcAsset: {
              address: '0x0000000000000000000000000000000000000000',
              chainId: 1,
              assetId: 'eip155:1/slip44:60',
              symbol: 'ETH',
              decimals: 18,
              name: 'Ethereum',
              iconUrl:
                'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
              metadata: {},
              price: '2508.40719604',
            },
            destChainId: 10,
            destTokenAmount: '991000653973560',
            minDestTokenAmount: '941450621125082',
            destAsset: {
              address: '0x0000000000000000000000000000000000000000',
              chainId: 10,
              assetId: 'eip155:10/slip44:614',
              symbol: 'ETH',
              decimals: 18,
              name: 'Ether',
              iconUrl:
                'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/10/slip44/614.png',
              metadata: {},
              price: '2508.40719604',
            },
            feeData: {
              metabridge: {
                amount: '8750000000000',
                asset: {
                  address: '0x0000000000000000000000000000000000000000',
                  chainId: 1,
                  assetId: 'eip155:1/slip44:60',
                  symbol: 'ETH',
                  decimals: 18,
                  name: 'Ethereum',
                  iconUrl:
                    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
                  metadata: {},
                  price: '2508.40719604',
                },
              },
            },
            bridges: ['across (via LiFi)'],
            protocols: ['across (via LiFi)'],
            steps: [
              {
                action: 'bridge',
                srcChainId: 1,
                destChainId: 10,
                protocol: {
                  name: 'across',
                  displayName: 'AcrossV3',
                  icon: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/across.svg',
                },
                srcAsset: {
                  address: '0x0000000000000000000000000000000000000000',
                  chainId: 1,
                  assetId: 'eip155:1/slip44:60',
                  symbol: 'ETH',
                  decimals: 18,
                  name: 'Ethereum',
                  iconUrl:
                    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
                  metadata: {},
                },
                destAsset: {
                  address: '0x0000000000000000000000000000000000000000',
                  chainId: 10,
                  assetId: 'eip155:10/slip44:614',
                  symbol: 'ETH',
                  decimals: 18,
                  name: 'Ether',
                  iconUrl:
                    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/10/slip44/614.png',
                  metadata: {},
                },
                srcAmount: '991250000000000',
                destAmount: '991000653973560',
              },
            ],
            priceData: {
              totalFromAmountUsd: '2.51158',
              totalToAmountUsd: '0.0005574021918365844',
              priceImpact: '0.9997780671163824',
            },
          },
          startTime: 1750370772486,
          estimatedProcessingTimeInSeconds: 8,
          slippagePercentage: 0,
          pricingData: {
            amountSent: '0.001',
            amountSentInUsd: '2.51487',
            quotedGasInUsd: '1.05920236691058491226',
            quotedReturnInUsd: '2.4922378146584868372',
          },
          account: '0xc5fe6ef47965741f6f7a4734bf784bf3ae3f2452',
          status: {
            status: 'COMPLETE',
            isExpectedToken: true,
            bridge: 'across',
            srcChain: {
              chainId: 1,
              txHash:
                '0x423c2fdcb339d575a494f9db7131963fa6848ed55e76f24a85b344a2622abf1c',
              amount: '991250000000000',
              token: {
                address: '0x0000000000000000000000000000000000000000',
                chainId: 1,
                assetId: 'eip155:1/slip44:60',
                symbol: 'ETH',
                decimals: 18,
                name: 'Ethereum',
                iconUrl:
                  'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
                metadata: {},
              },
            },
            destChain: {
              chainId: 10,
              txHash:
                '0xd47f87fd0df561ece589faacfb0bc29812bccc979dbb00674ca16290bf60f3de',
              amount: '991000653973560',
              token: {
                address: '0x0000000000000000000000000000000000000000',
                chainId: 10,
                assetId: 'eip155:10/slip44:614',
                symbol: 'ETH',
                decimals: 18,
                name: 'Ether',
                iconUrl:
                  'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/10/slip44/614.png',
                metadata: {},
              },
            },
          },
          hasApprovalTx: false,
          isStxEnabled: true,
          completionTime: 1750370794608,
        },
        isBridgeComplete: true,
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = decodeBridgeTx(args as unknown as any);
    expect(res).toEqual([
      {
        renderTo: '0x0439e60f02a8900a951603950d8d4527f400c3f1',
        renderFrom: '0xc5fe6ef47965741f6f7a4734bf784bf3ae3f2452',
        actionKey: 'Bridge to Optimism',
        value: '-0.00099125 ETH',
        fiatValue: '$2.49',
        transactionType: 'bridge_transaction',
      },
      {},
    ]);
  });
});

describe('handleUnifiedSwapsTxHistoryItemClick', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };

  const mockTx = {
    id: 'test-tx-id',
    type: TransactionType.bridge,
    txParams: {
      from: '0x123',
      to: '0x456',
    },
  };

  const mockBridgeTxHistoryItem: BridgeHistoryItem = {
    txMetaId: 'test-tx-id',
    account: '0x123',
    quote: {
      requestId: 'test-request-id',
      minDestTokenAmount: '1000000000000000000',
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
      },
      destChain: {
        chainId: 10,
      },
      status: StatusTypes.PENDING,
    },
    startTime: Date.now(),
    estimatedProcessingTimeInSeconds: 300,
    slippagePercentage: 0,
    hasApprovalTx: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to bridge transaction details with correct parameters', () => {
    // Arrange
    const navigation = mockNavigation as any;
    const tx = mockTx as any;

    // Act
    handleUnifiedSwapsTxHistoryItemClick(navigation, tx);

    // Assert
    expect(navigation.navigate).toHaveBeenCalledWith(
      Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS,
      { evmTxMeta: tx },
    );
  });

  it('resets attempts when bridge transaction has reached max attempts', () => {
    // Arrange
    const navigation = mockNavigation as any;
    const tx = { ...mockTx, type: TransactionType.bridge } as any;
    const bridgeTxHistoryItem = {
      ...mockBridgeTxHistoryItem,
      attempts: { counter: MAX_ATTEMPTS, lastAttemptTime: Date.now() },
    };

    // Act
    handleUnifiedSwapsTxHistoryItemClick(navigation, tx, bridgeTxHistoryItem);

    // Assert
    expect(
      Engine.context.BridgeStatusController.restartPollingForFailedAttempts,
    ).toHaveBeenCalledWith({
      txMetaId: bridgeTxHistoryItem.txMetaId,
    });
  });

  it('resets attempts when bridge transaction has exceeded max attempts', () => {
    // Arrange
    const navigation = mockNavigation as any;
    const tx = { ...mockTx, type: TransactionType.bridge } as any;
    const bridgeTxHistoryItem = {
      ...mockBridgeTxHistoryItem,
      attempts: { counter: MAX_ATTEMPTS + 1, lastAttemptTime: Date.now() },
    };

    // Act
    handleUnifiedSwapsTxHistoryItemClick(navigation, tx, bridgeTxHistoryItem);

    // Assert
    expect(
      Engine.context.BridgeStatusController.restartPollingForFailedAttempts,
    ).toHaveBeenCalledWith({
      txMetaId: bridgeTxHistoryItem.txMetaId,
    });
  });

  it('does not reset attempts when transaction is not a bridge transaction', () => {
    // Arrange
    const navigation = mockNavigation as any;
    const tx = { ...mockTx, type: TransactionType.swap } as any;
    const bridgeTxHistoryItem = {
      ...mockBridgeTxHistoryItem,
      attempts: { counter: MAX_ATTEMPTS, lastAttemptTime: Date.now() },
    };

    // Act
    handleUnifiedSwapsTxHistoryItemClick(navigation, tx, bridgeTxHistoryItem);

    // Assert
    expect(
      Engine.context.BridgeStatusController.restartPollingForFailedAttempts,
    ).not.toHaveBeenCalled();
  });

  it('does not reset attempts when no bridge transaction history item is provided', () => {
    // Arrange
    const navigation = mockNavigation as any;
    const tx = { ...mockTx, type: TransactionType.bridge } as any;

    // Act
    handleUnifiedSwapsTxHistoryItemClick(navigation, tx);

    // Assert
    expect(
      Engine.context.BridgeStatusController.restartPollingForFailedAttempts,
    ).not.toHaveBeenCalled();
  });

  it('does not reset attempts when attempts counter is below max attempts', () => {
    // Arrange
    const navigation = mockNavigation as any;
    const tx = { ...mockTx, type: TransactionType.bridge } as any;
    const bridgeTxHistoryItem = {
      ...mockBridgeTxHistoryItem,
      attempts: { counter: MAX_ATTEMPTS - 1, lastAttemptTime: Date.now() },
    };

    // Act
    handleUnifiedSwapsTxHistoryItemClick(navigation, tx, bridgeTxHistoryItem);

    // Assert
    expect(
      Engine.context.BridgeStatusController.restartPollingForFailedAttempts,
    ).not.toHaveBeenCalled();
  });

  it('does not reset attempts when attempts is undefined', () => {
    // Arrange
    const navigation = mockNavigation as any;
    const tx = { ...mockTx, type: TransactionType.bridge } as any;
    const bridgeTxHistoryItem = {
      ...mockBridgeTxHistoryItem,
      attempts: undefined,
    };

    // Act
    handleUnifiedSwapsTxHistoryItemClick(navigation, tx, bridgeTxHistoryItem);

    // Assert
    expect(
      Engine.context.BridgeStatusController.restartPollingForFailedAttempts,
    ).not.toHaveBeenCalled();
  });

  it('still navigates even when reset attempts conditions are not met', () => {
    // Arrange
    const navigation = mockNavigation as any;
    const tx = { ...mockTx, type: TransactionType.swap } as any;

    // Act
    handleUnifiedSwapsTxHistoryItemClick(navigation, tx);

    // Assert
    expect(navigation.navigate).toHaveBeenCalledWith(
      Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS,
      { evmTxMeta: tx },
    );
    expect(
      Engine.context.BridgeStatusController.restartPollingForFailedAttempts,
    ).not.toHaveBeenCalled();
  });
});
