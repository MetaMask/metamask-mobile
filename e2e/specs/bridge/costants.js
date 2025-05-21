import { url } from 'inspector';

export const localNodeOptions = {
  hardfork: 'london',
  mnemonic:
    'drive manage close raven tape average sausage pledge riot furnace august tip',
  chainId: 1,
};

export const GET_TOKENS_SOLANA_URL =
  'https://bridge.api.cx.metamask.io/getTokens?chainId=1151111081099710';
export const GET_TOKENS_SOLANA_RESPONSE = [
  {
    address: '0x0000000000000000000000000000000000000000',
    chainId: 1151111081099710,
    assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
    symbol: 'SOL',
    decimals: 9,
    name: 'SOL',
    aggregators: [],
    occurrences: 100,
    iconUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44/501.png',
    metadata: {},
  },
  {
    address: 'So11111111111111111111111111111111111111112',
    chainId: 1151111081099710,
    assetId:
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:So11111111111111111111111111111111111111112',
    symbol: 'wSOL',
    decimals: 9,
    name: 'wSOL',
    coingeckoId: 'wrapped-solana',
    aggregators: ['orca', 'jupiter', 'coinGecko', 'lifi'],
    occurrences: 4,
    iconUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token/So11111111111111111111111111111111111111112.png',
    metadata: {},
  },
];

export const GET_TOKENS_BASE_URL =
  'https://bridge.api.cx.metamask.io/getTokens?chainId=8453';

export const GET_TOKENS_BASE_RESPONSE = [
  {
    address: '0x0000000000000000000000000000000000000000',
    chainId: 8453,
    assetId: 'eip155:8453/slip44:8453',
    symbol: 'ETH',
    decimals: 18,
    name: 'Ether',
    coingeckoId: 'base',
    aggregators: [],
    occurrences: 100,
    iconUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/8453/slip44/8453.png',
    metadata: {
      honeypotStatus: {},
      erc20Permit: false,
      createdAt: '2023-10-31T21:47:47.414Z',
    },
  },
  {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    chainId: 8453,
    assetId: 'eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    symbol: 'USDC',
    decimals: 6,
    name: 'USDC',
    coingeckoId: 'usd-coin',
    aggregators: [
      'coinGecko',
      'optimism',
      'uniswap',
      'uniswapLabs',
      'oneInch',
      'liFi',
      'socket',
      'rubic',
      'squid',
      'rango',
      'sonarwatch',
      'sushiSwap',
    ],
    occurrences: 12,
    iconUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/8453/erc20/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.png',
    metadata: {
      honeypotStatus: {},
      isContractVerified: true,
      storage: {
        balance: 9,
        approval: 10,
      },
      erc20Permit: true,
      createdAt: '2023-10-31T21:47:47.414Z',
    },
  },
];

export const ETH_TO_BASE_GETQUOTE_URL =
  'https://bridge.api.cx.metamask.io/getQuote?walletAddress=0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3&destWalletAddress=0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3&srcChainId=1&destChainId=8453&srcTokenAddress=0x0000000000000000000000000000000000000000&destTokenAddress=0x0000000000000000000000000000000000000000&srcTokenAmount=1000000000000000000&insufficientBal=false&resetApproval=false&slippage=0.5';
