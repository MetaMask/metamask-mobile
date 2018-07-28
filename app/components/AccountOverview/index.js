import React, { Component } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../styles/common';
import Button from '../Button';
import Image from 'react-native-remote-svg';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import FoundationIcon from 'react-native-vector-icons/Foundation';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		padding: 20,
		alignItems: 'center'
	},
	profile: {
		flex: 1,
		flexDirection: 'row',
		marginBottom: 20,
		marginTop: 10
	},
	ethLogo: {
		flex: 1,
		textAlign: 'center',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 500,
		padding: 15,
		marginBottom: 10,
		width: 80,
		height: 70,
		backgroundColor: colors.white,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: colors.borderColor
	},
	ethLogoImage: {
		width: 60,
		height: 60
	},
	balance: {
		flex: 1,
		alignItems: 'center',
		marginTop: 10,
		marginBottom: 10
	},
	buttons: {
		flex: 1,
		flexDirection: 'row',
		marginTop: 30
	},
	accountInfo: {
		alignItems: 'center'
	},
	label: {
		fontSize: 25
	},
	address: {},
	amount: {
		fontSize: 30
	},
	amountFiat: {
		fontSize: 18,
		color: colors.fontSecondary
	},
	button: {
		color: colors.white,
		flex: 1,
		flexDirection: 'row'
	},
	leftButton: {
		marginRight: 10
	},
	rightButton: {
		marginLeft: 10
	},
	buttonText: {
		marginLeft: 10,
		fontSize: 15,
		fontWeight: 'bold',
		color: colors.white
	}
});

export default class AccountOverview extends Component {
	onDeposit = () => true;
	onSend = () => true;

	render() {
		return (
			<LinearGradient colors={[colors.slate, colors.white]} style={styles.wrapper}>
				<View style={styles.profile}>
					<View style={styles.accountInfo}>
						<Text style={styles.label}>Account 1</Text>
						<Text style={styles.address}>0x12...1234</Text>
					</View>
				</View>
				<View style={styles.ethLogo}>
					<Image source={require('../../images/eth-logo.svg')} style={styles.ethLogoImage} />
				</View>
				<View style={styles.balance}>
					<Text style={styles.amount}>0.04 ETH</Text>
					<Text style={styles.amountFiat}>$1.95</Text>
				</View>
				<View style={styles.buttons}>
					<Button onPress={this.onDeposit} styles={[styles.button, styles.leftButton]}>
						<FoundationIcon name={'dollar'} size={20} color={colors.white} />
						<Text style={styles.buttonText}>DEPOSIT</Text>
					</Button>
					<Button onPress={this.onSend} styles={[styles.button, styles.rightButton]}>
						<MaterialIcon name={'send'} size={15} color={colors.white} />
						<Text style={styles.buttonText}>SEND</Text>
					</Button>
				</View>
			</LinearGradient>
		);
	}
}
