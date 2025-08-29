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

// Gas fees response for offramp transactions
export const GAS_FEES_RESPONSE = {
  low: {
    suggestedMaxPriorityFeePerGas: '1.5',
    suggestedMaxFeePerGas: '25',
    minWaitTimeEstimate: 60000,
    maxWaitTimeEstimate: 180000,
  },
  medium: {
    suggestedMaxPriorityFeePerGas: '2',
    suggestedMaxFeePerGas: '30',
    minWaitTimeEstimate: 15000,
    maxWaitTimeEstimate: 60000,
  },
  high: {
    suggestedMaxPriorityFeePerGas: '3',
    suggestedMaxFeePerGas: '40',
    minWaitTimeEstimate: 5000,
    maxWaitTimeEstimate: 15000,
  },
  estimatedBaseFee: '22',
  networkCongestion: 0.3,
  latestPriorityFeeRange: ['1', '3'],
  historicalPriorityFeeRange: ['1', '5'],
  historicalBaseFeeRange: ['20', '30'],
  priorityFeeTrend: 'down',
  baseFeeTrend: 'stable',
};
