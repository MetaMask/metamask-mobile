import React, { Component } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import Identicon from '../Identicon';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.concrete
	},
	row: {
		backgroundColor: colors.white,
		flex: 1,
		padding: 15,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: colors.borderColor
	},
	date: {
		color: colors.fontSecondary,
		fontSize: 12,
		marginBottom: 10,
		...fontStyles.normal
	},
	info: {
		flex: 1,
		marginLeft: 15
	},
	address: {
		fontSize: 15,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	status: {
		color: colors.fontSecondary,
		fontSize: 12,
		...fontStyles.normal
	},
	amount: {
		fontSize: 15,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	amountFiat: {
		fontSize: 12,
		color: colors.fontSecondary,
		...fontStyles.normal
	},
	amounts: {
		alignItems: 'flex-end'
	},
	subRow: {
		flexDirection: 'row'
	}
});

/**
 * View that renders a list of transactions for a specific asset
 */
export default class Transactions extends Component {
	transactions = [
		{
			id: '0x45f9758855577311c91e49bc8b005a694f7f007d324290f046571819b8903a86',
			date: 'July 22 2018 22:34',
			to: '0xf4F6A831...21D8',
			status: 'Confirmed',
			amount: '0.0001',
			amountFiat: '0.47'
		},
		{
			id: '0xed0ef23798d23b29e91c54508a31fcb03992825ba003c769fc6c219b0b9ec0f3',
			date: 'July 13 2018 18:17',
			to: '0xb1690C08...7d8C',
			status: 'Confirmed',
			amount: '0.003',
			amountFiat: '1.41'
		}
	];

	render() {
		return (
			<ScrollView style={styles.wrapper}>
				{this.transactions.map(tx => (
					<View style={styles.row} key={`tx-${tx.id}`}>
						<Text style={styles.date}>{tx.date}</Text>
						<View style={styles.subRow}>
							<Identicon address={tx.to} diameter={24} />
							<View style={styles.info}>
								<Text style={styles.address}>{tx.to}</Text>
								<Text style={styles.status}>{tx.status}</Text>
							</View>
							<View style={styles.amounts}>
								<Text style={styles.amount}>{tx.amount} ETH</Text>
								<Text style={styles.amountFiat}>{tx.amountFiat} USD</Text>
							</View>
						</View>
					</View>
				))}
			</ScrollView>
		);
	}
}
