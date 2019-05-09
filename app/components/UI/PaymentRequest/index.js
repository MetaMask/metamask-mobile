import React, { Component } from 'react';
import { Platform, SafeAreaView, TextInput, Text, StyleSheet, ScrollView, View } from 'react-native';
import { connect } from 'react-redux';
import { colors, fontStyles } from '../../../styles/common';
import { getPaymentRequestOptionsTitle } from '../../UI/Navbar';
import FeatherIcon from 'react-native-vector-icons/Feather';
import contractMap from 'eth-contract-metadata';
import Fuse from 'fuse.js';
import AssetList from './AssetList';
import PropTypes from 'prop-types';
import {
	weiToFiat,
	toWei,
	balanceToFiat,
	renderFromWei,
	fiatNumberToWei,
	fromWei,
	isDecimal,
	fiatNumberToTokenMinimalUnit,
	renderFromTokenMinimalUnit,
	fromTokenMinimalUnit
} from '../../../util/number';
import { strings } from '../../../../locales/i18n';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { TouchableOpacity } from 'react-native-gesture-handler';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	contentWrapper: {
		padding: 20
	},
	title: {
		...fontStyles.bold,
		fontSize: 16
	},
	searchWrapper: {
		marginTop: 12,
		marginBottom: 24
	},
	searchInput: {
		flex: 1,
		marginHorizontal: 0,
		paddingTop: Platform.OS === 'android' ? 12 : 2,
		borderRadius: 20,
		paddingHorizontal: 38,
		fontSize: 16,
		backgroundColor: colors.grey000,
		height: 40,
		color: colors.grey400,
		...fontStyles.normal
	},
	searchIcon: {
		position: 'absolute',
		textAlignVertical: 'center',
		marginTop: Platform.OS === 'android' ? 9 : 10,
		marginLeft: 12
	},
	input: {
		...fontStyles.normal,
		backgroundColor: colors.white,
		borderWidth: 0,
		fontSize: 32,
		paddingBottom: 0,
		paddingRight: 0,
		paddingLeft: 0,
		paddingTop: 0
	},
	eth: {
		...fontStyles.normal,
		fontSize: 32,
		paddingTop: Platform.OS === 'android' ? 3 : 0,
		paddingLeft: 10
	},
	fiatValue: {
		...fontStyles.normal,
		fontSize: 18
	},
	split: {
		flex: 1,
		flexDirection: 'row'
	},
	ethContainer: {
		flex: 1,
		flexDirection: 'row',
		paddingLeft: 6,
		paddingRight: 10
	},
	container: {
		flex: 1,
		flexDirection: 'row',
		paddingRight: 10,
		paddingVertical: 10,
		paddingLeft: 14,
		position: 'relative',
		backgroundColor: colors.white,
		borderColor: colors.grey100,
		borderRadius: 4,
		borderWidth: 1
	},
	amounts: {
		maxWidth: '70%'
	},
	switchContainer: {
		flex: 1,
		flexDirection: 'column',
		alignSelf: 'center',
		right: 0
	},
	switchTouchable: {
		flexDirection: 'row',
		alignSelf: 'flex-end',
		right: 0
	}
});

const contractList = Object.entries(contractMap)
	.map(([address, tokenData]) => {
		tokenData.address = address;
		return tokenData;
	})
	.filter(tokenData => Boolean(tokenData.erc20));

const fuse = new Fuse(contractList, {
	shouldSort: true,
	threshold: 0.45,
	location: 0,
	distance: 100,
	maxPatternLength: 32,
	minMatchCharLength: 1,
	keys: [{ name: 'name', weight: 0.5 }, { name: 'symbol', weight: 0.5 }]
});

const ethLogo = require('../../../images/eth-logo.png'); // eslint-disable-line

const defaultAssets = [
	{
		symbol: 'ETH',
		name: 'Ether',
		logo: ethLogo
	},
	{
		address: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
		decimals: 18,
		erc20: true,
		logo: 'dai.svg',
		name: 'Dai Stablecoin v1.0',
		symbol: 'DAI'
	}
];

const MODE_SELECT = 'select';
const MODE_AMOUNT = 'amount';

