const hasOneDigit = /^\d$/;

function handleInput(currentAmount, inputKey) {
	switch (inputKey) {
		case 'PERIOD': {
			if (currentAmount === '0') {
				return `${currentAmount}.`;
			}
			if (currentAmount.includes('.')) {
				return currentAmount;
			}

			return `${currentAmount}.`;
		}
		case 'BACK': {
			if (currentAmount === '0') {
				return currentAmount;
			}
			if (hasOneDigit.test(currentAmount)) {
				return '0';
			}

			return currentAmount.slice(0, -1);
		}
		case '0': {
			if (currentAmount === '0') {
				return currentAmount;
			}
			return `${currentAmount}${inputKey}`;
		}
		case '1':
		case '2':
		case '3':
		case '4':
		case '5':
		case '6':
		case '7':
		case '8':
		case '9': {
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
