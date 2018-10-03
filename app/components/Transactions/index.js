import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import Identicon from '../Identicon';
import { fromWei, weiToFiat, hexToBN } from '../../util/number';
import { renderShortAddress } from '../../util/address';

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
	static propTypes = {
		/**
		 * ETH to currnt currency conversion rate
		 */
		conversionRate: PropTypes.number,
		/**
		 * Currency code of the currently-active currency
		 */
		currentCurrency: PropTypes.string,
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object,
		/**
		 * An array of transactions objects
		 */
		transactions: PropTypes.array
	};

	viewOnEtherscan = (hash, networkId) => {
		const isRopsten = networkId === '3';
		const url = `https://${isRopsten ? 'ropsten.' : ''}etherscan.io/tx/${hash}`;
		this.props.navigation.navigate('BrowserView', {
			url
		});
	};

	render() {
		const { transactions, currentCurrency, conversionRate } = this.props;
		return (
			<ScrollView style={styles.wrapper}>
				<View testID={'transactions'}>
					{transactions.map(tx => (
						<TouchableOpacity
							style={styles.row}
							key={`tx-${tx.id}`}
							onPress={() => this.viewOnEtherscan(tx.hash, tx.metamaskNetworkId)} // eslint-disable-line react/jsx-no-bind
						>
							<Text style={styles.date}>{tx.submittedTime}</Text>
							<View style={styles.subRow}>
								<Identicon address={tx.txParams.to} diameter={24} />
								<View style={styles.info}>
									<Text style={styles.address}>{renderShortAddress(tx.txParams.to)}</Text>
									<Text style={styles.status}>{tx.status}</Text>
								</View>
								<View style={styles.amounts}>
									<Text style={styles.amount}>{fromWei(tx.txParams.value, 'ether')} ETH</Text>
									<Text style={styles.amountFiat}>
										{weiToFiat(
											hexToBN(tx.txParams.value),
											conversionRate,
											currentCurrency
										).toUpperCase()}
									</Text>
								</View>
							</View>
						</TouchableOpacity>
					))}
				</View>
			</ScrollView>
		);
	}
}
