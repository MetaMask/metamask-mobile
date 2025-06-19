import '../_mocks_/initialState';
import {
  decodeSwapsTx,
  getSwapBridgeTxActivityTitle,
} from './transaction-history';
import { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import { ChainId, StatusTypes } from '@metamask/bridge-controller';

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

    const result = getSwapBridgeTxActivityTitle(bridgeHistoryItem);
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

    const result = getSwapBridgeTxActivityTitle(bridgeHistoryItem);
    expect(result).toBe('Bridge to Optimism');
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
        delegationAddress: '0x63c0c19a282a1b52b07dd5a65b58948a07dae32b',
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
        userEditedGasLimit: false,
        verifiedOnBlockchain: true,
        gasLimitNoBuffer: '0x409db',
        defaultGasEstimates: {
          gas: '0x409db',
          maxFeePerGas: '0x1cf3b9c98',
          maxPriorityFeePerGas: '0x77359400',
          estimateType: 'medium',
        },
        userFeeLevel: 'medium',
        r: '0x212e3a68c67c7381090e5a092d551b5db4bee663b470d9c4d7000d8c3291da0a',
        s: '0x1280909274c0dfaad55fd75be97409864c4988b7921da79f82f2de02d57dee51',
        v: '0x0',
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
        txReceipt: {
          blockHash:
            '0x3b46a982921214b2d6e7d939d37a73c1e45293ba049fdbc8c58f91c03d71d9eb',
          blockNumber: '0x15afabf',
          contractAddress: null,
          cumulativeGasUsed: '0x1ffb24',
          effectiveGasPrice: '0xfdc2f6db',
          from: '0xc5fe6ef47965741f6f7a4734bf784bf3ae3f2452',
          gasUsed: '0x316f7',
          logs: [
            {
              address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
              blockHash:
                '0x3b46a982921214b2d6e7d939d37a73c1e45293ba049fdbc8c58f91c03d71d9eb',
              blockNumber: '0x15afabf',
              data: '0x00000000000000000000000000000000000000000000000000000000004c4b40',
              logIndex: '0x4e',
              removed: false,
              topics: [
                '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
                '0x000000000000000000000000c5fe6ef47965741f6f7a4734bf784bf3ae3f2452',
                '0x00000000000000000000000074de5d4fcbf63e00296fd95d33236b9794016631',
              ],
              transactionHash:
                '0xac561978ed01a8828e30c193c8368b0baec0f8c8c85c933c324c06352a16aeb6',
              transactionIndex: '0xb',
            },
          ],
          logsBloom:
            '0x00200000000000001000000080000002004000000800000000000000000000000000010000000000000010000000000002000080080008000000000000000000000000000000080008020008000000200000000000400000000004000000000000000000000000000000000000000001000000000000040000000010000000080000021000000000000000000000000000000000810000084020004000000000000000000000200000000040000004000000000000000000000200000000200000000002000000000000000000000000000000000000001000000002080000000020200000020000000400800000000000000000000000000401000000001000',
          status: '0x1',
          to: '0x881d40237659c251811cec9c364ef91dc08d300c',
          transactionHash:
            '0xac561978ed01a8828e30c193c8368b0baec0f8c8c85c933c324c06352a16aeb6',
          transactionIndex: '0xb',
          type: '0x2',
        },
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
          marketCap: 120793578.6023602,
          allTimeHigh: 1.947968712773129,
          allTimeLow: 0.00017289557040579975,
          totalVolume: 4358358.956888226,
          high1d: 1.0149022972092887,
          low1d: 0.9937505130248475,
          circulatingSupply: 120720493.4555326,
          dilutedMarketCap: 120793578.6023602,
          marketCapPercentChange1d: 0.35431,
          priceChange1d: 4.58,
          pricePercentChange1h: 0.006992567165150356,
          pricePercentChange1d: 0.1833443712773114,
          pricePercentChange7d: -8.424708885071,
          pricePercentChange14d: -2.870895654448003,
          pricePercentChange30d: 1.5494065295082837,
          pricePercentChange200d: -32.56491802322466,
          pricePercentChange1y: -29.51025664197953,
        },
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': {
          tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          currency: 'ETH',
          id: 'usd-coin',
          price: 0.00039927436751183577,
          marketCap: 24507527.264268108,
          allTimeHigh: 0.0004672000659957774,
          allTimeLow: 0.0003504587489923043,
          totalVolume: 1460536.9803789528,
          high1d: 0.00039927756204220154,
          low1d: 0.00039919610151787407,
          circulatingSupply: 61380721378.7236,
          dilutedMarketCap: 24507527.264268108,
          marketCapPercentChange1d: -0.17714,
          priceChange1d: 0.00010404,
          pricePercentChange1h: 0.009461722768403104,
          pricePercentChange1d: 0.010406520827393299,
          pricePercentChange7d: 0.007477732560238306,
          pricePercentChange14d: 0.015271904422519059,
          pricePercentChange30d: -0.0006109990807711024,
          pricePercentChange200d: 0.0007941171579284213,
          pricePercentChange1y: 0.037889004621021787,
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
            aggregator: '1inch',
            aggregatorType: 'AGG',
            srcAsset: {
              address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
              chainId: 1,
              assetId:
                'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
              symbol: 'USDC',
              decimals: 6,
              name: 'USDC',
              coingeckoId: 'usd-coin',
              aggregators: [
                'metamask',
                'aave',
                'coinGecko',
                'openSwap',
                'uniswapLabs',
                'zerion',
                'oneInch',
                'liFi',
                'xSwap',
                'socket',
                'rubic',
                'squid',
                'rango',
                'sonarwatch',
                'sushiSwap',
                'pmm',
                'bancor',
              ],
              occurrences: 17,
              iconUrl:
                'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
              metadata: {
                storage: {
                  balance: 9,
                  approval: 10,
                },
              },
            },
            srcTokenAmount: '5000000',
            destAsset: {
              address: '0x0000000000000000000000000000000000000000',
              chainId: 1,
              assetId: 'eip155:1/slip44:60',
              symbol: 'ETH',
              decimals: 18,
              name: 'Ethereum',
              coingeckoId: 'ethereum',
              aggregators: [],
              occurrences: 100,
              iconUrl:
                'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
              metadata: {
                honeypotStatus: {},
                isContractVerified: false,
                erc20Permit: false,
                description: {
                  en: 'Ethereum is a global, open-source platform for decentralized applications. In other words, the vision is to create a world computer that anyone can build applications in a decentralized manner; while all states and data are distributed and publicly accessible. Ethereum supports smart contracts in which developers can write code in order to program digital value. Examples of decentralized apps (dapps) that are built on Ethereum includes tokens, non-fungible tokens, decentralized finance apps, lending protocol, decentralized exchanges, and much more.On Ethereum, all transactions and smart contract executions require a small fee to be paid. This fee is called Gas. In technical terms, Gas refers to the unit of measure on the amount of computational effort required to execute an operation or a smart contract. The more complex the execution operation is, the more gas is required to fulfill that operation. Gas fees are paid entirely in Ether (ETH), which is the native coin of the blockchain. The price of gas can fluctuate from time to time depending on the network demand.',
                  ko: '이더리움(Ethereum/ETH)은 블록체인 기술에 기반한 클라우드 컴퓨팅 플랫폼 또는 프로그래밍 언어이다. 비탈릭 부테린이 개발하였다.비탈릭 부테린은 가상화폐인 비트코인에 사용된 핵심 기술인 블록체인(blockchain)에 화폐 거래 기록뿐 아니라 계약서 등의 추가 정보를 기록할 수 있다는 점에 착안하여, 전 세계 수많은 사용자들이 보유하고 있는 컴퓨팅 자원을 활용해 분산 네트워크를 구성하고, 이 플랫폼을 이용하여 SNS, 이메일, 전자투표 등 다양한 정보를 기록하는 시스템을 창안했다. 이더리움은 C++, 자바, 파이썬, GO 등 주요 프로그래밍 언어를 지원한다.이더리움을 사물 인터넷(IoT)에 적용하면 기계 간 금융 거래도 가능해진다. 예를 들어 고장난 청소로봇이 정비로봇에 돈을 내고 정비를 받고, 청소로봇은 돈을 벌기 위해 정비로봇의 집을 청소하는 것도 가능해진다.',
                  zh: 'Ethereum（以太坊）是一个平台和一种编程语言，使开发人员能够建立和发布下一代分布式应用。Ethereum 是使用甲醚作为燃料，以激励其网络的第一个图灵完备cryptocurrency。Ethereum（以太坊） 是由Vitalik Buterin的创建。该项目于2014年8月获得了美国1800万$比特币的价值及其crowdsale期间。在2016年，Ethereum（以太坊）的价格上涨超过50倍。',
                  ja: 'イーサリアム (Ethereum, ETH)・プロジェクトにより開発が進められている、分散型アプリケーション（DApps）やスマート・コントラクトを構築するためのプラットフォームの名称、及び関連するオープンソース・ソフトウェア・プロジェクトの総称である。イーサリアムでは、イーサリアム・ネットワークと呼ばれるP2Pのネットワーク上でスマート・コントラクトの履行履歴をブロックチェーンに記録していく。またイーサリアムは、スマート・コントラクトを記述するチューリング完全なプログラミング言語を持ち、ネットワーク参加者はこのネットワーク上のブロックチェーンに任意のDAppsやスマート・コントラクトを記述しそれを実行することが可能になる。ネットワーク参加者が「Ether」と呼ばれるイーサリアム内部通貨の報酬を目当てに、採掘と呼ばれるブロックチェーンへのスマート・コントラクトの履行結果の記録を行うことで、その正統性を保証していく。このような仕組みにより特定の中央管理組織に依拠せず、P2P全体を実行環境としてプログラムの実行とその結果を共有することが可能になった。',
                },
                createdAt: '2023-10-31T22:41:58.553Z',
              },
            },
            destTokenAmount: '1967600601227999',
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
                  coingeckoId: 'ethereum',
                  aggregators: [],
                  occurrences: 100,
                  iconUrl:
                    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
                  metadata: {
                    honeypotStatus: {},
                    isContractVerified: false,
                    erc20Permit: false,
                    description: {
                      en: 'Ethereum is a global, open-source platform for decentralized applications. In other words, the vision is to create a world computer that anyone can build applications in a decentralized manner; while all states and data are distributed and publicly accessible. Ethereum supports smart contracts in which developers can write code in order to program digital value. Examples of decentralized apps (dapps) that are built on Ethereum includes tokens, non-fungible tokens, decentralized finance apps, lending protocol, decentralized exchanges, and much more.On Ethereum, all transactions and smart contract executions require a small fee to be paid. This fee is called Gas. In technical terms, Gas refers to the unit of measure on the amount of computational effort required to execute an operation or a smart contract. The more complex the execution operation is, the more gas is required to fulfill that operation. Gas fees are paid entirely in Ether (ETH), which is the native coin of the blockchain. The price of gas can fluctuate from time to time depending on the network demand.',
                      ko: '이더리움(Ethereum/ETH)은 블록체인 기술에 기반한 클라우드 컴퓨팅 플랫폼 또는 프로그래밍 언어이다. 비탈릭 부테린이 개발하였다.비탈릭 부테린은 가상화폐인 비트코인에 사용된 핵심 기술인 블록체인(blockchain)에 화폐 거래 기록뿐 아니라 계약서 등의 추가 정보를 기록할 수 있다는 점에 착안하여, 전 세계 수많은 사용자들이 보유하고 있는 컴퓨팅 자원을 활용해 분산 네트워크를 구성하고, 이 플랫폼을 이용하여 SNS, 이메일, 전자투표 등 다양한 정보를 기록하는 시스템을 창안했다. 이더리움은 C++, 자바, 파이썬, GO 등 주요 프로그래밍 언어를 지원한다.이더리움을 사물 인터넷(IoT)에 적용하면 기계 간 금융 거래도 가능해진다. 예를 들어 고장난 청소로봇이 정비로봇에 돈을 내고 정비를 받고, 청소로봇은 돈을 벌기 위해 정비로봇의 집을 청소하는 것도 가능해진다.',
                      zh: 'Ethereum（以太坊）是一个平台和一种编程语言，使开发人员能够建立和发布下一代分布式应用。Ethereum 是使用甲醚作为燃料，以激励其网络的第一个图灵完备cryptocurrency。Ethereum（以太坊） 是由Vitalik Buterin的创建。该项目于2014年8月获得了美国1800万$比特币的价值及其crowdsale期间。在2016年，Ethereum（以太坊）的价格上涨超过50倍。',
                      ja: 'イーサリアム (Ethereum, ETH)・プロジェクトにより開発が進められている、分散型アプリケーション（DApps）やスマート・コントラクトを構築するためのプラットフォームの名称、及び関連するオープンソース・ソフトウェア・プロジェクトの総称である。イーサリアムでは、イーサリアム・ネットワークと呼ばれるP2Pのネットワーク上でスマート・コントラクトの履行履歴をブロックチェーンに記録していく。またイーサリアムは、スマート・コントラクトを記述するチューリング完全なプログラミング言語を持ち、ネットワーク参加者はこのネットワーク上のブロックチェーンに任意のDAppsやスマート・コントラクトを記述しそれを実行することが可能になる。ネットワーク参加者が「Ether」と呼ばれるイーサリアム内部通貨の報酬を目当てに、採掘と呼ばれるブロックチェーンへのスマート・コントラクトの履行結果の記録を行うことで、その正統性を保証していく。このような仕組みにより特定の中央管理組織に依拠せず、P2P全体を実行環境としてプログラムの実行とその結果を共有することが可能になった。',
                    },
                    createdAt: '2023-10-31T22:41:58.553Z',
                  },
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
    expect(res).toEqual( [
      {
        renderTo: '0x881d40237659c251811cec9c364ef91dc08d300c',
        renderFrom: '0xc5fe6ef47965741f6f7a4734bf784bf3ae3f2452',
        actionKey: 'Swap USDC to ETH',
        notificationKey: 'Swap complete (USDC to ETH)',
        value: '-5.0 USDC',
        fiatValue: '$5.01',
        transactionType: 'transaction_site_interaction'
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
        summarySecondaryTotalAmount: '$6.33'
      }
    ]);
  });
});
