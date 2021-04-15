import React, { PureComponent } from 'react';
import { colors, baseStyles, fontStyles } from '../../../../styles/common';
import {
	InteractionManager,
	StyleSheet,
	SafeAreaView,
	View,
	Alert,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { connect } from 'react-redux';
import { getSendFlowTitle } from '../../../UI/Navbar';
import { AddressFrom, AddressTo } from '../AddressInputs';
import PropTypes from 'prop-types';
import {
	renderFromWei,
	renderFromTokenMinimalUnit,
	weiToFiat,
	balanceToFiat,
	weiToFiatNumber,
	balanceToFiatNumber,
	renderFiatAddition,
	isDecimal,
	toBN
} from '../../../../util/number';
import { getTicker, decodeTransferData, getNormalizedTxState } from '../../../../util/transactions';
import StyledButton from '../../../UI/StyledButton';
import { util } from '@metamask/controllers';
import { prepareTransaction, resetTransaction, setNonce, setProposedNonce } from '../../../../actions/transaction';
import {
	apiEstimateModifiedToWEI,
	getGasPriceByChainId,
	getBasicGasEstimatesByChainId
} from '../../../../util/custom-gas';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import AccountList from '../../../UI/AccountList';
import CustomNonceModal from '../../../UI/CustomNonceModal';
import AnimatedTransactionModal from '../../../UI/AnimatedTransactionModal';
import TransactionReviewFeeCard from '../../../UI/TransactionReview/TransactionReviewFeeCard';
import CustomGas from '../../../UI/CustomGas';
import { doENSReverseLookup } from '../../../../util/ENSUtils';
import NotificationManager from '../../../../core/NotificationManager';
import { strings } from '../../../../../locales/i18n';
import collectiblesTransferInformation from '../../../../util/collectibles-transfer';
import CollectibleImage from '../../../UI/CollectibleImage';
import Modal from 'react-native-modal';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import TransactionTypes from '../../../../core/TransactionTypes';
import Analytics from '../../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../../util/analytics';
import { capitalize } from '../../../../util/general';
import { isMainNet, getNetworkName, getNetworkNonce } from '../../../../util/networks';
import Text from '../../../Base/Text';
import AnalyticsV2 from '../../../../util/analyticsV2';

const EDIT = 'edit';
const EDIT_NONCE = 'edit_nonce';
const REVIEW = 'review';

const { hexToBN, BNToHex } = util;

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: colors.white
	},
	inputWrapper: {
		flex: 0,
		borderBottomWidth: 1,
		borderBottomColor: colors.grey050,
		paddingHorizontal: 8
	},
	amountWrapper: {
		flexDirection: 'column',
		margin: 24
	},
	textAmountLabel: {
		...fontStyles.normal,
		fontSize: 14,
		textAlign: 'center',
		color: colors.grey500,
		textTransform: 'uppercase',
		marginVertical: 3
	},
	textAmount: {
		fontFamily: 'Roboto-Light',
		fontWeight: fontStyles.light.fontWeight,
		color: colors.black,
		fontSize: 44,
		textAlign: 'center'
	},
	buttonNext: {
		flex: 1,
		marginHorizontal: 24,
		alignSelf: 'flex-end'
	},
	buttonNextWrapper: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		marginBottom: 16
	},
	actionTouchable: {
		padding: 12
	},
	actionText: {
		...fontStyles.normal,
		color: colors.blue,
		fontSize: 14,
		alignSelf: 'center'
	},
	actionsWrapper: {
		margin: 24
	},
	collectibleImageWrapper: {
		flexDirection: 'column',
		alignItems: 'center',
		margin: 16
	},
	collectibleName: {
		...fontStyles.normal,
		fontSize: 18,
		color: colors.black,
		textAlign: 'center'
	},
	collectibleTokenId: {
		...fontStyles.normal,
		fontSize: 12,
		color: colors.grey500,
		marginTop: 8,
		textAlign: 'center'
	},
	collectibleImage: {
		height: 120,
		width: 120
	},
	qrCode: {
		marginBottom: 16,
		paddingHorizontal: 36,
		paddingBottom: 24,
		paddingTop: 16,
		backgroundColor: colors.grey000,
		borderRadius: 8,
		width: '100%'
	},
	hexDataWrapper: {
		padding: 10,
		alignItems: 'center'
	},
	addressTitle: {
		...fontStyles.bold,
		color: colors.black,
		alignItems: 'center',
		justifyContent: 'center',
		textAlign: 'center',
		fontSize: 16,
		marginBottom: 16
	},
	hexDataClose: {
		zIndex: 999,
		position: 'absolute',
		top: 12,
		right: 20
	},
	hexDataText: {
		textAlign: 'justify'
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	},
	totalAmount: {
		...fontStyles.normal,
		color: colors.fontPrimary,
		fontSize: 14,
		textAlign: 'right',
		textTransform: 'uppercase',
		flexWrap: 'wrap',
		flex: 1
	},
	keyboardAwareWrapper: {
		flex: 1,
		justifyContent: 'flex-end'
	},
	errorWrapper: {
		marginHorizontal: 24,
		marginTop: 12,
		paddingHorizontal: 10,
		paddingVertical: 8,
		backgroundColor: colors.red000,
		borderColor: colors.red,
		borderRadius: 8,
		borderWidth: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	error: {
		color: colors.red,
		fontSize: 12,
		lineHeight: 16,
		...fontStyles.normal,
		textAlign: 'center'
	},
	underline: {
		textDecorationLine: 'underline',
		...fontStyles.bold
	},
	over: {
		color: colors.red,
		...fontStyles.bold
	}
});

