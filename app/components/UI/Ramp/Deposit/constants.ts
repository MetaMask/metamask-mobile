export const FIAT_CURRENCIES = ['USD', 'EUR'];

export interface DepositCryptoCurrency {
  assetId: string;
  logo: string;
  name: string;
  chainId: CaipChainId;
  address: string;
  decimals: number;
  iconUrl: string;
  symbol: string;
}

export interface DepositPaymentMethod {
  id: string;
  name: string;
  duration: string;
}

export interface DepositFiatCurrency {
  id: string;
  name: string;
  symbol: string;
  emoji: string;
}

export interface DepositState {
  code: string;
  name: string;
  supported: boolean;
}

export interface DepositRegion {
  code: string;
  flag: string;
  name: string;
  phonePrefix: string;
  currency: string;
  states?: DepositState[];
  phoneDigitCount: number;
  recommended?: boolean;
  supported: boolean;
}

export const USDC_TOKEN: DepositCryptoCurrency = {
  assetId: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainId: 'eip155:1',
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.png',
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  logo: 'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.png',
};

export const USDT_TOKEN: DepositCryptoCurrency = {
  assetId: 'eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7',
  chainId: 'eip155:1',
  name: 'Tether USD',
  symbol: 'USDT',
  decimals: 6,
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xdAC17F958D2ee523a2206206994597C13D831ec7.png',
  address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  logo: 'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xdAC17F958D2ee523a2206206994597C13D831ec7.png',
};

export const SUPPORTED_DEPOSIT_TOKENS: DepositCryptoCurrency[] = [
  USDC_TOKEN,
  USDT_TOKEN,
];

export const DEBIT_CREDIT_PAYMENT_METHOD: DepositPaymentMethod = {
  id: 'credit_debit_card',
  name: 'Debit or Credit',
  duration: 'Instant',
};

export const USD_CURRENCY: DepositFiatCurrency = {
  id: 'USD',
  name: 'US Dollar',
  symbol: '$',
  emoji: '🇺🇸',
};

export const EUR_CURRENCY: DepositFiatCurrency = {
  id: 'EUR',
  name: 'Euro',
  symbol: '€',
  emoji: '🇪🇺',
};

import { CaipChainId } from '@metamask/utils';

export const TRANSAK_NETWORKS: Record<string, CaipChainId> = {
  ethereum: 'eip155:1',
};

