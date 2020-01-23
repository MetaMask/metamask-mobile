import React, { PureComponent } from 'react';
import { colors, fontStyles } from '../../../../styles/common';
import {
	StyleSheet,
	Text,
	SafeAreaView,
	View,
	TouchableOpacity,
	TextInput,
	Platform,
	KeyboardAvoidingView,
	FlatList,
	Image
} from 'react-native';
import { connect } from 'react-redux';
import { setSelectedAsset, prepareTransaction } from '../../../../actions/newTransaction';
import { getSendFlowTitle } from '../../../UI/Navbar';
import StyledButton from '../../../UI/StyledButton';
import PropTypes from 'prop-types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Modal from 'react-native-modal';
import TokenImage from '../../../UI/TokenImage';
import {
	renderFromTokenMinimalUnit,
	balanceToFiat,
	renderFromWei,
	weiToFiat,
	fromWei,
	fromTokenMinimalUnit,
	toWei,
	isDecimal,
	toTokenMinimalUnit,
	fiatNumberToWei,
	fiatNumberToTokenMinimalUnit,
	weiToFiatNumber,
	balanceToFiatNumber,
	getCurrencySymbol
} from '../../../../util/number';
import { getTicker, generateTransferData, getEther } from '../../../../util/transactions';
import { hexToBN, BNToHex } from 'gaba/dist/util';
import FadeIn from 'react-native-fade-in-image';
import ErrorMessage from '../ErrorMessage';
import { fetchBasicGasEstimates, apiEstimateModifiedToWEI } from '../../../../util/custom-gas';
import Engine from '../../../../core/Engine';
import CollectibleImage from '../../../UI/CollectibleImage';
import collectiblesTransferInformation from '../../../../util/collectibles-transfer';
import { strings } from '../../../../../locales/i18n';
import TransactionTypes from '../../../../core/TransactionTypes';
import DeviceSize from '../../../../util/DeviceSize';
import { BN } from 'ethereumjs-util';

const KEYBOARD_OFFSET = DeviceSize.isSmallDevice() ? 80 : 120;

const ethLogo = require('../../../../images/eth-logo.png'); // eslint-disable-line

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: colors.white
	},
	buttonNextWrapper: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'flex-end'
	},
	buttonNext: {
		flex: 1,
		marginHorizontal: 24
	},
	inputWrapper: {
		flex: 1,
		marginTop: 30,
		marginHorizontal: 24
	},
	actionsWrapper: {
		flexDirection: 'row'
	},
	action: {
		flex: 1,
		alignItems: 'center'
	},
	actionBorder: {
		flex: 0.8
	},
	actionDropdown: {
		backgroundColor: colors.blue,
		paddingHorizontal: 16,
		paddingVertical: 2,
		borderRadius: 100,
		flexDirection: 'row',
		alignItems: 'center'
	},
	textDropdown: {
		...fontStyles.normal,
		fontSize: 14,
		color: colors.white,
		paddingVertical: 2
	},
	iconDropdown: {
		paddingLeft: 10
	},
	maxText: {
		...fontStyles.normal,
		fontSize: 12,
		color: colors.blue,
		alignSelf: 'flex-end',
		textTransform: 'uppercase'
	},
	actionMax: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-end'
	},
	actionMaxTouchable: {},
	inputContainerWrapper: {
		marginVertical: 16,
		alignItems: 'center'
	},
	inputContainer: {
		flexDirection: 'row'
	},
	inputCurrencyText: {
		fontFamily: 'Roboto-Light',
		fontWeight: fontStyles.light.fontWeight,
		color: colors.black,
		fontSize: 44,
		marginRight: 8,
		paddingVertical: Platform.OS === 'ios' ? 0 : 8,
		justifyContent: 'center',
		alignItems: 'center'
	},
	textInput: {
		fontFamily: 'Roboto-Light',
		fontWeight: fontStyles.light.fontWeight,
		fontSize: 44,
		textAlign: 'center'
	},
	switch: {
		flex: 1,
		marginTop: Platform.OS === 'ios' ? 0 : 2
	},
	actionSwitch: {
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 8,
		flexDirection: 'row',
		borderColor: colors.grey500,
		borderWidth: 1,
		right: -2
	},
	textSwitch: {
		...fontStyles.normal,
		fontSize: 14,
		color: colors.grey500,
		textTransform: 'uppercase'
	},
	switchWrapper: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	},
	tokenImage: {
		width: 36,
		height: 36,
		overflow: 'hidden'
	},
	assetElementWrapper: {
		height: 70,
		backgroundColor: colors.white,
		borderWidth: 1,
		borderColor: colors.grey000,
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 24
	},
	assetElement: {
		flexDirection: 'row',
		flex: 1
	},
	assetsModalWrapper: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
		height: 450
	},
	titleWrapper: {
		width: '100%',
		height: 33,
		alignItems: 'center',
		justifyContent: 'center',
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: colors.grey100
	},
	dragger: {
		width: 48,
		height: 5,
		borderRadius: 4,
		backgroundColor: colors.grey400,
		opacity: Platform.OS === 'android' ? 0.6 : 0.5
	},
	textAssetTitle: {
		...fontStyles.normal,
		fontSize: 18
	},
	assetInformationWrapper: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginLeft: 16
	},
	assetBalanceWrapper: {
		flexDirection: 'column'
	},
	textAssetBalance: {
		...fontStyles.normal,
		fontSize: 18,
		textAlign: 'right'
	},
	textAssetFiat: {
		...fontStyles.normal,
		fontSize: 12,
		color: colors.grey500,
		textAlign: 'right',
		textTransform: 'uppercase'
	},
	ethLogo: {
		width: 36,
		height: 36
	},
	errorMessageWrapper: {
		marginVertical: 16
	},
	collectibleImage: {
		width: 120,
		height: 120
	},
	collectibleName: {
		...fontStyles.normal,
		fontSize: 32,
		color: colors.grey500,
		textAlign: 'center'
	},
	collectibleId: {
		...fontStyles.normal,
		fontSize: 14,
		color: colors.grey500,
		marginTop: 8,
		textAlign: 'center'
	},
	collectibleInputWrapper: {
		margin: 24
	},
	collectibleInputImageWrapper: {
		flexDirection: 'column',
		alignItems: 'center'
	},
	collectibleInputInformationWrapper: {
		marginTop: 12
	},
	nextActionWrapper: {
		flex: 1,
		marginBottom: 16
	}
});

