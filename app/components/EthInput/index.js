import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../../styles/common';
import { connect } from 'react-redux';
import { ethToFiat, isNumeric } from '../../util/number';

const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		borderColor: colors.inputBorderColor,
		borderRadius: 4,
		borderWidth: 1,
		flex: 1,
		fontWeight: '500',
		paddingLeft: 10,
		paddingRight: 40,
		paddingVertical: 6,
		position: 'relative',
		zIndex: 1
	},
	input: {
		flex: 0,
		fontSize: 16,
		fontWeight: '500',
		minWidth: 44,
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
		flex: 0,
		flexDirection: 'row'
	}
});

/**
 * Component that renders a text input that accepts ETH and also renders fiat
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
		 * Value of this underlying input expressed as big number
		 */
		value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
	};

	onChange = (value) => {
		const { onChange } = this.props;
		onChange && onChange(isNumeric(value) ? parseFloat(value) : value);
	};

	render() {
		const { conversionRate, currentCurrency, readonly, value } = this.props;
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
						value={typeof value === 'number' ? String(value) : value}
					/>
					<Text style={styles.eth} numberOfLines={1}>
						ETH
					</Text>
				</View>
				<Text style={styles.fiatValue} numberOfLines={1}>
					{ethToFiat(value, conversionRate, currentCurrency)}
				</Text>
			</View>
		);
	}
}

const mapStateToProps = ({ backgroundState: { CurrencyRateController } }) => ({
	conversionRate: CurrencyRateController.conversionRate,
	currentCurrency: CurrencyRateController.currentCurrency
});

export default connect(mapStateToProps)(EthInput);