/**
 * View that wraps the wraps the "Send" screen
 */
class Confirm extends PureComponent {
	static navigationOptions = ({ navigation, screenProps }) =>
		getSendFlowTitle('send.confirm', navigation, screenProps);

	static propTypes = {
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object,
		/**
		 * Map of accounts to information objects including balances
		 */
		accounts: PropTypes.object,
		/**
		 * Object containing token balances in the format address => balance
		 */
		contractBalances: PropTypes.object,
		/**
		 * Current provider ticker
		 */
		ticker: PropTypes.string,
		/**
		 * Current transaction state
		 */
		transactionState: PropTypes.object,
		/**
		 * Normalized transaction state
		 */
		transaction: PropTypes.object.isRequired,
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
		 * Set transaction object to be sent
		 */
		prepareTransaction: PropTypes.func,
		/**
		 * Network id
		 */
		network: PropTypes.string,
		/**
		 * Indicates whether hex data should be shown in transaction editor
		 */
		showHexData: PropTypes.bool,
		/**
		 * Indicates whether custom nonce should be shown in transaction editor
		 */
		showCustomNonce: PropTypes.bool,
		/**
		 * Network provider type as mainnet
		 */
		providerType: PropTypes.string,
		/**
		 * List of accounts from the PreferencesController
		 */
		identities: PropTypes.object,
		/**
		 * List of keyrings
		 */
		keyrings: PropTypes.array,
		/**
		 * Selected asset from current transaction state
		 */
		selectedAsset: PropTypes.object,
		/**
		 * Resets transaction state
		 */
		resetTransaction: PropTypes.func,
		/**
		 * ETH or fiat, depending on user setting
		 */
		primaryCurrency: PropTypes.string,
		/**
		 * Set transaction nonce
		 */
		setNonce: PropTypes.func,
		/**
		 * Set proposed nonce (from network)
		 */
		setProposedNonce: PropTypes.func
	};

	state = {
		gasSpeedSelected: 'average',
		gasEstimationReady: false,
		customGas: undefined,
		customGasPrice: undefined,
		fromAccountBalance: undefined,
		fromAccountName: this.props.transactionState.transactionFromName,
		fromSelectedAddress: this.props.transactionState.transaction.from,
		hexDataModalVisible: false,
		gasError: undefined,
		warningGasPriceHigh: undefined,
		ready: false,
		transactionValue: undefined,
		transactionValueFiat: undefined,
		transactionFee: undefined,
		transactionTotalAmount: undefined,
		transactionTotalAmountFiat: undefined,
		errorMessage: undefined,
		fromAccountModalVisible: false,
		mode: REVIEW,
		over: false
	};

