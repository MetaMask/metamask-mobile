import { mockEvents } from '../../../api-mocking/mock-config/mock-events.js';

export const localNodeOptions = {
  hardfork: 'london',
  mnemonic:
    'drive manage close raven tape average sausage pledge riot furnace august tip',
  chainId: 1,
};

const GET_QUOTE_ETH_USDC_URL =
  'https://bridge.dev-api.cx.metamask.io/getQuote?walletAddress=0xcdD74C6eb517f687Aa2C786bC7484eB2F9bAe1da&destWalletAddress=0xcdD74C6eb517f687Aa2C786bC7484eB2F9bAe1da&srcChainId=1&destChainId=1&srcTokenAddress=0x0000000000000000000000000000000000000000&destTokenAddress=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&srcTokenAmount=1000000000000000000&insufficientBal=false&resetApproval=false&slippage=0.5';

export const GET_QUOTE_ETH_USDC_RESPONSE = [
  {
    quote: {
      requestId:
        '0xedc95a61357f584cc10edc19751799089e6ffd8338b847661d0e5900b13ef7a3',
      bridgeId: 'kyberswap',
      srcChainId: 1,
      destChainId: 1,
      aggregator: 'kyberswap',
      aggregatorType: 'AGG',
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
          createdAt: '2023-10-31T22:41:58.553Z',
        },
      },
      srcTokenAmount: '1000000000000000000',
      destAsset: {
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        chainId: 1,
        assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
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
      destTokenAmount: '2733450205',
      walletAddress: '0xcdD74C6eb517f687Aa2C786bC7484eB2F9bAe1da',
      destWalletAddress: '0xcdD74C6eb517f687Aa2C786bC7484eB2F9bAe1da',
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
            iconUrl:
              'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
            metadata: {
              honeypotStatus: {},
              isContractVerified: false,
              erc20Permit: false,
              createdAt: '2023-10-31T22:41:58.553Z',
            },
          },
        },
      },
      bridges: ['kyberswap'],
      protocols: ['kyberswap'],
      steps: [],
      priceData: {
        totalFromAmountUsd: '2772.62',
        totalToAmountUsd: '2733.3408669918',
        priceImpact: '0.01416679278379295',
      },
    },
    trade: {
      chainId: 1,
      to: '0x881D40237659C251811CEC9c364ef91dC08D300C',
      from: '0xcdD74C6eb517f687Aa2C786bC7484eB2F9bAe1da',
      value: '0xde0b6b3a7640000',
      data: '0x5f575529000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000136b796265725377617046656544796e616d69630000000000000000000000000000000000000000000000000000000000000000000000000000000000000009a00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000dc1a09f859b200000000000000000000000000000000000000000000000000000000000a2ed23dd0000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000001f161421c8e000000000000000000000000000f326e4de8f66a0bdc0970b79e0924e33c79f191500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000864e21fd0e900000000000000000000000000000000000000000000000000000000000000200000000000000000000000006e4141d33021b52c91c28608403db4a0ffb50ec6000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000003a000000000000000000000000000000000000000000000000000000000000005a000000000000000000000000000000000000000000000000000000000000002e0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000074de5d4fcbf63e00296fd95d33236b979401663100000000000000000000000000000000000000000000000000000000686ef01800000000000000000000000000000000000000000000000000000000000002800000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000004063407a490000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000e00000000000000000000000006e4141d33021b52c91c28608403db4a0ffb50ec6000000000000000000000000e0554a476a092703abdb3ef35c80e0d76d32939f000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000dc1a09f859b200000000000000000000000fffd8963efd1fc6a506488495d951d5263988d250000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000abb000000000000000000000000a3bebbd8000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000001c000000000000000000000000074de5d4fcbf63e00296fd95d33236b97940166310000000000000000000000000000000000000000000000000dc1a09f859b200000000000000000000000000000000000000000000000000000000000a2ed23dd000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001e00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000027d7b22536f75726365223a226d6574616d61736b222c22416d6f756e74496e555344223a22323734382e3433373039373739373333222c22416d6f756e744f7574555344223a22323735302e31303731303238353133373735222c22526566657272616c223a22222c22466c616773223a302c22416d6f756e744f7574223a2232373437313836313336222c2254696d657374616d70223a313735323039393638382c22526f7574654944223a2234313032663964652d626634662d343234392d623861642d3436643930643065343230303a34613862663935332d656665382d343433312d613134322d383639636637396466363333222c22496e74656772697479496e666f223a7b224b65794944223a2231222c225369676e6174757265223a22596869584d705068733139767273517778496177657a70302b71726877462b3339694e52496466697274374f6372574442622f76374a4c33656450435151395268587a67652b30483466594f3275514363544d544b777464517454547759494e4543374a304c73505348644d6c68416f6c786a482f4f63473754627867534a445875326d31663043436a4341735976342b68506b6c414d734531736152614475306c504c65533437766778577932526d65764836564a3333575234317655586b504b704e763432744c51657751416a2b334f685a3950775a39703368344e306376582b6d775a31564f5865696a2f6133566a37364a4d5a497a797633674d5851446649776b3474695a6d75463068676e436c2b4a56437461366865615367556f597262716f747a2f4b74596461434245423444654a34674c496d642b7252736744395471306f4575626f634a7a36627450485a5239673d3d227d7d0000000000000000000000000000000000000000000000000000000000000007a4cdcdee3e13f05d9bf26f2d7d18eea82013dc9f072eb9f84dd636d231dca61c3242f528a12b3648585aa9135d12a14de84305b9e4b3fc2d6f4c6ad064d3251b',
      gasLimit: 390980,
    },
    estimatedProcessingTimeInSeconds: 0,
  },
];

