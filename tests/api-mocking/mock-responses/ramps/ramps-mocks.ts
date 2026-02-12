/**
 * Comprehensive mock responses for all on-ramp API endpoints
 * Covers both UAT and production environments
 */

// Geolocation response (France - create other mocks for other regions)
export const RAMPS_GEOLOCATION_RESPONSE = {
  id: '/regions/fr',
  name: 'France',
  emoji: '🇫🇷',
  detected: true,
};
// Networks response
export const RAMPS_NETWORKS_RESPONSE = {
  networks: [
    {
      active: true,
      chainId: '1',
      chainName: 'Ethereum Mainnet',
      shortName: 'Ethereum',
      nativeTokenSupported: true,
    },
    {
      active: true,
      chainId: '59144',
      chainName: 'Linea',
      shortName: 'Linea',
      isEvm: true,
      nativeTokenSupported: true,
    },
    {
      active: true,
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      chainName: 'Solana',
      shortName: 'Solana',
      nativeTokenSupported: true,
      isEvm: false,
    },
  ],
};

// Countries response
export const RAMPS_COUNTRIES_RESPONSE = [
  {
    currencies: ['/currencies/fiat/eur'],
    emoji: '🇵🇹',
    id: '/regions/pt',
    name: 'Portugal',
    support: {
      buy: true,
      sell: true,
    },
    unsupported: false,
    detected: false,
  },
  {
    currencies: ['/currencies/fiat/eur'],
    emoji: '🇫🇷',
    id: '/regions/fr',
    name: 'France',
    support: {
      buy: true,
      sell: true,
    },
    unsupported: false,
    detected: false,
  },
  {
    currencies: ['/currencies/fiat/usd'],
    emoji: '🇺🇸',
    id: '/regions/us',
    name: 'United States of America',
    states: [
      {
        emoji: '🇺🇸',
        id: '/regions/us-ca',
        name: 'California',
        stateId: 'ca',
        support: {
          buy: true,
          sell: true,
        },
        unsupported: false,
        detected: false,
      },
    ],
    enableSell: true,
    support: {
      buy: false,
      sell: false,
    },
    unsupported: true,
    detected: true,
  },
  {
    currencies: ['/currencies/fiat/eur'],
    emoji: '🇪🇸',
    id: '/regions/es',
    name: 'Spain',
    support: {
      buy: true,
      sell: true,
    },
    unsupported: false,
    detected: false,
  },
];

