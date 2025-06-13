import {
  Country,
  CryptoCurrency,
  FiatCurrency,
  Payment,
} from '@consensys/on-ramp-sdk';
import APP_CONSTANTS from '../../../../../../core/AppConstants';

const {
  MASTERCARD_LIGHT,
  MASTERCARD_DARK,
  VISA_LIGHT,
  VISA_DARK,
  ACH_LIGHT,
  ACH_DARK,
} = APP_CONSTANTS.URLS.ICONS;

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
      light: [MASTERCARD_LIGHT, VISA_LIGHT],
      dark: [MASTERCARD_DARK, VISA_DARK],
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
      light: [VISA_LIGHT, MASTERCARD_LIGHT],
      dark: [VISA_DARK, MASTERCARD_DARK],
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
      light: [ACH_LIGHT],
      dark: [ACH_DARK],
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
