import React, { PureComponent } from 'react';
import { colors, baseStyles, fontStyles } from '../../../../styles/common';
import {
	InteractionManager,
	StyleSheet,
	SafeAreaView,
	View,
	Alert,
	Text,
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
	toWei,
	isDecimal,
	toBN
} from '../../../../util/number';
import { getTicker, decodeTransferData, getNormalizedTxState } from '../../../../util/transactions';
import StyledButton from '../../../UI/StyledButton';
import { util } from '@metamask/controllers';
import { prepareTransaction, resetTransaction } from '../../../../actions/transaction';
import {
	fetchBasicGasEstimates,
	convertApiValueToGWEI,
	apiEstimateModifiedToWEI,
	getBasicGasEstimates
} from '../../../../util/custom-gas';
import Engine from '../../../../core/Engine';
import PaymentChannelsClient from '../../../../core/PaymentChannelsClient';
import Logger from '../../../../util/Logger';
import AccountList from '../../../UI/AccountList';
import AnimatedTransactionModal from '../../../UI/AnimatedTransactionModal';
import TransactionReviewFeeCard from '../../../UI/TransactionReview/TransactionReviewFeeCard';
import CustomGas from '../../../UI/CustomGas';
import ErrorMessage from '../ErrorMessage';
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

const EDIT = 'edit';
const REVIEW = 'review';

