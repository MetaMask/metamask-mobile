import React, { Component } from 'react';
import PropTypes from 'prop-types';
import QRCode from 'react-native-qrcode';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { weiToFiat, hexToBN } from '../../util/number';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		height: 130,
		paddingTop: 20,
		paddingHorizontal: 20,
		paddingBottom: 0
	},
	row: {
		flex: 1,
		flexDirection: 'row'
	},
	left: {
		flex: 1
	},
	right: {
		flex: 0,
		alignItems: 'flex-end',
		paddingTop: 5
	},

	label: {
		paddingTop: 7,
		fontSize: 20,
		...fontStyles.normal
	},
	amountFiat: {
		flex: 1,
		fontSize: 43,
		lineHeight: 43,
		paddingTop: 15,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	address: {
		flex: 1,
		marginTop: 10,
		fontSize: 12,
		...fontStyles.normal
	}
});

/**
 * View that's part of the <Wallet /> component
 * which shows information about the selected account
 */
export default class AccountOverview extends Component {
	static propTypes = {
		/**
		 * Object that represents the selected account
		 */
		account: PropTypes.object,
		/**
		 * ETH to current currency conversion rate
		 */
		conversionRate: PropTypes.number,
		/**
		 * Currency code of the currently-active currency
		 */
		currentCurrency: PropTypes.string,
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object
	};
	onDeposit = () => true;
	onSend = () => true;

	goToAccountDetails = () => {
		this.props.navigation.push('AccountDetails');
	};

	render() {
		const {
			account: { name, balance, address },
			conversionRate,
			currentCurrency
		} = this.props;

		if (!address) return null;

		return (
			<View style={styles.wrapper} testID={'account-overview'}>
				<View style={styles.row}>
					<View style={styles.left}>
						<Text style={styles.label}>{name}</Text>
						<Text style={styles.amountFiat}>
							{weiToFiat(hexToBN(balance), conversionRate, currentCurrency).toUpperCase()}
						</Text>
					</View>
					<View style={styles.right}>
						<TouchableOpacity onPress={this.goToAccountDetails} testID={'account-qr-button'}>
							<QRCode value={address} size={60} bgColor={colors.fontPrimary} fgColor={colors.white} />
							<Text style={styles.address}>{`${address.substr(0, 4)}...${address.substr(-4)}`}</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		);
	}
}
