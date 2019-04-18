import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Keyboard, ScrollView, Platform, StyleSheet, Text, TextInput, View, Image } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import {
	weiToFiat,
	balanceToFiat,
	fromTokenMinimalUnit,
	renderFromTokenMinimalUnit,
	renderFromWei
} from '../../../util/number';
import { strings } from '../../../../locales/i18n';
import TokenImage from '../TokenImage';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import ElevatedView from 'react-native-elevated-view';
import CollectibleImage from '../CollectibleImage';
import SelectableAsset from './SelectableAsset';

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
	input: {
		...fontStyles.bold,
		backgroundColor: colors.white,
		borderWidth: 0,
		fontSize: 16,
		paddingBottom: 0,
		paddingRight: 0,
		paddingLeft: 0,
		paddingTop: 0,
		maxWidth: '80%'
	},
	eth: {
		...fontStyles.bold,
		marginRight: 30,
		fontSize: 16,
		paddingTop: Platform.OS === 'android' ? 3 : 0,
		paddingLeft: 10
	},
	fiatValue: {
		...fontStyles.normal,
		fontSize: 12
	},
	split: {
		flex: 1,
		flexDirection: 'row'
	},
	ethContainer: {
		flex: 1,
		paddingLeft: 6,
		paddingRight: 10
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
	arrow: {
		color: colors.grey100,
		position: 'absolute',
		right: 10,
		top: Platform.OS === 'android' ? 20 : 13
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
		isOpen: PropTypes.bool
	};

	state = { readableValue: undefined, assets: undefined };

	componentDidUpdate = () => {
		const { fillMax, readableValue } = this.props;
		if (fillMax) {
			this.setState({ readableValue });
		}
		this.props.updateFillMax(false);
	};

	componentDidMount = () => {
		const { transaction, collectibles } = this.props;
		switch (transaction.type) {
			case 'TOKENS_TRANSACTION':
				this.setState({
					assets: [
						{
							name: 'Ether',
							symbol: 'ETH'
						},
						...this.props.tokens
					],
					readableValue: transaction.readableValue
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
					readableValue: transaction.readableValue
				});
				break;
			case 'INDIVIDUAL_TOKEN_TRANSACTION':
				this.setState({
					assets: [transaction.selectedAsset],
					readableValue: transaction.readableValue
				});
				break;
			case 'INDIVIDUAL_COLLECTIBLE_TRANSACTION':
				this.setState({
					assets: [transaction.selectedAsset],
					readableValue: transaction.readableValue
				});
				break;
			case 'CONTRACT_COLLECTIBLE_TRANSACTION': {
				const collectiblesToShow = collectibles.filter(
					collectible => collectible.address.toLowerCase() === transaction.selectedAsset.address.toLowerCase()
				);
				this.setState({
					assets: collectiblesToShow,
					readableValue: transaction.readableValue
				});
				break;
			}
		}
	};

	onFocus = () => {
		const { isOpen, openEthInput } = this.props;
		openEthInput && openEthInput(!isOpen);
	};

	selectAsset = async asset => {
		Keyboard.dismiss();
		const { handleUpdateAsset, onChange, openEthInput } = this.props;
		openEthInput && openEthInput(false);
		handleUpdateAsset && (await handleUpdateAsset(asset));
		onChange && onChange(undefined);
		this.setState({ readableValue: undefined });
	};

	renderAsset = (asset, onPress) => {
		const { assetType } = this.props.transaction;
		let title, subTitle, icon;
		if (assetType === 'ERC20' || assetType === 'ETH') {
			const { tokenBalances, accounts, selectedAddress } = this.props;
			title = asset.symbol;
			subTitle =
				asset.symbol !== 'ETH'
					? asset.address in tokenBalances
						? renderFromTokenMinimalUnit(tokenBalances[asset.address], asset.decimals) + ' ' + asset.symbol
						: undefined
					: renderFromWei(accounts[selectedAddress].balance) + ' ' + asset.symbol;
			icon =
				asset.symbol !== 'ETH' ? (
					<TokenImage asset={asset} containerStyle={styles.logo} iconStyle={styles.logo} />
				) : (
					<Image source={ethLogo} style={styles.logo} />
				);
		} else {
			title = asset.name;
			subTitle = strings('collectible.collectible_token_id') + strings('unit.colon') + ' ' + asset.tokenId;
			icon = <CollectibleImage collectible={asset} containerStyle={styles.logo} iconStyle={styles.logo} />;
		}
		return <SelectableAsset onPress={onPress} title={title} subTitle={subTitle} icon={icon} asset={asset} />;
	};

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

	onChange = value => {
		const { onChange } = this.props;
		onChange && onChange(value);
		this.setState({ readableValue: value });
	};

	renderInput = () => {
		const {
			currentCurrency,
			readonly,
			contractExchangeRates,
			conversionRate,
			transaction: { assetType, selectedAsset, value }
		} = this.props;
		const { readableValue } = this.state;
		const inputs = {
			ETH: () => {
				const convertedAmount = weiToFiat(value, conversionRate, currentCurrency.toUpperCase());
				return (
					<View style={styles.container}>
						<View style={styles.icon}>
							<Image source={ethLogo} style={styles.logo} />
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
									{strings('unit.eth')}
								</Text>
							</View>
							<Text style={styles.fiatValue} numberOfLines={1}>
								{convertedAmount}
							</Text>
						</View>
					</View>
				);
			},
			ERC20: () => {
				const exchangeRate = contractExchangeRates[selectedAsset.address];
				let convertedAmount;
				if (exchangeRate) {
					convertedAmount = balanceToFiat(
						(value && fromTokenMinimalUnit(value, selectedAsset.decimals)) || 0,
						conversionRate,
						exchangeRate,
						currentCurrency.toUpperCase()
					);
				} else {
					convertedAmount = strings('transaction.conversion_not_available');
				}
				return (
					<View style={styles.container}>
						<View style={styles.icon}>
							<TokenImage asset={selectedAsset} containerStyle={styles.logo} iconStyle={styles.logo} />
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
									{selectedAsset.symbol}
								</Text>
							</View>
							<Text style={styles.fiatValue} numberOfLines={1}>
								{convertedAmount}
							</Text>
						</View>
					</View>
				);
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

	render = () => {
		const { assets } = this.state;
		const { isOpen } = this.props;
		const selectAssets = assets && assets.length > 1;
		return (
			<View style={styles.root}>
				{this.renderInput()}
				{selectAssets && (
					<MaterialIcon onPress={this.onFocus} name={'arrow-drop-down'} size={24} style={styles.arrow} />
				)}
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
	transaction: state.transaction
});

export default connect(mapStateToProps)(EthInput);
