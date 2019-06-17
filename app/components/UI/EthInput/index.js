import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Keyboard, ScrollView, Platform, StyleSheet, Text, TextInput, View, Image } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import {
	balanceToFiat,
	fromTokenMinimalUnit,
	renderFromTokenMinimalUnit,
	renderFromWei,
	toTokenMinimalUnit,
	fiatNumberToTokenMinimalUnit,
	toWei,
	fiatNumberToWei,
	isDecimal,
	weiToFiatNumber
} from '../../../util/number';
import { strings } from '../../../../locales/i18n';
import TokenImage from '../TokenImage';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import ElevatedView from 'react-native-elevated-view';
import CollectibleImage from '../CollectibleImage';
import SelectableAsset from './SelectableAsset';
import { getTicker } from '../../../util/transactions';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

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
		backgroundColor: colors.white,
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
		maxWidth: '70%'
	},
	eth: {
		...fontStyles.bold,
		marginRight: 30,
		fontSize: 16,
		paddingTop: Platform.OS === 'android' ? 3 : 0,
		paddingLeft: 10,
		alignSelf: 'center'
	},
	secondaryValue: {
		...fontStyles.normal,
		fontSize: 12
	},
	secondaryCurrency: {
		...fontStyles.normal,
		fontSize: 12
	},
	secondaryValues: {
		flexDirection: 'row',
		maxWidth: '70%'
	},
	split: {
		flex: 1,
		flexDirection: 'row'
	},
	ethContainer: {
		flex: 1,
		paddingLeft: 6,
		paddingRight: 10,
		maxWidth: '65%'
	},
	icon: {
		paddingBottom: 4,
		paddingRight: 10,
		paddingTop: 6
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
		top: Platform.OS === 'android' ? 20 : 13
	},
	switch: {
		transform: [{ rotate: '270deg' }],
		marginVertical: 3,
		marginHorizontal: 3
	},
	componentContainer: {
		position: 'relative',
		maxHeight: 200,
		borderRadius: 4
	},
	optionList: {
		backgroundColor: colors.white,
		borderColor: colors.grey100,
		borderRadius: 4,
		borderWidth: 1,
		paddingLeft: 14,
		paddingBottom: 12,
		width: '100%'
	},
	selectableAsset: {
		paddingTop: 12
	}
});