	setNetworkNonce = async () => {
		const { setNonce, setProposedNonce, transaction } = this.props;
		const proposedNonce = await getNetworkNonce(transaction);
		setNonce(proposedNonce);
		setProposedNonce(proposedNonce);
	};

	getAnalyticsParams = () => {
		try {
			const { selectedAsset } = this.props;
			const { NetworkController } = Engine.context;
			const { chainId, type } = NetworkController?.state?.provider || {};
			return {
				active_currency: { value: selectedAsset?.symbol, anonymous: true },
				network_name: type,
				chain_id: chainId
			};
		} catch (error) {
			return {};
		}
	};

	getGasAnalyticsParams = () => {
		try {
			const { selectedAsset } = this.props;
			return {
				active_currency: { value: selectedAsset.symbol, anonymous: true }
			};
		} catch (error) {
			return {};
		}
	};

	componentDidMount = async () => {
		// For analytics
		AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.SEND_TRANSACTION_STARTED, this.getAnalyticsParams());

		const { navigation, providerType } = this.props;
		await this.handleFetchBasicEstimates();
		await this.setNetworkNonce();
		navigation.setParams({ providerType });
		this.parseTransactionData();
		this.prepareTransaction();
	};

	componentDidUpdate = (prevProps, prevState) => {
		const {
			transactionState: {
				transactionTo,
				transaction: { value }
			},
			contractBalances,
			selectedAsset
		} = this.props;
		const { errorMessage, fromSelectedAddress } = this.state;
		const valueChanged = prevProps.transactionState.transaction.value !== value;
		const fromAddressChanged = prevState.fromSelectedAddress !== fromSelectedAddress;
		const previousContractBalance = prevProps.contractBalances[selectedAsset.address];
		const newContractBalance = contractBalances[selectedAsset.address];
		const contractBalanceChanged = previousContractBalance !== newContractBalance;
		const recipientIsDefined = transactionTo !== undefined;
		if (recipientIsDefined && (valueChanged || fromAddressChanged || contractBalanceChanged)) {
			this.parseTransactionData();
		}
		if (!prevState.errorMessage && errorMessage) {
			this.scrollView.scrollToEnd({ animated: true });
		}
	};

	setScrollViewRef = ref => {
		this.scrollView = ref;
	};

	review = () => {
		this.onModeChange(REVIEW);
	};

	edit = MODE => {
		this.onModeChange(MODE);
	};

	onModeChange = mode => {
		this.setState({ mode });
		if (mode === EDIT) {
			InteractionManager.runAfterInteractions(() => {
				Analytics.trackEvent(ANALYTICS_EVENT_OPTS.SEND_FLOW_ADJUSTS_TRANSACTION_FEE);
			});
		}
	};

	handleFetchBasicEstimates = async () => {
		this.setState({ ready: false });
		const basicGasEstimates = await getBasicGasEstimatesByChainId();
		if (basicGasEstimates) {
			this.handleSetGasFee(this.props.transaction.gas, apiEstimateModifiedToWEI(basicGasEstimates.averageGwei));
		}
		return this.setState({ basicGasEstimates, ready: true });
	};

	prepareTransaction = async () => {
		const {
			prepareTransaction,
			transactionState: { transaction }
		} = this.props;
		const estimation = await this.estimateGas(transaction);
		prepareTransaction({ ...transaction, ...estimation });
		this.parseTransactionData();
		this.setState({ gasEstimationReady: true });
	};

	estimateGas = async transaction => {
		const { value, data, to, from } = transaction;

		return await getGasPriceByChainId({
			value,
			from,
			data,
			to
		});
	};

	parseTransactionData = () => {
		const {
			accounts,
			contractBalances,
			contractExchangeRates,
			conversionRate,
			currentCurrency,
			transactionState: {
				selectedAsset,
				transactionTo: to,
				transaction: { from, value, gas, gasPrice, data }
			},
			ticker
		} = this.props;
		const { fromSelectedAddress, over } = this.state;
		let fromAccountBalance,
			transactionValue,
			transactionValueFiat,
			transactionTo,
			transactionTotalAmount,
			transactionTotalAmountFiat;
		const weiTransactionFee = gas && gas.mul(gasPrice);
		const valueBN = hexToBN(value);
		const transactionFeeFiat = weiToFiat(weiTransactionFee, conversionRate, currentCurrency);
		const parsedTicker = getTicker(ticker);
		const transactionFee = `${renderFromWei(weiTransactionFee)} ${parsedTicker}`;

		if (selectedAsset.isETH) {
			fromAccountBalance = `${renderFromWei(accounts[fromSelectedAddress].balance)} ${parsedTicker}`;
			transactionValue = `${renderFromWei(value)} ${parsedTicker}`;
			transactionValueFiat = weiToFiat(valueBN, conversionRate, currentCurrency);
			const transactionTotalAmountBN = weiTransactionFee && weiTransactionFee.add(valueBN);
			transactionTotalAmount = (
				<Text style={[styles.totalAmount, over && styles.over]}>
					{renderFromWei(transactionTotalAmountBN)} {parsedTicker}
				</Text>
			);
			transactionTotalAmountFiat = (
				<Text style={[styles.totalAmount, over && styles.over]}>
					{weiToFiat(transactionTotalAmountBN, conversionRate, currentCurrency)}
				</Text>
			);
			transactionTo = to;
		} else if (selectedAsset.tokenId) {
			fromAccountBalance = `${renderFromWei(accounts[from].balance)} ${parsedTicker}`;
			const collectibleTransferInformation =
				selectedAsset.address.toLowerCase() in collectiblesTransferInformation &&
				collectiblesTransferInformation[selectedAsset.address.toLowerCase()];
			if (
				!collectibleTransferInformation ||
				(collectibleTransferInformation.tradable && collectibleTransferInformation.method === 'transferFrom')
			) {
				[, transactionTo] = decodeTransferData('transferFrom', data);
			} else if (
				collectibleTransferInformation.tradable &&
				collectibleTransferInformation.method === 'transfer'
			) {
				[transactionTo, ,] = decodeTransferData('transfer', data);
			}
			transactionValueFiat = weiToFiat(valueBN, conversionRate, currentCurrency);
			const transactionTotalAmountBN = weiTransactionFee && weiTransactionFee.add(valueBN);
			transactionTotalAmount = (
				<Text style={styles.totalAmount}>
					{renderFromWei(weiTransactionFee)} {parsedTicker}
				</Text>
			);
			transactionTotalAmountFiat = (
				<Text style={styles.totalAmount}>
					{weiToFiat(transactionTotalAmountBN, conversionRate, currentCurrency)}
				</Text>
			);
		} else {
			let rawAmount;
			const { address, symbol = 'ERC20', decimals } = selectedAsset;
			fromAccountBalance = `${renderFromTokenMinimalUnit(
				contractBalances[address] ? contractBalances[address] : '0',
				decimals
			)} ${symbol}`;
			[transactionTo, , rawAmount] = decodeTransferData('transfer', data);
			const rawAmountString = parseInt(rawAmount, 16).toLocaleString('fullwide', { useGrouping: false });
			const transferValue = renderFromTokenMinimalUnit(rawAmountString, decimals);
			transactionValue = `${transferValue} ${symbol}`;
			const exchangeRate = contractExchangeRates[address];
			const transactionFeeFiatNumber = weiToFiatNumber(weiTransactionFee, conversionRate);
			transactionValueFiat =
				balanceToFiat(transferValue, conversionRate, exchangeRate, currentCurrency) || `0 ${currentCurrency}`;
			const transactionValueFiatNumber = balanceToFiatNumber(transferValue, conversionRate, exchangeRate);
			transactionTotalAmount = (
				<Text style={styles.totalAmount}>
					{transactionValue} + ${renderFromWei(weiTransactionFee)} {parsedTicker}
				</Text>
			);
			transactionTotalAmountFiat = (
				<Text style={styles.totalAmount}>
					{renderFiatAddition(transactionValueFiatNumber, transactionFeeFiatNumber, currentCurrency)}
				</Text>
			);
		}

		this.setState(
			{
				fromAccountBalance,
				transactionValue,
				transactionValueFiat,
				transactionFeeFiat,
				transactionFee,
				transactionTo,
				transactionTotalAmount,
				transactionTotalAmountFiat
			},
			() => {
				this.validateAmount({
					...this.props.transactionState.transaction,
					from: fromSelectedAddress,
					value
				});
			}
		);
	};

	handleSetGasFee = (customGas, customGasPrice, warningGasPriceHigh) => {
		const { prepareTransaction, transactionState } = this.props;
		let transaction = transactionState.transaction;
		transaction = { ...transaction, gas: customGas, gasPrice: customGasPrice };
		prepareTransaction(transaction);
		this.setState({ warningGasPriceHigh });
		setTimeout(() => {
			this.parseTransactionData();
			this.setState({
				errorMessage: undefined
			});
		}, 100);

		this.onModeChange(REVIEW);
	};

	handleSetGasSpeed = speed => {
		this.setState({ gasSpeedSelected: speed });
	};

	validateGas = () => {
		const { accounts } = this.props;
		const { gas, gasPrice, value, from } = this.props.transactionState.transaction;
		let errorMessage;
		const totalGas = gas.mul(gasPrice);
		const valueBN = hexToBN(value);
		const balanceBN = hexToBN(accounts[from].balance);
		if (valueBN.add(totalGas).gt(balanceBN)) {
			errorMessage = strings('transaction.insufficient');
			this.setState({ errorMessage });
		}
		return errorMessage;
	};

	prepareTransactionToSend = () => {
		const {
			transactionState: { transaction },
			showCustomNonce
		} = this.props;
		const { fromSelectedAddress } = this.state;
		const { nonce } = this.props.transaction;
		const transactionToSend = { ...transaction };
		transactionToSend.gas = BNToHex(transaction.gas);
		transactionToSend.gasPrice = BNToHex(transaction.gasPrice);
		transactionToSend.from = fromSelectedAddress;
		if (showCustomNonce && nonce) transactionToSend.nonce = BNToHex(nonce);
		return transactionToSend;
	};

	/**
	 * Removes collectible in case an ERC721 asset is being sent, when not in mainnet
	 */
	checkRemoveCollectible = () => {
		const {
			transactionState: { selectedAsset, assetType },
			network
		} = this.props;
		if (assetType === 'ERC721' && network !== 1) {
			const { AssetsController } = Engine.context;
			AssetsController.removeCollectible(selectedAsset.address, selectedAsset.tokenId);
		}
	};

	/**
	 * Validates crypto value only
	 * Independent of current internalPrimaryCurrencyIsCrypto
	 *
	 * @param {string} - Crypto value
	 * @returns - Whether there is an error with the amount
	 */
	validateAmount = transaction => {
		const {
			accounts,
			contractBalances,
			selectedAsset,
			transactionState: {
				ticker,
				transaction: { value, gas, gasPrice }
			}
		} = this.props;
		const selectedAddress = transaction.from;
		let weiBalance, weiInput, errorMessage;
		if (isDecimal(value)) {
			if (selectedAsset.isETH || selectedAsset.tokenId) {
				const totalGas = gas ? gas.mul(gasPrice) : toBN('0x0');
				weiBalance = hexToBN(accounts[selectedAddress].balance);
				weiInput = hexToBN(value).add(totalGas);
				if (!weiBalance.gte(weiInput)) {
					this.setState({ over: true });
					const amount = renderFromWei(weiInput.sub(weiBalance));
					const tokenSymbol = getTicker(ticker);
					errorMessage = strings('transaction.insufficient_amount', { amount, tokenSymbol });
				} else {
					this.setState({ over: false });
				}
			} else {
				const [, , amount] = decodeTransferData('transfer', transaction.data);
				weiBalance = contractBalances[selectedAsset.address];
				weiInput = hexToBN(amount);
				errorMessage =
					weiBalance && weiBalance.gte(weiInput)
						? undefined
						: strings('transaction.insufficient_tokens', { token: selectedAsset.symbol });
			}
		} else {
			errorMessage = strings('transaction.invalid_amount');
		}
		this.setState({ errorMessage }, () => {
			if (errorMessage) {
				this.scrollView.scrollToEnd({ animated: true });
			}
		});
		return !!errorMessage;
	};

	onNext = async () => {
		const { TransactionController } = Engine.context;
		const {
			transactionState: { assetType },
			navigation,
			resetTransaction
		} = this.props;
		this.setState({ transactionConfirmed: true });
		if (this.validateGas()) {
			this.setState({ transactionConfirmed: false });
			return;
		}
		try {
			const transaction = this.prepareTransactionToSend();
			if (this.validateAmount(transaction)) {
				this.setState({ transactionConfirmed: false });
				return;
			}
			const { result, transactionMeta } = await TransactionController.addTransaction(
				transaction,
				TransactionTypes.MMM
			);
			await TransactionController.approveTransaction(transactionMeta.id);
			await new Promise(resolve => resolve(result));

			if (transactionMeta.error) {
				throw transactionMeta.error;
			}

			InteractionManager.runAfterInteractions(() => {
				NotificationManager.watchSubmittedTransaction({
					...transactionMeta,
					assetType
				});
				this.checkRemoveCollectible();
				AnalyticsV2.trackEvent(
					AnalyticsV2.ANALYTICS_EVENTS.SEND_TRANSACTION_COMPLETED,
					this.getAnalyticsParams()
				);
				resetTransaction();
				navigation && navigation.dismiss();
			});
		} catch (error) {
			Alert.alert(strings('transactions.transaction_error'), error && error.message, [
				{ text: strings('navigation.ok') }
			]);
			Logger.error(error, 'error while trying to send transaction (Confirm)');
		}
		this.setState({ transactionConfirmed: false });
	};

	getBalanceError = balance => {
		const {
			transactionState: {
				transaction: { value = '0x0', gas = '0x0', gasPrice = '0x0' }
			}
		} = this.props;

		const gasBN = hexToBN(gas);
		const weiTransactionFee = gasBN.mul(hexToBN(gasPrice));
		const valueBN = hexToBN(value);
		const transactionTotalAmountBN = weiTransactionFee.add(valueBN);

		const balanceIsInsufficient = hexToBN(balance).lt(transactionTotalAmountBN);

		return balanceIsInsufficient ? strings('transaction.insufficient') : null;
	};

	onAccountChange = async accountAddress => {
		const { identities, accounts } = this.props;
		const { name } = identities[accountAddress];
		const { PreferencesController } = Engine.context;
		const ens = await doENSReverseLookup(accountAddress);
		const fromAccountName = ens || name;
		PreferencesController.setSelectedAddress(accountAddress);
		// If new account doesn't have the asset
		this.setState({
			fromAccountName,
			fromSelectedAddress: accountAddress,
			balanceIsZero: hexToBN(accounts[accountAddress].balance).isZero()
		});
		this.parseTransactionData();
		this.toggleFromAccountModal();
	};

	toggleHexDataModal = () => {
		const { hexDataModalVisible } = this.state;
		this.setState({ hexDataModalVisible: !hexDataModalVisible });
	};

	toggleFromAccountModal = () => {
		const { fromAccountModalVisible } = this.state;
		this.setState({ fromAccountModalVisible: !fromAccountModalVisible });
	};

	renderCustomGasModal = () => {
		const { basicGasEstimates, gasError, ready, mode, gasSpeedSelected } = this.state;
		const {
			transaction: { gas, gasPrice }
		} = this.props;
		return (
			<Modal
				isVisible
				animationIn="slideInUp"
				animationOut="slideOutDown"
				style={styles.bottomModal}
				backdropOpacity={0.7}
				animationInTiming={600}
				animationOutTiming={600}
				onBackdropPress={this.review}
				onBackButtonPress={this.review}
				onSwipeComplete={this.review}
				swipeDirection={'down'}
				propagateSwipe
			>
				<KeyboardAwareScrollView contentContainerStyle={styles.keyboardAwareWrapper}>
					<AnimatedTransactionModal onModeChange={this.onModeChange} ready={ready} review={this.review}>
						<CustomGas
							handleGasFeeSelection={this.handleSetGasFee}
							basicGasEstimates={basicGasEstimates}
							gas={gas}
							gasPrice={gasPrice}
							gasError={gasError}
							mode={mode}
							onPress={this.handleSetGasSpeed}
							gasSpeedSelected={gasSpeedSelected}
							view={'SendTo (Confirm)'}
							analyticsParams={this.getGasAnalyticsParams()}
						/>
					</AnimatedTransactionModal>
				</KeyboardAwareScrollView>
			</Modal>
		);
	};

	renderCustomNonceModal = () => {
		const { setNonce } = this.props;
		const { proposedNonce, nonce } = this.props.transaction;
		return (
			<CustomNonceModal
				proposedNonce={proposedNonce}
				nonceValue={nonce}
				close={() => this.review()}
				save={setNonce}
			/>
		);
	};

	renderHexDataModal = () => {
		const { hexDataModalVisible } = this.state;
		const { data } = this.props.transactionState.transaction;
		return (
			<Modal
				isVisible={hexDataModalVisible}
				onBackdropPress={this.toggleHexDataModal}
				onBackButtonPress={this.toggleHexDataModal}
				onSwipeComplete={this.toggleHexDataModal}
				swipeDirection={'down'}
				propagateSwipe
			>
				<View style={styles.hexDataWrapper}>
					<TouchableOpacity style={styles.hexDataClose} onPress={this.toggleHexDataModal}>
						<IonicIcon name={'ios-close'} size={28} color={colors.black} />
					</TouchableOpacity>
					<View style={styles.qrCode}>
						<Text style={styles.addressTitle}>{strings('transaction.hex_data')}</Text>
						<Text style={styles.hexDataText}>{data || strings('unit.empty_data')}</Text>
					</View>
				</View>
			</Modal>
		);
	};

	renderFromAccountModal = () => {
		const { identities, keyrings, ticker } = this.props;
		const { fromAccountModalVisible, fromSelectedAddress } = this.state;

		return (
			<Modal
				isVisible={fromAccountModalVisible}
				style={styles.bottomModal}
				onBackdropPress={this.toggleFromAccountModal}
				onBackButtonPress={this.toggleFromAccountModal}
				onSwipeComplete={this.toggleFromAccountModal}
				swipeDirection={'down'}
				propagateSwipe
			>
				<AccountList
					enableAccountsAddition={false}
					identities={identities}
					selectedAddress={fromSelectedAddress}
					keyrings={keyrings}
					onAccountChange={this.onAccountChange}
					getBalanceError={this.getBalanceError}
					ticker={ticker}
				/>
			</Modal>
		);
	};

	buyEth = () => {
		const { navigation } = this.props;
		navigation.navigate('PaymentMethodSelector');
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.RECEIVE_OPTIONS_PAYMENT_REQUEST);
		});
	};

	gotoFaucet = () => {
		const mmFaucetUrl = 'https://faucet.metamask.io/';
		InteractionManager.runAfterInteractions(() => {
			this.props.navigation.navigate('BrowserView', {
				newTabUrl: mmFaucetUrl
			});
		});
	};

	render = () => {
		const { transactionToName, selectedAsset, paymentRequest } = this.props.transactionState;
		const { showHexData, showCustomNonce, primaryCurrency, network } = this.props;
		const { nonce } = this.props.transaction;
		const {
			gasEstimationReady,
			fromAccountBalance,
			fromAccountName,
			fromSelectedAddress,
			transactionValue = '',
			transactionValueFiat = '',
			transactionFeeFiat = '',
			transactionFee,
			transactionTo = '',
			transactionTotalAmount = <Text />,
			transactionTotalAmountFiat = <Text />,
			errorMessage,
			transactionConfirmed,
			warningGasPriceHigh,
			mode,
			over
		} = this.state;

		const is_main_net = isMainNet(network);
		const errorPress = is_main_net ? this.buyEth : this.gotoFaucet;
		const networkName = capitalize(getNetworkName(network));
		const errorLinkText = is_main_net
			? strings('transaction.buy_more_eth')
			: strings('transaction.get_ether', { networkName });
		return (
			<SafeAreaView style={styles.wrapper} testID={'txn-confirm-screen'}>
				<View style={styles.inputWrapper}>
					<AddressFrom
						onPressIcon={!paymentRequest ? null : this.toggleFromAccountModal}
						fromAccountAddress={fromSelectedAddress}
						fromAccountName={fromAccountName}
						fromAccountBalance={fromAccountBalance}
					/>
					<AddressTo
						addressToReady
						toSelectedAddress={transactionTo}
						toAddressName={transactionToName}
						onToSelectedAddressChange={this.onToSelectedAddressChange}
					/>
				</View>

				<ScrollView style={baseStyles.flexGrow} ref={this.setScrollViewRef}>
					{!selectedAsset.tokenId ? (
						<View style={styles.amountWrapper}>
							<Text style={styles.textAmountLabel}>{strings('transaction.amount')}</Text>
							<Text style={styles.textAmount} testID={'confirm-txn-amount'}>
								{transactionValue}
							</Text>
							<Text style={styles.textAmountLabel}>{transactionValueFiat}</Text>
						</View>
					) : (
						<View style={styles.amountWrapper}>
							<Text style={styles.textAmountLabel}>{strings('transaction.asset')}</Text>
							<View style={styles.collectibleImageWrapper}>
								<CollectibleImage
									iconStyle={styles.collectibleImage}
									containerStyle={styles.collectibleImage}
									collectible={selectedAsset}
								/>
							</View>
							<View>
								<Text style={styles.collectibleName}>{selectedAsset.name}</Text>
								<Text style={styles.collectibleTokenId}>{`#${selectedAsset.tokenId}`}</Text>
							</View>
						</View>
					)}
					<TransactionReviewFeeCard
						totalGasFiat={transactionFeeFiat}
						totalGasEth={transactionFee}
						totalFiat={transactionTotalAmountFiat}
						fiat={transactionValueFiat}
						totalValue={transactionTotalAmount}
						transactionValue={transactionValue}
						primaryCurrency={primaryCurrency}
						gasEstimationReady={gasEstimationReady}
						edit={() => this.edit(EDIT)}
						over={over}
						warningGasPriceHigh={warningGasPriceHigh}
						showCustomNonce={showCustomNonce}
						nonceValue={nonce}
						onNonceEdit={() => this.edit(EDIT_NONCE)}
					/>
					{errorMessage && (
						<View style={styles.errorWrapper}>
							<TouchableOpacity onPress={errorPress}>
								<Text style={styles.error}>{errorMessage}</Text>
								{/* only show buy more on mainnet */}
								{over && is_main_net && (
									<Text style={[styles.error, styles.underline]}>{errorLinkText}</Text>
								)}
							</TouchableOpacity>
						</View>
					)}
					{!!warningGasPriceHigh && (
						<View style={styles.errorWrapper}>
							<Text style={styles.error}>{warningGasPriceHigh}</Text>
						</View>
					)}
					<View style={styles.actionsWrapper}>
						{showHexData && (
							<TouchableOpacity style={styles.actionTouchable} onPress={this.toggleHexDataModal}>
								<Text style={styles.actionText}>{strings('transaction.hex_data')}</Text>
							</TouchableOpacity>
						)}
					</View>
				</ScrollView>
				<View style={styles.buttonNextWrapper}>
					<StyledButton
						type={'confirm'}
						disabled={!gasEstimationReady || Boolean(errorMessage)}
						containerStyle={styles.buttonNext}
						onPress={this.onNext}
						testID={'txn-confirm-send-button'}
					>
						{transactionConfirmed ? (
							<ActivityIndicator size="small" color="white" />
						) : (
							strings('transaction.send')
						)}
					</StyledButton>
				</View>
				{this.renderFromAccountModal()}
				{mode === EDIT && this.renderCustomGasModal()}
				{mode === EDIT_NONCE && this.renderCustomNonceModal()}
				{this.renderHexDataModal()}
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
	network: state.engine.backgroundState.NetworkController.network,
	identities: state.engine.backgroundState.PreferencesController.identities,
	providerType: state.engine.backgroundState.NetworkController.provider.type,
	showHexData: state.settings.showHexData,
	showCustomNonce: state.settings.showCustomNonce,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	keyrings: state.engine.backgroundState.KeyringController.keyrings,
	transaction: getNormalizedTxState(state),
	selectedAsset: state.transaction.selectedAsset,
	transactionState: state.transaction,
	primaryCurrency: state.settings.primaryCurrency
});

const mapDispatchToProps = dispatch => ({
	prepareTransaction: transaction => dispatch(prepareTransaction(transaction)),
	resetTransaction: () => dispatch(resetTransaction()),
	setNonce: nonce => dispatch(setNonce(nonce)),
	setProposedNonce: nonce => dispatch(setProposedNonce(nonce))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Confirm);
