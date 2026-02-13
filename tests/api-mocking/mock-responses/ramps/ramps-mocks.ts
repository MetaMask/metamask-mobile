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
      chainId: '8453',
      chainName: 'Base',
      shortName: 'Base',
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

// Top Tokens V2 response - Actual UAT structure
// 6 tokens across different networks (2 per network)
export const RAMPS_TOP_TOKENS_RESPONSE = {
  topTokens: [
    {
      assetId: 'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
      chainId: 'eip155:1',
      decimals: 6,
      name: 'MetaMask USD',
      symbol: 'MUSD',
      iconUrl:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xaca92e438df0b2401ff60da7e4337b687a2435da.png',
      tokenSupported: true,
    },
    {
      assetId: 'eip155:59144/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
      chainId: 'eip155:59144',
      decimals: 6,
      name: 'MetaMask USD',
      symbol: 'MUSD',
      iconUrl:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/59144/erc20/0xaca92e438df0b2401ff60da7e4337b687a2435da.png',
      tokenSupported: true,
    },
    {
      assetId: 'eip155:1/slip44:60',
      chainId: 'eip155:1',
      decimals: 18,
      name: 'Ethereum',
      symbol: 'ETH',
      iconUrl:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
      tokenSupported: true,
    },
    {
      assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
      chainId: 'bip122:000000000019d6689c085ae165831e93',
      decimals: 8,
      name: 'Bitcoin',
      symbol: 'BTC',
      iconUrl:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/bip122/000000000019d6689c085ae165831e93/slip44/0.png',
      tokenSupported: true,
    },
    {
      assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      decimals: 9,
      name: 'Solana',
      symbol: 'SOL',
      iconUrl:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44/501.png',
      tokenSupported: true,
    },
    {
      assetId: 'eip155:56/slip44:714',
      chainId: 'eip155:56',
      decimals: 18,
      name: 'Binance Coin',
      symbol: 'BNB',
      iconUrl:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/56/slip44/714.png',
      tokenSupported: true,
    },
    {
      assetId: 'eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      chainId: 'eip155:8453',
      decimals: 6,
      name: 'USD Coin',
      symbol: 'USDC',
      iconUrl:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/8453/erc20/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.png',
      tokenSupported: true,
    },
  ],
  allTokens: [
    {
      assetId: 'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
      chainId: 'eip155:1',
      decimals: 6,
      name: 'MetaMask USD',
      symbol: 'MUSD',
      iconUrl:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xaca92e438df0b2401ff60da7e4337b687a2435da.png',
      tokenSupported: true,
    },
    {
      assetId: 'eip155:59144/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
      chainId: 'eip155:59144',
      decimals: 6,
      name: 'MetaMask USD',
      symbol: 'MUSD',
      iconUrl:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/59144/erc20/0xaca92e438df0b2401ff60da7e4337b687a2435da.png',
      tokenSupported: true,
    },
    {
      assetId: 'eip155:1/slip44:60',
      chainId: 'eip155:1',
      decimals: 18,
      name: 'Ethereum',
      symbol: 'ETH',
      iconUrl:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
      tokenSupported: true,
    },
    {
      assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
      chainId: 'bip122:000000000019d6689c085ae165831e93',
      decimals: 8,
      name: 'Bitcoin',
      symbol: 'BTC',
      iconUrl:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/bip122/000000000019d6689c085ae165831e93/slip44/0.png',
      tokenSupported: true,
    },
    {
      assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      decimals: 9,
      name: 'Solana',
      symbol: 'SOL',
      iconUrl:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44/501.png',
      tokenSupported: true,
    },
    {
      assetId: 'eip155:56/slip44:714',
      chainId: 'eip155:56',
      decimals: 18,
      name: 'Binance Coin',
      symbol: 'BNB',
      iconUrl:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/56/slip44/714.png',
      tokenSupported: true,
    },
    {
      assetId: 'eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      chainId: 'eip155:8453',
      decimals: 6,
      name: 'USD Coin',
      symbol: 'USDC',
      iconUrl:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/8453/erc20/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.png',
      tokenSupported: true,
    },
  ],
};

