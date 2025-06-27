import { CaipChainId } from '@metamask/utils';
import { CountryCode } from 'libphonenumber-js';

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

export interface DepositRegion {
  code: CountryCode;
  flag: string;
  name: string;
  phonePrefix: string;
  currency: string;
  template: string;
  placeholder: string;
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
    template: 'XXX XXX',
    placeholder: '123 456',
    supported: true,
  },
  {
    code: 'AT',
    flag: '🇦🇹',
    name: 'Austria',
    phonePrefix: '+43',
    currency: 'EUR',
    template: 'XXX XXX XXX',
    placeholder: '664 123 456',
    supported: true,
  },
  {
    code: 'BE',
    flag: '🇧🇪',
    name: 'Belgium',
    phonePrefix: '+32',
    currency: 'EUR',
    template: 'XXX XXX XXX',
    placeholder: '470 123 456',
    supported: true,
  },
  {
    code: 'CZ',
    flag: '🇨🇿',
    name: 'Czech Republic',
    phonePrefix: '+420',
    currency: 'CZK',
    template: 'XXX XXX XXX',
    placeholder: '601 123 456',
    supported: true,
  },
  {
    code: 'DK',
    flag: '🇩🇰',
    name: 'Denmark',
    phonePrefix: '+45',
    currency: 'DKK',
    template: 'XX XX XX XX',
    placeholder: '12 34 56 78',
    supported: true,
  },
  {
    code: 'EE',
    flag: '🇪🇪',
    name: 'Estonia',
    phonePrefix: '+372',
    currency: 'EUR',
    template: 'XXX XXX XXX',
    placeholder: '512 345 678',
    supported: true,
  },
  {
    code: 'FI',
    flag: '🇫🇮',
    name: 'Finland',
    phonePrefix: '+358',
    currency: 'EUR',
    template: 'XXX XXX XXXX',
    placeholder: '40 123 4567',
    supported: true,
  },
  {
    code: 'FR',
    flag: '🇫🇷',
    name: 'France',
    phonePrefix: '+33',
    currency: 'EUR',
    template: 'X XX XX XX XX',
    placeholder: '6 12 34 56 78',
    supported: true,
  },
  {
    code: 'DE',
    flag: '🇩🇪',
    name: 'Germany',
    phonePrefix: '+49',
    currency: 'EUR',
    template: 'XXX XXXXXXX',
    placeholder: '151 12345678',
    supported: true,
  },
  {
    code: 'GR',
    flag: '🇬🇷',
    name: 'Greece',
    phonePrefix: '+30',
    currency: 'EUR',
    template: 'XXX XXX XXXX',
    placeholder: '691 234 5678',
    supported: true,
  },
  {
    code: 'HU',
    flag: '🇭🇺',
    name: 'Hungary',
    phonePrefix: '+36',
    currency: 'HUF',
    template: 'XX XXX XXXX',
    placeholder: '20 123 4567',
    supported: true,
  },
  {
    code: 'IS',
    flag: '🇮🇸',
    name: 'Iceland',
    phonePrefix: '+354',
    currency: 'ISK',
    template: 'XXX XXXX',
    placeholder: '612 3456',
    supported: true,
  },
  {
    code: 'IE',
    flag: '🇮🇪',
    name: 'Ireland',
    phonePrefix: '+353',
    currency: 'EUR',
    template: 'XX XXX XXXX',
    placeholder: '83 123 4567',
    supported: true,
  },
  {
    code: 'IT',
    flag: '🇮🇹',
    name: 'Italy',
    phonePrefix: '+39',
    currency: 'EUR',
    template: 'XXX XXX XXXX',
    placeholder: '312 345 6789',
    supported: true,
  },
  {
    code: 'LV',
    flag: '🇱🇻',
    name: 'Latvia',
    phonePrefix: '+371',
    currency: 'EUR',
    template: 'XX XXX XXX',
    placeholder: '21 234 567',
    supported: true,
  },
  {
    code: 'LT',
    flag: '🇱🇹',
    name: 'Lithuania',
    phonePrefix: '+370',
    currency: 'EUR',
    template: 'XXX XXXXX',
    placeholder: '612 34567',
    supported: true,
  },
  {
    code: 'LU',
    flag: '🇱🇺',
    name: 'Luxembourg',
    phonePrefix: '+352',
    currency: 'EUR',
    template: 'XXX XXX XXX',
    placeholder: '621 123 456',
    supported: true,
  },
  {
    code: 'MT',
    flag: '🇲🇹',
    name: 'Malta',
    phonePrefix: '+356',
    currency: 'EUR',
    template: 'XXXX XXXX',
    placeholder: '2123 4567',
    supported: true,
  },
  {
    code: 'ME',
    flag: '🇲🇪',
    name: 'Montenegro',
    phonePrefix: '+382',
    currency: 'EUR',
    template: 'XX XXX XXX',
    placeholder: '67 123 456',
    supported: true,
  },
  {
    code: 'NL',
    flag: '🇳🇱',
    name: 'Netherlands',
    phonePrefix: '+31',
    currency: 'EUR',
    template: 'X XXX XXX XXX',
    placeholder: '6 123 456 789',
    supported: true,
  },
  {
    code: 'NO',
    flag: '🇳🇴',
    name: 'Norway',
    phonePrefix: '+47',
    currency: 'NOK',
    template: 'XXX XX XXX',
    placeholder: '123 45 678',
    supported: true,
  },
  {
    code: 'PL',
    flag: '🇵🇱',
    name: 'Poland',
    phonePrefix: '+48',
    currency: 'PLN',
    template: 'XXX XXX XXX',
    placeholder: '123 456 789',
    supported: true,
  },
  {
    code: 'PT',
    flag: '🇵🇹',
    name: 'Portugal',
    phonePrefix: '+351',
    currency: 'EUR',
    template: 'XXX XXX XXX',
    placeholder: '912 345 678',
    supported: true,
  },
  {
    code: 'RO',
    flag: '🇷🇴',
    name: 'Romania',
    phonePrefix: '+40',
    currency: 'RON',
    template: 'XXX XXX XXX',
    placeholder: '712 345 678',
    supported: true,
  },
  {
    code: 'RS',
    flag: '🇷🇸',
    name: 'Serbia',
    phonePrefix: '+381',
    currency: 'RSD',
    template: 'XX XXX XXXX',
    placeholder: '60 123 4567',
    supported: true,
  },
  {
    code: 'SK',
    flag: '🇸🇰',
    name: 'Slovakia',
    phonePrefix: '+421',
    currency: 'EUR',
    template: 'XXX XXX XXX',
    placeholder: '904 123 456',
    supported: true,
  },
  {
    code: 'SI',
    flag: '🇸🇮',
    name: 'Slovenia',
    phonePrefix: '+386',
    currency: 'EUR',
    template: 'XX XXX XXX',
    placeholder: '31 234 567',
    supported: true,
  },
  {
    code: 'ES',
    flag: '🇪🇸',
    name: 'Spain',
    phonePrefix: '+34',
    currency: 'EUR',
    template: 'XXX XXX XXX',
    placeholder: '612 345 678',
    supported: true,
  },
  {
    code: 'SE',
    flag: '🇸🇪',
    name: 'Sweden',
    phonePrefix: '+46',
    currency: 'SEK',
    template: 'XX XXX XXXX',
    placeholder: '70 123 4567',
    supported: true,
  },
  {
    code: 'CH',
    flag: '🇨🇭',
    name: 'Switzerland',
    phonePrefix: '+41',
    currency: 'CHF',
    template: 'XX XXX XXXX',
    placeholder: '76 123 4567',
    supported: true,
  },
  {
    code: 'GB',
    flag: '🇬🇧',
    name: 'United Kingdom',
    phonePrefix: '+44',
    currency: 'GBP',
    template: 'XXXX XXXXXX',
    placeholder: '7123 456789',
    supported: true,
  },
  {
    code: 'AX',
    flag: '🇦🇽',
    name: 'Åland Islands',
    phonePrefix: '+358',
    currency: 'EUR',
    template: 'XXX XXX XXXX',
    placeholder: '40 123 4567',
    supported: true,
  },

  // North America - Mixed Support
  {
    code: 'BM',
    flag: '🇧🇲',
    name: 'Bermuda',
    phonePrefix: '+1',
    currency: 'BMD',
    template: '(XXX) XXX-XXXX',
    placeholder: '(555) 123-4567',
    supported: false,
  },
  {
    code: 'CA',
    flag: '🇨🇦',
    name: 'Canada',
    phonePrefix: '+1',
    currency: 'CAD',
    template: 'XXX XXX XXXX',
    placeholder: '555 123 4567',
    supported: false,
  },
  {
    code: 'GP',
    flag: '🇬🇵',
    name: 'Guadeloupe',
    phonePrefix: '+590',
    currency: 'EUR',
    template: 'XXX XXX XXX',
    placeholder: '123 456 789',
    supported: false,
  },
  {
    code: 'MQ',
    flag: '🇲🇶',
    name: 'Martinique',
    phonePrefix: '+596',
    currency: 'EUR',
    template: 'XXX XXX XXX',
    placeholder: '123 456 789',
    supported: false,
  },
  {
    code: 'MX',
    flag: '🇲🇽',
    name: 'Mexico',
    phonePrefix: '+52',
    currency: 'MXN',
    template: 'XX XXXX XXXX',
    placeholder: '55 1234 5678',
    supported: false,
  },
  {
    code: 'PR',
    flag: '🇵🇷',
    name: 'Puerto Rico',
    phonePrefix: '+1',
    currency: 'USD',
    template: '(XXX) XXX-XXXX',
    placeholder: '(555) 123-4567',
    supported: false,
  },
  {
    code: 'MF',
    flag: '🇲🇫',
    name: 'Saint Martin',
    phonePrefix: '+590',
    currency: 'EUR',
    template: 'XXX XXX XXX',
    placeholder: '123 456 789',
    supported: false,
  },

  // United States - Supported
  {
    code: 'US',
    flag: '🇺🇸',
    name: 'United States',
    phonePrefix: '+1',
    currency: 'USD',
    template: '(XXX) XXX-XXXX',
    placeholder: '(555) 123-4567',
    recommended: true,
    supported: true,
  },

  // Asia - Not Supported
  {
    code: 'CY',
    flag: '🇨🇾',
    name: 'Cyprus',
    phonePrefix: '+357',
    currency: 'EUR',
    template: 'XX XXX XXX',
    placeholder: '12 345 678',
    supported: false,
  },
  {
    code: 'GE',
    flag: '🇬🇪',
    name: 'Georgia',
    phonePrefix: '+995',
    currency: 'GEL',
    template: 'XXX XXX XXX',
    placeholder: '123 456 789',
    supported: false,
  },
  {
    code: 'HK',
    flag: '🇭🇰',
    name: 'Hong Kong',
    phonePrefix: '+852',
    currency: 'HKD',
    template: 'XXXX XXXX',
    placeholder: '1234 5678',
    supported: false,
  },
  {
    code: 'IN',
    flag: '🇮🇳',
    name: 'India',
    phonePrefix: '+91',
    currency: 'INR',
    template: 'XXXXX XXXXX',
    placeholder: '98765 43210',
    supported: false,
  },
  {
    code: 'IL',
    flag: '🇮🇱',
    name: 'Israel',
    phonePrefix: '+972',
    currency: 'ILS',
    template: 'XXX XXX XXX',
    placeholder: '123 456 789',
    supported: false,
  },
  {
    code: 'KW',
    flag: '🇰🇼',
    name: 'Kuwait',
    phonePrefix: '+965',
    currency: 'KWD',
    template: 'XXXX XXXX',
    placeholder: '1234 5678',
    supported: false,
  },
  {
    code: 'MY',
    flag: '🇲🇾',
    name: 'Malaysia',
    phonePrefix: '+60',
    currency: 'MYR',
    template: 'XXX XXX XXX',
    placeholder: '123 456 789',
    supported: false,
  },
  {
    code: 'PH',
    flag: '🇵🇭',
    name: 'Philippines',
    phonePrefix: '+63',
    currency: 'PHP',
    template: 'XXX XXX XXXX',
    placeholder: '123 456 7890',
    supported: false,
  },

  // South America - Not Supported
  {
    code: 'BR',
    flag: '🇧🇷',
    name: 'Brazil',
    phonePrefix: '+55',
    currency: 'BRL',
    template: 'XX XXXXX-XXXX',
    placeholder: '11 98765-4321',
    supported: false,
  },
  {
    code: 'GF',
    flag: '🇬🇫',
    name: 'French Guiana',
    phonePrefix: '+594',
    currency: 'EUR',
    template: 'XXX XXX XXX',
    placeholder: '123 456 789',
    supported: false,
  },

  // Oceania - Not Supported
  {
    code: 'AU',
    flag: '🇦🇺',
    name: 'Australia',
    phonePrefix: '+61',
    currency: 'AUD',
    template: 'XXX XXX XXX',
    placeholder: '412 345 678',
    supported: false,
  },
  {
    code: 'GU',
    flag: '🇬🇺',
    name: 'Guam',
    phonePrefix: '+1',
    currency: 'USD',
    template: '(XXX) XXX-XXXX',
    placeholder: '(555) 123-4567',
    supported: false,
  },
  {
    code: 'NZ',
    flag: '🇳🇿',
    name: 'New Zealand',
    phonePrefix: '+64',
    currency: 'NZD',
    template: 'XXX XXX XXX',
    placeholder: '123 456 789',
    supported: false,
  },

  // Africa - Not Supported
  {
    code: 'YT',
    flag: '🇾🇹',
    name: 'Mayotte',
    phonePrefix: '+262',
    currency: 'EUR',
    template: 'XXX XXX XXX',
    placeholder: '123 456 789',
    supported: false,
  },
  {
    code: 'RE',
    flag: '🇷🇪',
    name: 'Réunion',
    phonePrefix: '+262',
    currency: 'EUR',
    template: 'XXX XXX XXX',
    placeholder: '123 456 789',
    supported: false,
  },
];

export const TRANSAK_SUPPORT_URL = 'https://support.transak.com';