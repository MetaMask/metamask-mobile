// Region config response (/regions/{region}/light) — payment methods,
// crypto/fiat currencies, and limits for the selected region.
export const RAMPS_REGION_CONFIG_RESPONSE = {
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
    {
      id: '/currencies/crypto/8453/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      idv2: '/currencies/crypto/8453/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      network: {
        active: true,
        chainId: '8453',
        chainName: 'Base',
        shortName: 'Base',
      },
      logo: 'https://uat-static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/8453/erc20/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.png',
      decimals: 6,
      address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      symbol: 'USDC',
      name: 'USD Coin',
    },
    {
      id: '/currencies/crypto/59144/0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
      idv2: '/currencies/crypto/59144/0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
      network: {
        active: true,
        chainId: '59144',
        chainName: 'Linea',
        shortName: 'Linea',
      },
      logo: 'https://uat-static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/59144/erc20/0xacA92E438df0B2401fF60dA7E4337B687a2435DA.png',
      decimals: 18,
      address: '0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
      symbol: 'mUSD',
      name: 'mUSD',
    },
    {
      id: '/currencies/crypto/1/0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
      idv2: '/currencies/crypto/1/0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
      network: {
        active: true,
        chainId: '1',
        chainName: 'Ethereum Mainnet',
        shortName: 'Ethereum',
      },
      logo: 'https://uat-static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xacA92E438df0B2401fF60dA7E4337B687a2435DA.png',
      decimals: 18,
      address: '0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
      symbol: 'mUSD',
      name: 'mUSD',
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

// Amount conversion endpoint response.
export const RAMPS_AMOUNT_RESPONSE = {
  cryptoAmount: '1.0',
  fiatAmount: '3924.50',
};