export const DEPOSIT_REGIONS: DepositRegion[] = [
  // Europe - Supported
  {
    code: 'AD',
    flag: '🇦🇩',
    name: 'Andorra',
    phonePrefix: '+376',
    currency: 'EUR',
    phoneDigitCount: 6,
    supported: true,
  },
  {
    code: 'AT',
    flag: '🇦🇹',
    name: 'Austria',
    phonePrefix: '+43',
    currency: 'EUR',
    phoneDigitCount: 10,
    supported: true,
  },
  {
    code: 'BE',
    flag: '🇧🇪',
    name: 'Belgium',
    phonePrefix: '+32',
    currency: 'EUR',
    phoneDigitCount: 9,
    supported: true,
  },
  {
    code: 'CZ',
    flag: '🇨🇿',
    name: 'Czech Republic',
    phonePrefix: '+420',
    currency: 'CZK',
    phoneDigitCount: 9,
    supported: true,
  },
  {
    code: 'DK',
    flag: '🇩🇰',
    name: 'Denmark',
    phonePrefix: '+45',
    currency: 'DKK',
    phoneDigitCount: 8,
    supported: true,
  },
  {
    code: 'EE',
    flag: '🇪🇪',
    name: 'Estonia',
    phonePrefix: '+372',
    currency: 'EUR',
    phoneDigitCount: 8,
    supported: true,
  },
  {
    code: 'FI',
    flag: '🇫🇮',
    name: 'Finland',
    phonePrefix: '+358',
    currency: 'EUR',
    phoneDigitCount: 9,
    supported: true,
  },
  {
    code: 'FR',
    flag: '🇫🇷',
    name: 'France',
    phonePrefix: '+33',
    currency: 'EUR',
    phoneDigitCount: 9,
    supported: true,
  },
  {
    code: 'DE',
    flag: '🇩🇪',
    name: 'Germany',
    phonePrefix: '+49',
    currency: 'EUR',
    phoneDigitCount: 10,
    supported: true,
  },
  {
    code: 'GR',
    flag: '🇬🇷',
    name: 'Greece',
    phonePrefix: '+30',
    currency: 'EUR',
    phoneDigitCount: 10,
    supported: true,
  },
  {
    code: 'HU',
    flag: '🇭🇺',
    name: 'Hungary',
    phonePrefix: '+36',
    currency: 'HUF',
    phoneDigitCount: 9,
    supported: true,
  },
  {
    code: 'IS',
    flag: '🇮🇸',
    name: 'Iceland',
    phonePrefix: '+354',
    currency: 'ISK',
    phoneDigitCount: 7,
    supported: true,
  },
  {
    code: 'IE',
    flag: '🇮🇪',
    name: 'Ireland',
    phonePrefix: '+353',
    currency: 'EUR',
    phoneDigitCount: 9,
    supported: true,
  },
  {
    code: 'IT',
    flag: '🇮🇹',
    name: 'Italy',
    phonePrefix: '+39',
    currency: 'EUR',
    phoneDigitCount: 10,
    supported: true,
  },
  {
    code: 'LV',
    flag: '🇱🇻',
    name: 'Latvia',
    phonePrefix: '+371',
    currency: 'EUR',
    phoneDigitCount: 8,
    supported: true,
  },
  {
    code: 'LT',
    flag: '🇱🇹',
    name: 'Lithuania',
    phonePrefix: '+370',
    currency: 'EUR',
    phoneDigitCount: 8,
    supported: true,
  },
  {
    code: 'LU',
    flag: '🇱🇺',
    name: 'Luxembourg',
    phonePrefix: '+352',
    currency: 'EUR',
    phoneDigitCount: 9,
    supported: true,
  },
  {
    code: 'MT',
    flag: '🇲🇹',
    name: 'Malta',
    phonePrefix: '+356',
    currency: 'EUR',
    phoneDigitCount: 8,
    supported: true,
  },
  {
    code: 'ME',
    flag: '🇲🇪',
    name: 'Montenegro',
    phonePrefix: '+382',
    currency: 'EUR',
    phoneDigitCount: 8,
    supported: true,
  },
  {
    code: 'NL',
    flag: '🇳🇱',
    name: 'Netherlands',
    phonePrefix: '+31',
    currency: 'EUR',
    phoneDigitCount: 9,
    supported: true,
  },
  {
    code: 'NO',
    flag: '🇳🇴',
    name: 'Norway',
    phonePrefix: '+47',
    currency: 'NOK',
    phoneDigitCount: 8,
    supported: true,
  },
  {
    code: 'PL',
    flag: '🇵🇱',
    name: 'Poland',
    phonePrefix: '+48',
    currency: 'PLN',
    phoneDigitCount: 9,
    supported: true,
  },
  {
    code: 'PT',
    flag: '🇵🇹',
    name: 'Portugal',
    phonePrefix: '+351',
    currency: 'EUR',
    phoneDigitCount: 9,
    supported: true,
  },
  {
    code: 'RO',
    flag: '🇷🇴',
    name: 'Romania',
    phonePrefix: '+40',
    currency: 'RON',
    phoneDigitCount: 9,
    supported: true,
  },
  {
    code: 'RS',
    flag: '🇷🇸',
    name: 'Serbia',
    phonePrefix: '+381',
    currency: 'RSD',
    phoneDigitCount: 8,
    supported: true,
  },
  {
    code: 'SK',
    flag: '🇸🇰',
    name: 'Slovakia',
    phonePrefix: '+421',
    currency: 'EUR',
    phoneDigitCount: 9,
    supported: true,
  },
  {
    code: 'SI',
    flag: '🇸🇮',
    name: 'Slovenia',
    phonePrefix: '+386',
    currency: 'EUR',
    phoneDigitCount: 8,
    supported: true,
  },
  {
    code: 'ES',
    flag: '🇪🇸',
    name: 'Spain',
    phonePrefix: '+34',
    currency: 'EUR',
    phoneDigitCount: 9,
    supported: true,
  },
  {
    code: 'SE',
    flag: '🇸🇪',
    name: 'Sweden',
    phonePrefix: '+46',
    currency: 'SEK',
    phoneDigitCount: 9,
    supported: true,
  },
  {
    code: 'CH',
    flag: '🇨🇭',
    name: 'Switzerland',
    phonePrefix: '+41',
    currency: 'CHF',
    phoneDigitCount: 9,
    supported: true,
  },
  {
    code: 'GB',
    flag: '🇬🇧',
    name: 'United Kingdom',
    phonePrefix: '+44',
    currency: 'GBP',
    phoneDigitCount: 10,
    supported: true,
  },
  {
    code: 'AX',
    flag: '🇦🇽',
    name: 'Åland Islands',
    phonePrefix: '+358',
    currency: 'EUR',
    phoneDigitCount: 9,
    supported: true,
  },

  // North America - Mixed Support
  {
    code: 'BM',
    flag: '🇧🇲',
    name: 'Bermuda',
    phonePrefix: '+1',
    currency: 'BMD',
    phoneDigitCount: 10,
    supported: false,
  },
  {
    code: 'CA',
    flag: '🇨🇦',
    name: 'Canada',
    phonePrefix: '+1',
    currency: 'CAD',
    phoneDigitCount: 10,
    supported: false,
  },
  {
    code: 'GP',
    flag: '🇬🇵',
    name: 'Guadeloupe',
    phonePrefix: '+590',
    currency: 'EUR',
    phoneDigitCount: 9,
    supported: false,
  },
  {
    code: 'MQ',
    flag: '🇲🇶',
    name: 'Martinique',
    phonePrefix: '+596',
    currency: 'EUR',
    phoneDigitCount: 9,
    supported: false,
  },
  {
    code: 'MX',
    flag: '🇲🇽',
    name: 'Mexico',
    phonePrefix: '+52',
    currency: 'MXN',
    phoneDigitCount: 10,
    supported: false,
  },
  {
    code: 'PR',
    flag: '🇵🇷',
    name: 'Puerto Rico',
    phonePrefix: '+1',
    currency: 'USD',
    phoneDigitCount: 10,
    supported: false,
  },
  {
    code: 'MF',
    flag: '🇲🇫',
    name: 'Saint Martin',
    phonePrefix: '+590',
    currency: 'EUR',
    phoneDigitCount: 9,
    supported: false,
  },

  // United States - Supported with all states
  {
    code: 'US',
    flag: '🇺🇸',
    name: 'United States',
    phonePrefix: '+1',
    currency: 'USD',
    phoneDigitCount: 10,
    recommended: true,
    supported: true,
    states: [
      { code: 'AL', name: 'Alabama', supported: true },
      { code: 'AZ', name: 'Arizona', supported: true },
      { code: 'AR', name: 'Arkansas', supported: true },
      { code: 'CA', name: 'California', supported: true },
      { code: 'CO', name: 'Colorado', supported: true },
      { code: 'CT', name: 'Connecticut', supported: true },
      { code: 'DE', name: 'Delaware', supported: true },
      { code: 'DC', name: 'District of Columbia', supported: true },
      { code: 'FL', name: 'Florida', supported: true },
      { code: 'GA', name: 'Georgia', supported: true },
      { code: 'HI', name: 'Hawaii', supported: true },
      { code: 'ID', name: 'Idaho', supported: true },
      { code: 'IL', name: 'Illinois', supported: true },
      { code: 'IN', name: 'Indiana', supported: true },
      { code: 'IA', name: 'Iowa', supported: true },
      { code: 'KS', name: 'Kansas', supported: true },
      { code: 'KY', name: 'Kentucky', supported: true },
      { code: 'ME', name: 'Maine', supported: true },
      { code: 'MD', name: 'Maryland', supported: true },
      { code: 'MA', name: 'Massachusetts', supported: true },
      { code: 'MI', name: 'Michigan', supported: true },
      { code: 'MS', name: 'Mississippi', supported: true },
      { code: 'MO', name: 'Missouri', supported: true },
      { code: 'MT', name: 'Montana', supported: true },
      { code: 'NE', name: 'Nebraska', supported: true },
      { code: 'NV', name: 'Nevada', supported: true },
      { code: 'NH', name: 'New Hampshire', supported: true },
      { code: 'NJ', name: 'New Jersey', supported: true },
      { code: 'NM', name: 'New Mexico', supported: true },
      { code: 'NC', name: 'North Carolina', supported: true },
      { code: 'OH', name: 'Ohio', supported: true },
      { code: 'OK', name: 'Oklahoma', supported: true },
      { code: 'OR', name: 'Oregon', supported: true },
      { code: 'PA', name: 'Pennsylvania', supported: true },
      { code: 'RI', name: 'Rhode Island', supported: true },
      { code: 'SC', name: 'South Carolina', supported: true },
      { code: 'SD', name: 'South Dakota', supported: true },
      { code: 'TN', name: 'Tennessee', supported: true },
      { code: 'TX', name: 'Texas', supported: true },
      { code: 'UT', name: 'Utah', supported: true },
      { code: 'VT', name: 'Vermont', supported: true },
      { code: 'VA', name: 'Virginia', supported: true },
      { code: 'WA', name: 'Washington', supported: true },
      { code: 'WV', name: 'West Virginia', supported: true },
      { code: 'WI', name: 'Wisconsin', supported: true },
      { code: 'WY', name: 'Wyoming', supported: true },
    ],
  },

  // Asia - Not Supported
  {
    code: 'CY',
    flag: '🇨🇾',
    name: 'Cyprus',
    phonePrefix: '+357',
    currency: 'EUR',
    phoneDigitCount: 8,
    supported: false,
  },
  {
    code: 'GE',
    flag: '🇬🇪',
    name: 'Georgia',
    phonePrefix: '+995',
    currency: 'GEL',
    phoneDigitCount: 9,
    supported: false,
  },
  {
    code: 'HK',
    flag: '🇭🇰',
    name: 'Hong Kong',
    phonePrefix: '+852',
    currency: 'HKD',
    phoneDigitCount: 8,
    supported: false,
  },
  {
    code: 'IN',
    flag: '🇮🇳',
    name: 'India',
    phonePrefix: '+91',
    currency: 'INR',
    phoneDigitCount: 10,
    supported: false,
  },
  {
    code: 'IL',
    flag: '🇮🇱',
    name: 'Israel',
    phonePrefix: '+972',
    currency: 'ILS',
    phoneDigitCount: 9,
    supported: false,
  },
  {
    code: 'KW',
    flag: '🇰🇼',
    name: 'Kuwait',
    phonePrefix: '+965',
    currency: 'KWD',
    phoneDigitCount: 8,
    supported: false,
  },
  {
    code: 'MY',
    flag: '🇲🇾',
    name: 'Malaysia',
    phonePrefix: '+60',
    currency: 'MYR',
    phoneDigitCount: 9,
    supported: false,
  },
  {
    code: 'PH',
    flag: '🇵🇭',
    name: 'Philippines',
    phonePrefix: '+63',
    currency: 'PHP',
    phoneDigitCount: 9,
    supported: false,
  },

  // South America - Not Supported
  {
    code: 'BR',
    flag: '🇧🇷',
    name: 'Brazil',
    phonePrefix: '+55',
    currency: 'BRL',
    phoneDigitCount: 11,
    supported: false,
  },
  {
    code: 'GF',
    flag: '🇬🇫',
    name: 'French Guiana',
    phonePrefix: '+594',
    currency: 'EUR',
    phoneDigitCount: 9,
    supported: false,
  },

  // Oceania - Not Supported
  {
    code: 'AU',
    flag: '🇦🇺',
    name: 'Australia',
    phonePrefix: '+61',
    currency: 'AUD',
    phoneDigitCount: 9,
    supported: false,
  },
  {
    code: 'GU',
    flag: '🇬🇺',
    name: 'Guam',
    phonePrefix: '+1',
    currency: 'USD',
    phoneDigitCount: 10,
    supported: false,
  },
  {
    code: 'NZ',
    flag: '🇳🇿',
    name: 'New Zealand',
    phonePrefix: '+64',
    currency: 'NZD',
    phoneDigitCount: 9,
    supported: false,
  },

  // Africa - Not Supported
  {
    code: 'YT',
    flag: '🇾🇹',
    name: 'Mayotte',
    phonePrefix: '+262',
    currency: 'EUR',
    phoneDigitCount: 9,
    supported: false,
  },
  {
    code: 'RE',
    flag: '🇷🇪',
    name: 'Réunion',
    phonePrefix: '+262',
    currency: 'EUR',
    phoneDigitCount: 9,
    supported: false,
  },
];
