import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Platform, StyleSheet, Text, TextInput, View, Image, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { connect } from 'react-redux';
import {
	weiToFiat,
	balanceToFiat,
	fromTokenMinimalUnit,
	renderFromTokenMinimalUnit,
	renderFromWei
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
		maxHeight: 200,
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
		 * Map of accounts to information objects including balances
		 */
		accounts: PropTypes.object,
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
		 * A string that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * A string that represents the value un a readable format (decimal)
		 */
		readableValue: PropTypes.string,
		/**
		 * Whether fill max button was pressed or not
		 */
		fillMax: PropTypes.bool,
		/**
		 * Callback to update fill max state in parent
		 */
		updateFillMax: PropTypes.func,
		/**
		 * Array of assets (in this case ERC20 tokens)
		 */
		tokens: PropTypes.array
	};

	state = { isOpen: false, readableValue: undefined };

	componentDidUpdate = () => {
		const { fillMax, readableValue } = this.props;
		if (fillMax) {
			this.setState({ readableValue });
		}
		this.props.updateFillMax(false);
	};

	componentDidMount = () => {
		const { readableValue } = this.props;
		this.setState({ readableValue });
	};

	onFocus = () => {
		const { isOpen } = this.state;
		this.setState({ isOpen: !isOpen });
	};

	selectAsset = async asset => {
		this.setState({ isOpen: false });
		const { handleUpdateAsset, onChange } = this.props;
		asset = asset.symbol === 'ETH' ? undefined : asset;
		handleUpdateAsset && (await handleUpdateAsset(asset));
		onChange && onChange(undefined);
		this.setState({ readableValue: undefined });
	};

	renderAsset = (asset, onPress) => {
		const { tokenBalances, accounts, selectedAddress } = this.props;
		const balance =
			asset.symbol !== 'ETH'
				? asset.address in tokenBalances
					? renderFromTokenMinimalUnit(tokenBalances[asset.address], asset.decimals)
					: undefined
				: renderFromWei(accounts[selectedAddress].balance);

		return (
			<TouchableOpacity key={asset.address || asset.symbol} onPress={onPress} style={styles.option}>
				<View style={styles.icon}>
					{asset.symbol !== 'ETH' ? (
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
		const tokens = [
			{
				name: 'Ether',
				symbol: 'ETH'
			},
			...this.props.tokens
		];
		return (
			<ScrollView style={styles.componentContainer}>
				<View style={styles.optionList}>
					{tokens.map(token =>
						this.renderAsset(token, async () => {
							await this.selectAsset(token);
						})
					)}
				</View>
			</ScrollView>
		);
	};

	onChange = value => {
		const { onChange } = this.props;
		onChange && onChange(value);
		this.setState({ readableValue: value });
	};

	render = () => {
		const { currentCurrency, readonly, value, asset, contractExchangeRates, conversionRate } = this.props;
		const { isOpen, readableValue } = this.state;
		let convertedAmount;
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
		} else {
			convertedAmount = weiToFiat(value, this.props.conversionRate, currentCurrency).toUpperCase();
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
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	tokens: state.engine.backgroundState.AssetsController.tokens,
	tokenBalances: state.engine.backgroundState.TokenBalancesController.contractBalances
});

export default connect(mapStateToProps)(EthInput);