/**
 * View that wraps the wraps the "Send" screen
 */
class Amount extends PureComponent {
	static navigationOptions = ({ navigation }) => getSendFlowTitle('send.amount', navigation);

	static propTypes = {
		/**
		 * Map of accounts to information objects including balances
		 */
		accounts: PropTypes.object,
		/**
		 * Array of collectible objects
		 */
		collectibles: PropTypes.array,
		/**
		 * An array that represents the user collectible contracts
		 */
		collectibleContracts: PropTypes.array,
		/**
		 * Object containing token balances in the format address => balance
		 */
		contractBalances: PropTypes.object,
		/**
		 * ETH to current currency conversion rate
		 */
		conversionRate: PropTypes.number,
		/**
		 * Currency code of the currently-active currency
		 */
		currentCurrency: PropTypes.string,
		/**
		 * Object containing token exchange rates in the format address => exchangeRate
		 */
		contractExchangeRates: PropTypes.object,
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object,
		/**
		 * A string that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * An array that represents the user tokens
		 */
		tokens: PropTypes.array,
		/**
		 * Current provider ticker
		 */
		ticker: PropTypes.string,
		/**
		 * Set selected in transaction state
		 */
		setSelectedAsset: PropTypes.func,
		/**
		 * Set transaction object to be sent
		 */
		prepareTransaction: PropTypes.func,
		/**
		 * Primary currency, either ETH or Fiat
		 */
		primaryCurrency: PropTypes.string,
		/**
		 * Selected asset from current transaction state
		 */
		selectedAsset: PropTypes.object,
		/**
		 * Current transaction state
		 */
		transactionState: PropTypes.object
	};

	state = {
		amountError: undefined,
		inputValue: undefined,
		inputValueConversion: undefined,
		renderableInputValueConversion: undefined,
		assetsModalVisible: false,
		internalPrimaryCurrencyIsCrypto: this.props.primaryCurrency === 'ETH',
		estimatedTotalGas: undefined,
		hasExchangeRate: false
	};

	amountInput = React.createRef();
	tokens = [];
	collectibles = [];

	componentDidMount = async () => {
		const { tokens, ticker } = this.props;
		this.tokens = [getEther(ticker), ...tokens];
		this.collectibles = this.processCollectibles();
		this.amountInput && this.amountInput.current && this.amountInput.current.focus();
		this.onInputChange();
		const estimatedTotalGas = await this.estimateTransactionTotalGas();
		this.setState({ estimatedTotalGas });
	};