const GET_QUOTE_ETH_WETH_URL =
  'https://bridge.dev-api.cx.metamask.io/getQuote?walletAddress=0xcdD74C6eb517f687Aa2C786bC7484eB2F9bAe1da&destWalletAddress=0xcdD74C6eb517f687Aa2C786bC7484eB2F9bAe1da&srcChainId=1&destChainId=1&srcTokenAddress=0x0000000000000000000000000000000000000000&destTokenAddress=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2&srcTokenAmount=1000000000000000000&insufficientBal=false&resetApproval=false&slippage=0.5';

export const GET_QUOTE_ETH_WETH_RESPONSE = [
  {
    quote: {
      requestId:
        '0xab7ef19bc7be4860e8f41b76b2f0d18ab6273a7b6c15bd4549c8931b644761c1',
      bridgeId: 'wrapped_native',
      srcChainId: 1,
      srcTokenAmount: '1000000000000000000',
      srcAsset: {
        chainId: 1,
        assetId: 'eip155:1/slip44:60',
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ether',
        decimals: 18,
      },
      destChainId: 1,
      destTokenAmount: '1000000000000000000',
      destAsset: {
        address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        chainId: 1,
        assetId: 'eip155:1/erc20:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        symbol: 'WETH',
        decimals: 18,
        name: 'Wrapped Ether',
        coingeckoId: 'weth',
        aggregators: [
          'metamask',
          'aave',
          'coinGecko',
          'coinMarketCap',
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
        ],
        occurrences: 17,
        iconUrl:
          'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png',
        metadata: {
          storage: {
            balance: 3,
            approval: 4,
          },
        },
      },
      feeData: {
        metabridge: {
          amount: '0',
          asset: {
            chainId: 1,
            assetId: 'eip155:1/slip44:60',
            address: '0x0000000000000000000000000000000000000000',
            symbol: 'ETH',
            name: 'Ether',
            decimals: 18,
          },
        },
      },
      aggregator: 'wrapped_native',
      bridges: [],
      protocols: [],
      steps: [],
      aggregatorType: 'WRAPPED',
      walletAddress: '0xcdD74C6eb517f687Aa2C786bC7484eB2F9bAe1da',
      destWalletAddress: '0xcdD74C6eb517f687Aa2C786bC7484eB2F9bAe1da',
    },
    approval: null,
    trade: {
      chainId: 1,
      to: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      from: '0xcdD74C6eb517f687Aa2C786bC7484eB2F9bAe1da',
      value: '1000000000000000000',
      data: '0xd0e30db0f9efeea38046e3b6bffabf95a842b70a502e39bb3eca2b10abac221dfd0dc34b52fdaf4b90c031c75c4e092ae5e169cab37216d232c284266e46ec8dffa118d91b',
      gasLimit: 49960,
    },
  },
];

