import React, { PureComponent } from 'react';
import {
	Platform,
	SafeAreaView,
	TextInput,
	Text,
	StyleSheet,
	View,
	TouchableOpacity,
	KeyboardAvoidingView,
	InteractionManager
} from 'react-native';
import { connect } from 'react-redux';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
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
import StyledButton from '../StyledButton';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { generateETHLink, generateERC20Link, generateUniversalLinkRequest } from '../../../util/payment-link-generator';
import NetworkList from '../../../util/networks';

const KEYBOARD_OFFSET = 120;
const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1
	},
	contentWrapper: {
		paddingTop: 24,
		paddingHorizontal: 24
	},
	title: {
		...fontStyles.bold,
		fontSize: 16
	},
	searchWrapper: {
		marginVertical: 8
	},
	searchInput: {
		flex: 1,
		marginHorizontal: 0,
		paddingTop: Platform.OS === 'android' ? 12 : 2,
		borderRadius: 8,
		paddingHorizontal: 38,
		fontSize: 16,
		backgroundColor: colors.white,
		height: 40,
		color: colors.grey400,
		borderColor: colors.grey100,
		borderWidth: 1,
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
		paddingLeft: 10,
		textTransform: 'uppercase'
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
	},
	enterAmountWrapper: {
		flex: 1,
		flexDirection: 'column'
	},
	button: {
		marginBottom: 16
	},
	buttonsWrapper: {
		flex: 1,
		flexDirection: 'row',
		alignSelf: 'center'
	},
	buttonsContainer: {
		flex: 1,
		flexDirection: 'column',
		alignSelf: 'flex-end'
	},
	scrollViewContainer: {
		flexGrow: 1
	},
	errorWrapper: {
		backgroundColor: colors.red000,
		borderRadius: 4,
		marginTop: 8
	},
	errorText: {
		color: colors.fontError,
		alignSelf: 'center'
	},
	assetsWrapper: {
		marginTop: 16
	},
	assetsTitle: {
		...fontStyles.normal,
		fontSize: 16,
		marginBottom: 8
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
const defaultEth = [
	{
		symbol: 'ETH',
		name: 'Ether',
		logo: ethLogo,
		isETH: true
	}
];
const defaultAssets = [
	...defaultEth,
	{
		address: '0x6b175474e89094c44da98b954eedeac495271d0f',
		decimals: 18,
		erc20: true,
		logo: 'new-dai.svg',
		name: 'Dai Stablecoin',
		symbol: 'DAI'
	}
];

const MODE_SELECT = 'select';
const MODE_AMOUNT = 'amount';

/**
 * View to generate a payment request link
 */
class PaymentRequest extends PureComponent {
	static navigationOptions = ({ navigation }) =>
		getPaymentRequestOptionsTitle(strings('payment_request.title'), navigation);

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
		primaryCurrency: PropTypes.string,
		/**
		 * A string that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * Array of ERC20 assets
		 */
		tokens: PropTypes.array,
		/**
		 * A string representing the network name
		 */
		networkType: PropTypes.string
	};

	amountInput = React.createRef();

	state = {
		searchInputValue: '',
		results: [],
		selectedAsset: undefined,
		mode: MODE_SELECT,
		internalPrimaryCurrency: '',
		cryptoAmount: undefined,
		amount: undefined,
		secondaryAmount: undefined,
		symbol: undefined,
		showError: false,
		chainId: ''
	};

	/**
	 * Set chainId, internalPrimaryCurrency and receiveAssets, if there is an asset set to this payment request chose it automatically, to state
	 */
	componentDidMount = () => {
		const { primaryCurrency, navigation, networkType } = this.props;
		const receiveAsset = navigation && navigation.getParam('receiveAsset', undefined);
		const chainId = Object.keys(NetworkList).indexOf(networkType) > -1 && NetworkList[networkType].networkId;
		this.setState({ internalPrimaryCurrency: primaryCurrency, chainId });
		if (receiveAsset) {
			this.goToAmountInput(receiveAsset);
		}
	};

	componentDidUpdate = () => {
		InteractionManager.runAfterInteractions(() => {
			this.amountInput.current && this.amountInput.current.focus();
		});
	};

	/**
	 * Go to asset selection view and modify navbar accordingly
	 */
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

	/**
	 * Go to enter amount view, with selectedAsset and modify navbar accordingly
	 *
	 * @param {object} selectedAsset - Asset selected to build the payment request
	 */
	goToAmountInput = async selectedAsset => {
		const { navigation } = this.props;
		navigation && navigation.setParams({ mode: MODE_AMOUNT, dispatch: this.goToAssetSelection });
		await this.setState({ selectedAsset, mode: MODE_AMOUNT });
		this.updateAmount();
	};

	/**
	 * Handle search input result
	 *
	 * @param {string} searchInputValue - String containing assets query
	 */
	handleSearch = searchInputValue => {
		if (typeof searchInputValue !== 'string') {
			searchInputValue = this.state.searchInputValue;
		}

		const fuseSearchResult = fuse.search(searchInputValue);
		const addressSearchResult = contractList.filter(
			token => token.address.toLowerCase() === searchInputValue.toLowerCase()
		);
		const results = [...addressSearchResult, ...fuseSearchResult];
		this.setState({ searchInputValue, results });
	};

	/**
	 * Renders a view that allows user to select assets to build the payment request
	 * Either top picks and user's assets are available to select
	 */
	renderSelectAssets = () => {
		const { tokens } = this.props;
		const { chainId } = this.state;
		let results;
		if (chainId === 1) {
			results = this.state.searchInputValue ? this.state.results : defaultAssets;
		} else {
			results = defaultEth;
		}
		const userTokens = tokens.map(token => {
			const contract = contractList.find(contractToken => contractToken.address === token.address);
			if (contract) return contract;
			return token;
		});
		return (
			<View style={baseStyles.flexGrow} testID={'request-screen'}>
				<View>
					<Text style={styles.title}>{strings('payment_request.choose_asset')}</Text>
				</View>
				{chainId === 1 && (
					<View style={styles.searchWrapper}>
						<TextInput
							style={[styles.searchInput, this.state.inputWidth ? { width: this.state.inputWidth } : {}]}
							autoCapitalize="none"
							autoCorrect={false}
							clearButtonMode="while-editing"
							onChangeText={this.handleSearch}
							onSubmitEditing={this.handleSearch}
							placeholder={strings('payment_request.search_assets')}
							placeholderTextColor={colors.grey400}
							returnKeyType="go"
							value={this.state.searchInputValue}
							blurOnSubmit
							testID={'request-search-asset-input'}
						/>
						<FeatherIcon
							onPress={this.focusInput}
							name="search"
							size={18}
							color={colors.grey400}
							style={styles.searchIcon}
						/>
					</View>
				)}
				<View style={styles.assetsWrapper} testID={'searched-asset-results'}>
					<Text style={styles.assetsTitle}>
						{this.state.searchInputValue
							? strings('payment_request.search_results')
							: strings('payment_request.search_top_picks')}
					</Text>
					<AssetList
						searchResults={results}
						handleSelectAsset={this.goToAmountInput}
						selectedAsset={this.state.selectedAsset}
						searchQuery={this.state.searchInputValue}
						emptyMessage={strings('payment_request.search_no_tokens_found')}
					/>
				</View>
				{userTokens.length > 0 && (
					<View style={styles.assetsWrapper}>
						<Text style={styles.assetsTitle}>{strings('payment_request.your_tokens')}</Text>
						<AssetList
							searchResults={userTokens}
							handleSelectAsset={this.goToAmountInput}
							selectedAsset={this.state.selectedAsset}
							searchQuery={this.state.searchInputValue}
						/>
					</View>
				)}
			</View>
		);
	};

	/**
	 * Handles payment request parameters for ETH as primaryCurrency
	 *
	 * @param {string} amount - String containing amount number from input, as token value
	 * @returns {object} - Object containing respective symbol, secondaryAmount and cryptoAmount according to amount and selectedAsset
	 */
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
				: undefined;
		} else {
			secondaryAmount = weiToFiat(toWei(undefAmount), conversionRate, currentCurrency);
		}
		return { symbol, secondaryAmount, cryptoAmount };
	};

	/**
	 * Handles payment request parameters for Fiat as primaryCurrency
	 *
	 * @param {string} amount - String containing amount number from input, as fiat value
	 * @returns {object} - Object containing respective symbol, secondaryAmount and cryptoAmount according to amount and selectedAsset
	 */
	handleFiatPrimaryCurrency = amount => {
		const { conversionRate, currentCurrency, contractExchangeRates } = this.props;
		const { selectedAsset } = this.state;
		const symbol = currentCurrency;
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

	/**
	 * Handles amount update, setting amount related state parameters, it handles state according to internalPrimaryCurrency
	 *
	 * @param {string} amount - String containing amount number from input
	 */
	updateAmount = amount => {
		const { internalPrimaryCurrency, selectedAsset } = this.state;
		const { conversionRate, contractExchangeRates } = this.props;
		const exchangeRate = selectedAsset && selectedAsset.address && contractExchangeRates[selectedAsset.address];
		let res;
		// If primary currency is not crypo we need to know if there are conversion and exchange rates to handle0,
		// fiat conversion for the payment request
		if (internalPrimaryCurrency !== 'ETH' && conversionRate && (exchangeRate || selectedAsset.isETH)) {
			res = this.handleFiatPrimaryCurrency(amount && amount.replace(',', '.'));
		} else {
			res = this.handleETHPrimaryCurrency(amount && amount.replace(',', '.'));
		}
		const { cryptoAmount, secondaryAmount, symbol } = res;
		this.setState({ amount, cryptoAmount, secondaryAmount, symbol, showError: false });
	};

	/**
	 * Updates internalPrimaryCurrency
	 */
	switchPrimaryCurrency = async () => {
		const { internalPrimaryCurrency, secondaryAmount } = this.state;
		const primarycurrencies = {
			ETH: 'Fiat',
			Fiat: 'ETH'
		};
		await this.setState({ internalPrimaryCurrency: primarycurrencies[internalPrimaryCurrency] });
		this.updateAmount(secondaryAmount.split(' ')[0]);
	};

	/**
	 * Resets amount on payment request
	 */
	onReset = () => {
		this.updateAmount();
	};

	/**
	 * Generates payment request link and redirects to PaymentRequestSuccess view with it
	 * If there is an error, an error message will be set to display on the view
	 */
	onNext = () => {
		const { selectedAddress, navigation } = this.props;
		const { cryptoAmount, selectedAsset, chainId } = this.state;
		try {
			let eth_link;
			if (selectedAsset.isETH) {
				eth_link = generateETHLink(selectedAddress, cryptoAmount, chainId);
			} else {
				eth_link = generateERC20Link(selectedAddress, selectedAsset.address, cryptoAmount, chainId);
			}

			// Convert to universal link / app link
			const link = generateUniversalLinkRequest(eth_link);

			navigation &&
				navigation.replace('PaymentRequestSuccess', {
					link,
					qrLink: eth_link,
					amount: cryptoAmount,
					symbol: selectedAsset.symbol
				});
		} catch (e) {
			this.setState({ showError: true });
		}
	};

	/**
	 * Renders a view that allows user to set payment request amount
	 */
	renderEnterAmount = () => {
		const { conversionRate, contractExchangeRates } = this.props;
		const { amount, secondaryAmount, symbol, cryptoAmount, showError, selectedAsset } = this.state;
		const exchangeRate = selectedAsset && selectedAsset.address && contractExchangeRates[selectedAsset.address];
		let switchable = true;
		if (!conversionRate) {
			switchable = false;
		} else if (selectedAsset.symbol !== 'ETH' && !exchangeRate) {
			switchable = false;
		}
		return (
			<View style={styles.enterAmountWrapper} testID={'request-amount-screen'}>
				<View>
					<Text style={styles.title}>{strings('payment_request.enter_amount')}</Text>
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
										placeholder={strings('payment_request.amount_placeholder')}
										placeholderTextColor={colors.grey100}
										spellCheck={false}
										style={styles.input}
										value={amount}
										onSubmitEditing={this.onNext}
										ref={this.amountInput}
										testID={'request-amount-input'}
									/>
									<Text style={styles.eth} numberOfLines={1}>
										{symbol}
									</Text>
								</View>
								{secondaryAmount && (
									<Text style={styles.fiatValue} numberOfLines={1}>
										{secondaryAmount}
									</Text>
								)}
							</View>
							{switchable && (
								<View style={styles.switchContainer}>
									<TouchableOpacity
										onPress={this.switchPrimaryCurrency}
										style={styles.switchTouchable}
									>
										<FontAwesome
											onPress={this.focusInput}
											name="exchange"
											size={18}
											color={colors.grey200}
											style={{ transform: [{ rotate: '270deg' }] }}
										/>
									</TouchableOpacity>
								</View>
							)}
						</View>
					</View>
					{showError && (
						<View style={styles.errorWrapper}>
							<Text style={styles.errorText}>{strings('payment_request.request_error')}</Text>
						</View>
					)}
				</View>
				<KeyboardAvoidingView
					style={styles.buttonsWrapper}
					behavior={'padding'}
					keyboardVerticalOffset={KEYBOARD_OFFSET}
					enabled={Platform.OS === 'ios'}
				>
					<View style={styles.buttonsContainer}>
						<StyledButton type={'normal'} onPress={this.onReset} containerStyle={[styles.button]}>
							{strings('payment_request.reset')}
						</StyledButton>
						<StyledButton
							type={'blue'}
							onPress={this.onNext}
							containerStyle={[styles.button]}
							disabled={!cryptoAmount || cryptoAmount === '0'}
						>
							{strings('payment_request.next')}
						</StyledButton>
					</View>
				</KeyboardAvoidingView>
			</View>
		);
	};

	render() {
		const { mode } = this.state;
		return (
			<SafeAreaView style={styles.wrapper}>
				<KeyboardAwareScrollView
					style={styles.contentWrapper}
					contentContainerStyle={styles.scrollViewContainer}
				>
					{mode === MODE_SELECT ? this.renderSelectAssets() : this.renderEnterAmount()}
				</KeyboardAwareScrollView>
			</SafeAreaView>
		);
	}
}

const mapStateToProps = state => ({
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	searchEngine: state.settings.searchEngine,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	tokens: state.engine.backgroundState.AssetsController.tokens,
	primaryCurrency: state.settings.primaryCurrency,
	networkType: state.engine.backgroundState.NetworkController.provider.type
});

export default connect(mapStateToProps)(PaymentRequest);