export const ETH_TO_BASE_GETQUOTE_RESPONSE = [
  {
    quote: {
      bridgeId: 'lifi',
      requestId:
        '0x600e713627450d75a62292a1d97c8069c7c10932622e8fe1ea909d0eef263378',
      aggregator: 'lifi',
      srcChainId: 1,
      srcTokenAmount: '991250000000000000',
      srcAsset: {
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
          description: {},
          createdAt: '2023-10-31T22:41:58.553Z',
        },
        price: '2420.678586',
      },
      destChainId: 8453,
      destTokenAmount: '991237292213186874',
      destAsset: {
        address: '0x0000000000000000000000000000000000000000',
        chainId: 8453,
        assetId: 'eip155:8453/slip44:8453',
        symbol: 'ETH',
        decimals: 18,
        name: 'Ether',
        coingeckoId: 'base',
        aggregators: [],
        occurrences: 100,
        iconUrl:
          'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/8453/slip44/8453.png',
        metadata: {
          honeypotStatus: {},
          erc20Permit: false,
          createdAt: '2023-10-31T21:47:47.414Z',
        },
        price: '2420.678586',
      },
      feeData: {
        metabridge: {
          amount: '8750000000000000',
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
              description: {},
              createdAt: '2023-10-31T22:41:58.553Z',
            },
            price: '2420.678586',
          },
        },
      },
      bridges: ['relay'],
      steps: [
        {
          action: 'bridge',
          srcChainId: 1,
          destChainId: 8453,
          protocol: {
            name: 'relay',
            displayName: 'Relay',
            icon: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/relay.svg',
          },
          srcAsset: {
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
              description: {},
              createdAt: '2023-10-31T22:41:58.553Z',
            },
          },
          destAsset: {
            address: '0x0000000000000000000000000000000000000000',
            chainId: 8453,
            assetId: 'eip155:8453/slip44:8453',
            symbol: 'ETH',
            decimals: 18,
            name: 'Ether',
            coingeckoId: 'base',
            aggregators: [],
            occurrences: 100,
            iconUrl:
              'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/8453/slip44/8453.png',
            metadata: {
              honeypotStatus: {},
              erc20Permit: false,
              createdAt: '2023-10-31T21:47:47.414Z',
            },
          },
          srcAmount: '991250000000000000',
          destAmount: '991237292213186874',
        },
      ],
      priceData: {
        totalFromAmountUsd: '2408.95',
        totalToAmountUsd: '2387.6329152455914',
        priceImpact: '0.008849118808779083',
      },
    },
    trade: {
      chainId: 1,
      to: '0x0439e60F02a8900a951603950d8D4527f400C3f1',
      from: '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
      value: '0x0de0b6b3a7640000',
      data: '0x3ce33bff000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000000d6c6966694164617074657256320000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004600000000000000000000000001231deb6f5749ef6ce6943a275a1d3e7486f4eae0000000000000000000000001231deb6f5749ef6ce6943a275a1d3e7486f4eae0000000000000000000000000000000000000000000000000000000000002105000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000dc1a09f859b20000000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000001f161421c8e000000000000000000000000000e6b738da243e8fa2a0ed5915645789add5de51520000000000000000000000000000000000000000000000000000000000000304ae328590000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000002009cf9dceb2f716c1b015a3baf6875317e98a33e9db406ac9573c89b8a1847729b000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000076cf1cdd1fcc252442b50d6e97207228aa4aefc30000000000000000000000000000000000000000000000000dc1a09f859b2000000000000000000000000000000000000000000000000000000000000000210500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000572656c6179000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f6d6574616d61736b2d6272696467650000000000000000000000000000000000c308dddf5a31b33ee3a9339a15e975b78f7c476d5c1ff05e93db340bfbfaf78600000000000000000000000076cf1cdd1fcc252442b50d6e97207228aa4aefc300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000004189976b5f32ac9b618ebcffa72a6ddbd2bc29c16479b10d5fe9315a95e36611ea7974434a7e5d148c13a798987eb0fca6a382c4d8bb8d559ddb605b1ca5ea11941b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f1dfe19a025d0d89cb78562fc890e90f5341d1612e7e7ac20a6bc57b9cd51a955648822344a3c72d9e1b6e98c0fb41de4af644c35b396993c60cc4ddc1797e921c',
      gasLimit: 209791,
    },
    estimatedProcessingTimeInSeconds: 24,
  },
];

// CEQ87PmqFPA8cajAXYVrFT2FQobRrAT4Wd53FvfgYrrd
// https://bridge.api.cx.metamask.io/getQuote?walletAddress=0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3&destWalletAddress=CEQ87PmqFPA8cajAXYVrFT2FQobRrAT4Wd53FvfgYrrd&srcChainId=1&destChainId=1151111081099710&srcTokenAddress=0x0000000000000000000000000000000000000000&destTokenAddress=0x0000000000000000000000000000000000000000&srcTokenAmount=1000000000000000000&insufficientBal=true&resetApproval=false&slippage=0.5

export const ETH_TO_SOLANA_GETQUOTE_URL =
  'https://bridge.api.cx.metamask.io/getQuote?walletAddress=0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3&destWalletAddress=0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3&srcChainId=1&destChainId=1151111081099710&srcTokenAddress=0x0000000000000000000000000000000000000000&destTokenAddress=0x0000000000000000000000000000000000000000&srcTokenAmount=1000000000000000000&insufficientBal=false&resetApproval=false&slippage=0.5';