	onNext = async () => {
		const { navigation, selectedAsset } = this.props;
		const { inputValue, inputValueConversion, internalPrimaryCurrencyIsCrypto, hasExchangeRate } = this.state;
		const value = internalPrimaryCurrencyIsCrypto || !hasExchangeRate ? inputValue : inputValueConversion;
		if (!selectedAsset.tokenId && this.validateAmount(value)) return;
		await this.prepareTransaction(value);
		navigation.navigate('Confirm');
	};

	prepareTransaction = async value => {
		const {
			prepareTransaction,
			selectedAsset,
			transactionState: { transaction, transactionTo }
		} = this.props;
		if (selectedAsset.isETH) {
			transaction.data = undefined;
			transaction.to = transactionTo;
			transaction.value = BNToHex(toWei(value));
		} else if (selectedAsset.tokenId) {
			const collectibleTransferInformation = collectiblesTransferInformation[selectedAsset.address.toLowerCase()];
			if (
				!collectibleTransferInformation ||
				(collectibleTransferInformation.tradable && collectibleTransferInformation.method === 'transferFrom')
			) {
				transaction.data = generateTransferData('transferFrom', {
					fromAddress: transaction.from,
					toAddress: transactionTo,
					tokenId: selectedAsset.tokenId
				});
			} else if (
				collectibleTransferInformation.tradable &&
				collectibleTransferInformation.method === 'transfer'
			) {
				transaction.data = generateTransferData('transfer', {
					toAddress: transactionTo,
					amount: selectedAsset.tokenId.toString(16)
				});
			}
			transaction.to = selectedAsset.address;
			transaction.value = '0x0';
		} else {
			const tokenAmount = toTokenMinimalUnit(value, selectedAsset.decimals);
			transaction.data = generateTransferData('transfer', {
				toAddress: transactionTo,
				amount: BNToHex(tokenAmount)
			});
			transaction.to = selectedAsset.address;
			transaction.value = '0x0';
		}
		prepareTransaction(transaction);
	};

	/**
	 * Validates crypto value only
	 * Independent of current internalPrimaryCurrencyIsCrypto
	 *
	 * @param {string} - Crypto value
	 * @returns - Whether there is an error with the amount
	 */
	validateAmount = inputValue => {
		const { accounts, selectedAddress, contractBalances, selectedAsset } = this.props;
		const { estimatedTotalGas } = this.state;
		let weiBalance, weiInput, amountError;
		if (isDecimal(inputValue)) {
			if (selectedAsset.isETH) {
				weiBalance = hexToBN(accounts[selectedAddress].balance);
				weiInput = toWei(inputValue).add(estimatedTotalGas);
			} else {
				weiBalance = contractBalances[selectedAsset.address];
				weiInput = toTokenMinimalUnit(inputValue, selectedAsset.decimals);
			}
			amountError = weiBalance.gte(weiInput) ? undefined : strings('transaction.insufficient');
		} else {
			amountError = strings('transaction.invalid_amount');
		}
		this.setState({ amountError });
		return !!amountError;
	};

	/**
	 * Estimate transaction gas with information available
	 */
	estimateTransactionTotalGas = async () => {
		const { TransactionController } = Engine.context;
		const {
			transaction: { from },
			transactionTo
		} = this.props.transactionState;
		let estimation, basicGasEstimates;
		try {
			estimation = await TransactionController.estimateGas({
				from,
				to: transactionTo
			});
		} catch (e) {
			estimation = { gas: TransactionTypes.CUSTOM_GAS.DEFAULT_GAS_LIMIT };
		}
		try {
			basicGasEstimates = await fetchBasicGasEstimates();
		} catch (error) {
			basicGasEstimates = { average: 20 };
		}
		const gas = hexToBN(estimation.gas);
		const gasPrice = apiEstimateModifiedToWEI(basicGasEstimates.average);
		return gas.mul(gasPrice);
	};

