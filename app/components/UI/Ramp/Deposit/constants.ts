import { CaipChainId } from '@metamask/utils';
import {
  IconColor,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import { brandColor } from '@metamask/design-tokens';
import { AppThemeKey } from '../../../../util/theme/models';

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
  duration: 'instant' | '1_to_2_days';
  icon: IconName;
  iconColor?:
    | string
    | IconColor
    | { [AppThemeKey.light]: string; [AppThemeKey.dark]: string };
}

export interface DepositFiatCurrency {
  id: string;
  name: string;
  symbol: string;
  emoji: string;
}

export interface DepositRegion {
  isoCode: string;
  flag: string;
  name: string;
  phone: {
    prefix: string;
    placeholder: string;
    template: string;
  };
  currency: string;
  supported: boolean;
  recommended?: boolean;
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
  duration: 'instant',
  icon: IconName.Card,
};

export const SEPA_PAYMENT_METHOD: DepositPaymentMethod = {
  id: 'sepa_bank_transfer',
  name: 'SEPA Bank Transfer',
  duration: '1_to_2_days',
  icon: IconName.Bank,
};

export const APPLE_PAY_PAYMENT_METHOD: DepositPaymentMethod = {
  id: 'apple_pay',
  name: 'Apple Pay',
  duration: 'instant',
  icon: IconName.Apple,
  iconColor: {
    light: brandColor.black,
    dark: brandColor.white,
  },
};

