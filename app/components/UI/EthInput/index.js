import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Keyboard, ScrollView, Platform, StyleSheet, Text, TextInput, View, Image } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import {
	fromTokenMinimalUnit,
	renderFromTokenMinimalUnit,
	renderFromWei,
	toTokenMinimalUnit,
	fiatNumberToTokenMinimalUnit,
	toWei,
	fiatNumberToWei,
	isDecimal,
	weiToFiatNumber,
	balanceToFiatNumber
} from '../../../util/number';
import { strings } from '../../../../locales/i18n';
import TokenImage from '../TokenImage';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import ElevatedView from 'react-native-elevated-view';
import CollectibleImage from '../CollectibleImage';
import SelectableAsset from './SelectableAsset';
import { getTicker } from '../../../util/transactions';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import DeviceSize from '../../../util/DeviceSize';

const styles = StyleSheet.create({
	root: {
		flex: 1
	},
	container: {
		flex: 1,
		flexDirection: 'row',
		paddingRight: 10,
		paddingVertical: 10,
		paddingLeft: 14,
		position: 'relative',
		borderColor: colors.grey100,
		borderRadius: 4,
		borderWidth: 1
	},
	wrapper: {
		flexDirection: 'row'
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
		maxWidth: DeviceSize.isSmallDevice() ? '40%' : '70%',
		minWidth: 35
	},
	eth: {
		...fontStyles.bold,
		marginRight: 0,
		fontSize: 16,
		paddingTop: Platform.OS === 'android' ? 1 : 0,
		paddingLeft: DeviceSize.isSmallDevice() ? 4 : 10,
		alignSelf: 'center'
	},
	secondaryValue: {
		...fontStyles.normal,
		fontSize: 12
	},
	secondaryCurrency: {
		...fontStyles.normal,
		fontSize: 12,
		textTransform: 'uppercase'
	},
	secondaryValues: {
		flexDirection: 'row',
		maxWidth: '70%'
	},
	split: {
		flexDirection: 'row'
	},
	splitNoSecondaryAmount: {
		top: Platform.OS === 'android' ? 5 : 8
	},
	ethContainer: {
		flex: 1,
		marginLeft: 6,
		marginRight: 10,
		maxWidth: '65%'
	},
	icon: {
		paddingVertical: Platform.OS === 'android' ? 8 : 6,
		marginRight: 10
	},
	logo: {
		width: 22,
		height: 22,
		borderRadius: 11
	},
	actions: {
		position: 'absolute',
		right: 10,
		flexDirection: 'row',
		top: Platform.OS === 'android' ? 18 : 15
	},
	switch: {
		transform: [{ rotate: '270deg' }],
		marginVertical: 3,
		marginHorizontal: DeviceSize.isSmallDevice() ? 0 : 3
	},
	scrollContainer: {
		position: 'relative',
		maxHeight: 200
	},
	optionList: {
		backgroundColor: colors.white,
		borderColor: colors.grey100,
		borderRadius: 4,
		borderWidth: 1,
		paddingHorizontal: 14,
		paddingVertical: 6,
		flexGrow: 1
	},
	selectableAsset: {
		flex: 1,
		paddingVertical: 6
	}
});

const ethLogo = require('../../../images/eth-logo.png'); // eslint-disable-line

/**
 * Form component that allows users to type an amount of ETH and its fiat value is rendered dynamically
 */
