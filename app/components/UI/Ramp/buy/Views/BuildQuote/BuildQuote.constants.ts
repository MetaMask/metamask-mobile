import { CryptoCurrency, FiatCurrency } from '@consensys/on-ramp-sdk';

export const mockCryptoCurrenciesData = [
  {
    id: '1',
    idv2: '2',
    network: {},
    symbol: 'ETH',
    logo: 'some_logo_url',
    decimals: 8,
    address: '0x123',
    name: 'Ethereum',
    limits: ['0.001', '8'],
  },
  {
    id: '2',
    idv2: '3',
    network: {},
    symbol: 'UNI',
    logo: 'some_logo_url',
    decimals: 8,
    address: '0x123',
    name: 'Uniswap',
    limits: ['0.001', '8'],
  },
] as CryptoCurrency[];

export const mockFiatCurrenciesData = [
  {
    id: '1',
    symbol: 'USD',
    name: 'US Dollar',
    decimals: 2,
    denomSymbol: '$',
  },
  {
    id: '2',
    symbol: 'EUR',
    name: 'Euro',
    decimals: 2,
    denomSymbol: '€',
  },
] as FiatCurrency[];

/* eslint-disable import/prefer-default-export */

import { Payment } from '@consensys/on-ramp-sdk';

export const mockPaymentMethods = [
  {
    id: '/payments/instant-bank-transfer',
    paymentType: 'bank-transfer',
    name: 'Instant Bank Transfer',
    score: 5,
    icons: [
      {
        type: 'materialCommunityIcons',
        name: 'bank',
      },
    ],
    logo: {
      light: [
        'https://on-ramp.metafi-dev.codefi.network/assets/ACHBankTransfer-regular@3x.png',
      ],
      dark: [
        'https://on-ramp.metafi-dev.codefi.network/assets/ACHBankTransfer@3x.png',
      ],
    },
    delay: [0, 0],
    amountTier: [3, 3],
    supportedCurrency: ['/currencies/fiat/usd'],
    translation: 'ACH',
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
        'https://on-ramp.metafi-dev.codefi.network/assets/Visa-regular@3x.png',
        'https://on-ramp.metafi-dev.codefi.network/assets/Mastercard-regular@3x.png',
      ],
      dark: [
        'https://on-ramp.metafi-dev.codefi.network/assets/Visa@3x.png',
        'https://on-ramp.metafi-dev.codefi.network/assets/Mastercard@3x.png',
      ],
    },
    disclaimer: 'Apple Cash is not supported.',
    delay: [0, 0],
    amountTier: [1, 3],
    isApplePay: true,
    translation: 'mobile_wallet',
  },
  {
    id: '/payments/debit-credit-card',
    paymentType: 'debit-credit-card',
    name: 'Debit or Credit',
    score: 8,
    icons: [
      {
        type: 'materialIcons',
        name: 'card',
      },
    ],
    logo: {
      light: [
        'https://on-ramp.metafi-dev.codefi.network/assets/Visa-regular@3x.png',
        'https://on-ramp.metafi-dev.codefi.network/assets/Mastercard-regular@3x.png',
      ],
      dark: [
        'https://on-ramp.metafi-dev.codefi.network/assets/Visa@3x.png',
        'https://on-ramp.metafi-dev.codefi.network/assets/Mastercard@3x.png',
      ],
    },
    disclaimer:
      "Credit card purchases may incur your bank's cash advance fees, subject to your bank's policies.",
    delay: [5, 10],
    amountTier: [1, 3],
    translation: 'debit-credit-card',
  },
] as Partial<Payment>[];

import { Country } from '@consensys/on-ramp-sdk';

export const mockRegionsData = [
  {
    currencies: ['/currencies/fiat/clp'],
    emoji: 'chile emoji',
    id: '/regions/cl',
    name: 'Chile',
    unsupported: false,
  },
  {
    currencies: ['/currencies/fiat/eur'],
    emoji: 'albania emoji',
    id: '/regions/al',
    name: 'Albania',
    unsupported: false,
  },
] as Country[];
