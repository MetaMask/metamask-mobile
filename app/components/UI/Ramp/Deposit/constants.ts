import { CaipChainId } from '@metamask/utils';

export const TRANSAK_NETWORKS: Record<string, CaipChainId> = {
  ethereum: 'eip155:1',
};

import { CountryCode } from 'libphonenumber-js';

export interface DepositState {
  code: string;
  name: string;
}

export interface DepositRegion {
  code: CountryCode;
  flag: string;
  name: string;
  phonePrefix: string;
  currency: string;
  states?: DepositState[];
  phoneDigitCount: number;
}

export const DEPOSIT_REGIONS: DepositRegion[] = [
  {
    code: 'US',
    flag: '🇺🇸',
    name: 'United States',
    phonePrefix: '+1',
    currency: 'USD',
    phoneDigitCount: 10,
  },
  {
    code: 'AT',
    flag: '🇦🇹',
    name: 'Austria',
    phonePrefix: '+43',
    currency: 'EUR',
    phoneDigitCount: 10,
  },
  {
    code: 'BE',
    flag: '🇧🇪',
    name: 'Belgium',
    phonePrefix: '+32',
    currency: 'EUR',
    phoneDigitCount: 9,
  },
  {
    code: 'BG',
    flag: '🇧🇬',
    name: 'Bulgaria',
    phonePrefix: '+359',
    currency: 'BGN',
    phoneDigitCount: 9,
  },
  {
    code: 'HR',
    flag: '🇭🇷',
    name: 'Croatia',
    phonePrefix: '+385',
    currency: 'HRK',
    phoneDigitCount: 9,
  },
  {
    code: 'CY',
    flag: '🇨🇾',
    name: 'Cyprus',
    phonePrefix: '+357',
    currency: 'EUR',
    phoneDigitCount: 8,
  },
  {
    code: 'CZ',
    flag: '🇨🇿',
    name: 'Czech Republic',
    phonePrefix: '+420',
    currency: 'CZK',
    phoneDigitCount: 9,
  },
  {
    code: 'DK',
    flag: '🇩🇰',
    name: 'Denmark',
    phonePrefix: '+45',
    currency: 'DKK',
    phoneDigitCount: 8,
  },
  {
    code: 'EE',
    flag: '🇪🇪',
    name: 'Estonia',
    phonePrefix: '+372',
    currency: 'EUR',
    phoneDigitCount: 8,
  },
  {
    code: 'FI',
    flag: '🇫🇮',
    name: 'Finland',
    phonePrefix: '+358',
    currency: 'EUR',
    phoneDigitCount: 9,
  },
  {
    code: 'FR',
    flag: '🇫🇷',
    name: 'France',
    phonePrefix: '+33',
    currency: 'EUR',
    phoneDigitCount: 9,
  },
  {
    code: 'DE',
    flag: '🇩🇪',
    name: 'Germany',
    phonePrefix: '+49',
    currency: 'EUR',
    phoneDigitCount: 10,
  },
  {
    code: 'GR',
    flag: '🇬🇷',
    name: 'Greece',
    phonePrefix: '+30',
    currency: 'EUR',
    phoneDigitCount: 10,
  },
  {
    code: 'HU',
    flag: '🇭🇺',
    name: 'Hungary',
    phonePrefix: '+36',
    currency: 'HUF',
    phoneDigitCount: 9,
  },
  {
    code: 'IE',
    flag: '🇮🇪',
    name: 'Ireland',
    phonePrefix: '+353',
    currency: 'EUR',
    phoneDigitCount: 9,
  },
  {
    code: 'IT',
    flag: '🇮🇹',
    name: 'Italy',
    phonePrefix: '+39',
    currency: 'EUR',
    phoneDigitCount: 10,
  },
  {
    code: 'LV',
    flag: '🇱🇻',
    name: 'Latvia',
    phonePrefix: '+371',
    currency: 'EUR',
    phoneDigitCount: 8,
  },
  {
    code: 'LT',
    flag: '🇱🇹',
    name: 'Lithuania',
    phonePrefix: '+370',
    currency: 'EUR',
    phoneDigitCount: 8,
  },
  {
    code: 'LU',
    flag: '🇱🇺',
    name: 'Luxembourg',
    phonePrefix: '+352',
    currency: 'EUR',
    phoneDigitCount: 9,
  },
  {
    code: 'MT',
    flag: '🇲🇹',
    name: 'Malta',
    phonePrefix: '+356',
    currency: 'EUR',
    phoneDigitCount: 8,
  },
  {
    code: 'NL',
    flag: '🇳🇱',
    name: 'Netherlands',
    phonePrefix: '+31',
    currency: 'EUR',
    phoneDigitCount: 9,
  },
  {
    code: 'PL',
    flag: '🇵🇱',
    name: 'Poland',
    phonePrefix: '+48',
    currency: 'PLN',
    phoneDigitCount: 9,
  },
  {
    code: 'PT',
    flag: '🇵🇹',
    name: 'Portugal',
    phonePrefix: '+351',
    currency: 'EUR',
    phoneDigitCount: 9,
  },
  {
    code: 'RO',
    flag: '🇷🇴',
    name: 'Romania',
    phonePrefix: '+40',
    currency: 'RON',
    phoneDigitCount: 9,
  },
  {
    code: 'SK',
    flag: '🇸🇰',
    name: 'Slovakia',
    phonePrefix: '+421',
    currency: 'EUR',
    phoneDigitCount: 9,
  },
  {
    code: 'SI',
    flag: '🇸🇮',
    name: 'Slovenia',
    phonePrefix: '+386',
    currency: 'EUR',
    phoneDigitCount: 8,
  },
  {
    code: 'ES',
    flag: '🇪🇸',
    name: 'Spain',
    phonePrefix: '+34',
    currency: 'EUR',
    phoneDigitCount: 9,
  },
  {
    code: 'SE',
    flag: '🇸🇪',
    name: 'Sweden',
    phonePrefix: '+46',
    currency: 'SEK',
    phoneDigitCount: 9,
  },
];