export const GET_TOKENS_MAINNET_URL =
  'https://bridge.dev-api.cx.metamask.io/getTokens?chainId=1';

export const GET_TOKENS_MAINNET_RESPONSE = [
  {
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
    metadata: {},
  },
  {
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    chainId: 1,
    assetId: 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
    symbol: 'DAI',
    decimals: 18,
    name: 'Dai Stablecoin',
    coingeckoId: 'dai',
    aggregators: [
      'uniswapLabs',
      'metamask',
      'aave',
      'cmc',
      'coinGecko',
      'coinMarketCap',
      'openSwap',
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
    occurrences: 19,
    iconUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0x6b175474e89094c44da98b954eedeac495271d0f.png',
    metadata: {
      storage: {
        balance: 2,
        approval: 3,
      },
    },
  },
  {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    chainId: 1,
    assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    symbol: 'USDC',
    decimals: 6,
    name: 'USDCoin',
    coingeckoId: 'usd-coin',
    aggregators: [
      'uniswapLabs',
      'metamask',
      'aave',
      'coinGecko',
      'openSwap',
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
  {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    chainId: 1,
    assetId: 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
    symbol: 'USDT',
    decimals: 6,
    name: 'Tether USD',
    coingeckoId: 'tether',
    aggregators: [
      'uniswapLabs',
      'metamask',
      'aave',
      'coinGecko',
      'openSwap',
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
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xdac17f958d2ee523a2206206994597c13d831ec7.png',
    metadata: {
      storage: {
        balance: 2,
        approval: 5,
      },
    },
  },
  {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    chainId: 1,
    assetId: 'eip155:1/erc20:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    symbol: 'WETH',
    decimals: 18,
    name: 'Wrapped Ether',
    coingeckoId: 'weth',
    aggregators: [
      'uniswapLabs',
      'metamask',
      'aave',
      'coinGecko',
      'coinMarketCap',
      'openSwap',
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
    ],
    occurrences: 17,
    iconUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png',
    metadata: {
      storage: {
        balance: 3,
        approval: 4,
      },
    },
  },
];

export const GET_TOKENS_OPTIMISM_URL =
  'https://bridge.dev-api.cx.metamask.io/getTokens?chainId=10';

export const GET_TOKENS_OPTIMISM_RESPONSE = [
  {
    address: '0x0000000000000000000000000000000000000000',
    chainId: 10,
    assetId: 'eip155:10/slip44:60',
    symbol: 'ETH',
    decimals: 18,
    name: 'Ether',
    coingeckoId: 'ethereum',
    aggregators: [],
    occurrences: 100,
    iconUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/10/slip44/60.png',
    metadata: {},
  },
  {
    address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    chainId: 10,
    assetId: 'eip155:10/erc20:0x0b2c639c533813f4aa9d7837caf62653d097ff85',
    symbol: 'USDC',
    decimals: 6,
    name: 'USDCoin',
    coingeckoId: 'usd-coin',
    aggregators: [
      'uniswapLabs',
      'coinGecko',
      'optimism',
      'uniswap',
      'oneInch',
      'liFi',
      'xSwap',
      'socket',
      'rubic',
      'squid',
      'rango',
      'sushiSwap',
    ],
    occurrences: 12,
    iconUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/10/erc20/0x0b2c639c533813f4aa9d7837caf62653d097ff85.png',
    metadata: {
      storage: {
        balance: 9,
        approval: 10,
      },
    },
  },
];

const GET_QUOTE_USDC_ETH_URL =
  'https://bridge.dev-api.cx.metamask.io/getQuote?walletAddress=0xcdD74C6eb517f687Aa2C786bC7484eB2F9bAe1da&destWalletAddress=0xcdD74C6eb517f687Aa2C786bC7484eB2F9bAe1da&srcChainId=1&destChainId=1&srcTokenAddress=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&destTokenAddress=0x0000000000000000000000000000000000000000&srcTokenAmount=1000000&insufficientBal=false&resetApproval=false&gasIncluded=false&slippage=0.5';

const GET_QUOTE_USDC_ETH_RESPONSE = [
  {
    quote: {
      requestId:
        '0xfdaa7d42796bf09f97da55aa516963c230d9cea81a60655a7d6c307b62ed8c83',
      bridgeId: '1inch',
      srcChainId: 1,
      destChainId: 1,
      aggregator: '1inch',
      aggregatorType: 'AGG',
      srcAsset: {
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        chainId: 1,
        assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        symbol: 'USDC',
        decimals: 6,
        name: 'USDCoin',
        coingeckoId: 'usd-coin',
        aggregators: [
          'uniswapLabs',
          'metamask',
          'aave',
          'coinGecko',
          'openSwap',
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
      srcTokenAmount: '1000000',
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
        metadata: {},
      },
      destTokenAmount: '259869816517910',
      walletAddress: '0xcdD74C6eb517f687Aa2C786bC7484eB2F9bAe1da',
      destWalletAddress: '0xcdD74C6eb517f687Aa2C786bC7484eB2F9bAe1da',
      feeData: {
        metabridge: {
          amount: '2305460107125',
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
            metadata: {},
          },
        },
      },
      bridges: ['1inch'],
      protocols: ['1inch'],
      steps: [],
      priceData: {
        totalFromAmountUsd: '0.999715',
        totalToAmountUsd: '0.9848026566762718',
        priceImpact: '0.014916594553175917',
      },
    },
    approval: {
      chainId: 1,
      to: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      from: '0xcdD74C6eb517f687Aa2C786bC7484eB2F9bAe1da',
      value: '0x0',
      data: '0x095ea7b3000000000000000000000000881d40237659c251811cec9c364ef91dc08d300c0000000000000000000000000000000000000000000000000de0b6b3a7640000',
      gasLimit: 550000,
    },
    trade: {
      chainId: 1,
      to: '0x881D40237659C251811CEC9c364ef91dC08D300C',
      from: '0xcdD74C6eb517f687Aa2C786bC7484eB2F9bAe1da',
      value: '0x0',
      data: '0x5f5755290000000000000000000000000000000000000000000000000000000000000080000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000f424000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000136f6e65496e6368563646656544796e616d69630000000000000000000000000000000000000000000000000000000000000000000000000000000000000002c0000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f42400000000000000000000000000000000000000000000000000000ec59a819f516000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000218c8217775000000000000000000000000f326e4de8f66a0bdc0970b79e0924e33c79f1915000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000001889fda64bd0000000000000000000000000000000000000000562dcb95be373f559d768bb5000000000000000000000000388364512b2603eb2588ea12eda201423d5f7ffe0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000000efae6394feac00000000000000000000000000000000000000000000000000000000000f424000000000000000000000000089e1d3b662006887da5e00000000000000000000198fe943c5eb5dc8c7c07587384b3b2e1184fbb3e454558e82c0e6ff2bcfb3234fd53d092aa56fa2e896904e1df548b9cba6e19fd4743e3c8263547a0b130d290000000000000000000000000000000000000000000000000000000000000f424060000000000000000000000000000000000000000000000000000000000000007dcbea7c000000000000000000000000000000000000000000000000650f8deb1cf53121046c747f90fc0b9f7f88cf5d4dbdcb4efb70a3631cedaac90e26e7dea59329c6e00a37fa9cb812d77561b7df5b749d3264045982c7d950171b',
      gasLimit: 277483,
    },
    estimatedProcessingTimeInSeconds: 0,
  },
];

export const GET_TOKENS_SOLANA_URL =
  'https://bridge.dev-api.cx.metamask.io/getTokens?chainId=1151111081099710';

export const GET_TOKENS_SOLANA_RESPONSE = [
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
  'https://bridge.dev-api.cx.metamask.io/getTokens?chainId=8453';

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

export const GET_QUOTE_DAI_USDC_URL =
  'https://bridge.dev-api.cx.metamask.io/getQuote?walletAddress=0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3&destWalletAddress=0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3&srcChainId=1&destChainId=1&srcTokenAddress=0x6B175474E89094C44Da98b954EedeAC495271d0F&destTokenAddress=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&srcTokenAmount=3000000000000000000&insufficientBal=false&resetApproval=false&gasIncluded=false&slippage=0.5';
export const GET_QUOTE_DAI_USDC_RESPONSE = [
  {
    quote: {
      requestId:
        '0xc4132e4e49660f217efb9eea0a961a6efe607fde4897bd8cca246d2e0945ae80',
      bridgeId: 'kyberswap',
      srcChainId: 1,
      destChainId: 1,
      aggregator: 'kyberswap',
      aggregatorType: 'AGG',
      srcAsset: {
        address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        chainId: 1,
        assetId: 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
        symbol: 'DAI',
        decimals: 18,
        name: 'Dai Stablecoin',
        coingeckoId: 'dai',
        aggregators: [
          'uniswapLabs',
          'metamask',
          'aave',
          'cmc',
          'coinGecko',
          'coinMarketCap',
          'openSwap',
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
        occurrences: 19,
        iconUrl:
          'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0x6b175474e89094c44da98b954eedeac495271d0f.png',
        metadata: {
          storage: {
            balance: 2,
            approval: 3,
          },
        },
      },
      srcTokenAmount: '2973750000000000000',
      destAsset: {
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        chainId: 1,
        assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        symbol: 'USDC',
        decimals: 6,
        name: 'USDCoin',
        coingeckoId: 'usd-coin',
        aggregators: [
          'uniswapLabs',
          'metamask',
          'aave',
          'coinGecko',
          'openSwap',
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
      destTokenAmount: '2958880',
      walletAddress: '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
      destWalletAddress: '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
      feeData: {
        metabridge: {
          amount: '26250000000000000',
          asset: {
            address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
            chainId: 1,
            assetId:
              'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
            symbol: 'DAI',
            decimals: 18,
            name: 'Dai Stablecoin',
            coingeckoId: 'dai',
            aggregators: [
              'uniswapLabs',
              'metamask',
              'aave',
              'cmc',
              'coinGecko',
              'coinMarketCap',
              'openSwap',
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
            occurrences: 19,
            iconUrl:
              'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0x6b175474e89094c44da98b954eedeac495271d0f.png',
            metadata: {
              storage: {
                balance: 2,
                approval: 3,
              },
            },
          },
        },
      },
      bridges: ['kyberswap'],
      protocols: ['kyberswap'],
      steps: [],
      priceData: {
        totalFromAmountUsd: '2.999529',
        totalToAmountUsd: '2.9580367192000003',
        priceImpact: '0.013832932036996329',
      },
    },
    approval: {
      chainId: 1,
      to: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      from: '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
      value: '0x0',
      data: '0x095ea7b3000000000000000000000000881d40237659c251811cec9c364ef91dc08d300c00000000000000000000000000000000000000000000000029a2241af62c0000',
      gasLimit: 1000000, // was 26589
    },
    trade: {
      chainId: 1,
      to: '0x881D40237659C251811CEC9c364ef91dC08D300C',
      from: '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
      value: '0x0',
      data: '0x5f57552900000000000000000000000000000000000000000000000000000000000000800000000000000000000000006b175474e89094c44da98b954eedeac495271d0f00000000000000000000000000000000000000000000000029a2241af62c000000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000136b796265725377617046656544796e616d69630000000000000000000000000000000000000000000000000000000000000000000000000000000000000009800000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000002944e1de90d1600000000000000000000000000000000000000000000000000000000000002d26200000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000005d423c655aa000000000000000000000000000f326e4de8f66a0bdc0970b79e0924e33c79f191500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000844e21fd0e900000000000000000000000000000000000000000000000000000000000000200000000000000000000000006e4141d33021b52c91c28608403db4a0ffb50ec6000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000034000000000000000000000000000000000000000000000000000000000000005800000000000000000000000000000000000000000000000000000000000000280000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000074de5d4fcbf63e00296fd95d33236b979401663100000000000000000000000000000000000000000000000000000000689342eb00000000000000000000000000000000000000000000000000000000000002200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000004094f1a6820000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000002944e1de90d16000000000000000000000000000f6e72db5454dd049d0788e411b06cfaf168530420000000000000000000000006b175474e89094c44da98b954eedeac495271d0f0000000000000000000000006e4141d33021b52c91c28608403db4a0ffb50ec6000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000002000000000000000000000000002d60360000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000001e0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000074de5d4fcbf63e00296fd95d33236b97940166310000000000000000000000000000000000000000000000002944e1de90d1600000000000000000000000000000000000000000000000000000000000002d26200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000022000000000000000000000000000000000000000000000000000000000000000010000000000000000000000006e4141d33021b52c91c28608403db4a0ffb50ec600000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000002944e1de90d16000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000027b7b22536f75726365223a226d6574616d61736b222c22416d6f756e74496e555344223a22322e39373439343433363037363538373334222c22416d6f756e744f7574555344223a22322e393736343630343135313233343731222c22526566657272616c223a22222c22466c616773223a302c22416d6f756e744f7574223a2232393733373439222c2254696d657374616d70223a313735343438303138372c22526f7574654944223a2231643532636533662d663835302d343366612d616563372d3437333036666531303534303a33306335656564632d616464382d343234662d396538352d343263636434396137643233222c22496e74656772697479496e666f223a7b224b65794944223a2231222c225369676e6174757265223a224c65704576667069327749462b613065617045414f516844736f655239655574447a574c2f4d674a45747046417033793230735a48306759386237382f527a4f4a5547576737346f683730766d5570327768472b6d3772455361574361585a672f7a50676d4c7437305349434e5a6d6964493957704a654c346d4f3838326e79514e33417466562b4a614a457047364245334c2b753346776a586d555945466e755250546d686756474d5a784269492f5458626132313063787133716f4245502b364f6e6779664f49732f52563166507131717a635a703848694b4c7646374f68373665383870454d5a596271624a6134502f346b6c75326656566566416179374c683067334754354a4f714e4e524d61633572623063513555702b753847503765626e6e76674e4a476776626e4475744a6750497a2f6d514c73383161306747385a4d4755674171614752592b686b655a364848773d3d227d7d000000000000000000000000000000000000000000000000000000000000000000669594b33b43c16db614312a524722cfc976c017894361704c07e6c2baa7cf9575c85b27c173d8f106811f506ee7f7311651854f558cfbdf1aa7e1019ec1f2f41c',
      gasLimit: 2000000, // was 372116
    },
    estimatedProcessingTimeInSeconds: 0,
  },
];

export const GET_QUOTE_DAI_ETH_URL =
  'https://bridge.dev-api.cx.metamask.io/getQuote?walletAddress=0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3&destWalletAddress=0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3&srcChainId=1&destChainId=1&srcTokenAddress=0x6B175474E89094C44Da98b954EedeAC495271d0F&destTokenAddress=0x0000000000000000000000000000000000000000&srcTokenAmount=1000000000000000000&insufficientBal=false&resetApproval=false&gasIncluded=false&slippage=0.5';

export const GET_QUOTE_DAI_ETH_RESPONSE = [
  {
    quote: {
      requestId:
        '0x44a1612f93c6986a67a6588031d814711c7a5ee83286f60ab8005cb360f5624f',
      bridgeId: 'kyberswap',
      srcChainId: 1,
      destChainId: 1,
      aggregator: 'kyberswap',
      aggregatorType: 'AGG',
      srcAsset: {
        address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        chainId: 1,
        assetId: 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
        symbol: 'DAI',
        decimals: 18,
        name: 'Dai Stablecoin',
        coingeckoId: 'dai',
        aggregators: [
          'uniswapLabs',
          'metamask',
          'aave',
          'cmc',
          'coinGecko',
          'coinMarketCap',
          'openSwap',
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
        occurrences: 19,
        iconUrl:
          'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0x6b175474e89094c44da98b954eedeac495271d0f.png',
        metadata: {
          storage: {
            balance: 2,
            approval: 3,
          },
        },
      },
      srcTokenAmount: '1000000000000000000',
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
        metadata: {},
      },
      destTokenAmount: '296761897986099',
      walletAddress: '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
      destWalletAddress: '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
      feeData: {
        metabridge: {
          amount: '2632751761205',
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
            metadata: {},
          },
        },
      },
      bridges: ['kyberswap'],
      protocols: ['kyberswap'],
      steps: [],
      priceData: {
        totalFromAmountUsd: '0.999844',
        totalToAmountUsd: '1.0753167373526298',
        priceImpact: '-0.07548451293664794',
      },
    },
    approval: {
      chainId: 1,
      to: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      from: '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
      value: '0x0',
      data: '0x095ea7b3000000000000000000000000881d40237659c251811cec9c364ef91dc08d300c0000000000000000000000000000000000000000000000000de0b6b3a7640000',
      gasLimit: 1000000, // was 26589
    },
    trade: {
      chainId: 1,
      to: '0x881D40237659C251811CEC9c364ef91dC08D300C',
      from: '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3',
      value: '0x0',
      data: '0x5f57552900000000000000000000000000000000000000000000000000000000000000800000000000000000000000006b175474e89094c44da98b954eedeac495271d0f0000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000136b796265725377617046656544796e616d6963000000000000000000000000000000000000000000000000000000000000000000000000000000000000000bc00000000000000000000000006b175474e89094c44da98b954eedeac495271d0f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000010de743832833000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000264fc3bc735000000000000000000000000f326e4de8f66a0bdc0970b79e0924e33c79f191500000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000a848af033fb0000000000000000000000006e4141d33021b52c91c28608403db4a0ffb50ec60000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000028000000000000000000000000000000000000000000000000000000000000007c00000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee0000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000001c000000000000000000000000074de5d4fcbf63e00296fd95d33236b97940166310000000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000000000000000000000000000000000000110492f1fea92000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000001e0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000520000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000689345e900000000000000000000000000000000000000000000000000000000000004c000000000000000000000000000000000000000000000000000000000000000010000000000000000000000005ce50407b614daff085522d476c5ec5e93a00afb00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000034000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000040593611990000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000005ce50407b614daff085522d476c5ec5e93a00afb0000000000000000000000006b175474e89094c44da98b954eedeac495271d0f0000000000000000000000007d1afa7b718fb893db30a3abc0cfc608aacfebb00000000000000000000000007f8f7dd53d1f3ac1052565e3ff451d7fe666a3110000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000003e800000000000000000000000000000000000000000000000000000000000000320000000000000000000000000000000000000000000000000000000000000040593611990000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000007f8f7dd53d1f3ac1052565e3ff451d7fe666a3110000000000000000000000007d1afa7b718fb893db30a3abc0cfc608aacfebb0000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000006e4141d33021b52c91c28608403db4a0ffb50ec60000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000003e80000000000000000000000000000000000000000000000000000000000000032000000000000000000000000000000000000000000000000000000000000002000000000000000000000000011ef279b0000000000000000000111a7761d80fb00000000000000000000000000000000000000000000000000000000000002847b22536f75726365223a226d6574616d61736b222c22416d6f756e74496e555344223a22302e39393936343031333034373631373835222c22416d6f756e744f7574555344223a22312e30383938323836363830393032313332222c22526566657272616c223a22222c22466c616773223a302c22416d6f756e744f7574223a22333030383835393135353636333330222c2254696d657374616d70223a313735343438303935332c22526f7574654944223a2234333639343330622d353163662d343131392d393133372d6335633864323630376366363a39303561353764342d613865302d343663342d616532342d643062373239356534633861222c22496e74656772697479496e666f223a7b224b65794944223a2231222c225369676e6174757265223a22437754473737754f322b5533534462694f7735656237464d6e5235556e754f3077736e38366f3065624d677861717332324f69723343736c6762314f653251394b59663832352f506164625672466c68356757617432474470413670754e62794f4f4968724e41354a3877544f78396e66744b324551766435555933596a4258533953353848514d4f584f7961715742557a54686344507532627a2b426f71496173374f535a49514e304c6e2b66316c594b757478705867714a7532416c4f74482f66466d684a48495954767a3571556a6c464e6d5877654869654d545863647762624d79673867307a365653636b6f314f6d6749686263713457466177576e34306b6d2b713845382f4d577461356d746f613165546c43493064556d35687732473266705479344245564d624f546a2f4d6d686455344b744e397176515877444c7763756b48774d6f475071582f35722f41766a673d3d227d7d0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000b602ce56ece1a104f62d6770c9e4d556cd397bb834bdf3ac79cf7a935b21812e5597addef23fa1b645d3c61204aa737c7f704a75a9cced349abe1efcbe0d696a1b',
      gasLimit: 448297,
    },
    estimatedProcessingTimeInSeconds: 0,
  },
];

export const bridgeSpecificMock = {
  GET: [
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
    {
      urlEndpoint: GET_TOKENS_MAINNET_URL,
      response: GET_TOKENS_MAINNET_RESPONSE,
      responseCode: 200,
    },
    {
      urlEndpoint: GET_TOKENS_OPTIMISM_URL,
      response: GET_TOKENS_OPTIMISM_RESPONSE,
      responseCode: 200,
    },
  ],
  POST: [mockEvents.POST.segmentTrack],
};

export const swapSpecificMock = {
  GET: [
    {
      urlEndpoint: GET_QUOTE_ETH_USDC_URL,
      response: GET_QUOTE_ETH_USDC_RESPONSE,
      responseCode: 200,
    },
    {
      urlEndpoint: GET_QUOTE_ETH_WETH_URL,
      response: GET_QUOTE_ETH_WETH_RESPONSE,
      responseCode: 200,
    },
    {
      urlEndpoint: GET_TOKENS_MAINNET_URL,
      response: GET_TOKENS_MAINNET_RESPONSE,
      responseCode: 200,
    },
    {
      urlEndpoint: GET_QUOTE_USDC_ETH_URL,
      response: GET_QUOTE_USDC_ETH_RESPONSE,
      responseCode: 200,
    },
    {
      urlEndpoint: GET_QUOTE_DAI_USDC_URL,
      response: GET_QUOTE_DAI_USDC_RESPONSE,
      responseCode: 200,
    },
    {
      urlEndpoint: GET_QUOTE_DAI_ETH_URL,
      response: GET_QUOTE_DAI_ETH_RESPONSE,
      responseCode: 200,
    },
  ],
};