	useMax = () => {
		const {
			accounts,
			selectedAddress,
			contractBalances,
			selectedAsset,
			conversionRate,
			contractExchangeRates
		} = this.props;
		const { internalPrimaryCurrencyIsCrypto, estimatedTotalGas } = this.state;
		let input;
		if (selectedAsset.isETH) {
			const balanceBN = hexToBN(accounts[selectedAddress].balance);
			const realMaxValue = balanceBN.sub(estimatedTotalGas);
			const maxValue = balanceBN.isZero() || realMaxValue.isNeg() ? new BN(0) : realMaxValue;
			if (internalPrimaryCurrencyIsCrypto) {
				input = fromWei(maxValue);
			} else {
				input = `${weiToFiatNumber(maxValue, conversionRate)}`;
			}
		} else {
			const exchangeRate = contractExchangeRates[selectedAsset.address];
			if (internalPrimaryCurrencyIsCrypto || !exchangeRate) {
				input = fromTokenMinimalUnit(contractBalances[selectedAsset.address], selectedAsset.decimals);
			} else {
				input = `${balanceToFiatNumber(
					fromTokenMinimalUnit(contractBalances[selectedAsset.address], selectedAsset.decimals),
					conversionRate,
					exchangeRate
				)}`;
			}
		}
		this.onInputChange(input);
	};

	onInputChange = (inputValue, selectedAsset) => {
		const { contractExchangeRates, conversionRate, currentCurrency, ticker } = this.props;
		const { internalPrimaryCurrencyIsCrypto } = this.state;
		let inputValueConversion, renderableInputValueConversion, hasExchangeRate;
		const processedTicker = getTicker(ticker);
		const processedInputValue = isDecimal(inputValue) ? inputValue : '0';
		selectedAsset = selectedAsset || this.props.selectedAsset;
		if (selectedAsset.isETH) {
			hasExchangeRate = true;
			if (internalPrimaryCurrencyIsCrypto) {
				inputValueConversion = `${weiToFiatNumber(toWei(processedInputValue.toString(16)), conversionRate)}`;
				renderableInputValueConversion = `${weiToFiat(
					toWei(processedInputValue.toString(16)),
					conversionRate,
					currentCurrency
				)}`;
			} else {
				inputValueConversion = `${renderFromWei(fiatNumberToWei(processedInputValue, conversionRate))}`;
				renderableInputValueConversion = `${inputValueConversion} ${processedTicker}`;
			}
		} else {
			const exchangeRate = contractExchangeRates[selectedAsset.address];
			hasExchangeRate = !!exchangeRate;
			// If !hasExchangeRate we have to handle crypto amount
			if (internalPrimaryCurrencyIsCrypto || !hasExchangeRate) {
				inputValueConversion = `${balanceToFiatNumber(processedInputValue, conversionRate, exchangeRate)}`;
				renderableInputValueConversion = `${balanceToFiat(
					processedInputValue,
					conversionRate,
					exchangeRate,
					currentCurrency
				)}`;
			} else {
				inputValueConversion = `${renderFromTokenMinimalUnit(
					fiatNumberToTokenMinimalUnit(
						processedInputValue,
						conversionRate,
						exchangeRate,
						selectedAsset.decimals
					),
					selectedAsset.decimals
				)}`;
				renderableInputValueConversion = `${inputValueConversion} ${selectedAsset.symbol}`;
			}
		}

		inputValueConversion = inputValueConversion === '0' ? undefined : inputValueConversion;
		this.setState({
			inputValue,
			inputValueConversion,
			renderableInputValueConversion,
			amountError: undefined,
			hasExchangeRate
		});
	};

	toggleAssetsModal = () => {
		const { assetsModalVisible } = this.state;
		this.setState({ assetsModalVisible: !assetsModalVisible });
	};

	pickSelectedAsset = selectedAsset => {
		this.toggleAssetsModal();
		this.props.setSelectedAsset(selectedAsset);
		if (!selectedAsset.tokenId) {
			this.onInputChange(undefined, selectedAsset);
			// Wait for input to mount first
			setTimeout(() => this.amountInput && this.amountInput.current && this.amountInput.current.focus(), 500);
		}
	};

	assetKeyExtractor = asset => {
		if (asset.tokenId) {
			return asset.address + asset.tokenId;
		}
		return asset.address;
	};