// Providers V2 response - Actual UAT structure
// 2 staging providers with full metadata
export const RAMPS_PROVIDERS_RESPONSE = {
  providers: [
    {
      id: '/providers/mercuryo-staging',
      name: 'Mercuryo (Staging)',
      environmentType: 'STAGING',
      description:
        'Per Mercuryo: "Mercuryo offers easy onboarding for MetaMask users, with a speedy purchase process of under 15 seconds Light KYC up to 700$. With support for 20+ tokens, customers can pay using preferred methods, such as Apple Pay and bank cards."',
      hqAddress: 'London, United Kingdom, 77 Gracechurch, EC3V0AG',
      links: [
        {
          name: 'Homepage',
          url: 'https://mercuryo.io/',
        },
        {
          name: 'Privacy Policy',
          url: 'https://mercuryo.io/legal/privacy/',
        },
        {
          name: 'Support',
          url: 'https://help.mercuryo.io/en/',
        },
      ],
      logos: {
        light: '/assets/providers/mercuryo_light.png',
        dark: '/assets/providers/mercuryo_dark.png',
        height: 24,
        width: 88,
      },
      features: {
        buy: {
          enabled: true,
          userAgent: null,
          padCustomOrderId: false,
          orderCustomId: '',
          browser: 'APP_BROWSER',
          orderCustomIdRequired: false,
          orderCustomIdExpiration: null,
          orderCustomIdSeparator: null,
          orderCustomIdPrefixes: ['c-', ''],
          supportedByBackend: true,
          redirection: 'JSON_REDIRECTION',
        },
        quotes: {
          enabled: false,
          supportedByBackend: false,
        },
        sell: {
          enabled: true,
        },
        sellQuotes: {
          enabled: true,
        },
        recurringBuy: {
          enabled: true,
        },
      },
      type: 'aggregator',
      supportedCryptoCurrencies: {
        'eip155:1/slip44:60': true,
        'eip155:59144/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da': true,
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501': true,
        'bip122:000000000019d6689c085ae165831e93/slip44:0': true,
      },
      supportedFiatCurrencies: {
        '/currencies/fiat/eur': true,
        '/currencies/fiat/usd': true,
      },
      supportedPaymentMethods: {
        '/payments/debit-credit-card': true,
        '/payments/apple-pay': true,
      },
    },
    {
      id: '/providers/banxa-staging',
      name: 'Banxa (Staging)',
      environmentType: 'STAGING',
      description:
        'Per Banxa: "Established from 2014, Banxa is the world\'s first publicly listed Financial technology platform, powering a world-leading fiat to crypto gateway solution for customers to buy, sell and trade digital assets. Banxa\'s payment infrastructure offers online payment services across multiple currencies, crypto, and payment types from card to local bank transfers. Banxa now supports over 130+ countries and more than 80 currencies."',
      hqAddress: '2/6 Gwynne St, Cremorne VIC 3121, Australia',
      links: [
        {
          name: 'Homepage',
          url: 'https://banxa.com/',
        },
        {
          name: 'Terms of Service',
          url: 'https://banxa.com/wp-content/uploads/2022/10/Customer-Terms-and-Conditions-1-July-2022.pdf',
        },
        {
          name: 'Support',
          url: 'https://support.banxa.com/en/support/tickets/new',
        },
      ],
      logos: {
        light: '/assets/providers/banxa_light.png',
        dark: '/assets/providers/banxa_dark.png',
        height: 24,
        width: 65,
      },
      features: {
        buy: {
          userAgent: null,
          padCustomOrderId: false,
          orderCustomId: '',
          browser: 'APP_BROWSER',
          orderCustomIdRequired: false,
          orderCustomIdExpiration: null,
          orderCustomIdSeparator: null,
          orderCustomIdPrefixes: ['c-', ''],
          supportedByBackend: true,
          redirection: 'JSON_REDIRECTION',
        },
        quotes: {
          enabled: false,
          supportedByBackend: false,
        },
        sell: {
          enabled: true,
        },
        sellQuotes: {
          enabled: true,
        },
        recurringBuy: {},
      },
      type: 'aggregator',
      supportedCryptoCurrencies: {
        'eip155:1/slip44:60': true,
        'eip155:59144/slip44:60': true,
        'bip122:000000000019d6689c085ae165831e93/slip44:0': true,
      },
      supportedFiatCurrencies: {
        '/currencies/fiat/eur': true,
        '/currencies/fiat/usd': true,
      },
      supportedPaymentMethods: {
        '/payments/debit-credit-card': true,
        '/payments/apple-pay': true,
      },
    },
  ],
};

// Payments V2 response (per-provider payment methods)
// Response structure: { payments: PaymentMethod[], sorted: { sortBy: string, ids: string[] }[] }
export const RAMPS_PAYMENTS_V2_RESPONSE = {
  payments: [
    {
      id: '/payments/apple-pay',
      paymentType: 'apple-pay',
      name: 'Apple Pay',
      score: 100,
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
      sell: {
        enabled: false,
      },
      recurringBuy: {
        enabled: true,
      },
      buy: {
        enabled: true,
      },
    },
    {
      id: '/payments/debit-credit-card',
      paymentType: 'debit-credit-card',
      name: 'Debit or Credit',
      score: 90,
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
      sell: {
        enabled: true,
      },
      recurringBuy: {
        enabled: true,
      },
      buy: {
        enabled: true,
      },
    },
    {
      id: '/payments/bank-transfer',
      paymentType: 'bank-transfer',
      name: 'Bank Transfer',
      score: 80,
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
      sell: {
        enabled: true,
      },
      recurringBuy: {
        enabled: false,
      },
      buy: {
        enabled: true,
      },
    },
    {
      id: '/payments/google-pay',
      paymentType: 'google-pay',
      name: 'Google Pay',
      score: 95,
      icons: [
        {
          type: 'fontAwesome',
          name: 'google',
        },
      ],
      logo: {
        light: [
          'assets/Visa-regular@3x.png',
          'assets/Mastercard-regular@3x.png',
        ],
        dark: ['assets/Visa@3x.png', 'assets/Mastercard@3x.png'],
      },
      delay: [0, 0],
      pendingOrderDescription:
        'Card purchases may take a few minutes to complete.',
      amountTier: [1, 3],
      sell: {
        enabled: false,
      },
      recurringBuy: {
        enabled: true,
      },
      buy: {
        enabled: true,
      },
    },
    {
      id: '/payments/instant-ach',
      paymentType: 'instant-ach',
      name: 'Instant ACH',
      score: 85,
      icons: [
        {
          type: 'materialCommunityIcons',
          name: 'bank',
        },
      ],
      logo: {
        light: ['assets/ACH-regular@3x.png'],
        dark: ['assets/ACH@3x.png'],
      },
      delay: [5, 15],
      pendingOrderDescription:
        'ACH transfers may take a few minutes to complete.',
      amountTier: [2, 3],
      sell: {
        enabled: false,
      },
      recurringBuy: {
        enabled: false,
      },
      buy: {
        enabled: true,
      },
    },
  ],
  sorted: [
    {
      sortBy: '1',
      ids: [
        '/payments/apple-pay',
        '/payments/google-pay',
        '/payments/debit-credit-card',
        '/payments/instant-ach',
        '/payments/bank-transfer',
      ],
    },
  ],
};
