/**
 * @enum {string}
 */
export const FIAT_ORDER_PROVIDERS = {
  WYRE: 'WYRE',
  WYRE_APPLE_PAY: 'WYRE_APPLE_PAY',
  TRANSAK: 'TRANSAK',
  MOONPAY: 'MOONPAY',
  // The key for fiat on-ramp aggregator
  AGGREGATOR: 'AGGREGATOR',
};

/**
 * @enum {string}
 */
export const FIAT_ORDER_STATES = {
  PENDING: 'PENDING',
  FAILED: 'FAILED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

/**
 * @enum {string}
 */
export const PAYMENT_RAILS = {
  APPLE_PAY: 'Apple Pay',
  MULTIPLE: 'Multiple Options',
};

/**
 * @enum {string}
 */
export const PAYMENT_CATEGORY = {
  CARD_PAYMENT: 'Card Payment',
  BANK_TRANSFER: 'Bank Transfer',
  MULTIPLE: 'Multiple Options',
};

/**
 * @enum {string}
 */

export const NETWORKS_CHAIN_ID = {
  MAINNET: '1',
  OPTIMISM: '10',
  KOVAN: '42',
  BSC: '56',
  POLYGON: '137',
  FANTOM: '250',
  ARBITRUM: '42161',
  AVAXCCHAIN: '43114',
  CELO: '42220',
  HARMONY: '1666600000',
};

export const NETWORKS_NAMES = {
  [NETWORKS_CHAIN_ID.MAINNET]: 'Ethereum',
  [NETWORKS_CHAIN_ID.OPTIMISM]: 'Optimism',
  [NETWORKS_CHAIN_ID.KOVAN]: 'Kovan',
  [NETWORKS_CHAIN_ID.BSC]: 'BNB Smart Chain',
  [NETWORKS_CHAIN_ID.POLYGON]: 'Polygon',
  [NETWORKS_CHAIN_ID.FANTOM]: 'Fantom',
  [NETWORKS_CHAIN_ID.ARBITRUM]: 'Arbitrum',
  [NETWORKS_CHAIN_ID.AVAXCCHAIN]: 'Avalanche',
  [NETWORKS_CHAIN_ID.CELO]: 'Celo',
  [NETWORKS_CHAIN_ID.HARMONY]: 'Harmony',
};

const TRANSAK_NETWORK_NAMES = {
  [NETWORKS_CHAIN_ID.MAINNET]: 'ethereum',
  [NETWORKS_CHAIN_ID.BSC]: 'bsc',
  [NETWORKS_CHAIN_ID.POLYGON]: 'polygon',
  [NETWORKS_CHAIN_ID.AVAXCCHAIN]: 'avaxcchain',
  [NETWORKS_CHAIN_ID.CELO]: 'celo',
  [NETWORKS_CHAIN_ID.FANTOM]: 'fantom',
};

export const NETWORK_NATIVE_SYMBOL = {
  [NETWORKS_CHAIN_ID.MAINNET]: 'ETH',
  [NETWORKS_CHAIN_ID.BSC]: 'BNB',
  [NETWORKS_CHAIN_ID.POLYGON]: 'MATIC',
  [NETWORKS_CHAIN_ID.AVAXCCHAIN]: 'AVAX',
  [NETWORKS_CHAIN_ID.CELO]: 'CELO',
  [NETWORKS_CHAIN_ID.FANTOM]: 'FTM',
};

export const NETWORK_ALLOWED_TOKENS = {
  [NETWORKS_CHAIN_ID.MAINNET]: [
    {
      symbol: 'USDT',
      address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      decimals: 6,
    },
    {
      symbol: 'USDC',
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      decimals: 6,
    },
    {
      symbol: 'DAI',
      address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      decimals: 18,
    },
  ],
  [NETWORKS_CHAIN_ID.BSC]: [
    {
      symbol: 'BUSD',
      address: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
      decimals: 18,
    },
  ],
  [NETWORKS_CHAIN_ID.POLYGON]: [
    {
      symbol: 'USDT',
      address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
      decimals: 6,
    },
    {
      symbol: 'USDC',
      address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
      decimals: 6,
    },
    {
      symbol: 'DAI',
      address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
      decimals: 18,
    },
  ],
  [NETWORKS_CHAIN_ID.CELO]: [
    {
      symbol: 'CUSD',
      address: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
      decimals: 18,
    },
    {
      symbol: 'CEUR',
      address: '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73',
      decimals: 18,
    },
  ],
};

export const TRANSAK_NETWORK_PARAMETERS = Object.keys(
  TRANSAK_NETWORK_NAMES,
).reduce(
  (acc, key) => ({
    ...acc,
    [key]: [
      TRANSAK_NETWORK_NAMES[key],
      NETWORK_NATIVE_SYMBOL[key],
      [
        NETWORK_NATIVE_SYMBOL[key],
        ...(NETWORK_ALLOWED_TOKENS[key] || []).map(({ symbol }) => symbol),
      ].join(','),
    ],
  }),
  {},
);

export const MOONPAY_NETWORK_PARAMETERS = {
  [NETWORKS_CHAIN_ID.MAINNET]: ['eth', 'eth,usdt,usdc,dai'],
  [NETWORKS_CHAIN_ID.BSC]: ['bnb_bsc', 'bnb_bsc,busd_bsc'],
  [NETWORKS_CHAIN_ID.POLYGON]: ['matic_polygon', 'matic_polygon,usdc_polygon'],
  [NETWORKS_CHAIN_ID.AVAXCCHAIN]: ['avax_cchain', 'avax_cchain'],
  [NETWORKS_CHAIN_ID.CELO]: ['celo', 'celo,cusd'],
};

export const NATIVE_ADDRESS = '0x0000000000000000000000000000000000000000';