	renderToken = (token, index) => {
		const {
			accounts,
			selectedAddress,
			conversionRate,
			currentCurrency,
			contractBalances,
			contractExchangeRates
		} = this.props;
		let balance, balanceFiat;
		const { address, decimals, symbol } = token;
		if (token.isETH) {
			balance = renderFromWei(accounts[selectedAddress].balance);
			balanceFiat = weiToFiat(hexToBN(accounts[selectedAddress].balance), conversionRate, currentCurrency);
		} else {
			balance = renderFromTokenMinimalUnit(contractBalances[address], decimals);
			const exchangeRate = contractExchangeRates[address];
			balanceFiat = balanceToFiat(balance, conversionRate, exchangeRate, currentCurrency);
		}
		return (
			<TouchableOpacity
				key={index}
				style={styles.assetElementWrapper}
				// eslint-disable-next-line react/jsx-no-bind
				onPress={() => this.pickSelectedAsset(token)}
			>
				<View style={styles.assetElement}>
					{token.isETH ? (
						<FadeIn placeholderStyle={{ backgroundColor: colors.white }}>
							<Image source={ethLogo} style={styles.ethLogo} />
						</FadeIn>
					) : (
						<TokenImage asset={token} iconStyle={styles.tokenImage} containerStyle={styles.tokenImage} />
					)}
					<View style={styles.assetInformationWrapper}>
						<Text style={styles.textAssetTitle}>{symbol}</Text>
						<View style={styles.assetBalanceWrapper}>
							<Text style={styles.textAssetBalance}>{balance}</Text>
							{!!balanceFiat && <Text style={styles.textAssetFiat}>{balanceFiat}</Text>}
						</View>
					</View>
				</View>
			</TouchableOpacity>
		);
	};

	renderCollectible = (collectible, index) => {
		const { name } = collectible;
		return (
			<TouchableOpacity
				key={index}
				style={styles.assetElementWrapper}
				// eslint-disable-next-line react/jsx-no-bind
				onPress={() => this.pickSelectedAsset(collectible)}
			>
				<View style={styles.assetElement}>
					<CollectibleImage collectible={collectible} />
					<View style={styles.assetInformationWrapper}>
						<Text style={styles.textAssetTitle}>{name}</Text>
					</View>
				</View>
			</TouchableOpacity>
		);
	};

	renderAsset = props => {
		const { item: asset, index } = props;
		if (!asset.tokenId) {
			return this.renderToken(asset, index);
		}
		return this.renderCollectible(asset, index);
	};

	processCollectibles = () => {
		const { collectibleContracts } = this.props;
		const collectibles = [];
		this.props.collectibles
			.sort((a, b) => a.address < b.address)
			.forEach(collectible => {
				const address = collectible.address.toLowerCase();
				const isTradable =
					!collectiblesTransferInformation[address] || collectiblesTransferInformation[address].tradable;
				if (!isTradable) return;
				const collectibleContract = collectibleContracts.find(
					contract => contract.address.toLowerCase() === address
				);
				if (!collectible.name) collectible.name = collectibleContract.name;
				if (!collectible.image) collectible.image = collectibleContract.logo;
				collectibles.push(collectible);
			});
		return collectibles;
	};

	renderAssetsModal = () => {
		const { assetsModalVisible } = this.state;

		return (
			<Modal
				isVisible={assetsModalVisible}
				style={styles.bottomModal}
				onBackdropPress={this.toggleAssetsModal}
				onBackButtonPress={this.toggleAssetsModal}
				onSwipeComplete={this.toggleAssetsModal}
				swipeDirection={'down'}
				propagateSwipe
			>
				<SafeAreaView style={styles.assetsModalWrapper}>
					<View style={styles.titleWrapper}>
						<View style={styles.dragger} />
					</View>
					<FlatList
						data={[...this.tokens, ...this.collectibles]}
						keyExtractor={this.assetKeyExtractor}
						renderItem={this.renderAsset}
					/>
				</SafeAreaView>
			</Modal>
		);
	};

	switchCurrency = async () => {
		const { internalPrimaryCurrencyIsCrypto, inputValueConversion } = this.state;
		await this.setState({ internalPrimaryCurrencyIsCrypto: !internalPrimaryCurrencyIsCrypto });
		this.onInputChange(inputValueConversion);
	};

