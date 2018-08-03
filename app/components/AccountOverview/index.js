import React, { Component } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import PropTypes from 'prop-types';
import QRCode from 'react-native-qrcode';
import { colors, fontStyles } from '../../styles/common';

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
		flex: 1,
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

export default class AccountOverview extends Component {
	static propTypes = {
		account: PropTypes.object
	};
	onDeposit = () => true;
	onSend = () => true;

	render() {
		const { account } = this.props;
		return (
			<View style={styles.wrapper}>
				<View style={styles.row}>
					<View style={styles.left}>
						<Text style={styles.label}>{account.label}</Text>
						<Text style={styles.amountFiat}>${account.balanceFiat}</Text>
					</View>
					<View style={styles.right}>
						<QRCode value={account.address} size={60} bgColor={colors.fontPrimary} fgColor={colors.white} />
						<Text style={styles.address}>{`${account.address.substr(0, 4)}...${account.address.substr(
							-4
						)}`}</Text>
					</View>
				</View>
			</View>
		);
	}
}
