import {
  Country,
  CryptoCurrency,
  FiatCurrency,
  Payment,
} from '@consensys/on-ramp-sdk';

export const mockCryptoCurrenciesData = [
  {
    id: '2',
    idv2: '3',
    network: {},
    symbol: 'ETH',
    logo: 'some_random_logo_url',
    decimals: 8,
    address: '0xabc',
    name: 'Ethereum',
    limits: ['0.001', '8'],
  },
  {
    id: '3',
    idv2: '4',
    network: {},
    symbol: 'UNI',
    logo: 'uni_logo_url',
    decimals: 8,
    address: '0x1a2b3c',
    name: 'Uniswap',
    limits: ['0.001', '8'],
  },
] as CryptoCurrency[];

export const mockFiatCurrenciesData = [
  {
    id: '2',
    symbol: 'USD',
    name: 'US Dollar',
    decimals: 2,
    denomSymbol: '$',
  },
  {
    id: '3',
    symbol: 'EUR',
    name: 'Euro',
    decimals: 2,
    denomSymbol: '€',
  },
] as FiatCurrency[];

export const mockPaymentMethods = [
  {
    id: '/payments/credit-debit-card',
    paymentType: 'credit-debit-card',
    name: 'Credit or Debit Card',
    score: 8,
    icons: [
      {
        type: 'materialIcons',
        name: 'card',
      },
    ],
    logo: {
      light: [
        'https://on-ramp.dev-api.cx.metamask.io/assets/Mastercard-regular@3x.png',
        'https://on-ramp.dev-api.cx.metamask.io/assets/Visa-regular@3x.png',
      ],
      dark: [
        'https://on-ramp.dev-api.cx.metamask.io/assets/Mastercard@3x.png',
        'https://on-ramp.dev-api.cx.metamask.io/assets/Visa@3x.png',
      ],
    },
    disclaimer:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua',
    delay: [5, 10],
    amountTier: [1, 3],
    translation: 'debit-credit-card',
  },
  {
    id: '/payments/apple-pay',
    paymentType: 'apple-pay',
    name: 'Apple Pay',
    score: 6,
    icons: [
      {
        type: 'fontAwesome',
        name: 'apple',
      },
    ],
    logo: {
      light: [
        'https://on-ramp.dev-api.cx.metamask.io/assets/Visa-regular@3x.png',
        'https://on-ramp.dev-api.cx.metamask.io/assets/Mastercard-regular@3x.png',
      ],
      dark: [
        'https://on-ramp.dev-api.cx.metamask.io/assets/Visa@3x.png',
        'https://on-ramp.dev-api.cx.metamask.io/assets/Mastercard@3x.png',
      ],
    },
    disclaimer: 'Apple credit is not supported.',
    delay: [0, 0],
    amountTier: [1, 3],
    isApplePay: true,
    translation: 'mobile_wallet',
  },
  {
    id: '/payments/bank-transfer',
    paymentType: 'bank-transfer',
    name: 'Super Instant Bank Transfer',
    score: 5,
    icons: [
      {
        type: 'materialCommunityIcons',
        name: 'bank',
      },
    ],
    logo: {
      light: [
        'https://on-ramp.dev-api.cx.metamask.io/assets/ACHBankTransfer-regular@3x.png',
      ],
      dark: [
        'https://on-ramp.dev-api.cx.metamask.io/assets/ACHBankTransfer@3x.png',
      ],
    },
    delay: [0, 0],
    amountTier: [3, 3],
    supportedCurrency: ['/currencies/fiat/usd'],
    translation: 'ACH',
  },
] as Partial<Payment>[];

export const mockRegionsData = [
  {
    currencies: ['/currencies/fiat/clp'],
    emoji: '🇨🇱',
    id: '/regions/cl',
    name: 'Chile',
    unsupported: false,
    support: {
      buy: true,
      sell: true,
    },
  },
  {
    currencies: ['/currencies/fiat/eur'],
    emoji: '🇦🇱',
    id: '/regions/al',
    name: 'Albania',
    unsupported: false,
    support: {
      buy: true,
      sell: true,
    },
  },
] as Country[];