	renderTokenInput = () => {
		const {
			inputValue,
			renderableInputValueConversion,
			amountError,
			hasExchangeRate,
			internalPrimaryCurrencyIsCrypto
		} = this.state;
		const { currentCurrency } = this.props;
		return (
			<View>
				<View style={styles.inputContainerWrapper}>
					<View style={styles.inputContainer}>
						{!internalPrimaryCurrencyIsCrypto && !!inputValue && (
							<Text style={styles.inputCurrencyText}>{`${getCurrencySymbol(currentCurrency)} `}</Text>
						)}
						<TextInput
							ref={this.amountInput}
							style={styles.textInput}
							value={inputValue}
							onChangeText={this.onInputChange}
							keyboardType={'numeric'}
							placeholder={'0'}
						/>
					</View>
				</View>
				{hasExchangeRate && (
					<View style={styles.actionsWrapper}>
						<View style={[styles.action]}>
							<TouchableOpacity style={styles.actionSwitch} onPress={this.switchCurrency}>
								<Text style={styles.textSwitch} numberOfLines={1}>
									{renderableInputValueConversion}
								</Text>
								<View styles={styles.switchWrapper}>
									<MaterialCommunityIcons
										name="swap-vertical"
										size={16}
										color={colors.blue}
										style={styles.switch}
									/>
								</View>
							</TouchableOpacity>
						</View>
					</View>
				)}
				{amountError && (
					<View style={styles.errorMessageWrapper}>
						<ErrorMessage errorMessage={amountError} />
					</View>
				)}
			</View>
		);
	};

	renderCollectibleInput = () => {
		const { selectedAsset } = this.props;
		return (
			<View style={styles.collectibleInputWrapper}>
				<View style={styles.collectibleInputImageWrapper}>
					<CollectibleImage
						containerStyle={styles.collectibleImage}
						iconStyle={styles.collectibleImage}
						collectible={selectedAsset}
					/>
				</View>
				<View style={styles.collectibleInputInformationWrapper}>
					<Text style={styles.collectibleName}>{selectedAsset.name}</Text>
					<Text style={styles.collectibleId}>{`#${selectedAsset.tokenId}`}</Text>
				</View>
			</View>
		);
	};

	render = () => {
		const { estimatedTotalGas } = this.state;
		const { selectedAsset } = this.props;
		return (
			<SafeAreaView style={styles.wrapper}>
				<View style={styles.inputWrapper}>
					<View style={styles.actionsWrapper}>
						<View style={styles.actionBorder} />
						<View style={styles.action}>
							<TouchableOpacity style={styles.actionDropdown} onPress={this.toggleAssetsModal}>
								<Text style={styles.textDropdown}>
									{selectedAsset.symbol || strings('wallet.collectible')}
								</Text>
								<View styles={styles.arrow}>
									<Ionicons
										name="ios-arrow-down"
										size={16}
										color={colors.white}
										style={styles.iconDropdown}
									/>
								</View>
							</TouchableOpacity>
						</View>
						<View style={[styles.actionBorder, styles.actionMax]}>
							{!selectedAsset.tokenId && (
								<TouchableOpacity
									style={styles.actionMaxTouchable}
									disabled={!estimatedTotalGas}
									onPress={this.useMax}
								>
									<Text style={styles.maxText}>{strings('transaction.use_max')}</Text>
								</TouchableOpacity>
							)}
						</View>
					</View>
					{selectedAsset.tokenId ? this.renderCollectibleInput() : this.renderTokenInput()}
				</View>

				<KeyboardAvoidingView
					style={styles.nextActionWrapper}
					behavior={'padding'}
					keyboardVerticalOffset={KEYBOARD_OFFSET}
					enabled={Platform.OS === 'ios'}
				>
					<View style={styles.buttonNextWrapper}>
						<StyledButton
							type={'confirm'}
							containerStyle={styles.buttonNext}
							disabled={!estimatedTotalGas}
							onPress={this.onNext}
						>
							{strings('transaction.next')}
						</StyledButton>
					</View>
				</KeyboardAvoidingView>
				{this.renderAssetsModal()}
			</SafeAreaView>
		);
	};
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	contractBalances: state.engine.backgroundState.TokenBalancesController.contractBalances,
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	collectibles: state.engine.backgroundState.AssetsController.collectibles,
	collectibleContracts: state.engine.backgroundState.AssetsController.collectibleContracts,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	primaryCurrency: state.settings.primaryCurrency,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	tokens: state.engine.backgroundState.AssetsController.tokens,
	selectedAsset: state.newTransaction.selectedAsset,
	transactionState: state.newTransaction
});

const mapDispatchToProps = dispatch => ({
	prepareTransaction: transaction => dispatch(prepareTransaction(transaction)),
	setSelectedAsset: selectedAsset => dispatch(setSelectedAsset(selectedAsset))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Amount);
