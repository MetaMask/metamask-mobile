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
	default: {
		handler: createKeypadRule({ decimalSeparator: '.' }),
		symbol: null,
		decimalSeparator: '.'
	},
	native: {
		handler: createKeypadRule({ decimalSeparator: '.' }),
		symbol: null,
		decimalSeparator: '.'
	},
	USD: {
		handler: createKeypadRule({ decimalSeparator: '.', decimals: 2 }),
		symbol: '$',
		decimalSeparator: '.'
	},
	JPY: {
		handler: createKeypadRule({ decimalSeparator: null }),
		symbol: '¥',
		decimalSeparator: null
	},
	CLP: {
		handler: createKeypadRule({ decimalSeparator: null }),
		symbol: '$',
		decimalSeparator: null
	}
};
