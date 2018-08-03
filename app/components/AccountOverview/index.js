import React, { Component } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import QRCode from 'react-native-qrcode';

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
		alignItems: 'flex-end'
	},

	label: {
		fontSize: 15,
		...fontStyles.normal
	},
	amount: {
		flex: 1,
		marginTop: 10,
		fontSize: 15,
		...fontStyles.normal
	},
	amountFiat: {
		flex: 1,
		fontSize: 40,
		lineHeight: 40,
		paddingTop: 10,
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
	state = {
		address: '0xe7E125654064EEa56229f273dA586F10DF96B0a1'
	};
	onDeposit = () => true;
	onSend = () => true;

	render() {
		return (
			<View style={styles.wrapper}>
				<View style={styles.row}>
					<View style={styles.left}>
						<Text style={styles.label}>Account 1</Text>
						<Text style={styles.amountFiat}>$1.95</Text>
						<Text style={styles.amount}>0.04 ETH</Text>
					</View>
					<View style={styles.right}>
						<QRCode
							value={this.state.address}
							size={70}
							bgColor={colors.fontPrimary}
							fgColor={colors.white}
						/>
						<Text style={styles.address}>0xe7...6B0a1</Text>
					</View>
				</View>
			</View>
		);
	}
}