// Light endpoint response (for all variations)
export const RAMPS_LIGHT_RESPONSE = {
  parameters: {
    appleMerchantId: '',
    disableLimits: false,
  },
  payments: [
    {
      id: '/payments/apple-pay',
      paymentType: 'apple-pay',
      name: 'Apple Pay',
      score: 285,
      icons: [
        {
          type: 'fontAwesome',
          name: 'apple',
        },
      ],
      logo: {
        light: [
          'assets/Visa-regular@3x.png',
          'assets/Mastercard-regular@3x.png',
        ],
        dark: ['assets/Visa@3x.png', 'assets/Mastercard@3x.png'],
      },
      disclaimer: 'Apple Cash is not supported.',
      delay: [0, 0],
      pendingOrderDescription:
        'Card purchases may take a few minutes to complete.',
      amountTier: [1, 3],
      isApplePay: true,
    },
    {
      id: '/payments/debit-credit-card',
      paymentType: 'debit-credit-card',
      name: 'Debit or Credit',
      score: 268,
      icons: [
        {
          type: 'materialIcons',
          name: 'card',
        },
      ],
      logo: {
        light: [
          'assets/Visa-regular@3x.png',
          'assets/Mastercard-regular@3x.png',
        ],
        dark: ['assets/Visa@3x.png', 'assets/Mastercard@3x.png'],
      },
      disclaimer:
        "Credit card purchases may incur your bank's cash advance fees, subject to your bank's policies.",
      delay: [5, 10],
      pendingOrderDescription:
        'Card purchases may take a few minutes to complete.',
      amountTier: [1, 3],
      sellEnabled: true,
    },
    {
      id: '/payments/sepa-bank-transfer',
      paymentType: 'bank-transfer',
      name: 'SEPA Bank Transfer',
      score: 250,
      icons: [
        {
          type: 'materialCommunityIcons',
          name: 'bank',
        },
      ],
      logo: {
        light: ['assets/SEPABankTransfer-regular@3x.png'],
        dark: ['assets/SEPABankTransfer@3x.png'],
      },
      delay: [1440, 2880],
      pendingOrderDescription:
        'Bank transfers may take 1-2 business days to complete.',
      amountTier: [2, 3],
      sellEnabled: true,
      supportedCurrency: ['/currencies/fiat/eur'],
      supportedRegions: ['/regions/fr', '/regions/pt', '/regions/es'],
    },
  ],
  cryptoCurrencies: [
    {
      id: '/currencies/crypto/1/0x0000000000000000000000000000000000000000',
      idv2: '/currencies/crypto/1/0x0000000000000000000000000000000000000000',
      legacyId: '/currencies/crypto/1/eth',
      network: {
        active: true,
        chainId: '1',
        chainName: 'Ethereum Mainnet',
        shortName: 'Ethereum',
      },
      logo: 'https://uat-static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0x0000000000000000000000000000000000000000.png',
      decimals: 18,
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      name: 'Ethereum',
    },
    {
      id: '/currencies/crypto/1/0x6b175474e89094c44da98b954eedeac495271d0f',
      idv2: '/currencies/crypto/1/0x6b175474e89094c44da98b954eedeac495271d0f',
      legacyId: '/currencies/crypto/1/dai',
      network: {
        active: true,
        chainId: '1',
        chainName: 'Ethereum Mainnet',
        shortName: 'Ethereum',
      },
      logo: 'https://uat-static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0x6b175474e89094c44da98b954eedeac495271d0f.png',
      decimals: 18,
      address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      symbol: 'DAI',
      name: 'Dai Stablecoin',
    },
  ],
  fiatCurrencies: [
    {
      id: '/currencies/fiat/eur',
      symbol: 'EUR',
      name: 'Euro',
      decimals: 2,
      denomSymbol: '€',
    },
    {
      id: '/currencies/fiat/usd',
      symbol: 'USD',
      name: 'US Dollar',
      decimals: 2,
      denomSymbol: '$',
    },
  ],
  limits: {
    minAmount: 2,
    maxAmount: 50000,
    feeDynamicRate: 0,
    feeFixedRate: 0,
  },
};

export const RAMPS_AMOUNT_RESPONSE = {
  cryptoAmount: '1.0',
  fiatAmount: '3924.50',
};