/**
 * Main view for general app configurations
 */
class PaymentRequest extends Component {
	static navigationOptions = ({ navigation }) => getPaymentRequestOptionsTitle('Request', navigation);

	static propTypes = {
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object,
		/**
		 * ETH-to-current currency conversion rate from CurrencyRateController
		 */
		conversionRate: PropTypes.number,
		/**
		 * Currency code for currently-selected currency from CurrencyRateController
		 */
		currentCurrency: PropTypes.string,
		/**
		 * Object containing token exchange rates in the format address => exchangeRate
		 */
		contractExchangeRates: PropTypes.object,
		/**
		 * Primary currency, either ETH or Fiat
		 */
		primaryCurrency: PropTypes.string
	};

	state = {
		searchInputValue: '',
		results: [],
		selectedAsset: undefined,
		mode: MODE_SELECT,
		internalPrimaryCurrency: '',
		cryptoAmount: undefined,
		amount: undefined,
		secondaryAmount: undefined,
		symbol: undefined
	};

	componentDidMount = () => {
		const { primaryCurrency } = this.props;
		this.setState({ internalPrimaryCurrency: primaryCurrency });
	};

	goToAssetSelection = () => {
		const { navigation } = this.props;
		navigation && navigation.setParams({ mode: MODE_SELECT, dispatch: undefined });
		this.setState({
			mode: MODE_SELECT,
			amount: undefined,
			cryptoAmount: undefined,
			secondaryAmount: undefined,
			symbol: undefined
		});
	};

	goToAmountInput = async selectedAsset => {
		const { navigation } = this.props;
		navigation && navigation.setParams({ mode: MODE_AMOUNT, dispatch: this.goToAssetSelection });
		await this.setState({ selectedAsset, mode: MODE_AMOUNT });
		this.updateAmount();
	};

	handleSearch = searchInputValue => {
		const fuseSearchResult = fuse.search(searchInputValue);
		const addressSearchResult = contractList.filter(
			token => token.address.toLowerCase() === searchInputValue.toLowerCase()
		);
		const results = [...addressSearchResult, ...fuseSearchResult];
		this.setState({ searchInputValue, results });
	};

	renderSelectAssets() {
		const results = this.state.results.length ? this.state.results : defaultAssets;
		return (
			<View>
				<View>
					<Text style={styles.title}>Choose an asset to request</Text>
				</View>
				<View style={styles.searchWrapper}>
					<TextInput
						style={[styles.searchInput, this.state.inputWidth ? { width: this.state.inputWidth } : {}]}
						autoCapitalize="none"
						autoCorrect={false}
						clearButtonMode="while-editing"
						onChangeText={this.handleSearch}
						onSubmitEditing={this.handleSearch}
						placeholder={'Search assets'}
						placeholderTextColor={colors.grey400}
						returnKeyType="go"
						value={this.state.searchInputValue}
						blurOnSubmit
					/>
					<FeatherIcon
						onPress={this.focusInput}
						name="search"
						size={18}
						color={colors.grey400}
						style={styles.searchIcon}
					/>
				</View>
				<AssetList
					searchResults={results}
					handleSelectAsset={this.goToAmountInput}
					selectedAsset={this.state.selectedAsset}
					searchQuery={this.state.searchInputValue}
				/>
			</View>
		);
	}

	handleETHPrimaryCurrency = amount => {
		const { conversionRate, currentCurrency, contractExchangeRates } = this.props;
		const { selectedAsset } = this.state;
		let secondaryAmount;
		const symbol = selectedAsset.symbol;
		const undefAmount = (isDecimal(amount) && amount) || 0;
		const cryptoAmount = amount;
		const exchangeRate = selectedAsset && selectedAsset.address && contractExchangeRates[selectedAsset.address];

		if (selectedAsset.symbol !== 'ETH') {
			secondaryAmount = exchangeRate
				? balanceToFiat(undefAmount, conversionRate, exchangeRate, currentCurrency)
				: 'conversion rate not available';
		} else {
			secondaryAmount = weiToFiat(toWei(undefAmount), conversionRate, currentCurrency.toUpperCase());
		}
		return { symbol, secondaryAmount, cryptoAmount };
	};

