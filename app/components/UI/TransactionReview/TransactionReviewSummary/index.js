import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View } from 'react-native';
import {
	weiToFiat,
	balanceToFiat,
	renderFromTokenMinimalUnit,
	renderFromWei,
	fromTokenMinimalUnit
} from '../../../../util/number';
import { colors, fontStyles } from '../../../../styles/common';
import { strings } from '../../../../../locales/i18n';
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
		actionKey: PropTypes.string
	};

	getRenderValues = () => {
		const {
			transaction: { value, selectedAsset, assetType },
			currentCurrency,
			contractExchangeRates
		} = this.props;
		const values = {
			ETH: () => {
				const assetAmount = renderFromWei(value).toString() + ' ' + strings('unit.eth');
				const conversionRate = this.props.conversionRate;
				const fiatValue = weiToFiat(value, conversionRate, currentCurrency.toUpperCase());
				return [assetAmount, conversionRate, fiatValue];
			},
			ERC20: () => {
				const assetAmount =
					renderFromTokenMinimalUnit(value, selectedAsset.decimals) + ' ' + selectedAsset.symbol;
				const conversionRate = contractExchangeRates[selectedAsset.address];
				const fiatValue = balanceToFiat(
					(value && fromTokenMinimalUnit(value, selectedAsset.decimals)) || 0,
					this.props.conversionRate,
					conversionRate,
					currentCurrency
				);
				return [assetAmount, conversionRate, fiatValue];
			},
			ERC721: () => {
				const assetAmount = strings('unit.token_id') + selectedAsset.tokenId;
				const conversionRate = true;
				const fiatValue = selectedAsset.name;
				return [assetAmount, conversionRate, fiatValue];
			},
			default: () => [undefined, undefined, undefined]
		};
		return values[assetType] || values.default;
	};

	render = () => {
		const { actionKey } = this.props;
		const [assetAmount, conversionRate, fiatValue] = this.getRenderValues()();
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
