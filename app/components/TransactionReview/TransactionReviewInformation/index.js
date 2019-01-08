import React, { Component } from 'react';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import PropTypes from 'prop-types';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import { toBN, isBN, weiToFiat, fromWei, weiToFiatNumber, balanceToFiatNumber } from '../../../util/number';
import { strings } from '../../../../locales/i18n';

const styles = StyleSheet.create({
	overview: {
		paddingHorizontal: 16,
		borderTopWidth: 1,
		borderColor: colors.lightGray
	},
	overviewRow: {
		alignItems: 'center',
		flexDirection: 'row',
		paddingVertical: 15
	},
	overviewAlert: {
		alignItems: 'center',
		backgroundColor: colors.lightRed,
		borderColor: colors.borderRed,
		borderRadius: 4,
		borderWidth: 1,
		flexDirection: 'row',
		height: 32,
		paddingHorizontal: 16
	},
	overviewAlertText: {
		...fontStyles.normal,
		color: colors.borderRed,
		flex: 1,
		fontSize: 12,
		marginLeft: 8
	},
	overviewAlertIcon: {
		color: colors.borderRed,
		flex: 0
	},
	topOverviewRow: {
		borderBottomWidth: 1,
		borderColor: colors.lightGray
	},
	overviewLabel: {
		...fontStyles.bold,
		color: colors.gray,
		flex: 1,
		fontSize: 12
	},
	overviewFiat: {
		...fontStyles.bold,
		color: colors.copy,
		fontSize: 24,
		textAlign: 'right'
	},
	overviewAccent: {
		color: colors.primary
	},
	overviewEth: {
		...fontStyles.normal,
		color: colors.subtleGray,
		fontSize: 16,
		textAlign: 'right'
	},
	overviewInfo: {
		...fontStyles.normal,
		fontSize: 12,
		marginBottom: 6,
		textAlign: 'right'
	},
	overviewAction: {
		...fontStyles.nold,
		color: colors.primary
	}
});

/**
 * Component that supports reviewing a transaction information
 */
class TransactionReviewInformation extends Component {
	static propTypes = {
		/**
		 * ETH to current currency conversion rate
		 */
		conversionRate: PropTypes.number,
		/**
		 * Currency code of the currently-active currency
		 */
		currentCurrency: PropTypes.string,
		/**
		 * Transaction object associated with this transaction
		 */
		transactionData: PropTypes.object,
		/**
		 * Object containing token exchange rates in the format address => exchangeRate
		 */
		contractExchangeRates: PropTypes.object,
		/**
		 * Callback for transaction edition
		 */
		edit: PropTypes.func
	};

	state = {
		toFocused: false,
		amountError: '',
		actionKey: strings('transactions.tx_review_confirm')
	};

	getTotalAmount = (totalGas, amount, conversionRate, exchangeRate, currentCurrency) => {
		let total = 0;
		const gasFeeFiat = weiToFiatNumber(totalGas, conversionRate);
		let balanceFiat;
		if (exchangeRate) {
			balanceFiat = balanceToFiatNumber(parseFloat(amount), conversionRate, exchangeRate);
		} else {
			balanceFiat = weiToFiatNumber(amount, conversionRate, exchangeRate);
		}
		total = parseFloat(gasFeeFiat) + parseFloat(balanceFiat);
		return `${total} ${currentCurrency.toUpperCase()}`;
	};

	edit = () => {
		const { edit } = this.props;
		edit && edit();
	};

	render = () => {
		const {
			transactionData: { amount, gas, gasPrice, asset },
			currentCurrency,
			conversionRate,
			contractExchangeRates
		} = this.props;
		const conversionRateAsset = asset ? contractExchangeRates[asset.address] : undefined;
		const { amountError } = this.state;
		const totalGas = isBN(gas) && isBN(gasPrice) ? gas.mul(gasPrice) : toBN('0x0');
		const ethTotal = isBN(amount) && !asset ? amount.add(totalGas) : totalGas;
		const assetAmount = isBN(amount) && asset ? fromWei(amount) : undefined;
		return (
			<View style={styles.overview}>
				<View style={{ ...styles.overviewRow, ...styles.topOverviewRow }}>
					<Text style={styles.overviewLabel}>{strings('transaction.gas_fee').toUpperCase()}</Text>
					<View style={styles.overviewContent}>
						<TouchableOpacity onPress={this.edit}>
							<Text style={{ ...styles.overviewInfo, ...styles.overviewAction }}>
								{strings('transaction.edit').toUpperCase()}
							</Text>
						</TouchableOpacity>
						<Text style={styles.overviewFiat}>
							{weiToFiat(totalGas, conversionRate, currentCurrency).toUpperCase()}
						</Text>
						<Text style={styles.overviewEth}>
							{fromWei(totalGas).toString()} {strings('unit.eth')}
						</Text>
					</View>
				</View>

				<View style={styles.overviewRow}>
					<Text style={styles.overviewLabel}>{strings('transaction.total').toUpperCase()}</Text>
					<View style={styles.overviewContent}>
						<Text style={styles.overviewInfo}>
							{strings('transaction.amount').toUpperCase()} +{' '}
							{strings('transaction.gas_fee').toUpperCase()}
						</Text>
						<Text style={{ ...styles.overviewFiat, ...styles.overviewAccent }}>
							{this.getTotalAmount(
								totalGas,
								asset ? assetAmount : ethTotal,
								conversionRate,
								conversionRateAsset,
								currentCurrency
							)}
						</Text>

						<Text style={styles.overviewEth}>
							{asset && assetAmount} {asset && asset.symbol} {asset && ' + '}
							{fromWei(ethTotal).toString()} {strings('unit.eth')}
						</Text>
					</View>
				</View>
				{amountError ? (
					<View style={styles.overviewAlert}>
						<MaterialIcon name={'error'} size={20} style={styles.overviewAlertIcon} />
						<Text style={styles.overviewAlertText}>
							{strings('transaction.alert')}: {amountError}.
						</Text>
					</View>
				) : null}
			</View>
		);
	};
}

const mapStateToProps = state => ({
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates
});

export default connect(mapStateToProps)(TransactionReviewInformation);