export const ETH_TO_SOLANA_GETQUOTE_RESPONSE = [
  {
    quote: {
      bridgeId: 'lifi',
      requestId:
        '0x3b4c662b6105d398d0f0dd71cbe204e7e4da3e6242862d2e1509f48ab56579a2',
      aggregator: 'lifi',
      srcChainId: 1,
      srcTokenAmount: '991250000000000000',
      srcAsset: {
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
          description: {},
          createdAt: '2023-10-31T22:41:58.553Z',
        },
        price: '2492.62',
      },
      destChainId: 1151111081099710,
      destTokenAmount: '14771159058',
      destAsset: {
        address: '0x0000000000000000000000000000000000000000',
        chainId: 1151111081099710,
        assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
        symbol: 'SOL',
        decimals: 9,
        name: 'SOL',
        aggregators: [],
        occurrences: 100,
        iconUrl:
          'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44/501.png',
        metadata: {},
        price: '165.66',
      },
      feeData: {
        metabridge: {
          amount: '8750000000000000',
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
              description: {},
              createdAt: '2023-10-31T22:41:58.553Z',
            },
            price: '2492.62',
          },
        },
      },
      bridges: ['relay'],
      steps: [
        {
          action: 'bridge',
          srcChainId: 1,
          destChainId: 1151111081099710,
          protocol: {
            name: 'relay',
            displayName: 'Relay',
            icon: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/bridges/relay.svg',
          },
          srcAsset: {
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
              description: {},
              createdAt: '2023-10-31T22:41:58.553Z',
            },
          },
          destAsset: {
            address: '0x0000000000000000000000000000000000000000',
            chainId: 1151111081099710,
            assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
            symbol: 'SOL',
            decimals: 9,
            name: 'SOL',
            aggregators: [],
            occurrences: 100,
            iconUrl:
              'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44/501.png',
            metadata: {},
          },
          srcAmount: '991250000000000000',
          destAmount: '14771159058',
        },
      ],
      priceData: {
        totalFromAmountUsd: '2487.4',
        totalToAmountUsd: '2459.84111792874',
        priceImpact: '0.011079392969068137',
      },
    },
    trade: {
      chainId: 1,
      to: '0x0439e60F02a8900a951603950d8D4527f400C3f1',
      from: '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
      value: '0x0de0b6b3a7640000',
      data: '0x3ce33bff000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000000d6c6966694164617074657256320000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004600000000000000000000000001231deb6f5749ef6ce6943a275a1d3e7486f4eae0000000000000000000000001231deb6f5749ef6ce6943a275a1d3e7486f4eae000000000000000000000000000000000000000000000000000416edef1601be00000000000000000000000000000000000000000000000000000000000000000000000000000000000000002530b0726c0e1010a959bd8b871a6a5d6337144a0000000000000000000000000000000000000000000000000dc1a09f859b20000000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000001f161421c8e000000000000000000000000000e6b738da243e8fa2a0ed5915645789add5de51520000000000000000000000000000000000000000000000000000000000000304ae3285900000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000020037f3027dc6980e51b6ee3ebc57b473bb442d8efbe3a9d95d6074286b0d695405000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000011f111f111f111f111f111f111f111f111f111f10000000000000000000000000000000000000000000000000dc1a09f859b2000000000000000000000000000000000000000000000000000000416edef1601be00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000572656c6179000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f6d6574616d61736b2d62726964676500000000000000000000000000000000002aa49a429428f5d66a0ed6cbfd4b9a58a3c19c67ad5a7e93962b76a50e299069a6df40628b785cc2e62f6d520e072c8215d4f6b6fa427c73670435ed9fae5d6a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000041d80f419b5b5534608c584390c811ef701ea1221138fe23d38d3f0488333be34a60506f3d239957932f260a4d5c7420e6123dfeab61bee75456bca4ec1a01a33c1b00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002e2f452ac9af446323ed1d9722a189ec30bf1cc8b370d541b9d5c971c78e21d7508fbd6b86927ccf280db59ef7048ba4000d1522f63361b30c293c2dceb892631c',
      gasLimit: 212523,
    },
    estimatedProcessingTimeInSeconds: 24,
  },
];

export const testSpecificMock = {
  GET: [
    {
      urlEndpoint: ETH_TO_BASE_GETQUOTE_URL,
      response: ETH_TO_BASE_GETQUOTE_RESPONSE,
      responseCode: 200,
    },
    {
      urlEndpoint: ETH_TO_SOLANA_GETQUOTE_URL,
      response: ETH_TO_SOLANA_GETQUOTE_RESPONSE,
      responseCode: 200,
    },
    {
      urlEndpoint: GET_TOKENS_SOLANA_URL,
      response: GET_TOKENS_SOLANA_RESPONSE,
      responseCode: 200,
    },
    {
      urlEndpoint: GET_TOKENS_BASE_URL,
      response: GET_TOKENS_BASE_RESPONSE,
      responseCode: 200,
    },
  ],
};