const ethLogo = require('../../../images/eth-logo.png'); // eslint-disable-line

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
		internalPrimaryCurrency: this.props.primaryCurrency
	};

	/**
	 * Used to 'fillMax' feature. Will process value coming from parent to render corresponding values on input
	 */
	componentDidUpdate = () => {
		const { fillMax, readableValue } = this.props;
		if (fillMax) {
			const { processedReadableValue } = this.processValue(readableValue);
			this.setState({ readableValue: processedReadableValue });
		}
		this.props.updateFillMax(false);
	};

	/**
	 * Depending on transaction type, fill 'readableValue' and 'assets' to be rendered in dorpdown asset selector
	 */
	componentDidMount = () => {
		const { transaction, collectibles } = this.props;
		const { processedReadableValue } = this.processValue(transaction.readableValue);
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
			<ElevatedView elevation={10} style={styles.root}>
				<ScrollView style={styles.componentContainer} keyboardShouldPersistTaps={'handled'}>
					<View style={styles.optionList}>
						{assetsList.map(asset => (
							<View
								key={asset.address + asset.tokenId || asset.symbol || undefined}
								style={styles.selectableAsset}
							>
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
	 * @returns {Object} - Object containing BN instance of the value for the transaction and a string containing readable value
	 */
	processValue = value => {
		const {
			transaction: { selectedAsset, assetType },
			conversionRate,
			contractExchangeRates
		} = this.props;
		const { internalPrimaryCurrency } = this.state;
		let processedValue, processedReadableValue;
		const decimal = isDecimal(value);
		if (decimal) {
			// Only for ETH or ERC20, depending on 'primaryCurrency' selected
			switch (assetType) {
				case 'ETH':
					if (internalPrimaryCurrency === 'ETH') {
						processedValue = toWei(value);
						processedReadableValue = value;
					} else {
						processedValue = fiatNumberToWei(value, conversionRate);
						processedReadableValue = weiToFiatNumber(toWei(value), conversionRate).toString();
					}
					break;
				case 'ERC20': {
					const exchangeRate =
						selectedAsset && selectedAsset.address && contractExchangeRates[selectedAsset.address];
					if (internalPrimaryCurrency !== 'ETH' && (exchangeRate && exchangeRate !== 0)) {
						processedValue = fiatNumberToTokenMinimalUnit(
							value,
							conversionRate,
							exchangeRate,
							selectedAsset.decimals
						);
						processedReadableValue = balanceToFiat(value, conversionRate, exchangeRate, '');
					} else {
						processedValue = toTokenMinimalUnit(value, selectedAsset.decimals);
						processedReadableValue = value;
					}
				}
			}
		}
		return { processedValue, processedReadableValue };
	};

	/**
	 * On value change, callback to props 'onChange' and update 'readableValue'
	 */
	onChange = value => {
		const { onChange } = this.props;
		const { processedValue } = this.processValue(value);
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
		const { readonly } = this.props;
		const { readableValue } = this.state;
		return (
			<View style={styles.container}>
				<View style={styles.icon}>{image}</View>
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
							{currency}
						</Text>
					</View>
					{secondaryAmount !== undefined && (
						<View style={styles.secondaryValues}>
							<Text style={styles.secondaryValue} numberOfLines={1}>
								{secondaryAmount}
							</Text>
							<Text style={styles.secondaryCurrency} numberOfLines={1}>
								{' '}
								{secondaryCurrency}
							</Text>
						</View>
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
					secondaryAmount = weiToFiatNumber(value, conversionRate);
					secondaryCurrency = currentCurrency.toUpperCase();
					currency = getTicker(ticker);
				} else {
					secondaryAmount = renderFromWei(value);
					secondaryCurrency = getTicker(ticker);
					currency = currentCurrency.toUpperCase();
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
						secondaryAmount = balanceToFiat(finalValue, conversionRate, exchangeRate, currentCurrency);
						currency = selectedAsset.symbol;
					} else {
						const finalValue = (value && renderFromTokenMinimalUnit(value, selectedAsset.decimals)) || 0;
						secondaryAmount = finalValue + ' ' + selectedAsset.symbol;
						currency = currentCurrency.toUpperCase();
					}
				} else {
					secondaryAmount = strings('transaction.conversion_not_available');
					currency =
						internalPrimaryCurrency === 'ETH'
							? selectedAsset.symbol
							: currentCurrency && currentCurrency.toUpperCase();
				}

				const image = <TokenImage asset={selectedAsset} containerStyle={styles.logo} iconStyle={styles.logo} />;
				return this.renderTokenInput(image, currency, secondaryAmount, secondaryCurrency);
			},
			ERC721: () => (
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
				</View>
			)
		};
		return assetType && inputs[assetType]();
	};

	swithInternalPrimaryCurrency = async () => {
		const { internalPrimaryCurrency, readableValue } = this.state;
		const primarycurrencies = {
			ETH: 'Fiat',
			Fiat: 'ETH'
		};
		await this.setState({ internalPrimaryCurrency: primarycurrencies[internalPrimaryCurrency] });
		this.onChange(readableValue);
	};

	render = () => {
		const { assets } = this.state;
		const { isOpen } = this.props;
		const selectAssets = assets && assets.length > 1;
		return (
			<View style={styles.root}>
				<View style={styles.wrapper}>
					{this.renderInput()}
					<View style={[styles.actions]}>
						<FontAwesome
							onPress={this.swithInternalPrimaryCurrency}
							name="exchange"
							size={18}
							color={colors.grey100}
							style={styles.switch}
						/>
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