// Top Tokens response (V2 Unified Buy)
// Note: The API returns an object with topTokens and allTokens arrays
// RampsToken type requires: assetId (CAIP-19), chainId (CAIP-2), name, symbol, decimals, iconUrl, tokenSupported
const TOKENS_LIST = [
  // ========== Ethereum Mainnet (eip155:1) ==========
  {
    assetId: 'eip155:1/erc20:0x0000000000000000000000000000000000000000',
    chainId: 'eip155:1',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    iconUrl:
      'https://uat-static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0x0000000000000000000000000000000000000000.png',
    tokenSupported: true,
  },
  {
    assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    chainId: 'eip155:1',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    iconUrl:
      'https://uat-static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
    tokenSupported: true,
  },
  {
    assetId: 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f',
    chainId: 'eip155:1',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    iconUrl:
      'https://uat-static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0x6b175474e89094c44da98b954eedeac495271d0f.png',
    tokenSupported: true,
  },
  {
    assetId: 'eip155:1/erc20:0x437cc33344a0b27a429f795ff6b469c72698b291',
    chainId: 'eip155:1',
    symbol: 'mUSD',
    name: 'MetaMask USD',
    decimals: 18,
    iconUrl:
      'https://uat-static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0x437cc33344a0b27a429f795ff6b469c72698b291.png',
    tokenSupported: true,
  },
  {
    assetId: 'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7',
    chainId: 'eip155:1',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    iconUrl:
      'https://uat-static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xdac17f958d2ee523a2206206994597c13d831ec7.png',
    tokenSupported: true,
  },

  // ========== Linea (eip155:59144) ==========
  {
    assetId: 'eip155:59144/erc20:0x0000000000000000000000000000000000000000',
    chainId: 'eip155:59144',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    iconUrl:
      'https://uat-static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/59144/erc20/0x0000000000000000000000000000000000000000.png',
    tokenSupported: true,
  },
  {
    assetId: 'eip155:59144/erc20:0x176211869ca2b568f2a7d4ee941e073a821ee1ff',
    chainId: 'eip155:59144',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    iconUrl:
      'https://uat-static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/59144/erc20/0x176211869ca2b568f2a7d4ee941e073a821ee1ff.png',
    tokenSupported: true,
  },
  {
    assetId: 'eip155:59144/erc20:0x5a7a183b6b44dc4ec2e3d2ef43f98c5152b1d76d',
    chainId: 'eip155:59144',
    symbol: 'mUSD',
    name: 'MetaMask USD',
    decimals: 18,
    iconUrl:
      'https://uat-static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/59144/erc20/0x5a7a183b6b44dc4ec2e3d2ef43f98c5152b1d76d.png',
    tokenSupported: true,
  },

  // ========== Polygon (eip155:137) ==========
  {
    assetId: 'eip155:137/erc20:0x0000000000000000000000000000000000001010',
    chainId: 'eip155:137',
    symbol: 'MATIC',
    name: 'Polygon',
    decimals: 18,
    iconUrl:
      'https://uat-static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/137/erc20/0x0000000000000000000000000000000000001010.png',
    tokenSupported: true,
  },
  {
    assetId: 'eip155:137/erc20:0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
    chainId: 'eip155:137',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    iconUrl:
      'https://uat-static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/137/erc20/0x3c499c542cef5e3811e1192ce70d8cc03d5c3359.png',
    tokenSupported: true,
  },
  {
    assetId: 'eip155:137/erc20:0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
    chainId: 'eip155:137',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    iconUrl:
      'https://uat-static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/137/erc20/0xc2132d05d31c914a87c6611c10748aeb04b58e8f.png',
    tokenSupported: true,
  },

  // ========== Base (eip155:8453) ==========
  {
    assetId: 'eip155:8453/erc20:0x0000000000000000000000000000000000000000',
    chainId: 'eip155:8453',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    iconUrl:
      'https://uat-static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/8453/erc20/0x0000000000000000000000000000000000000000.png',
    tokenSupported: true,
  },
  {
    assetId: 'eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    chainId: 'eip155:8453',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    iconUrl:
      'https://uat-static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/8453/erc20/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.png',
    tokenSupported: true,
  },

  // ========== Optimism (eip155:10) ==========
  {
    assetId: 'eip155:10/erc20:0x0000000000000000000000000000000000000000',
    chainId: 'eip155:10',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    iconUrl:
      'https://uat-static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/10/erc20/0x0000000000000000000000000000000000000000.png',
    tokenSupported: true,
  },
  {
    assetId: 'eip155:10/erc20:0x0b2c639c533813f4aa9d7837caf62653d097ff85',
    chainId: 'eip155:10',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    iconUrl:
      'https://uat-static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/10/erc20/0x0b2c639c533813f4aa9d7837caf62653d097ff85.png',
    tokenSupported: true,
  },
];

export const RAMPS_TOP_TOKENS_RESPONSE = {
  // Top tokens: Most popular tokens (Ethereum and Linea only - networks in default fixture)
  topTokens: [
    TOKENS_LIST[0], // ETH (Ethereum)
    TOKENS_LIST[1], // USDC (Ethereum)
    TOKENS_LIST[3], // mUSD (Ethereum)
    TOKENS_LIST[5], // ETH (Linea)
    TOKENS_LIST[6], // USDC (Linea)
    TOKENS_LIST[7], // mUSD (Linea)
  ],
  // All tokens: Only Ethereum and Linea (networks available in default fixture)
  allTokens: [
    TOKENS_LIST[0], // ETH (Ethereum)
    TOKENS_LIST[1], // USDC (Ethereum)
    TOKENS_LIST[2], // DAI (Ethereum)
    TOKENS_LIST[3], // mUSD (Ethereum)
    TOKENS_LIST[4], // USDT (Ethereum)
    TOKENS_LIST[5], // ETH (Linea)
    TOKENS_LIST[6], // USDC (Linea)
    TOKENS_LIST[7], // mUSD (Linea)
  ],
};

