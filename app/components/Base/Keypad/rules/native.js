import { KEYS } from '../constants';

const hasOneDigit = /^\d$/;

function handleInput(currentAmount, inputKey) {
	switch (inputKey) {
		case KEYS.PERIOD: {
			if (currentAmount === '0') {
				return `${currentAmount}.`;
			}
			if (currentAmount.includes('.')) {
				return currentAmount;
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

			return `${currentAmount}${inputKey}`;
		}
		default: {
			return currentAmount;
		}
	}
}

export default handleInput;
