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
import { setSelectedAsset, setValue, prepareTransaction } from '../../../../actions/newTransaction';
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
	balanceToFiatNumber
} from '../../../../util/number';
import { getTicker, generateTransferData } from '../../../../util/transactions';
import { hexToBN, BNToHex } from 'gaba/dist/util';
import FadeIn from 'react-native-fade-in-image';
import ErrorMessage from '../ErrorMessage';

const KEYBOARD_OFFSET = 120;

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
		marginTop: 45,
		marginHorizontal: 24
	},
	actionsWrapper: {
		flexDirection: 'row'
	},
	action: {
		flex: 1,
		alignItems: 'center'
	},
	actionDropdown: {
		backgroundColor: colors.blue,
		paddingHorizontal: 16,
		paddingVertical: 2,
		borderRadius: 100,
		flexDirection: 'row'
	},
	textDropdown: {
		...fontStyles.normal,
		fontSize: 14,
		color: colors.white
	},
	iconDropdown: {
		paddingLeft: 10
	},
	maxText: {
		...fontStyles.normal,
		fontSize: 12,
		color: colors.blue,
		alignSelf: 'flex-end'
	},
	actionMax: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-end'
	},
	actionMaxTouchable: {},
	inputContainer: {
		marginVertical: 8
	},
	textInput: {
		...fontStyles.light,
		fontSize: 44,
		textAlign: 'center'
	},
	switch: {
		flex: 1
	},
	actionSwitch: {
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 8,
		flexDirection: 'row',
		borderColor: colors.grey500,
		borderWidth: 1
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
		assetsModalVisible: false
	};

	amountInput = React.createRef();
	tokens = [];

	componentDidMount = () => {
		const { tokens, ticker, setSelectedAsset, selectedAsset } = this.props;
		this.amountInput && this.amountInput.current && this.amountInput.current.focus();
		const ether = {
			name: 'Ether',
			address: '',
			symbol: getTicker(ticker),
			logo: '../images/eth-logo.png',
			isEth: true
		};
		this.tokens = [ether, ...tokens];
		Object.keys(selectedAsset).length === 0 && setSelectedAsset(ether);
	};

	onNext = async () => {
		const { navigation } = this.props;
		const { inputValue } = this.state;
		// setValue(inputValue);
		if (this.validateAmount(inputValue)) return;
		await this.prepareTransaction(inputValue);
		navigation.navigate('Confirm');
	};

	prepareTransaction = async value => {
		const {
			prepareTransaction,
			selectedAsset,
			transactionState: { transaction, transactionTo }
		} = this.props;
		if (selectedAsset.isEth) {
			transaction.data = '0x';
			transaction.to = transactionTo;
			transaction.value = BNToHex(toWei(value));
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

	validateAmount = inputValue => {
		const { accounts, selectedAddress, contractBalances, selectedAsset } = this.props;
		let weiBalance, weiInput, amountError;
		if (isDecimal(inputValue)) {
			if (selectedAsset.isEth) {
				// take care of gas
				weiBalance = hexToBN(accounts[selectedAddress].balance);
				weiInput = toWei(inputValue);
			} else {
				weiBalance = contractBalances[selectedAsset.address];
				weiInput = toTokenMinimalUnit(inputValue, selectedAsset.decimals);
			}
			amountError = weiBalance.gte(weiInput) ? undefined : 'Insufficient funds';
		} else {
			amountError = 'Invalid amount';
		}
		this.setState({ amountError });
		return !!amountError;
	};

	useMax = () => {
		const {
			accounts,
			selectedAddress,
			contractBalances,
			selectedAsset,
			primaryCurrency,
			conversionRate,
			contractExchangeRates
		} = this.props;
		let input;
		if (selectedAsset.isEth) {
			if (primaryCurrency === 'ETH') {
				// take care of gas
				input = fromWei(accounts[selectedAddress].balance);
			} else {
				input = `${weiToFiatNumber(accounts[selectedAddress].balance, conversionRate)}`;
			}
		} else {
			const exchangeRate = contractExchangeRates[selectedAsset.address];
			if (primaryCurrency === 'ETH') {
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

	onInputChange = inputValue => {
		const {
			selectedAsset,
			contractExchangeRates,
			conversionRate,
			currentCurrency,
			primaryCurrency,
			ticker
		} = this.props;
		let inputValueConversion;
		if (isDecimal(inputValue)) {
			if (selectedAsset.isEth) {
				if (primaryCurrency === 'ETH') {
					inputValueConversion = weiToFiat(toWei(inputValue.toString(16)), conversionRate, currentCurrency);
				} else {
					inputValueConversion = `${renderFromWei(fiatNumberToWei(inputValue, conversionRate))} ${getTicker(
						ticker
					)}`;
				}
			} else {
				const exchangeRate = contractExchangeRates[selectedAsset.address];
				if (primaryCurrency === 'ETH') {
					inputValueConversion = balanceToFiat(inputValue, conversionRate, exchangeRate, currentCurrency);
				} else {
					inputValueConversion = `${renderFromTokenMinimalUnit(
						fiatNumberToTokenMinimalUnit(inputValue, conversionRate, exchangeRate, selectedAsset.decimals),
						selectedAsset.decimals
					)} ${selectedAsset.symbol}`;
				}
			}
		}
		this.setState({ inputValue, inputValueConversion, amountError: undefined });
	};

	toggleAssetsModal = () => {
		const { assetsModalVisible } = this.state;
		this.setState({ assetsModalVisible: !assetsModalVisible });
	};

	pickSelectedAsset = selectedAsset => {
		this.props.setSelectedAsset(selectedAsset);
		this.toggleAssetsModal();
		this.onInputChange();
	};

	assetKeyExtractor = token => token.address;

	renderAsset = ({ item: asset }) => {
		const {
			accounts,
			selectedAddress,
			conversionRate,
			currentCurrency,
			contractBalances,
			contractExchangeRates
		} = this.props;
		const { address, decimals, symbol } = asset;
		let [balance, balanceFiat] = [undefined, undefined];
		if (asset.isEth) {
			balance = renderFromWei(accounts[selectedAddress].balance);
			balanceFiat = weiToFiat(hexToBN(accounts[selectedAddress].balance), conversionRate, currentCurrency);
		} else {
			balance = renderFromTokenMinimalUnit(contractBalances[address], decimals);
			const exchangeRate = contractExchangeRates[address];
			balanceFiat = balanceToFiat(balance, conversionRate, exchangeRate, currentCurrency);
		}

		return (
			<TouchableOpacity
				key={address}
				style={styles.assetElementWrapper}
				// eslint-disable-next-line react/jsx-no-bind
				onPress={() => this.pickSelectedAsset(asset)}
			>
				<View style={styles.assetElement}>
					{asset.isEth ? (
						<FadeIn placeholderStyle={{ backgroundColor: colors.white }}>
							<Image source={ethLogo} style={styles.ethLogo} testID={'eth-logo'} />
						</FadeIn>
					) : (
						<TokenImage asset={asset} iconStyle={styles.tokenImage} containerStyle={styles.tokenImage} />
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
					<FlatList data={this.tokens} keyExtractor={this.assetKeyExtractor} renderItem={this.renderAsset} />
				</SafeAreaView>
			</Modal>
		);
	};

	render = () => {
		const { inputValue, inputValueConversion, amountError } = this.state;
		const { selectedAsset, currentCurrency } = this.props;
		return (
			<SafeAreaView style={styles.wrapper}>
				<View style={styles.inputWrapper}>
					<View style={styles.actionsWrapper}>
						<View style={styles.action} />
						<View style={[styles.action]}>
							<TouchableOpacity style={styles.actionDropdown} onPress={this.toggleAssetsModal}>
								<Text style={styles.textDropdown}>{selectedAsset.symbol}</Text>
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
						<View style={[styles.action, styles.actionMax]}>
							<TouchableOpacity style={styles.actionMaxTouchable} onPress={this.useMax}>
								<Text style={styles.maxText}>USE MAX</Text>
							</TouchableOpacity>
						</View>
					</View>
					<View style={styles.inputContainer}>
						<TextInput
							ref={this.amountInput}
							style={styles.textInput}
							value={inputValue}
							onChangeText={this.onInputChange}
							keyboardType={'numeric'}
							placeholder={'0'}
						/>
					</View>
					<View style={styles.actionsWrapper}>
						<View style={[styles.action]}>
							<TouchableOpacity style={styles.actionSwitch}>
								<Text style={styles.textSwitch} numberOfLines={1}>
									{inputValueConversion || `0 ${currentCurrency}`}
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
					{amountError && (
						<View style={styles.errorMessageWrapper}>
							<ErrorMessage errorMessage={amountError} />
						</View>
					)}
				</View>
				<KeyboardAvoidingView
					style={styles.buttonsWrapper}
					behavior={'padding'}
					keyboardVerticalOffset={KEYBOARD_OFFSET}
					enabled={Platform.OS === 'ios'}
				>
					<View style={styles.buttonNextWrapper}>
						<StyledButton type={'confirm'} containerStyle={styles.buttonNext} onPress={this.onNext}>
							Next
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
	setSelectedAsset: selectedAsset => dispatch(setSelectedAsset(selectedAsset)),
	setValue: value => dispatch(setValue(value))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Amount);