// Providers response (V2 Unified Buy)
// Provider type requires: id, name, environmentType, description, hqAddress, links, logos (with height/width)
// Also includes supportedPaymentMethods to specify which payment methods each provider accepts
export const RAMPS_PROVIDERS_RESPONSE = [
  {
    id: '/providers/transak-native-staging',
    name: 'Transak',
    environmentType: 'staging',
    description: 'Buy crypto with credit card, debit card, or bank transfer',
    hqAddress: 'Miami, FL',
    links: [
      {
        name: 'Support',
        url: 'https://support.transak.com',
      },
      {
        name: 'Privacy Policy',
        url: 'https://transak.com/privacy-policy',
      },
    ],
    logos: {
      light: 'https://uat-static.cx.metamask.io/assets/transak-light.png',
      dark: 'https://uat-static.cx.metamask.io/assets/transak-dark.png',
      height: 32,
      width: 120,
    },
    supportedPaymentMethods: {
      '/payments/apple-pay': true,
      '/payments/debit-credit-card': true,
      '/payments/bank-transfer': true,
      '/payments/google-pay': true,
    },
  },
  {
    id: '/providers/moonpay-staging',
    name: 'MoonPay',
    environmentType: 'staging',
    description: 'Buy crypto instantly with card or bank transfer',
    hqAddress: 'London, UK',
    links: [
      {
        name: 'Support',
        url: 'https://support.moonpay.com',
      },
      {
        name: 'Privacy Policy',
        url: 'https://www.moonpay.com/privacy_policy',
      },
    ],
    logos: {
      light: 'https://uat-static.cx.metamask.io/assets/moonpay-light.png',
      dark: 'https://uat-static.cx.metamask.io/assets/moonpay-dark.png',
      height: 32,
      width: 120,
    },
    supportedPaymentMethods: {
      '/payments/apple-pay': true,
      '/payments/debit-credit-card': true,
      '/payments/google-pay': true,
      '/payments/instant-ach': true,
    },
  },
];

// Payments V2 response (per-provider payment methods)
// PaymentMethod type requires: id, paymentType, name, score, icon
export const RAMPS_PAYMENTS_V2_RESPONSE = [
  {
    id: '/payments/apple-pay',
    paymentType: 'apple-pay',
    name: 'Apple Pay',
    score: 285,
    icon: 'apple',
    disclaimer: 'Apple Cash is not supported.',
    delay: [0, 0],
    pendingOrderDescription:
      'Card purchases may take a few minutes to complete.',
  },
  {
    id: '/payments/debit-credit-card',
    paymentType: 'debit-credit-card',
    name: 'Debit or Credit',
    score: 268,
    icon: 'card',
    disclaimer:
      "Credit card purchases may incur your bank's cash advance fees, subject to your bank's policies.",
    delay: [5, 10],
    pendingOrderDescription:
      'Card purchases may take a few minutes to complete.',
  },
  {
    id: '/payments/bank-transfer',
    paymentType: 'bank-transfer',
    name: 'Bank Transfer',
    score: 250,
    icon: 'bank',
    delay: [1440, 2880],
    pendingOrderDescription:
      'Bank transfers may take 1-2 business days to complete.',
  },
  {
    id: '/payments/google-pay',
    paymentType: 'google-pay',
    name: 'Google Pay',
    score: 280,
    icon: 'google',
    delay: [0, 0],
    pendingOrderDescription:
      'Card purchases may take a few minutes to complete.',
  },
  {
    id: '/payments/instant-ach',
    paymentType: 'instant-ach',
    name: 'Instant ACH',
    score: 260,
    icon: 'bank',
    delay: [5, 15],
    pendingOrderDescription:
      'ACH transfers may take a few minutes to complete.',
  },
];
