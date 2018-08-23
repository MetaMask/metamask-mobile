import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../../styles/common';
import { connect } from 'react-redux';

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		borderColor: colors.inputBorderColor,
		borderRadius: 4,
		borderWidth: 1,
		flex: 1,
		fontWeight: '500',
		paddingBottom: 6,
		paddingLeft: 10,
		paddingRight: 40,
		paddingTop: 6,
		position: 'relative',
		zIndex: 1
	},
	input: {
		fontSize: 16,
		fontWeight: '500',
		flex: 0,
		paddingRight: 8
	},
	eth: {
		flex: 0,
		fontSize: 16,
		fontWeight: '500'
	},
	fiatValue: {
		fontSize: 12,
		marginTop: 4,
		textTransform: 'uppercase'
	},
	split: {
		flexDirection: 'row',
		flex: 0
	}
});

/**
 * Component that renders a text input that converts ETH to fiat
 */
class EthInput extends Component {
	static propTypes = {
		/**
		 * ETH-to-current currency conversion rate from CurrencyRateController
		 */
		conversionRate: PropTypes.number,
		/**
		 * Currency code for currently-selcted currency from CurrencyRateController
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
		 * Current input value
		 */
		value: PropTypes.string
	};

	render() {
		const { conversionRate, currentCurrency, onChange, readonly, value } = this.props;
		const fiatValue = parseFloat(Math.round((value || 0) * conversionRate * 100) / 100).toFixed(2);
		return (
			<View style={styles.root}>
				<View style={styles.split}>
					<TextInput
						autoCapitalize="none"
						autoCorrect={false}
						keyboardType="numeric"
						numberOfLines={1}
						onChangeText={onChange}
						onFocus={this.focus}
						placeholder={'0.00'}
						editable={!readonly}
						spellCheck={false}
						style={styles.input}
						value={value}
					/>
					<Text style={styles.eth} numberOfLines={1}>ETH</Text>
				</View>
				<Text style={styles.fiatValue}>
					{isNaN(fiatValue) ? '0.00' : fiatValue} {currentCurrency}
				</Text>
			</View>
		);
	}
}

const mapStateToProps = ({ backgroundState: { CurrencyRateController, PreferencesController } }) => ({
	// TODO:  Use different account list that includes balances (from GABA)
	accounts: PreferencesController.identities,
	activeAddress:  PreferencesController.selectedAddress,
	conversionRate: CurrencyRateController.conversionRate,
	currentCurrency: CurrencyRateController.currentCurrency
});

export default connect(mapStateToProps)(EthInput);
