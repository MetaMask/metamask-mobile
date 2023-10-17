import createKeypadRule from './createKeypadRule';

export const KEYS = {
  DIGIT_1: '1',
  DIGIT_2: '2',
  DIGIT_3: '3',
  DIGIT_4: '4',
  DIGIT_5: '5',
  DIGIT_6: '6',
  DIGIT_7: '7',
  DIGIT_8: '8',
  DIGIT_9: '9',
  DIGIT_0: '0',
  PERIOD: 'PERIOD',
  BACK: 'BACK',
  INITIAL: 'INITIAL',
};

export const CURRENCIES = {
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
