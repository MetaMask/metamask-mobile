import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import {
	weiToFiat,
	balanceToFiat,
	renderFromTokenMinimalUnit,
	renderFromWei,
	fromTokenMinimalUnit
} from '../../../util/number';
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
		width: 144
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
		transaction: PropTypes.object,
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

	edit = () => {
		const { edit } = this.props;
		edit && edit();
	};

	render = () => {
		const {
			transaction: { value, selectedAsset, assetType },
			currentCurrency,
			contractExchangeRates,
			actionKey
		} = this.props;
		let assetAmount, conversionRate, fiatValue;
		switch (assetType) {
			case 'ETH':
				assetAmount = renderFromWei(value).toString() + ' ' + strings('unit.eth');
				conversionRate = this.props.conversionRate;
				fiatValue = weiToFiat(value, conversionRate, currentCurrency);
				break;
			case 'ERC20':
				assetAmount = renderFromTokenMinimalUnit(value, selectedAsset.decimals) + ' ' + selectedAsset.symbol;
				conversionRate = contractExchangeRates[selectedAsset.address];
				fiatValue = balanceToFiat(
					(value && fromTokenMinimalUnit(value, selectedAsset.decimals)) || 0,
					this.props.conversionRate,
					conversionRate,
					currentCurrency
				);
				break;
			case 'ERC721':
				assetAmount = ' #' + selectedAsset.tokenId;
				conversionRate = '-';
				fiatValue = selectedAsset.name;
				break;
		}
		return (
			<View style={styles.summary}>
				<Text style={styles.confirmBadge} numberOfLines={1}>
					{actionKey}
				</Text>

				{!conversionRate ? (
					<Text style={styles.summaryFiat}>{assetAmount}</Text>
				) : (
					<View>
						<Text style={styles.summaryFiat}>{fiatValue}</Text>
						<Text style={styles.summaryEth}>{assetAmount}</Text>
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
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	transaction: state.transaction
});

export default connect(mapStateToProps)(TransactionReviewSummary);