const { hexToBN, BNToHex } = util;
const {
	CUSTOM_GAS: { AVERAGE_GAS, FAST_GAS, LOW_GAS }
} = TransactionTypes;

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
	errorMessageWrapper: {
		marginTop: 16,
		marginHorizontal: 24
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
		 * Indicates whether the current transaction is a payment channel transaction
		 */
		isPaymentChannelTransaction: PropTypes.bool,
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
		primaryCurrency: PropTypes.string
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
		ready: false,
		transactionValue: undefined,
		transactionValueFiat: undefined,
		transactionFee: undefined,
		transactionTotalAmount: undefined,
		transactionTotalAmountFiat: undefined,
		errorMessage: undefined,
		fromAccountModalVisible: false,
		paymentChannelBalance: this.props.selectedAsset.assetBalance,
		paymentChannelReady: false,
		mode: REVIEW
	};

	componentDidMount = async () => {
		// For analytics
		const { navigation, providerType } = this.props;
		await this.handleFetchBasicEstimates();
		navigation.setParams({ providerType });
		this.parseTransactionData();
		this.prepareTransaction();

		PaymentChannelsClient.hub.on('state::change', paymentChannelState => {
			if (paymentChannelState.balance !== this.state.paymentChannelBalance || !this.state.paymentChannelReady) {
				this.setState({
					paymentChannelBalance: paymentChannelState.balance,
					paymentChannelReady: true
				});
			}
		});
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

	edit = () => {
		this.onModeChange(EDIT);
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
		const basicGasEstimates = await getBasicGasEstimates();
		this.handleSetGasFee(this.props.transaction.gas, apiEstimateModifiedToWEI(basicGasEstimates.averageGwei));
		this.setState({ basicGasEstimates, ready: true });
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
		const { TransactionController } = Engine.context;
		const { value, data, to, from } = transaction;
		let estimation;
		try {
			estimation = await TransactionController.estimateGas({
				value,
				from,
				data,
				to
			});
		} catch (e) {
			estimation = { gas: TransactionTypes.CUSTOM_GAS.DEFAULT_GAS_LIMIT };
		}
		let basicGasEstimates;
		try {
			basicGasEstimates = await fetchBasicGasEstimates();
		} catch (error) {
			Logger.log('Error while trying to get gas limit estimates', error);
			basicGasEstimates = { average: AVERAGE_GAS, safeLow: LOW_GAS, fast: FAST_GAS };
		}
		return {
			gas: hexToBN(estimation.gas),
			gasPrice: toWei(convertApiValueToGWEI(basicGasEstimates.average), 'gwei')
		};
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
				transaction: { from, value, gas, gasPrice, data },
				readableValue
			},
			ticker,
			isPaymentChannelTransaction
		} = this.props;
		const { fromSelectedAddress } = this.state;
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

		if (isPaymentChannelTransaction) {
			fromAccountBalance = `${selectedAsset.assetBalance} ${selectedAsset.symbol}`;
			transactionValue = `${readableValue} ${selectedAsset.symbol}`;
			transactionTo = to;
		} else if (selectedAsset.isETH) {
			fromAccountBalance = `${renderFromWei(accounts[fromSelectedAddress].balance)} ${parsedTicker}`;
			transactionValue = `${renderFromWei(value)} ${parsedTicker}`;
			transactionValueFiat = weiToFiat(valueBN, conversionRate, currentCurrency);
			const transactionTotalAmountBN = weiTransactionFee && weiTransactionFee.add(valueBN);
			transactionTotalAmount = (
				<Text style={styles.totalAmount}>
					{renderFromWei(transactionTotalAmountBN)} {parsedTicker}
				</Text>
			);
			transactionTotalAmountFiat = (
				<Text style={styles.totalAmount}>
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
					value: isPaymentChannelTransaction ? readableValue : value
				});
			}
		);
	};

	handleSetGasFee = (customGas, customGasPrice) => {
		const { prepareTransaction, transactionState } = this.props;
		let transaction = transactionState.transaction;
		transaction = { ...transaction, gas: customGas, gasPrice: customGasPrice };
		prepareTransaction(transaction);
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
			transactionState: { transaction }
		} = this.props;
		const { fromSelectedAddress } = this.state;
		const transactionToSend = { ...transaction };
		transactionToSend.gas = BNToHex(transaction.gas);
		transactionToSend.gasPrice = BNToHex(transaction.gasPrice);
		transactionToSend.from = fromSelectedAddress;
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
				paymentChannelTransaction,
				transaction: { gas, gasPrice }
			}
		} = this.props;
		const selectedAddress = transaction.from;
		let weiBalance, weiInput, errorMessage;
		if (isDecimal(transaction.value)) {
			if (paymentChannelTransaction) {
				weiBalance = toWei(Number(selectedAsset.assetBalance));
				weiInput = toWei(transaction.value);
				errorMessage = weiBalance.gte(weiInput) ? undefined : strings('transaction.insufficient');
			} else if (selectedAsset.isETH || selectedAsset.tokenId) {
				const totalGas = gas ? gas.mul(gasPrice) : toBN('0x0');
				weiBalance = hexToBN(accounts[selectedAddress].balance);
				weiInput = hexToBN(transaction.value).add(totalGas);
				errorMessage = weiBalance.gte(weiInput) ? undefined : strings('transaction.insufficient');
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

	onPaymentChannelSend = async () => {
		this.setState({ transactionConfirmed: true });
		const {
			navigation,
			transactionState: { readableValue, transactionTo }
		} = this.props;
		if (this.sending) {
			return;
		}
		if (this.validateAmount({ value: readableValue })) {
			this.setState({ transactionConfirmed: false });
			return;
		}
		try {
			const params = {
				sendRecipient: transactionTo,
				sendAmount: readableValue
			};

			if (isNaN(params.sendAmount) || params.sendAmount.trim() === '') {
				Alert.alert(strings('payment_channel.error'), strings('payment_channel.enter_the_amount'));
				return false;
			}

			if (!params.sendRecipient) {
				Alert.alert(strings('payment_channel.error'), strings('payment_channel.enter_the_recipient'));
			}

			Logger.log('Sending ', params);
			this.sending = true;
			await PaymentChannelsClient.send(params);
			this.sending = false;

			Logger.log('Send succesful');
			this.props.resetTransaction();
			navigation.navigate('PaymentChannelHome');
		} catch (e) {
			let msg = strings('payment_channel.unknown_error');
			if (e.message === 'insufficient_balance') {
				msg = strings('payment_channel.insufficient_balance');
			}
			Alert.alert(strings('payment_channel.error'), msg);
			Logger.log('buy error error', e);
			this.sending = false;
		}
	};

	onNext = async () => {
		const { TransactionController } = Engine.context;
		const {
			transactionState: { assetType },
			navigation,
			providerType,
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
				Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.SEND_FLOW_CONFIRM_SEND, {
					network: providerType
				});
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
						/>
					</AnimatedTransactionModal>
				</KeyboardAwareScrollView>
			</Modal>
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

	render = () => {
		const { transactionToName, selectedAsset, paymentRequest } = this.props.transactionState;
		const { showHexData, isPaymentChannelTransaction, primaryCurrency } = this.props;
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
			paymentChannelBalance,
			mode
		} = this.state;
		return (
			<SafeAreaView style={styles.wrapper} testID={'txn-confirm-screen'}>
				<View style={styles.inputWrapper}>
					<AddressFrom
						onPressIcon={!paymentRequest ? null : this.toggleFromAccountModal}
						fromAccountAddress={fromSelectedAddress}
						fromAccountName={fromAccountName}
						fromAccountBalance={isPaymentChannelTransaction ? paymentChannelBalance : fromAccountBalance}
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
					{!isPaymentChannelTransaction && (
						<TransactionReviewFeeCard
							totalGasFiat={transactionFeeFiat}
							totalGasEth={transactionFee}
							totalFiat={transactionTotalAmountFiat}
							fiat={transactionValueFiat}
							totalValue={transactionTotalAmount}
							transactionValue={transactionValue}
							primaryCurrency={primaryCurrency}
							gasEstimationReady={gasEstimationReady}
							edit={this.edit}
						/>
					)}
					{errorMessage && (
						<View style={styles.errorMessageWrapper}>
							<ErrorMessage errorMessage={errorMessage} />
						</View>
					)}
					<View style={styles.actionsWrapper}>
						{!isPaymentChannelTransaction && showHexData && (
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
						onPress={isPaymentChannelTransaction ? this.onPaymentChannelSend : this.onNext}
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
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	keyrings: state.engine.backgroundState.KeyringController.keyrings,
	transaction: getNormalizedTxState(state),
	isPaymentChannelTransaction: state.transaction.paymentChannelTransaction,
	selectedAsset: state.transaction.selectedAsset,
	transactionState: state.transaction,
	primaryCurrency: state.settings.primaryCurrency
});

const mapDispatchToProps = dispatch => ({
	prepareTransaction: transaction => dispatch(prepareTransaction(transaction)),
	resetTransaction: () => dispatch(resetTransaction())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Confirm);
