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
	INITIAL: 'INITIAL'
};

export const CURRENCIES = {
	AUD: {
		decimalSeparator: '.',
		handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
		symbol: '$'
	},
	CLP: {
		decimalSeparator: null,
		handler: createKeypadRule({ decimalSeparator: null }),
		symbol: '$'
	},
	default: {
		decimalSeparator: '.',
		handler: createKeypadRule({ decimalSeparator: '.' }),
		symbol: null
	},
	EUR: {
		decimalSeparator: ',',
		handler: createKeypadRule({ decimalSeparator: ',', decimals: 2 }),
		symbol: '€'
	},
	GBP: {
		decimalSeparator: '.',
		handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
		symbol: '£'
	},
	JPY: {
		decimalSeparator: null,
		handler: createKeypadRule({ decimalSeparator: null }),
		symbol: '¥'
	},
	native: {
		decimalSeparator: '.',
		handler: createKeypadRule({ decimalSeparator: '.' }),
		symbol: null
	},
	USD: {
		decimalSeparator: '.',
		handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
		symbol: '$'
	}
};
