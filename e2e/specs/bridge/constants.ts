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

export const testSpecificMock = {
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
  ],
};
