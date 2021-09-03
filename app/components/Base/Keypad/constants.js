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
	CLP: {
		decimalSeparator: null,
		handler: createKeypadRule({ decimalSeparator: null }),
		symbol: '$',
	},
	CZK: {
		decimalSeparator: '.',
		handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
		symbol: 'Kč',
	},
	default: {
		decimalSeparator: '.',
		handler: createKeypadRule({ decimalSeparator: '.' }),
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
	ISK: {
		decimalSeparator: '.',
		handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
		symbol: 'kr',
	},
	JPY: {
		decimalSeparator: null,
		handler: createKeypadRule({ decimalSeparator: null }),
		symbol: '¥',
	},
	native: {
		decimalSeparator: '.',
		handler: createKeypadRule({ decimalSeparator: '.' }),
		symbol: null,
	},
	NOK: {
		decimalSeparator: '.',
		handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
		symbol: 'kr',
	},
	NZD: {
		decimalSeparator: '.',
		handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
		symbol: '$',
	},
	PLN: {
		decimalSeparator: '.',
		handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
		symbol: 'zł',
	},
	SGD: {
		decimalSeparator: '.',
		handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
		symbol: '$',
	},
	SEK: {
		decimalSeparator: '.',
		handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
		symbol: 'kr',
	},
	CHF: {
		decimalSeparator: '.',
		handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
		symbol: 'Fr',
	},
	USD: {
		decimalSeparator: '.',
		handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
		symbol: '$',
	},
};
