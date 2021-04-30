import { KEYS } from './constants';

const hasOneDigit = /^\d$/;
function hasDecimals(decimalPlaces) {
	return new RegExp(`^\\d+\\.\\d{${decimalPlaces}}$`, 'g');
}

export default function createKeypadRule(
	{ decimalSeparator = null, decimals = null } = { decimalSeparator: null, decimals: null }
) {
	return function handler(currentAmount, inputKey) {
		switch (inputKey) {
			case KEYS.PERIOD: {
				if (!decimalSeparator || decimals === 0) {
					return currentAmount;
				}
				if (currentAmount.includes(decimalSeparator)) {
					return currentAmount;
				}
				if (currentAmount === '0') {
					return `${currentAmount}${decimalSeparator}`;
				}

				return `${currentAmount}.`;
			}
			case KEYS.BACK: {
				if (currentAmount === '0') {
					return currentAmount;
				}
				if (hasOneDigit.test(currentAmount)) {
					return '0';
				}

				return currentAmount.slice(0, -1);
			}
			case KEYS.INITIAL: {
				return '0';
			}
			case KEYS.DIGIT_0: {
				if (currentAmount === '0') {
					return currentAmount;
				}
				if (hasDecimals(decimals).test(currentAmount)) {
					return currentAmount;
				}

				return `${currentAmount}${inputKey}`;
			}
			case KEYS.DIGIT_1:
			case KEYS.DIGIT_2:
			case KEYS.DIGIT_3:
			case KEYS.DIGIT_4:
			case KEYS.DIGIT_5:
			case KEYS.DIGIT_6:
			case KEYS.DIGIT_7:
			case KEYS.DIGIT_8:
			case KEYS.DIGIT_9: {
				if (currentAmount === '0') {
					return inputKey;
				}
				if (hasDecimals(2).test(currentAmount)) {
					return currentAmount;
				}

				return `${currentAmount}${inputKey}`;
			}
			default: {
				return currentAmount;
			}
		}
	};
}