class EthInput extends PureComponent {
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
		 * Object containing token balances in the format address => balance
		 */
		tokenBalances: PropTypes.object,
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
		 * Array of ERC20 assets
		 */
		tokens: PropTypes.array,
		/**
		 * Array of ERC721 assets
		 */
		collectibles: PropTypes.array,
		/**
		 * Transaction object associated with this transaction
		 */
		transaction: PropTypes.object,
		/**
		 * Callback to open assets dropdown
		 */
		openEthInput: PropTypes.func,
		/**
		 * Whether assets dropdown is opened
		 */
		isOpen: PropTypes.bool,
		/**
		 * Primary currency, either ETH or Fiat
		 */
		primaryCurrency: PropTypes.string,
		/**
		 * Current provider ticker
		 */
		ticker: PropTypes.string
	};

	state = {
		readableValue: undefined,
		assets: undefined,
		secondaryAmount: undefined,
		internalPrimaryCurrency: this.props.primaryCurrency,
		inputEnabled: Platform.OS === 'ios'
	};

	/**
	 * Used to 'fillMax' feature. Will process value coming from parent to render corresponding values on input
	 */
	componentDidUpdate = () => {
		this.handleComponentDidUpdate();
	};

	handleComponentDidUpdate = () => {
		const { fillMax, readableValue } = this.props;

		if (fillMax) {
			const { processedReadableValue } = this.processValue(readableValue);
			this.setState({ readableValue: processedReadableValue });
		}

		this.props.updateFillMax(false);

		// Workaround https://github.com/facebook/react-native/issues/9958
		!this.state.inputEnabled &&
			setTimeout(() => {
				this.setState({ inputEnabled: true });
			}, 100);
	};

	/**
	 * Depending on transaction type, fill 'readableValue' and 'assets' to be rendered in dorpdown asset selector
	 */
	componentDidMount = () => {
		const { transaction, collectibles } = this.props;
		const processedReadableValue = this.processFromValue(transaction.value);
		switch (transaction.type) {
			case 'TOKENS_TRANSACTION':
				this.setState({
					assets: [
						{
							name: 'Ether',
							symbol: 'ETH',
							isETH: true
						},
						...this.props.tokens
					],
					readableValue: processedReadableValue
				});
				break;
			case 'ETHER_TRANSACTION':
				this.setState({
					assets: [
						{
							name: 'Ether',
							symbol: 'ETH'
						}
					],
					readableValue: processedReadableValue
				});
				break;
			case 'INDIVIDUAL_TOKEN_TRANSACTION':
				this.setState({
					assets: [transaction.selectedAsset],
					readableValue: processedReadableValue
				});
				break;
			case 'INDIVIDUAL_COLLECTIBLE_TRANSACTION':
				this.setState({
					assets: [transaction.selectedAsset]
				});
				break;
			case 'CONTRACT_COLLECTIBLE_TRANSACTION': {
				const collectiblesToShow = collectibles.filter(
					collectible => collectible.address.toLowerCase() === transaction.selectedAsset.address.toLowerCase()
				);
				this.setState({
					assets: collectiblesToShow
				});
				break;
			}
		}
	};

	/**
	 * Callback to openEthInput from props
	 */
	onFocus = () => {
		const { isOpen, openEthInput } = this.props;
		openEthInput && openEthInput(!isOpen);
	};

	/**
	 * Selects new asset from assets dropdown selector
	 *
	 * @param {object} asset - Asset to be selected
	 */
	selectAsset = async asset => {
		Keyboard.dismiss();
		const { handleUpdateAsset, onChange, openEthInput } = this.props;
		openEthInput && openEthInput(false);
		handleUpdateAsset && (await handleUpdateAsset(asset));
		onChange && onChange(undefined);
		this.setState({ readableValue: undefined });
	};

	/**
	 * Depending on 'assetType' return element to be rendered in assets dropdown
	 *
	 * @param {object} asset - Asset to be rendered (ETH, ERC20 or ERC721)
	 * @param {func} onPress - Callback called when object is pressed
	 * @returns {object} - 'SelectableAsset' object with corresponding asset information
	 */
	renderAsset = (asset, onPress) => {
		const { tokenBalances, accounts, selectedAddress, ticker } = this.props;
		const assetsObject = {
			ETH: () => {
				const subTitle = renderFromWei(accounts[selectedAddress].balance) + ' ' + getTicker(ticker);
				const icon = <Image source={ethLogo} style={styles.logo} />;
				return { title: getTicker(ticker), subTitle, icon };
			},
			ERC20: () => {
				const title = asset.symbol;
				const subTitle =
					asset.address in tokenBalances
						? renderFromTokenMinimalUnit(tokenBalances[asset.address], asset.decimals) + ' ' + asset.symbol
						: undefined;
				const icon = <TokenImage asset={asset} containerStyle={styles.logo} iconStyle={styles.logo} />;
				return { title, subTitle, icon };
			},
			ERC721: () => {
				const title = asset.name;
				const subTitle =
					strings('collectible.collectible_token_id') + strings('unit.colon') + ' ' + asset.tokenId;
				const icon = (
					<CollectibleImage collectible={asset} containerStyle={styles.logo} iconStyle={styles.logo} />
				);
				return { title, subTitle, icon };
			}
		};
		let assetType;
		if (asset.isETH) {
			assetType = 'ETH';
		} else if (asset.decimals) {
			assetType = 'ERC20';
		} else {
			assetType = 'ERC721';
		}
		const { title, subTitle, icon } = assetsObject[assetType]();
		return <SelectableAsset onPress={onPress} title={title} subTitle={subTitle} icon={icon} asset={asset} />;
	};

	/**
	 * Render assets list in a dropdown
	 *
	 * @returns {object} - Assets dropdown object in an elevated view
	 */
	renderAssetsList = () => {
		const { assets } = this.state;
		const {
			transaction: { selectedAsset, assetType }
		} = this.props;
		const assetsLists = {
			ETH: () => assets.filter(asset => asset.symbol !== 'ETH'),
			ERC20: () => assets.filter(asset => asset.symbol !== selectedAsset.symbol),
			ERC721: () => assets.filter(asset => asset.tokenId !== selectedAsset.tokenId)
		};
		const assetsList = assetsLists[assetType]();
		return (
			<ElevatedView borderRadius={4} elevation={10} style={styles.root}>
				<ScrollView style={styles.scrollContainer} keyboardShouldPersistTaps={'handled'} nestedScrollEnabled>
					<View style={styles.optionList}>
						{assetsList.map((asset, i) => (
							<View key={i} style={styles.selectableAsset}>
								{this.renderAsset(asset, async () => {
									await this.selectAsset(asset);
								})}
							</View>
						))}
					</View>
				</ScrollView>
			</ElevatedView>
		);
	};

	/**
	 * Handle value from eth input according to app 'primaryCurrency', transforming either Token or Fiat value to corresponding transaction object value.
	 *
	 * @param {String} readableValue - String containing the tx value in readable format
	 * @param {String} internalPrimaryCurrency - If provided, represents internal primary currency
	 * @returns {Object} - Object containing BN instance of the value for the transaction and a string containing readable value
	 * @returns {String} - String containing internalPrimaryCurrency, if not provided will take it from state
	 */
	processValue = (readableValue, internalPrimaryCurrency) => {
		const {
			transaction: { selectedAsset, assetType },
			conversionRate,
			contractExchangeRates
		} = this.props;
		internalPrimaryCurrency = internalPrimaryCurrency || this.state.internalPrimaryCurrency;
		let processedValue, processedReadableValue;
		const decimal = isDecimal(readableValue);
		if (decimal) {
			// Only for ETH or ERC20, depending on 'primaryCurrency' selected
			switch (assetType) {
				case 'ETH':
					if (internalPrimaryCurrency === 'ETH') {
						processedValue = toWei(readableValue);
						processedReadableValue = readableValue;
					} else {
						processedValue = fiatNumberToWei(readableValue, conversionRate);
						processedReadableValue = weiToFiatNumber(toWei(readableValue), conversionRate).toString();
					}
					break;
				case 'ERC20': {
					const exchangeRate =
						selectedAsset && selectedAsset.address && contractExchangeRates[selectedAsset.address];
					if (internalPrimaryCurrency !== 'ETH' && (exchangeRate && exchangeRate !== 0)) {
						processedValue = fiatNumberToTokenMinimalUnit(
							readableValue,
							conversionRate,
							exchangeRate,
							selectedAsset.decimals
						);
						processedReadableValue = balanceToFiatNumber(
							readableValue,
							conversionRate,
							exchangeRate
						).toString();
					} else {
						processedValue = toTokenMinimalUnit(readableValue, selectedAsset.decimals);
						processedReadableValue = readableValue;
					}
				}
			}
		}
		return { processedValue, processedReadableValue };
	};

	/**
	 * Handle generation of readable information for the component from a transaction value
	 *
	 * @param {Object} value - Transaction value
	 * @returns {String} - Readable transaction value depending on primaryCurrency
	 */
	processFromValue = value => {
		if (!value) return undefined;
		const {
			transaction: { selectedAsset, assetType },
			conversionRate,
			contractExchangeRates
		} = this.props;
		const { internalPrimaryCurrency } = this.state;
		let processedReadableValue;
		// Only for ETH or ERC20, depending on 'primaryCurrency' selected
		switch (assetType) {
			case 'ETH':
				if (internalPrimaryCurrency === 'ETH') {
					processedReadableValue = renderFromWei(value);
				} else {
					processedReadableValue = weiToFiatNumber(value, conversionRate).toString();
				}
				break;
			case 'ERC20': {
				const exchangeRate =
					selectedAsset && selectedAsset.address && contractExchangeRates[selectedAsset.address];
				if (internalPrimaryCurrency !== 'ETH' && (exchangeRate && exchangeRate !== 0)) {
					processedReadableValue = balanceToFiatNumber(value, conversionRate, exchangeRate).toString();
				} else {
					processedReadableValue = renderFromTokenMinimalUnit(value, selectedAsset.decimals);
				}
			}
		}
		return processedReadableValue;
	};

	/**
	 * On value change, callback to props 'onChange' and update 'readableValue'
	 */
	onChange = value => {
		const { onChange } = this.props;
		const { processedValue } = this.processValue(value && value.replace(',', '.'));
		onChange && onChange(processedValue, value);
		this.setState({ readableValue: value });
	};

	/**
	 * Returns object to be rendered as input field. Only for ETH and ERC20 tokens
	 *
	 * @param {object} image - Image object of the asset
	 * @param {tsring} currency - String containing currency code
	 * @param {string} secondaryAmount - String containing amount depending on primary currency
	 * @param {string} secondaryCurrency - String containing currency code
	 * @returns {object} - View object to render as input field
	 */
	renderTokenInput = (image, currency, secondaryAmount, secondaryCurrency) => {
		const {
			transaction: { paymentChannelTransaction }
		} = this.props;
		const { readableValue, assets } = this.state;
		const selectAssets = assets && assets.length > 1;
		return (
			<View style={styles.container}>
				<View style={styles.icon}>{image}</View>
				<View style={styles.ethContainer}>
					<View style={[styles.split, !secondaryAmount ? styles.splitNoSecondaryAmount : {}]}>
						<TextInput
							autoCapitalize="none"
							autoCorrect={false}
							editable={this.state.inputEnabled}
							keyboardType="numeric"
							numberOfLines={1}
							onChangeText={this.onChange}
							placeholder={'0.00'}
							placeholderTextColor={colors.grey100}
							spellCheck={false}
							style={styles.input}
							value={readableValue}
							testID={'amount-input'}
						/>
						<Text style={styles.eth} numberOfLines={1}>
							{currency}
						</Text>
					</View>
					{secondaryAmount !== undefined && (
						<View style={styles.secondaryValues}>
							<Text style={styles.secondaryValue} numberOfLines={1}>
								{secondaryAmount}
							</Text>
							<Text style={styles.secondaryCurrency} numberOfLines={1}>
								{` ${secondaryCurrency}`}
							</Text>
						</View>
					)}
				</View>
				<View style={[styles.actions]}>
					{secondaryCurrency && (
						<FontAwesome
							onPress={() => this.switchInternalPrimaryCurrency(secondaryAmount)} // eslint-disable-line react/jsx-no-bind
							name="exchange"
							size={18}
							color={colors.grey100}
							style={styles.switch}
						/>
					)}
					{!paymentChannelTransaction && selectAssets && (
						<MaterialIcon
							onPress={this.onFocus}
							name={'arrow-drop-down'}
							size={24}
							color={colors.grey100}
						/>
					)}
				</View>
			</View>
		);
	};

	/**
	 * Returns object to render input, depending on 'assetType'
	 *
	 * @returns {object} - View object to render as input field
	 */
	renderInput = () => {
		const {
			currentCurrency,
			contractExchangeRates,
			conversionRate,
			transaction: { assetType, selectedAsset, value },
			ticker
		} = this.props;
		const { internalPrimaryCurrency } = this.state;

		// Depending on 'assetType' return object with corresponding 'secondaryAmount', 'currency' and 'image'
		const inputs = {
			ETH: () => {
				let secondaryAmount, currency, secondaryCurrency;
				if (internalPrimaryCurrency === 'ETH') {
					secondaryAmount = weiToFiatNumber(value, conversionRate).toString();
					secondaryCurrency = currentCurrency;
					currency = getTicker(ticker);
				} else {
					secondaryAmount = renderFromWei(value);
					secondaryCurrency = getTicker(ticker);
					currency = currentCurrency;
				}
				const image = <Image source={ethLogo} style={styles.logo} />;
				return this.renderTokenInput(image, currency, secondaryAmount, secondaryCurrency);
			},
			ERC20: () => {
				const exchangeRate =
					selectedAsset && selectedAsset.address && contractExchangeRates[selectedAsset.address];
				let secondaryAmount, currency, secondaryCurrency;
				if (exchangeRate && exchangeRate !== 0) {
					if (internalPrimaryCurrency === 'ETH') {
						const finalValue = (value && fromTokenMinimalUnit(value, selectedAsset.decimals)) || 0;
						secondaryAmount = balanceToFiatNumber(finalValue, conversionRate, exchangeRate).toString();
						currency = selectedAsset.symbol;
						secondaryCurrency = currentCurrency;
					} else {
						const finalValue = (value && renderFromTokenMinimalUnit(value, selectedAsset.decimals)) || 0;
						secondaryAmount = finalValue.toString();
						currency = currentCurrency;
						secondaryCurrency = selectedAsset.symbol;
					}
				} else {
					currency =
						internalPrimaryCurrency === 'ETH' ? selectedAsset.symbol : currentCurrency && currentCurrency;
				}

				const image = <TokenImage asset={selectedAsset} containerStyle={styles.logo} iconStyle={styles.logo} />;
				return this.renderTokenInput(image, currency, secondaryAmount, secondaryCurrency);
			},
			ERC721: () => {
				const { assets } = this.state;
				const selectAssets = assets && assets.length > 1;
				return (
					<View style={styles.container}>
						<SelectableAsset
							title={selectedAsset.name}
							subTitle={`${strings('unit.token_id')}${selectedAsset.tokenId}`}
							icon={
								<CollectibleImage
									collectible={selectedAsset}
									containerStyle={styles.logo}
									iconStyle={styles.logo}
								/>
							}
							asset={selectedAsset}
						/>
						<View style={[styles.actions]}>
							{selectAssets && (
								<MaterialIcon
									onPress={this.onFocus}
									name={'arrow-drop-down'}
									size={24}
									color={colors.grey100}
								/>
							)}
						</View>
					</View>
				);
			}
		};
		return assetType && inputs[assetType]();
	};

	/**
	 * Handle change of primary currency
	 */
	switchInternalPrimaryCurrency = secondaryAmount => {
		const { internalPrimaryCurrency } = this.state;
		const primarycurrencies = {
			ETH: 'Fiat',
			Fiat: 'ETH'
		};
		this.setState({
			readableValue: secondaryAmount,
			internalPrimaryCurrency: primarycurrencies[internalPrimaryCurrency]
		});
	};

	render = () => {
		const { assets } = this.state;
		const { isOpen } = this.props;
		const selectAssets = assets && assets.length > 1;
		return (
			<View style={styles.root}>
				<View style={styles.wrapper}>{this.renderInput()}</View>
				{selectAssets && isOpen && this.renderAssetsList()}
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
	tokenBalances: state.engine.backgroundState.TokenBalancesController.contractBalances,
	collectibles: state.engine.backgroundState.AssetsController.collectibles,
	transaction: state.transaction,
	primaryCurrency: state.settings.primaryCurrency,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker
});

export default connect(mapStateToProps)(EthInput);
