import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { connect } from 'react-redux';
import {
	weiToFiat,
	isDecimal,
	toWei,
	fromWei,
	balanceToFiat,
	toTokenMinimalUnit,
	fromTokenMinimalUnit
} from '../../util/number';
import { strings } from '../../../locales/i18n';

const styles = StyleSheet.create({
	root: {
		...fontStyles.bold,
		backgroundColor: colors.white,
		borderColor: colors.inputBorderColor,
		borderRadius: 4,
		borderWidth: 1,
		flex: 1,
		paddingLeft: 10,
		paddingRight: 40,
		paddingVertical: 6,
		position: 'relative',
		zIndex: 1
	},
	input: {
		...fontStyles.bold,
		flex: 0,
		fontSize: 16,
		minWidth: 44,
		paddingRight: 8,
		paddingTop: 0
	},
	eth: {
		...fontStyles.bold,
		flex: 0,
		fontSize: 16,
		paddingTop: Platform.OS === 'android' ? 3 : 0
	},
	fiatValue: {
		...fontStyles.normal,
		fontSize: 12
	},
	split: {
		flex: 0,
		flexDirection: 'row'
	}
});

/**
 * Form component that allows users to type an amount of ETH and its fiat value is rendered dynamically
 */
class EthInput extends Component {
	static propTypes = {
		/**
		 * ETH-to-current currency conversion rate from CurrencyRateController
		 */
		conversionRate: PropTypes.number,
		/**
		 * Currency code for currently-selected currency from CurrencyRateController
		 */
		currentCurrency: PropTypes.string,
		/**
		 * Callback triggered when this input value
		 */
		onChange: PropTypes.func,
		/**
		 * Makes this input readonly
		 */
		readonly: PropTypes.bool,
		/**
		 * Value of this underlying input expressed as in wei as a BN instance
		 */
		value: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
		/**
		 * Object representing an asset
		 */
		asset: PropTypes.object,
		/**
		 * Object containing token exchange rates in the format address => exchangeRate
		 */
		contractExchangeRates: PropTypes.object
	};

	onChange = value => {
		const { onChange, asset } = this.props;
		!asset && onChange && onChange(isDecimal(value) ? toWei(value) : undefined);
		asset && onChange && onChange(isDecimal(value) ? toTokenMinimalUnit(value, asset.decimals) : undefined);
	};

	render = () => {
		const { currentCurrency, readonly, value, asset, contractExchangeRates } = this.props;
		let convertedAmount, readableValue;
		if (asset) {
			const exchangeRate = contractExchangeRates[asset.address];
			if (exchangeRate) {
				convertedAmount = balanceToFiat(
					fromWei(value) || 0,
					this.props.conversionRate,
					exchangeRate,
					currentCurrency
				).toUpperCase();
			} else {
				convertedAmount = strings('transaction.conversion_not_available');
			}
			readableValue = value && fromTokenMinimalUnit(value, asset.decimals);
		} else {
			convertedAmount = weiToFiat(value, this.props.conversionRate, currentCurrency).toUpperCase();
			readableValue = value && fromWei(value);
		}
		return (
			<View style={styles.root}>
				<View style={styles.split}>
					<TextInput
						autoCapitalize="none"
						autoCorrect={false}
						editable={!readonly}
						keyboardType="numeric"
						numberOfLines={1}
						onChangeText={this.onChange}
						placeholder={'0.00'}
						spellCheck={false}
						style={styles.input}
					>
						{readableValue}
					</TextInput>
					<Text style={styles.eth} numberOfLines={1}>
						{(asset && asset.symbol) || strings('unit.eth')}
					</Text>
				</View>
				<Text style={styles.fiatValue} numberOfLines={1}>
					{convertedAmount}
				</Text>
			</View>
		);
	};
}

const mapStateToProps = state => ({
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates
});

export default connect(mapStateToProps)(EthInput);
