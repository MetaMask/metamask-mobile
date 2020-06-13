import React, { useContext, useState } from 'react';
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
		fontSize: 44
	},
	content: {
		flexGrow: 1,
		justifyContent: 'space-around'
	},
	quickAmounts: {
		flexDirection: 'row'
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
Keypad.Button = function KeypadButton({ children }) {
	return (
		<TouchableOpacity style={styles.keypadButton}>
			<Text style={styles.keypadButtonText}>{children}</Text>
		</TouchableOpacity>
	);
};

Keypad.Button.propTypes = {
	children: PropTypes.node
};

Keypad.DeleteButton = function DeleteButton(props) {
	return (
		<TouchableOpacity style={styles.keypadButton}>
			<IonicIcon style={[styles.keypadButtonText, styles.deleteIcon]} name="md-arrow-back" />
		</TouchableOpacity>
	);
};

function PaymentMethodApplePay(props) {
	const navigation = useContext(NavigationContext);
	const [amount, setAmount] = useState('0');
	const handleWyreTerms = useWyreTerms(navigation);

	const disabledButton = true;
	return (
		<View style={styles.screen}>
			<View>
				<AccountBar />
				<View style={styles.amountContainer}>
					<Text title style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
						${amount}
					</Text>
					<Text>= 0 ETH</Text>
				</View>
			</View>
			<View style={styles.content}>
				<View style={styles.quickAmounts}>
					<StyledButton type="normal">a</StyledButton>
					<StyledButton type="normal">a</StyledButton>
					<StyledButton type="normal">a</StyledButton>
				</View>
				<Keypad>
					<Keypad.Row>
						<Keypad.Button>1</Keypad.Button>
						<Keypad.Button>2</Keypad.Button>
						<Keypad.Button>3</Keypad.Button>
					</Keypad.Row>
					<Keypad.Row>
						<Keypad.Button>4</Keypad.Button>
						<Keypad.Button>5</Keypad.Button>
						<Keypad.Button>6</Keypad.Button>
					</Keypad.Row>
					<Keypad.Row>
						<Keypad.Button>7</Keypad.Button>
						<Keypad.Button>8</Keypad.Button>
						<Keypad.Button>9</Keypad.Button>
					</Keypad.Row>
					<Keypad.Row>
						<Keypad.Button>.</Keypad.Button>
						<Keypad.Button>0</Keypad.Button>
						<Keypad.DeleteButton />
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