export const SUPPORTED_PAYMENT_METHODS: DepositPaymentMethod[] = [
  DEBIT_CREDIT_PAYMENT_METHOD,
  APPLE_PAY_PAYMENT_METHOD,
  SEPA_PAYMENT_METHOD,
];

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
  {
    isoCode: 'AD',
    flag: '🇦🇩',
    name: 'Andorra',
    phone: {
      prefix: '+376',
      placeholder: '123 456',
      template: 'XXX XXX',
    },
    currency: 'EUR',
    supported: true,
  },
  {
    isoCode: 'AT',
    flag: '🇦🇹',
    name: 'Austria',
    phone: {
      prefix: '+43',
      placeholder: '123 456 7890',
      template: 'XXX XXX XXXX',
    },
    currency: 'EUR',
    supported: true,
  },
  {
    isoCode: 'BE',
    flag: '🇧🇪',
    name: 'Belgium',
    phone: {
      prefix: '+32',
      placeholder: '123 456 789',
      template: 'XXX XXX XXX',
    },
    currency: 'EUR',
    supported: true,
  },
  {
    isoCode: 'CZ',
    flag: '🇨🇿',
    name: 'Czech Republic',
    phone: {
      prefix: '+420',
      placeholder: '123 456 789',
      template: 'XXX XXX XXX',
    },
    currency: 'CZK',
    supported: true,
  },
  {
    isoCode: 'DK',
    flag: '🇩🇰',
    name: 'Denmark',
    phone: {
      prefix: '+45',
      placeholder: '12 34 56 78',
      template: 'XX XX XX XX',
    },
    currency: 'DKK',
    supported: true,
  },
  {
    isoCode: 'EE',
    flag: '🇪🇪',
    name: 'Estonia',
    phone: {
      prefix: '+372',
      placeholder: '1234 5678',
      template: 'XXXX XXXX',
    },
    currency: 'EUR',
    supported: true,
  },
  {
    isoCode: 'FI',
    flag: '🇫🇮',
    name: 'Finland',
    phone: {
      prefix: '+358',
      placeholder: '123 456 789',
      template: 'XXX XXX XXX',
    },
    currency: 'EUR',
    supported: true,
  },
  {
    isoCode: 'FR',
    flag: '🇫🇷',
    name: 'France',
    phone: {
      prefix: '+33',
      placeholder: '6 12 34 56 78',
      template: 'X XX XX XX XX',
    },
    currency: 'EUR',
    supported: true,
  },
  {
    isoCode: 'DE',
    flag: '🇩🇪',
    name: 'Germany',
    phone: {
      prefix: '+49',
      placeholder: '123 456 7890',
      template: 'XXX XXX XXXX',
    },
    currency: 'EUR',
    supported: true,
  },
  {
    isoCode: 'GR',
    flag: '🇬🇷',
    name: 'Greece',
    phone: {
      prefix: '+30',
      placeholder: '123 456 7890',
      template: 'XXX XXX XXXX',
    },
    currency: 'EUR',
    supported: true,
  },
  {
    isoCode: 'HU',
    flag: '🇭🇺',
    name: 'Hungary',
    phone: {
      prefix: '+36',
      placeholder: '123 456 789',
      template: 'XXX XXX XXX',
    },
    currency: 'HUF',
    supported: true,
  },
  {
    isoCode: 'IS',
    flag: '🇮🇸',
    name: 'Iceland',
    phone: {
      prefix: '+354',
      placeholder: '123 4567',
      template: 'XXX XXXX',
    },
    currency: 'EUR',
    supported: true,
  },
  {
    isoCode: 'IE',
    flag: '🇮🇪',
    name: 'Ireland',
    phone: {
      prefix: '+353',
      placeholder: '123 456 789',
      template: 'XXX XXX XXX',
    },
    currency: 'EUR',
    supported: true,
  },
  {
    isoCode: 'IT',
    flag: '🇮🇹',
    name: 'Italy',
    phone: {
      prefix: '+39',
      placeholder: '123 456 7890',
      template: 'XXX XXX XXXX',
    },
    currency: 'EUR',
    supported: true,
  },
  {
    isoCode: 'LV',
    flag: '🇱🇻',
    name: 'Latvia',
    phone: {
      prefix: '+371',
      placeholder: '1234 5678',
      template: 'XXXX XXXX',
    },
    currency: 'EUR',
    supported: true,
  },
  {
    isoCode: 'LT',
    flag: '🇱🇹',
    name: 'Lithuania',
    phone: {
      prefix: '+370',
      placeholder: '123 45678',
      template: 'XXX XXXXX',
    },
    currency: 'EUR',
    supported: true,
  },
  {
    isoCode: 'LU',
    flag: '🇱🇺',
    name: 'Luxembourg',
    phone: {
      prefix: '+352',
      placeholder: '123 456 789',
      template: 'XXX XXX XXX',
    },
    currency: 'EUR',
    supported: true,
  },
  {
    isoCode: 'MT',
    flag: '🇲🇹',
    name: 'Malta',
    phone: {
      prefix: '+356',
      placeholder: '1234 5678',
      template: 'XXXX XXXX',
    },
    currency: 'EUR',
    supported: true,
  },
  {
    isoCode: 'ME',
    flag: '🇲🇪',
    name: 'Montenegro',
    phone: {
      prefix: '+382',
      placeholder: '123 45678',
      template: 'XXX XXXXX',
    },
    currency: 'EUR',
    supported: true,
  },
  {
    isoCode: 'NL',
    flag: '🇳🇱',
    name: 'Netherlands',
    phone: {
      prefix: '+31',
      placeholder: '123 456 789',
      template: 'XXX XXX XXX',
    },
    currency: 'EUR',
    supported: true,
  },
  {
    isoCode: 'NO',
    flag: '🇳🇴',
    name: 'Norway',
    phone: {
      prefix: '+47',
      placeholder: '123 45 678',
      template: 'XXX XX XXX',
    },
    currency: 'NOK',
    supported: true,
  },
  {
    isoCode: 'PL',
    flag: '🇵🇱',
    name: 'Poland',
    phone: {
      prefix: '+48',
      placeholder: '123 456 789',
      template: 'XXX XXX XXX',
    },
    currency: 'PLN',
    supported: true,
  },
  {
    isoCode: 'PT',
    flag: '🇵🇹',
    name: 'Portugal',
    phone: {
      prefix: '+351',
      placeholder: '123 456 789',
      template: 'XXX XXX XXX',
    },
    currency: 'EUR',
    supported: true,
  },
  {
    isoCode: 'RO',
    flag: '🇷🇴',
    name: 'Romania',
    phone: {
      prefix: '+40',
      placeholder: '123 456 789',
      template: 'XXX XXX XXX',
    },
    currency: 'RON',
    supported: true,
  },
  {
    isoCode: 'RS',
    flag: '🇷🇸',
    name: 'Serbia',
    phone: {
      prefix: '+381',
      placeholder: '123 45678',
      template: 'XXX XXXXX',
    },
    currency: 'RSD',
    supported: true,
  },
  {
    isoCode: 'SK',
    flag: '🇸🇰',
    name: 'Slovakia',
    phone: {
      prefix: '+421',
      placeholder: '123 456 789',
      template: 'XXX XXX XXX',
    },
    currency: 'EUR',
    supported: true,
  },
  {
    isoCode: 'SI',
    flag: '🇸🇮',
    name: 'Slovenia',
    phone: {
      prefix: '+386',
      placeholder: '123 45678',
      template: 'XXX XXXXX',
    },
    currency: 'EUR',
    supported: true,
  },
  {
    isoCode: 'ES',
    flag: '🇪🇸',
    name: 'Spain',
    phone: {
      prefix: '+34',
      placeholder: '123 456 789',
      template: 'XXX XXX XXX',
    },
    currency: 'EUR',
    supported: true,
  },
  {
    isoCode: 'SE',
    flag: '🇸🇪',
    name: 'Sweden',
    phone: {
      prefix: '+46',
      placeholder: '123 456 789',
      template: 'XXX XXX XXX',
    },
    currency: 'SEK',
    supported: true,
  },
  {
    isoCode: 'CH',
    flag: '🇨🇭',
    name: 'Switzerland',
    phone: {
      prefix: '+41',
      placeholder: '123 456 789',
      template: 'XXX XXX XXX',
    },
    currency: 'CHF',
    supported: true,
  },
  {
    isoCode: 'GB',
    flag: '🇬🇧',
    name: 'United Kingdom',
    phone: {
      prefix: '+44',
      placeholder: '12345 67890',
      template: 'XXXXX XXXXX',
    },
    currency: 'GBP',
    supported: true,
  },
  {
    isoCode: 'AX',
    flag: '🇦🇽',
    name: 'Åland Islands',
    phone: {
      prefix: '+358',
      placeholder: '123 456 789',
      template: 'XXX XXX XXX',
    },
    currency: 'EUR',
    supported: true,
  },
  {
    isoCode: 'CY',
    flag: '🇨🇾',
    name: 'Cyprus',
    phone: {
      prefix: '+357',
      placeholder: '1234 5678',
      template: 'XXXX XXXX',
    },
    currency: 'EUR',
    supported: true,
  },
  {
    isoCode: 'US',
    flag: '🇺🇸',
    name: 'United States',
    phone: {
      prefix: '+1',
      placeholder: '(555) 555-1234',
      template: '(XXX) XXX-XXXX',
    },
    currency: 'USD',
    recommended: true,
    supported: true,
  },
  {
    isoCode: 'BM',
    flag: '🇧🇲',
    name: 'Bermuda',
    phone: {
      prefix: '+1',
      placeholder: '(441) 555-1234',
      template: '(441) XXX-XXXX',
    },
    currency: 'BMD',
    supported: false,
  },
  {
    isoCode: 'CA',
    flag: '🇨🇦',
    name: 'Canada',
    phone: {
      prefix: '+1',
      placeholder: '(555) 555-1234',
      template: '(XXX) XXX-XXXX',
    },
    currency: 'CAD',
    supported: false,
  },
  {
    isoCode: 'GP',
    flag: '🇬🇵',
    name: 'Guadeloupe',
    phone: {
      prefix: '+590',
      placeholder: '123 456 789',
      template: 'XXX XXX XXX',
    },
    currency: 'EUR',
    supported: false,
  },
  {
    isoCode: 'MQ',
    flag: '🇲🇶',
    name: 'Martinique',
    phone: {
      prefix: '+596',
      placeholder: '123 456 789',
      template: 'XXX XXX XXX',
    },
    currency: 'EUR',
    supported: false,
  },
  {
    isoCode: 'MX',
    flag: '🇲🇽',
    name: 'Mexico',
    phone: {
      prefix: '+52',
      placeholder: '123 456 7890',
      template: 'XXX XXX XXXX',
    },
    currency: 'MXN',
    supported: false,
  },
  {
    isoCode: 'PR',
    flag: '🇵🇷',
    name: 'Puerto Rico',
    phone: {
      prefix: '+1',
      placeholder: '(787) 555-1234',
      template: '(787) XXX-XXXX',
    },
    currency: 'USD',
    supported: false,
  },
  {
    isoCode: 'MF',
    flag: '🇲🇫',
    name: 'Saint Martin',
    phone: {
      prefix: '+590',
      placeholder: '123 456 789',
      template: 'XXX XXX XXX',
    },
    currency: 'EUR',
    supported: false,
  },
  {
    isoCode: 'GE',
    flag: '🇬🇪',
    name: 'Georgia',
    phone: {
      prefix: '+995',
      placeholder: '123 456 789',
      template: 'XXX XXX XXX',
    },
    currency: 'GEL',
    supported: false,
  },
  {
    isoCode: 'HK',
    flag: '🇭🇰',
    name: 'Hong Kong',
    phone: {
      prefix: '+852',
      placeholder: '1234 5678',
      template: 'XXXX XXXX',
    },
    currency: 'HKD',
    supported: false,
  },
  {
    isoCode: 'IN',
    flag: '🇮🇳',
    name: 'India',
    phone: {
      prefix: '+91',
      placeholder: '12345 67890',
      template: 'XXXXX XXXXX',
    },
    currency: 'INR',
    supported: false,
  },
  {
    isoCode: 'IL',
    flag: '🇮🇱',
    name: 'Israel',
    phone: {
      prefix: '+972',
      placeholder: '123 456 789',
      template: 'XXX XXX XXX',
    },
    currency: 'ILS',
    supported: false,
  },
  {
    isoCode: 'KW',
    flag: '🇰🇼',
    name: 'Kuwait',
    phone: {
      prefix: '+965',
      placeholder: '1234 5678',
      template: 'XXXX XXXX',
    },
    currency: 'KWD',
    supported: false,
  },
  {
    isoCode: 'MY',
    flag: '🇲🇾',
    name: 'Malaysia',
    phone: {
      prefix: '+60',
      placeholder: '123 456 789',
      template: 'XXX XXX XXX',
    },
    currency: 'MYR',
    supported: false,
  },
  {
    isoCode: 'PH',
    flag: '🇵🇭',
    name: 'Philippines',
    phone: {
      prefix: '+63',
      placeholder: '123 456 789',
      template: 'XXX XXX XXX',
    },
    currency: 'PHP',
    supported: false,
  },
  {
    isoCode: 'BR',
    flag: '🇧🇷',
    name: 'Brazil',
    phone: {
      prefix: '+55',
      placeholder: '11 12345 6789',
      template: 'XX XXXXX XXXX',
    },
    currency: 'BRL',
    supported: false,
  },
  {
    isoCode: 'GF',
    flag: '🇬🇫',
    name: 'French Guiana',
    phone: {
      prefix: '+594',
      placeholder: '123 456 789',
      template: 'XXX XXX XXX',
    },
    currency: 'EUR',
    supported: false,
  },
  {
    isoCode: 'AU',
    flag: '🇦🇺',
    name: 'Australia',
    phone: {
      prefix: '+61',
      placeholder: '123 456 789',
      template: 'XXX XXX XXX',
    },
    currency: 'AUD',
    supported: false,
  },
  {
    isoCode: 'GU',
    flag: '🇬🇺',
    name: 'Guam',
    phone: {
      prefix: '+1',
      placeholder: '(671) 555-1234',
      template: '(671) XXX-XXXX',
    },
    currency: 'USD',
    supported: false,
  },
  {
    isoCode: 'NZ',
    flag: '🇳🇿',
    name: 'New Zealand',
    phone: {
      prefix: '+64',
      placeholder: '123 456 789',
      template: 'XXX XXX XXX',
    },
    currency: 'NZD',
    supported: false,
  },
  {
    isoCode: 'YT',
    flag: '🇾🇹',
    name: 'Mayotte',
    phone: {
      prefix: '+262',
      placeholder: '123 456 789',
      template: 'XXX XXX XXX',
    },
    currency: 'EUR',
    supported: false,
  },
  {
    isoCode: 'RE',
    flag: '🇷🇪',
    name: 'Réunion',
    phone: {
      prefix: '+262',
      placeholder: '123 456 789',
      template: 'XXX XXX XXX',
    },
    currency: 'EUR',
    supported: false,
  },
];

export const TRANSAK_SUPPORT_URL = 'https://support.transak.com';
