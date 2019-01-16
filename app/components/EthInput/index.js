import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Platform, StyleSheet, Text, TextInput, View, Image, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { connect } from 'react-redux';
import {
	weiToFiat,
	isDecimal,
	toWei,
	fromWei,
	balanceToFiat,
	toTokenMinimalUnit,
	fromTokenMinimalUnit,
	renderFromTokenMinimalUnit
} from '../../util/number';
import { strings } from '../../../locales/i18n';
import TokenImage from '../TokenImage';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { ScrollView } from 'react-native-gesture-handler';

const styles = StyleSheet.create({
	root: {
		flex: 1
	},
	container: {
		flex: 1,
		flexDirection: 'row',
		paddingLeft: 10,
		paddingRight: 40,
		paddingVertical: 6,
		position: 'relative',
		backgroundColor: colors.white,
		borderColor: colors.inputBorderColor,
		borderRadius: 4,
		borderWidth: 1
	},
	input: {
		...fontStyles.bold,
		backgroundColor: colors.white,
		borderWidth: 0,
		fontSize: 16,
		paddingBottom: 0,
		paddingRight: 0,
		paddingLeft: 0,
		paddingTop: 0,
		position: 'relative'
	},
	eth: {
		...fontStyles.bold,
		flex: 0,
		fontSize: 16,
		paddingTop: Platform.OS === 'android' ? 3 : 0,
		paddingLeft: 10
	},
	fiatValue: {
		...fontStyles.normal,
		fontSize: 12
	},
	split: {
		flex: 0,
		flexDirection: 'row',
		marginRight: 100
	},
	ethContainer: {
		paddingLeft: 6,
		paddingRight: 30
	},
	icon: {
		paddingTop: 5,
		paddingLeft: 4,
		paddingRight: 8
	},
	logo: {
		width: 20,
		height: 20,
		marginRight: 0
	},
	arrow: {
		color: colors.inputBorderColor,
		position: 'absolute',
		right: 10,
		top: 20
	},
	componentContainer: {
		position: 'absolute',
		zIndex: 2,
		width: '100%',
		marginTop: 55,
		height: 200,
		borderColor: colors.inputBorderColor,
		borderRadius: 4,
		borderWidth: 1,
		elevation: 9
	},
	optionList: {
		backgroundColor: colors.white,
		borderColor: colors.inputBorderColor,
		borderRadius: 4,
		borderWidth: 1,
		paddingBottom: 12,
		paddingTop: 10,
		width: '100%',
		top: 0,
		left: 0,
		right: 0,
		elevation: 10
	},
	option: {
		flexDirection: 'row',
		paddingBottom: 4,
		paddingLeft: 8,
		paddingRight: 10,
		paddingTop: 8
	},
	symbol: {
		...fontStyles.bold
	},
	balance: {
		...fontStyles.normal
	},
	optionContent: {
		paddingLeft: 8
	}
});

const ethLogo = require('../../images/eth-logo.png'); // eslint-disable-line

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
		 * Callback to update selected asset in transaction in parent state
		 */
		handleUpdateAsset: PropTypes.func,
		/**
		 * Callback triggered when this input value
		 */
		onChange: PropTypes.func,
		/**
		 * Makes this input readonly
		 */
		readonly: PropTypes.bool,
		/**
		 * Object containing token balances in the format address => balance
		 */
		tokenBalances: PropTypes.object,
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
		contractExchangeRates: PropTypes.object,
		/**
		 * Array of assets (in this case ERC20 tokens)
		 */
		tokens: PropTypes.array
	};

	state = { isOpen: false };

	onFocus = () => {
		const { isOpen } = this.state;
		this.setState({ isOpen: !isOpen });
	};

	selectAsset = asset => {
		this.setState({ isOpen: false });
		const { handleUpdateAsset } = this.props;
		handleUpdateAsset && handleUpdateAsset(asset);
	};

	renderAsset = (asset, onPress) => {
		const { tokenBalances } = this.props;
		const balance =
			asset.address in tokenBalances
				? renderFromTokenMinimalUnit(tokenBalances[asset.address], asset.decimals)
				: undefined;
		return (
			<TouchableOpacity key={asset.address} onPress={onPress} style={styles.option}>
				<View style={styles.icon}>
					{asset ? (
						<TokenImage asset={asset} containerStyle={styles.logo} iconStyle={styles.logo} />
					) : (
						<Image source={ethLogo} style={styles.logo} />
					)}
				</View>
				<View style={styles.optionContent}>
					<Text style={styles.symbol}>{asset.symbol}</Text>
					<Text style={styles.balance}>
						{balance} {asset.symbol}
					</Text>
				</View>
			</TouchableOpacity>
		);
	};

	renderAssetsList = () => {
		const { tokens } = this.props;
		return (
			<ScrollView style={styles.componentContainer}>
				<View style={styles.optionList}>
					{tokens.map(token =>
						this.renderAsset(token, () => {
							this.selectAsset(token);
						})
					)}
				</View>
			</ScrollView>
		);
	};

	onChange = value => {
		const { onChange, asset } = this.props;
		!asset && onChange && onChange(isDecimal(value) ? toWei(value) : undefined);
		asset && onChange && onChange(isDecimal(value) ? toTokenMinimalUnit(value, asset.decimals) : undefined);
	};

	render = () => {
		const { currentCurrency, readonly, value, asset, contractExchangeRates, conversionRate } = this.props;
		const { isOpen } = this.state;
		let convertedAmount, readableValue;
		if (asset) {
			const exchangeRate = contractExchangeRates[asset.address];
			if (exchangeRate) {
				convertedAmount = balanceToFiat(
					(value && fromTokenMinimalUnit(value, asset.decimals)) || 0,
					conversionRate,
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
				<View style={styles.container}>
					<View style={styles.icon}>
						{asset ? (
							<TokenImage asset={asset} containerStyle={styles.logo} iconStyle={styles.logo} />
						) : (
							<Image source={ethLogo} style={styles.logo} />
						)}
					</View>
					<View style={styles.ethContainer}>
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
								value={readableValue}
							/>
							<Text style={styles.eth} numberOfLines={1}>
								{(asset && asset.symbol) || strings('unit.eth')}
							</Text>
						</View>
						<Text style={styles.fiatValue} numberOfLines={1}>
							{convertedAmount}
						</Text>
					</View>
				</View>

				<MaterialIcon onPress={this.onFocus} name={'arrow-drop-down'} size={24} style={styles.arrow} />
				{isOpen && this.renderAssetsList()}
			</View>
		);
	};
}

const mapStateToProps = state => ({
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	tokens: state.engine.backgroundState.AssetsController.tokens,
	tokenBalances: state.engine.backgroundState.TokenBalancesController.contractBalances
});

export default connect(mapStateToProps)(EthInput);
