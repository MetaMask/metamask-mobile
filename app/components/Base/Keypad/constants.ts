import createKeypadRule from './createKeypadRule';

export enum Keys {
  Digit1 = '1',
  Digit2 = '2',
  Digit3 = '3',
  Digit4 = '4',
  Digit5 = '5',
  Digit6 = '6',
  Digit7 = '7',
  Digit8 = '8',
  Digit9 = '9',
  Digit0 = '0',
  Period = 'Period',
  Back = 'Back',
  Initial = 'Initial',
}

interface CurrencyConfig {
  decimalSeparator: string | null;
  handler: (currentAmount: string, inputKey: Keys) => string;
  symbol: string | null;
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  native: {
    decimalSeparator: '.',
    handler: createKeypadRule({ decimalSeparator: '.' }),
    symbol: null,
  },
  ARS: {
    decimalSeparator: ',',
    handler: createKeypadRule({ decimalSeparator: ',', decimals: 2 }),
    symbol: '$',
  },
  AUD: {
    decimalSeparator: '.',
    handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
    symbol: '$',
  },
  BRL: {
    decimalSeparator: '.',
    handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
    symbol: 'R$',
  },
  CAD: {
    decimalSeparator: '.',
    handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
    symbol: '$',
  },
  CHF: {
    decimalSeparator: '.',
    handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
    symbol: 'Fr',
  },
  CLP: {
    decimalSeparator: null,
    handler: createKeypadRule({ decimalSeparator: null }),
    symbol: '$',
  },
  CNY: {
    decimalSeparator: '.',
    handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
    symbol: '¥',
  },
  COP: {
    decimalSeparator: '.',
    handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
    symbol: '$',
  },
  CZK: {
    decimalSeparator: '.',
    handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
    symbol: 'Kč',
  },
  default: {
    decimalSeparator: null,
    handler: createKeypadRule({ decimalSeparator: null }),
    symbol: null,
  },
  DKK: {
    decimalSeparator: '.',
    handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
    symbol: 'kr',
  },
  EUR: {
    decimalSeparator: ',',
    handler: createKeypadRule({ decimalSeparator: ',', decimals: 2 }),
    symbol: '€',
  },
  GBP: {
    decimalSeparator: '.',
    handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
    symbol: '£',
  },
  HKD: {
    decimalSeparator: '.',
    handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
    symbol: '$',
  },
  ILS: {
    decimalSeparator: '.',
    handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
    symbol: '₪',
  },
  INR: {
    decimalSeparator: '.',
    handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
    symbol: 'Rs',
  },
  ISK: {
    decimalSeparator: null,
    handler: createKeypadRule({ decimalSeparator: null }),
    symbol: 'kr',
  },
  JPY: {
    decimalSeparator: null,
    handler: createKeypadRule({ decimalSeparator: null }),
    symbol: '¥',
  },
  KRW: {
    decimalSeparator: null,
    handler: createKeypadRule({ decimalSeparator: null }),
    symbol: '₩',
  },
  MXN: {
    decimalSeparator: '.',
    handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
    symbol: '$',
  },
  MYR: {
    decimalSeparator: '.',
    handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
    symbol: 'RM',
  },
  NOK: {
    decimalSeparator: ',',
    handler: createKeypadRule({ decimalSeparator: ',', decimals: 2 }),
    symbol: 'kr',
  },
  NZD: {
    decimalSeparator: '.',
    handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
    symbol: '$',
  },
  PHP: {
    decimalSeparator: '.',
    handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
    symbol: '₱',
  },
  PLN: {
    decimalSeparator: ',',
    handler: createKeypadRule({ decimalSeparator: ',', decimals: 2 }),
    symbol: 'zł',
  },
  SEK: {
    decimalSeparator: ',',
    handler: createKeypadRule({ decimalSeparator: ',', decimals: 2 }),
    symbol: 'kr',
  },
  SGD: {
    decimalSeparator: '.',
    handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
    symbol: '$',
  },
  THB: {
    decimalSeparator: '.',
    handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
    symbol: '฿',
  },
  USD: {
    decimalSeparator: '.',
    handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
    symbol: '$',
  },
  VND: {
    decimalSeparator: null,
    handler: createKeypadRule({ decimalSeparator: null }),
    symbol: '₫',
  },
  ZAR: {
    decimalSeparator: '.',
    handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
    symbol: 'R',
  },
};

export type CurrencyConfigType = typeof CURRENCIES;
export type CurrencyCode = keyof CurrencyConfigType;
