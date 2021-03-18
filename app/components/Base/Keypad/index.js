import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import Keypad from './components';
import rules from './rules';

// TODO: get displayable keys from the currency (eg: a comma instead of a period)

export const Keys = {
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

function KeypadComponent({ onChange, value, currency }) {
	const handler = useMemo(() => rules[currency?.toLowerCase() || 'native'] || rules.native, [currency]);
	const handleKeypadPress = useCallback(
		newInput => {
			const newValue = handler(value, newInput);
			onChange(newValue, newInput);
		},
		[handler, onChange, value]
	);
	const handleKeypadPress1 = useCallback(() => handleKeypadPress(Keys.DIGIT_1), [handleKeypadPress]);
	const handleKeypadPress2 = useCallback(() => handleKeypadPress(Keys.DIGIT_2), [handleKeypadPress]);
	const handleKeypadPress3 = useCallback(() => handleKeypadPress(Keys.DIGIT_3), [handleKeypadPress]);
	const handleKeypadPress4 = useCallback(() => handleKeypadPress(Keys.DIGIT_4), [handleKeypadPress]);
	const handleKeypadPress5 = useCallback(() => handleKeypadPress(Keys.DIGIT_5), [handleKeypadPress]);
	const handleKeypadPress6 = useCallback(() => handleKeypadPress(Keys.DIGIT_6), [handleKeypadPress]);
	const handleKeypadPress7 = useCallback(() => handleKeypadPress(Keys.DIGIT_7), [handleKeypadPress]);
	const handleKeypadPress8 = useCallback(() => handleKeypadPress(Keys.DIGIT_8), [handleKeypadPress]);
	const handleKeypadPress9 = useCallback(() => handleKeypadPress(Keys.DIGIT_9), [handleKeypadPress]);
	const handleKeypadPress0 = useCallback(() => handleKeypadPress(Keys.DIGIT_0), [handleKeypadPress]);
	const handleKeypadPressPeriod = useCallback(() => handleKeypadPress(Keys.PERIOD), [handleKeypadPress]);
	const handleKeypadPressBack = useCallback(() => handleKeypadPress(Keys.BACK), [handleKeypadPress]);
	const handleKeypadLongPressBack = useCallback(() => handleKeypadPress(Keys.INITIAL), [handleKeypadPress]);

	return (
		<Keypad>
			<Keypad.Row>
				<Keypad.Button onPress={handleKeypadPress1}>1</Keypad.Button>
				<Keypad.Button onPress={handleKeypadPress2}>2</Keypad.Button>
				<Keypad.Button onPress={handleKeypadPress3}>3</Keypad.Button>
			</Keypad.Row>
			<Keypad.Row>
				<Keypad.Button onPress={handleKeypadPress4}>4</Keypad.Button>
				<Keypad.Button onPress={handleKeypadPress5}>5</Keypad.Button>
				<Keypad.Button onPress={handleKeypadPress6}>6</Keypad.Button>
			</Keypad.Row>
			<Keypad.Row>
				<Keypad.Button onPress={handleKeypadPress7}>7</Keypad.Button>
				<Keypad.Button onPress={handleKeypadPress8}>8</Keypad.Button>
				<Keypad.Button onPress={handleKeypadPress9}>9</Keypad.Button>
			</Keypad.Row>
			<Keypad.Row>
				<Keypad.Button onPress={handleKeypadPressPeriod}>.</Keypad.Button>
				<Keypad.Button onPress={handleKeypadPress0}>0</Keypad.Button>
				<Keypad.DeleteButton
					onPress={handleKeypadPressBack}
					onLongPress={handleKeypadLongPressBack}
					delayLongPress={500}
				/>
			</Keypad.Row>
		</Keypad>
	);
}

KeypadComponent.propTypes = {
	/**
	 * Function that will be called when a key is pressed with arguments `(value, key)`
	 */
	onChange: PropTypes.func,
	/**
	 * Currency code for the keypad rules and symbols. Defaults to native
	 */
	currency: PropTypes.string,
	/**
	 * Current value used to create new value when a key is pressed.
	 */
	value: PropTypes.string
};

export default KeypadComponent;