	handleFiatPrimaryCurrency = amount => {
		const { conversionRate, currentCurrency, contractExchangeRates } = this.props;
		const { selectedAsset } = this.state;
		const symbol = currentCurrency.toUpperCase();
		const exchangeRate = selectedAsset && selectedAsset.address && contractExchangeRates[selectedAsset.address];
		const undefAmount = (isDecimal(amount) && amount) || 0;
		let secondaryAmount, cryptoAmount;
		if (selectedAsset.symbol !== 'ETH' && (exchangeRate && exchangeRate !== 0)) {
			const secondaryMinimalUnit = fiatNumberToTokenMinimalUnit(
				undefAmount,
				conversionRate,
				exchangeRate,
				selectedAsset.decimals
			);
			secondaryAmount =
				renderFromTokenMinimalUnit(secondaryMinimalUnit, selectedAsset.decimals) + ' ' + selectedAsset.symbol;
			cryptoAmount = fromTokenMinimalUnit(secondaryMinimalUnit, selectedAsset.decimals);
		} else {
			secondaryAmount = renderFromWei(fiatNumberToWei(undefAmount, conversionRate)) + ' ' + strings('unit.eth');
			cryptoAmount = fromWei(fiatNumberToWei(undefAmount, conversionRate));
		}
		return { symbol, secondaryAmount, cryptoAmount };
	};

	updateAmount = amount => {
		const { internalPrimaryCurrency } = this.state;
		let res;
		if (internalPrimaryCurrency === 'ETH') {
			res = this.handleETHPrimaryCurrency(amount);
		} else if (internalPrimaryCurrency !== 'ETH') {
			res = this.handleFiatPrimaryCurrency(amount);
		}
		const { cryptoAmount, secondaryAmount, symbol } = res;
		this.setState({ amount, cryptoAmount, secondaryAmount, symbol });
	};

	switchPrimaryCurrency = async () => {
		const { internalPrimaryCurrency } = this.state;
		const primarycurrencies = {
			ETH: 'Fiat',
			Fiat: 'ETH'
		};
		await this.setState({ internalPrimaryCurrency: primarycurrencies[internalPrimaryCurrency] });
		this.updateAmount();
	};

	renderEnterAmount() {
		const { amount, secondaryAmount, symbol } = this.state;
		return (
			<View>
				<View>
					<Text style={styles.title}>Enter amount</Text>
				</View>
				<View style={styles.searchWrapper}>
					<View style={styles.container}>
						<View style={styles.ethContainer}>
							<View style={styles.amounts}>
								<View style={styles.split}>
									<TextInput
										autoCapitalize="none"
										autoCorrect={false}
										keyboardType="numeric"
										numberOfLines={1}
										onChangeText={this.updateAmount}
										placeholder={'0.00'}
										spellCheck={false}
										style={styles.input}
										value={amount}
									/>
									<Text style={styles.eth} numberOfLines={1}>
										{symbol}
									</Text>
								</View>
								<Text style={styles.fiatValue} numberOfLines={1}>
									{secondaryAmount}
								</Text>
							</View>
							<View style={styles.switchContainer}>
								<TouchableOpacity onPress={this.switchPrimaryCurrency} style={styles.switchTouchable}>
									<FontAwesome
										onPress={this.focusInput}
										name="exchange"
										size={18}
										color={colors.grey200}
										style={{ transform: [{ rotate: '270deg' }] }}
									/>
								</TouchableOpacity>
							</View>
						</View>
					</View>
				</View>
			</View>
		);
	}

	render() {
		const { mode } = this.state;
		return (
			<SafeAreaView style={styles.wrapper}>
				<ScrollView style={styles.contentWrapper}>
					{mode === MODE_SELECT ? this.renderSelectAssets() : this.renderEnterAmount()}
				</ScrollView>
			</SafeAreaView>
		);
	}
}

const mapStateToProps = state => ({
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	searchEngine: state.settings.searchEngine,
	primaryCurrency: state.settings.primaryCurrency
});

export default connect(mapStateToProps)(PaymentRequest);
