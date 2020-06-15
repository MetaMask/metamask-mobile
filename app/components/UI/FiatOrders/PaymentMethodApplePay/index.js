import React, { useContext, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import { getPaymentMethodApplePayNavbar } from '../../Navbar';
import AccountBar from '../components/AccountBar';
import Text from '../components/Text';
import StyledButton from '../../StyledButton';
import { colors, fontStyles } from '../../../../styles/common';
import { NavigationContext } from 'react-navigation';
import { useWyreTerms } from '../orderProcessor/wyreApplePay';

//* styles and components  */

const styles = StyleSheet.create({
	screen: { flex: 1 },
	amountContainer: {
		margin: 10,
		padding: 15,
		alignItems: 'center',
		justifyContent: 'center'
	},
	amount: {
		fontFamily: 'Roboto-Light',
		fontWeight: fontStyles.light.fontWeight,
		color: colors.black,
		fontSize: 44,
		height: 52
	},
	amountError: {
		color: colors.red
	},
	content: {
		flexGrow: 1,
		justifyContent: 'space-around'
	},
	quickAmounts: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-around',
		marginHorizontal: 70
	},
	quickAmount: {
		borderRadius: 18,
		borderColor: colors.grey200,
		borderWidth: 1,
		paddingVertical: 5,
		paddingHorizontal: 8,
		alignItems: 'center',
		minWidth: 49
	},
	quickAmountSelected: {
		backgroundColor: colors.blue,
		borderColor: colors.blue
	},
	quickAmountSelectedText: {
		color: colors.white
	},
	keypad: {
		paddingHorizontal: 25
	},
	keypadRow: {
		flexDirection: 'row',
		justifyContent: 'space-around'
	},
	keypadButton: {
		paddingHorizontal: 20,
		paddingVertical: 15,
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	keypadButtonText: {
		fontFamily: 'Roboto',
		color: colors.black,
		textAlign: 'center',
		fontSize: 30
	},
	deleteIcon: {
		fontSize: 25,
		marginTop: 5
	},
	buttonContainer: {
		paddingBottom: 20
	},
	applePayButton: {
		backgroundColor: colors.black,
		padding: 10,
		margin: 10,
		marginHorizontal: 25,
		alignItems: 'center'
	},
	applePayButtonText: {
		color: colors.white
	},
	applePayButtonTextDisabled: {
		opacity: 0.6
	},
	applePayLogo: {
		marginLeft: 4
	},
	applePayLogoDisabled: {
		opacity: 0.6
	}
});

/* eslint-disable import/no-commonjs */
const ApplePayLogo = require('../images/ApplePayLogo.png');
const ApplePay = ({ disabled }) => (
	<Image source={ApplePayLogo} style={[styles.applePayLogo, disabled && styles.applePayLogoDisabled]} />
);

ApplePay.propTypes = {
	disabled: PropTypes.bool
};

const Keypad = props => <View style={styles.keypad} {...props} />;
Keypad.Row = function Row(props) {
	return <View style={styles.keypadRow} {...props} />;
};
Keypad.Button = function KeypadButton({ children, ...props }) {
	return (
		<TouchableOpacity style={styles.keypadButton} {...props}>
			<Text style={styles.keypadButtonText}>{children}</Text>
		</TouchableOpacity>
	);
};

Keypad.Button.propTypes = {
	children: PropTypes.node
};

Keypad.DeleteButton = function DeleteButton(props) {
	return (
		<TouchableOpacity style={styles.keypadButton} {...props}>
			<IonicIcon style={[styles.keypadButtonText, styles.deleteIcon]} name="md-arrow-back" />
		</TouchableOpacity>
	);
};

const QuickAmount = ({ amount, current, ...props }) => {
	const selected = amount === current;
	return (
		<TouchableOpacity style={[styles.quickAmount, selected && styles.quickAmountSelected]} {...props}>
			<Text bold={selected} style={[selected && styles.quickAmountSelectedText]}>
				${amount}
			</Text>
		</TouchableOpacity>
	);
};

QuickAmount.propTypes = {
	amount: PropTypes.string,
	current: PropTypes.string
};

//* Constants */

const quickAmounts = ['50', '100', '250'];
const minAmount = 5;
const maxAmount = 250;

const hasTwoDecimals = /^\d+\.\d{2}$/;
const hasZeroAsFirstDecimal = /^\d+\.0$/;
const hasZerosAsDecimals = /^\d+\.00$/;
const hasOneDigit = /^\d$/;
const hasPeriodWithoutDecimal = /^\d+\.$/;
const avoidZerosAsDecimals = false;

//* Handlers

const handleNewAmountInput = (currentAmount, newInput) => {
	switch (newInput) {
		case 'PERIOD': {
			if (currentAmount === '0') {
				return `${currentAmount}.`;
			}
			if (currentAmount.includes('.')) {
				// TODO: throw error for feedback?
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
			if (hasTwoDecimals.test(currentAmount)) {
				return currentAmount;
			}
			if (avoidZerosAsDecimals && hasZeroAsFirstDecimal.test(currentAmount)) {
				return currentAmount;
			}
			return `${currentAmount}${newInput}`;
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
				return newInput;
			}
			if (hasTwoDecimals.test(currentAmount)) {
				return currentAmount;
			}

			return `${currentAmount}${newInput}`;
		}
		default: {
			return currentAmount;
		}
	}
};

function PaymentMethodApplePay(props) {
	const navigation = useContext(NavigationContext);
	const [amount, setAmount] = useState('0');
	const roundAmount =
		hasZerosAsDecimals.test(amount) || hasZeroAsFirstDecimal.test(amount) || hasPeriodWithoutDecimal.test(amount)
			? amount.split('.')[0]
			: amount;
	const isUnderMinimum = Number(roundAmount) !== 0 && Number(roundAmount) < minAmount;
	const isOverMaximum = Number(roundAmount) > maxAmount;
	const disabledButton = amount === '0' || isUnderMinimum || isOverMaximum;

	const handleWyreTerms = useWyreTerms(navigation);
	const handleQuickAmountPress = useCallback(amount => setAmount(amount), []);
	const handleKeypadPress = useCallback(
		newInput => {
			if (isOverMaximum && newInput !== 'BACK') {
				return;
			}
			const newAmount = handleNewAmountInput(amount, newInput);
			if (newAmount === amount) {
				return;
			}

			setAmount(newAmount);
		},
		[amount, isOverMaximum]
	);
	const handleKeypadPress1 = useCallback(() => handleKeypadPress('1'), [handleKeypadPress]);
	const handleKeypadPress2 = useCallback(() => handleKeypadPress('2'), [handleKeypadPress]);
	const handleKeypadPress3 = useCallback(() => handleKeypadPress('3'), [handleKeypadPress]);
	const handleKeypadPress4 = useCallback(() => handleKeypadPress('4'), [handleKeypadPress]);
	const handleKeypadPress5 = useCallback(() => handleKeypadPress('5'), [handleKeypadPress]);
	const handleKeypadPress6 = useCallback(() => handleKeypadPress('6'), [handleKeypadPress]);
	const handleKeypadPress7 = useCallback(() => handleKeypadPress('7'), [handleKeypadPress]);
	const handleKeypadPress8 = useCallback(() => handleKeypadPress('8'), [handleKeypadPress]);
	const handleKeypadPress9 = useCallback(() => handleKeypadPress('9'), [handleKeypadPress]);
	const handleKeypadPress0 = useCallback(() => handleKeypadPress('0'), [handleKeypadPress]);
	const handleKeypadPressPeriod = useCallback(() => handleKeypadPress('PERIOD'), [handleKeypadPress]);
	const handleKeypadPressBack = useCallback(() => handleKeypadPress('BACK'), [handleKeypadPress]);

	return (
		<View style={styles.screen}>
			<View>
				<AccountBar />
				<View style={styles.amountContainer}>
					<Text
						title
						style={[styles.amount, isOverMaximum && styles.amountError]}
						numberOfLines={1}
						adjustsFontSizeToFit
					>
						${amount}
					</Text>
					{!(isUnderMinimum || isOverMaximum) && <Text>= 0 ETH</Text>}
					{isUnderMinimum && <Text>Minimum deposit is ${minAmount}</Text>}
					{isOverMaximum && <Text style={styles.amountError}>Maximum deposit is ${maxAmount}</Text>}
				</View>
				{quickAmounts.length > 0 && (
					<View style={styles.quickAmounts}>
						{quickAmounts.map(quickAmount => (
							<QuickAmount
								key={quickAmount}
								amount={quickAmount}
								current={roundAmount}
								// eslint-disable-next-line react/jsx-no-bind
								onPress={() => handleQuickAmountPress(quickAmount)}
							/>
						))}
					</View>
				)}
			</View>
			<View style={styles.content}>
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
						<Keypad.DeleteButton onPress={handleKeypadPressBack} />
					</Keypad.Row>
				</Keypad>

				<View style={styles.buttonContainer}>
					<StyledButton type="blue" disabled={disabledButton} containerStyle={styles.applePayButton}>
						<Text
							centered
							bold
							style={[styles.applePayButtonText, disabledButton && styles.applePayButtonTextDisabled]}
						>
							Buy with
						</Text>
						<ApplePay disabled={disabledButton} />
					</StyledButton>
					<Text centered>
						<Text bold>Fee ~2.9% + $0.30</Text> (0.35% goes to MetaMask)
					</Text>
					<TouchableOpacity onPress={handleWyreTerms}>
						<Text centered link>
							Wyre terms of service
						</Text>
					</TouchableOpacity>
				</View>
			</View>
		</View>
	);
}

PaymentMethodApplePay.navigationOptions = ({ navigation }) =>
	getPaymentMethodApplePayNavbar('Amount to buy', navigation);

export default PaymentMethodApplePay;
