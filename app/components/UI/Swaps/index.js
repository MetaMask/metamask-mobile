import React, { useCallback, useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { connect } from 'react-redux';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import handleInput from '../../Base/Keypad/rules/native';
import Device from '../../../util/Device';

import { colors, fontStyles } from '../../../styles/common';
import { getSwapsAmountNavbar } from '../Navbar';
import Text from '../../Base/Text';
import Keypad from '../../Base/Keypad';
import ScreenView from '../FiatOrders/components/ScreenView';
import StyledButton from '../StyledButton';
import TokenSelectButton from './components/TokenSelectButton';

const styles = StyleSheet.create({
	screen: {
		flexGrow: 1,
		justifyContent: 'space-between'
	},
	content: {
		flexGrow: 1,
		justifyContent: 'center'
	},
	keypad: {
		flexGrow: 1,
		justifyContent: 'space-around'
	},
	tokenButtonContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		margin: Device.isIphone5() ? 5 : 10
	},
	amountContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		marginHorizontal: 25
	},
	amount: {
		...fontStyles.light,
		color: colors.black,
		textAlignVertical: 'center',
		fontSize: Device.isIphone5() ? 30 : 40,
		height: Device.isIphone5() ? 40 : 50
	},
	horizontalRuleContainer: {
		flexDirection: 'row',
		paddingHorizontal: 30,
		marginVertical: Device.isIphone5() ? 5 : 10,
		alignItems: 'center'
	},
	horizontalRule: {
		flex: 1,
		borderBottomWidth: StyleSheet.hairlineWidth,
		height: 1,
		borderBottomColor: colors.grey100
	},
	arrowDown: {
		color: colors.blue,
		fontSize: 25,
		marginHorizontal: 15
	},
	buttonsContainer: {
		marginTop: Device.isIphone5() ? 10 : 30,
		marginBottom: 5,
		paddingHorizontal: 30,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between'
	},
	column: {
		flex: 1
	},
	disabledSlippage: {
		color: colors.grey300
	},
	ctaContainer: {
		flexDirection: 'row',
		justifyContent: 'flex-end'
	},
	cta: {
		paddingHorizontal: Device.isIphone5() ? 10 : 20
	}
});

function SwapsAmountView() {
	// const navigation = useContext(NavigationContext);
	const [amount, setAmount] = useState('0');
	const handleKeypadPress = useCallback(
		newInput => {
			const newAmount = handleInput(amount, newInput);
			if (newAmount === amount) {
				return;
			}

			setAmount(newAmount);
		},
		[amount]
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
		<ScreenView contentContainerStyle={styles.screen}>
			<View style={styles.content}>
				<View style={styles.tokenButtonContainer}>
					<TokenSelectButton />
				</View>
				<View style={styles.amountContainer}>
					<Text style={[styles.amount]} numberOfLines={1} adjustsFontSizeToFit allowFontScaling>
						{amount}
					</Text>
					<Text>100 ETH available to swap.</Text>
				</View>
				<View style={styles.horizontalRuleContainer}>
					<View style={styles.horizontalRule} />
					<IonicIcon style={styles.arrowDown} name="md-arrow-down" />

					<View style={styles.horizontalRule} />
				</View>
				<View style={styles.tokenButtonContainer}>
					<TokenSelectButton />
				</View>
			</View>
			<View style={styles.keypad}>
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
				<View style={styles.buttonsContainer}>
					<View style={styles.column}>
						<TouchableOpacity disabled>
							<Text bold style={styles.disabledSlippage}>
								Max slippage 1%
							</Text>
						</TouchableOpacity>
					</View>
					<View style={styles.column}>
						<View style={styles.ctaContainer}>
							<StyledButton type="blue" containerStyle={styles.cta}>
								Get quotes
							</StyledButton>
						</View>
					</View>
				</View>
			</View>
		</ScreenView>
	);
}

SwapsAmountView.navigationOptions = ({ navigation }) => getSwapsAmountNavbar(navigation);

export default connect()(SwapsAmountView);
