import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { isBN, fromWei, weiToFiat, balanceToFiat } from '../../../util/number';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { connect } from 'react-redux';

const styles = StyleSheet.create({
	confirmBadge: {
		...fontStyles.normal,
		alignItems: 'center',
		borderColor: colors.subtleGray,
		borderRadius: 4,
		borderWidth: 1,
		color: colors.subtleGray,
		fontSize: 12,
		lineHeight: 22,
		textAlign: 'center',
		width: 74
	},
	summary: {
		backgroundColor: colors.beige,
		padding: 16
	},
	summaryFiat: {
		...fontStyles.normal,
		color: colors.copy,
		fontSize: 44,
		paddingVertical: 4
	},
	summaryEth: {
		...fontStyles.normal,
		color: colors.subtleGray,
		fontSize: 24
	},
	goBack: {
		alignItems: 'center',
		flexDirection: 'row',
		marginLeft: -8,
		marginTop: 8,
		position: 'relative',
		width: 150
	},
	goBackText: {
		...fontStyles.bold,
		color: colors.primary,
		fontSize: 22
	},
	goBackIcon: {
		color: colors.primary,
		flex: 0
	}
});

/**
 * Component that supports reviewing transaction summary
 */
class TransactionReviewSummary extends Component {
	static propTypes = {
		/**
		 * Transaction object associated with this transaction
		 */
		transactionData: PropTypes.object,
		/**
		 * ETH to current currency conversion rate
		 */
		conversionRate: PropTypes.number,
		/**
		 * Currency code of the currently-active currency
		 */
		currentCurrency: PropTypes.string,
		/**
		 * Object containing token exchange rates in the format address => exchangeRate
		 */
		contractExchangeRates: PropTypes.object,
		/**
		 * Transaction corresponding action key
		 */
		actionKey: PropTypes.string,
		/**
		 * Callback for transaction edition
		 */
		edit: PropTypes.func
	};

	getAssetConversion(asset, amount, conversionRate, exchangeRate, currentCurrency) {
		let convertedAmount;
		if (asset) {
			if (exchangeRate) {
				convertedAmount = balanceToFiat(
					parseFloat(amount) || 0,
					conversionRate,
					exchangeRate,
					currentCurrency
				).toUpperCase();
			} else {
				convertedAmount = strings('transaction.conversion_not_available');
			}
		} else {
			convertedAmount = weiToFiat(amount, conversionRate, currentCurrency).toUpperCase();
		}
		return convertedAmount;
	}

	edit = () => {
		const { edit } = this.props;
		edit && edit();
	};

	render = () => {
		const {
			transactionData: { amount, asset },
			currentCurrency,
			contractExchangeRates,
			actionKey
		} = this.props;
		const assetAmount = isBN(amount) && asset ? fromWei(amount) : undefined;
		const conversionRate = asset ? contractExchangeRates[asset.address] : this.props.conversionRate;
		return (
			<View style={styles.summary}>
				<Text style={styles.confirmBadge}>{actionKey}</Text>

				{!conversionRate ? (
					<Text style={styles.summaryFiat}>
						{asset
							? assetAmount + ' ' + asset.symbol
							: fromWei(amount).toString() + ' ' + strings('unit.eth')}
					</Text>
				) : (
					<View>
						<Text style={styles.summaryFiat}>
							{this.getAssetConversion(
								asset,
								asset ? assetAmount : amount,
								this.props.conversionRate,
								(asset && contractExchangeRates[asset.address]) || null,
								currentCurrency
							)}
						</Text>
						<Text style={styles.summaryEth}>
							{asset
								? assetAmount + ' ' + asset.symbol
								: fromWei(amount).toString() + ' ' + strings('unit.eth')}
						</Text>
					</View>
				)}

				<TouchableOpacity style={styles.goBack} onPress={this.edit}>
					<MaterialIcon name={'keyboard-arrow-left'} size={22} style={styles.goBackIcon} />
					<Text style={styles.goBackText}>{strings('transaction.edit')}</Text>
				</TouchableOpacity>
			</View>
		);
	};
}

const mapStateToProps = state => ({
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates
});

export default connect(mapStateToProps)(TransactionReviewSummary);
