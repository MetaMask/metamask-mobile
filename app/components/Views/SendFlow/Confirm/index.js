import React, { PureComponent } from 'react';
import { colors, baseStyles, fontStyles } from '../../../../styles/common';
import {
	InteractionManager,
	StyleSheet,
	View,
	Alert,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
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
	isDecimal,
	fromWei,
} from '../../../../util/number';

import {
	getTicker,
	decodeTransferData,
	getNormalizedTxState,
	parseTransactionEIP1559,
	parseTransactionLegacy,
} from '../../../../util/transactions';
import StyledButton from '../../../UI/StyledButton';
import { util, WalletDevice, NetworksChainId, GAS_ESTIMATE_TYPES } from '@metamask/controllers';
import { prepareTransaction, resetTransaction, setNonce, setProposedNonce } from '../../../../actions/transaction';
import { getGasLimit } from '../../../../util/custom-gas';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import AccountList from '../../../UI/AccountList';
import CustomNonceModal from '../../../UI/CustomNonceModal';
import { doENSReverseLookup } from '../../../../util/ENSUtils';
import NotificationManager from '../../../../core/NotificationManager';
import { strings } from '../../../../../locales/i18n';
import collectiblesTransferInformation from '../../../../util/collectibles-transfer';
import CollectibleMedia from '../../../UI/CollectibleMedia';
import Modal from 'react-native-modal';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import TransactionTypes from '../../../../core/TransactionTypes';
import Analytics from '../../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../../util/analytics';
import { capitalize, shallowEqual, renderShortText } from '../../../../util/general';
import { isMainNet, getNetworkName, getNetworkNonce, isMainnetByChainId } from '../../../../util/networks';
import Text from '../../../Base/Text';
import AnalyticsV2 from '../../../../util/analyticsV2';
import { collectConfusables } from '../../../../util/validators';
import InfoModal from '../../../UI/Swaps/components/InfoModal';
import { addHexPrefix, toChecksumAddress } from 'ethereumjs-util';
import { removeFavoriteCollectible } from '../../../../actions/collectibles';
import { SafeAreaView } from 'react-native-safe-area-context';
import TransactionReviewEIP1559 from '../../../UI/TransactionReview/TransactionReviewEIP1559';
import EditGasFee1559 from '../../../UI/EditGasFee1559';
import EditGasFeeLegacy from '../../../UI/EditGasFeeLegacy';
import CustomNonce from '../../../UI/CustomNonce';
import AppConstants from '../../../../core/AppConstants';

const EDIT = 'edit';
const EDIT_NONCE = 'edit_nonce';
const EDIT_EIP1559 = 'edit_eip1559';
const REVIEW = 'review';

const EMPTY_LEGACY_TRANSACTION_DATA = {
	transactionFeeFiat: '',
	transactionFee: '',
	transactionTotalAmount: '',
	transactionTotalAmountFiat: '',
};

const { hexToBN, BNToHex } = util;

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: colors.white,
	},
	inputWrapper: {
		flex: 0,
		borderBottomWidth: 1,
		borderBottomColor: colors.grey050,
		paddingHorizontal: 8,
	},
	amountWrapper: {
		flexDirection: 'column',
		margin: 24,
	},
	textAmountLabel: {
		...fontStyles.normal,
		fontSize: 14,
		textAlign: 'center',
		color: colors.grey500,
		textTransform: 'uppercase',
		marginVertical: 3,
	},
	textAmount: {
		...fontStyles.normal,
		fontWeight: fontStyles.light.fontWeight,
		color: colors.black,
		fontSize: 44,
		textAlign: 'center',
	},
	buttonNext: {
		flex: 1,
		marginHorizontal: 24,
		alignSelf: 'flex-end',
	},
	buttonNextWrapper: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		marginBottom: 16,
	},
	actionTouchable: {
		padding: 12,
	},
	actionText: {
		...fontStyles.normal,
		color: colors.blue,
		fontSize: 14,
		alignSelf: 'center',
	},
	actionsWrapper: {
		margin: 24,
	},
	CollectibleMediaWrapper: {
		flexDirection: 'column',
		alignItems: 'center',
		margin: 16,
	},
	collectibleName: {
		...fontStyles.normal,
		fontSize: 18,
		color: colors.black,
		textAlign: 'center',
	},
	collectibleTokenId: {
		...fontStyles.normal,
		fontSize: 12,
		color: colors.grey500,
		marginTop: 8,
		textAlign: 'center',
	},
	CollectibleMedia: {
		height: 120,
		width: 120,
	},
	qrCode: {
		marginBottom: 16,
		paddingHorizontal: 36,
		paddingBottom: 24,
		paddingTop: 16,
		backgroundColor: colors.grey000,
		borderRadius: 8,
		width: '100%',
	},
	hexDataWrapper: {
		padding: 10,
		alignItems: 'center',
	},
	addressTitle: {
		...fontStyles.bold,
		color: colors.black,
		alignItems: 'center',
		justifyContent: 'center',
		textAlign: 'center',
		fontSize: 16,
		marginBottom: 16,
	},
	hexDataClose: {
		zIndex: 999,
		position: 'absolute',
		top: 12,
		right: 20,
	},
	hexDataText: {
		textAlign: 'justify',
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0,
	},
	keyboardAwareWrapper: {
		flex: 1,
		justifyContent: 'flex-end',
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
		alignItems: 'center',
	},
	error: {
		color: colors.red,
		fontSize: 12,
		lineHeight: 16,
		...fontStyles.normal,
		textAlign: 'center',
	},
	underline: {
		textDecorationLine: 'underline',
		...fontStyles.bold,
	},
	text: {
		lineHeight: 20,
	},
});

/**
 * View that wraps the wraps the "Send" screen
 */
class Confirm extends PureComponent {
	static navigationOptions = ({ navigation, route }) => getSendFlowTitle('send.confirm', navigation, route);

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
		 * Map representing the address book
		 */
		addressBook: PropTypes.object,
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
		 * Chain Id
		 */
		chainId: PropTypes.string,
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
		setProposedNonce: PropTypes.func,
		/**
		 * Gas fee estimates returned by the gas fee controller
		 */
		gasFeeEstimates: PropTypes.object,
		/**
		 * Estimate type returned by the gas fee controller, can be market-fee, legacy or eth_gasPrice
		 */
		gasEstimateType: PropTypes.string,
		/**
		 * Indicates whether the current transaction is a deep link transaction
		 */
		isPaymentRequest: PropTypes.bool,
		/**
		 * A string representing the network type
		 */
		networkType: PropTypes.string,
	};

	state = {
		confusableCollection: [],
		gasEstimationReady: false,
		customGas: undefined,
		customGasPrice: undefined,
		fromAccountBalance: undefined,
		fromAccountName: this.props.transactionState.transactionFromName,
		fromSelectedAddress: this.props.transactionState.transaction.from,
		hexDataModalVisible: false,
		warningGasPriceHigh: undefined,
		ready: false,
		transactionValue: undefined,
		transactionValueFiat: undefined,
		transactionFee: undefined,
		transactionTotalAmount: undefined,
		transactionTotalAmountFiat: undefined,
		errorMessage: undefined,
		fromAccountModalVisible: false,
		warningModalVisible: false,
		mode: REVIEW,
		over: false,
		gasSelected: AppConstants.GAS_OPTIONS.MEDIUM,
		gasSelectedTemp: AppConstants.GAS_OPTIONS.MEDIUM,
		EIP1559TransactionData: {},
		EIP1559TransactionDataTemp: {},
		stopUpdateGas: false,
		advancedGasInserted: false,
		LegacyTransactionData: EMPTY_LEGACY_TRANSACTION_DATA,
		LegacyTransactionDataTemp: {},
		gasSpeedSelected: AppConstants.GAS_OPTIONS.MEDIUM,
	};

	setNetworkNonce = async () => {
		const { setNonce, setProposedNonce, transaction } = this.props;
		const proposedNonce = await getNetworkNonce(transaction);
		setNonce(proposedNonce);
		setProposedNonce(proposedNonce);
	};

	getAnalyticsParams = () => {
		try {
			const { selectedAsset, gasEstimateType, chainId, networkType } = this.props;
			const { gasSelected } = this.state;

			return {
				active_currency: { value: selectedAsset?.symbol, anonymous: true },
				network_name: networkType,
				chain_id: chainId,
				gas_estimate_type: gasEstimateType,
				gas_mode: gasSelected ? 'Basic' : 'Advanced',
				speed_set: gasSelected || undefined,
			};
		} catch (error) {
			return {};
		}
	};

	getGasAnalyticsParams = () => {
		try {
			const { selectedAsset, gasEstimateType, networkType } = this.props;
			return {
				active_currency: { value: selectedAsset.symbol, anonymous: true },
				gas_estimate_type: gasEstimateType,
				network_name: networkType,
			};
		} catch (error) {
			return {};
		}
	};

	handleConfusables = () => {
		const { identities = undefined, transactionState } = this.props;
		const { transactionToName = undefined } = transactionState;
		const accountNames = (identities && Object.keys(identities).map((hash) => identities[hash].name)) || [];
		const isOwnAccount = accountNames.includes(transactionToName);
		if (transactionToName && !isOwnAccount) {
			this.setState({ confusableCollection: collectConfusables(transactionToName) });
		}
	};

	toggleWarningModal = () => this.setState((state) => ({ warningModalVisible: !state.warningModalVisible }));

	componentWillUnmount = () => {
		const { GasFeeController } = Engine.context;
		GasFeeController.stopPolling(this.state.pollToken);
	};

	componentDidMount = async () => {
		this.getGasLimit();

		const { GasFeeController } = Engine.context;
		const pollToken = await GasFeeController.getGasFeeEstimatesAndStartPolling(this.state.pollToken);
		this.setState({ pollToken });
		// For analytics
		AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.SEND_TRANSACTION_STARTED, this.getAnalyticsParams());

		const { showCustomNonce, navigation, providerType, isPaymentRequest } = this.props;
		showCustomNonce && (await this.setNetworkNonce());
		navigation.setParams({ providerType, isPaymentRequest });
		this.handleConfusables();
		this.parseTransactionDataHeader();
	};

	componentDidUpdate = (prevProps, prevState) => {
		const {
			transactionState: {
				transactionTo,
				transaction: { value, gas },
			},
			contractBalances,
			selectedAsset,
		} = this.props;

		const { errorMessage, fromSelectedAddress } = this.state;
		const valueChanged = prevProps.transactionState.transaction.value !== value;
		const fromAddressChanged = prevState.fromSelectedAddress !== fromSelectedAddress;
		const previousContractBalance = prevProps.contractBalances[selectedAsset.address];
		const newContractBalance = contractBalances[selectedAsset.address];
		const contractBalanceChanged = previousContractBalance !== newContractBalance;
		const recipientIsDefined = transactionTo !== undefined;
		if (recipientIsDefined && (valueChanged || fromAddressChanged || contractBalanceChanged)) {
			this.parseTransactionDataHeader();
		}
		if (!prevState.errorMessage && errorMessage) {
			this.scrollView.scrollToEnd({ animated: true });
		}

		if (
			this.props.gasFeeEstimates &&
			gas &&
			(!shallowEqual(prevProps.gasFeeEstimates, this.props.gasFeeEstimates) ||
				gas !== prevProps?.transactionState?.transaction?.gas)
		) {
			const gasEstimateTypeChanged = prevProps.gasEstimateType !== this.props.gasEstimateType;
			const gasSelected = gasEstimateTypeChanged ? AppConstants.GAS_OPTIONS.MEDIUM : this.state.gasSelected;
			const gasSelectedTemp = gasEstimateTypeChanged
				? AppConstants.GAS_OPTIONS.MEDIUM
				: this.state.gasSelectedTemp;

			if ((!this.state.stopUpdateGas && !this.state.advancedGasInserted) || gasEstimateTypeChanged) {
				if (this.props.gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
					const suggestedGasLimit = fromWei(gas, 'wei');

					const EIP1559TransactionData = this.parseTransactionDataEIP1559({
						...this.props.gasFeeEstimates[gasSelected],
						suggestedGasLimit,
						selectedOption: gasSelected,
					});

					let EIP1559TransactionDataTemp;
					if (gasSelected === gasSelectedTemp) {
						EIP1559TransactionDataTemp = EIP1559TransactionData;
					} else {
						EIP1559TransactionDataTemp = this.parseTransactionDataEIP1559({
							...this.props.gasFeeEstimates[gasSelectedTemp],
							suggestedGasLimit,
							selectedOption: gasSelectedTemp,
						});
					}

					this.setError(EIP1559TransactionData.error);

					// eslint-disable-next-line react/no-did-update-set-state
					this.setState(
						{
							gasEstimationReady: true,
							EIP1559TransactionData,
							EIP1559TransactionDataTemp,
							LegacyTransactionData: EMPTY_LEGACY_TRANSACTION_DATA,
							LegacyTransactionDataTemp: EMPTY_LEGACY_TRANSACTION_DATA,
							animateOnChange: true,
							gasSelected,
							gasSelectedTemp,
						},
						() => {
							this.setState({ animateOnChange: false });
						}
					);
				} else if (this.props.gasEstimateType !== GAS_ESTIMATE_TYPES.NONE) {
					const suggestedGasLimit = fromWei(gas, 'wei');

					const LegacyTransactionData = this.parseTransactionDataLegacy({
						suggestedGasPrice:
							this.props.gasEstimateType === GAS_ESTIMATE_TYPES.LEGACY
								? this.props.gasFeeEstimates[gasSelected]
								: this.props.gasFeeEstimates.gasPrice,
						suggestedGasLimit,
					});

					let LegacyTransactionDataTemp;
					if (gasSelected === gasSelectedTemp) {
						LegacyTransactionDataTemp = LegacyTransactionData;
					} else {
						LegacyTransactionDataTemp = this.parseTransactionDataLegacy({
							suggestedGasPrice:
								this.props.gasEstimateType === GAS_ESTIMATE_TYPES.LEGACY
									? this.props.gasFeeEstimates[gasSelectedTemp]
									: this.props.gasFeeEstimates.gasPrice,
							suggestedGasLimit,
						});
					}
					this.setError(LegacyTransactionData.error);

					// eslint-disable-next-line react/no-did-update-set-state
					this.setState(
						{
							gasEstimationReady: true,
							LegacyTransactionData,
							LegacyTransactionDataTemp,
							EIP1559TransactionData: {},
							EIP1559TransactionDataTemp: {},
							animateOnChange: true,
							gasSelected,
							gasSelectedTemp,
						},
						() => {
							this.setState({ animateOnChange: false });
						}
					);
				}
				this.parseTransactionDataHeader();
			}
		}
	};

	setScrollViewRef = (ref) => {
		this.scrollView = ref;
	};

	review = () => {
		this.onModeChange(REVIEW);
	};

	edit = (MODE) => {
		this.onModeChange(MODE);
	};

	onModeChange = (mode) => {
		this.setState({ mode });
		if (mode === EDIT) {
			InteractionManager.runAfterInteractions(() => {
				Analytics.trackEvent(ANALYTICS_EVENT_OPTS.SEND_FLOW_ADJUSTS_TRANSACTION_FEE);
			});
		}
	};

	getGasLimit = async () => {
		const {
			prepareTransaction,
			transactionState: { transaction },
		} = this.props;
		const estimation = await getGasLimit(transaction);
		prepareTransaction({ ...transaction, ...estimation });
	};

	parseTransactionDataHeader = () => {
		const {
			accounts,
			contractBalances,
			contractExchangeRates,
			conversionRate,
			currentCurrency,
			transactionState: {
				selectedAsset,
				transactionTo: to,
				transaction: { from, value, data },
			},
			ticker,
		} = this.props;
		const { fromSelectedAddress } = this.state;
		let fromAccountBalance, transactionValue, transactionValueFiat, transactionTo;
		const valueBN = hexToBN(value);
		const parsedTicker = getTicker(ticker);

		if (selectedAsset.isETH) {
			fromAccountBalance = `${renderFromWei(accounts[fromSelectedAddress].balance)} ${parsedTicker}`;
			transactionValue = `${renderFromWei(value)} ${parsedTicker}`;
			transactionValueFiat = weiToFiat(valueBN, conversionRate, currentCurrency);
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
			transactionValueFiat =
				balanceToFiat(transferValue, conversionRate, exchangeRate, currentCurrency) || `0 ${currentCurrency}`;
		}
		this.setState({
			fromAccountBalance,
			transactionValue,
			transactionValueFiat,
			transactionTo,
		});
	};

	parseTransactionDataEIP1559 = (gasFee, options) => {
		const parsedTransactionEIP1559 = parseTransactionEIP1559(
			{
				...this.props,
				selectedGasFee: { ...gasFee, estimatedBaseFee: this.props.gasFeeEstimates.estimatedBaseFee },
			},
			options
		);
		const { transaction } = this.props;
		parsedTransactionEIP1559.error = this.validateAmount({
			transaction,
			total: parsedTransactionEIP1559.totalMaxHex,
		});

		return parsedTransactionEIP1559;
	};

	parseTransactionDataLegacy = (gasFee, options) => {
		const parsedTransactionLegacy = parseTransactionLegacy(
			{
				...this.props,
				selectedGasFee: gasFee,
			},
			options
		);
		const { transaction } = this.props;

		parsedTransactionLegacy.error = this.validateAmount({
			transaction,
			total: parsedTransactionLegacy.totalHex,
		});

		return parsedTransactionLegacy;
	};

	handleSetGasSpeed = (speed) => {
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
			showCustomNonce,
			gasEstimateType,
		} = this.props;
		const { fromSelectedAddress, LegacyTransactionData, EIP1559TransactionData } = this.state;
		const { nonce } = this.props.transaction;
		const transactionToSend = { ...transaction };

		if (gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
			transactionToSend.gas = EIP1559TransactionData.gasLimitHex;
			transactionToSend.maxFeePerGas = addHexPrefix(EIP1559TransactionData.suggestedMaxFeePerGasHex); //'0x2540be400'
			transactionToSend.maxPriorityFeePerGas = addHexPrefix(
				EIP1559TransactionData.suggestedMaxPriorityFeePerGasHex
			); //'0x3b9aca00';
			transactionToSend.estimatedBaseFee = addHexPrefix(EIP1559TransactionData.estimatedBaseFeeHex);
			delete transactionToSend.gasPrice;
		} else {
			transactionToSend.gas = LegacyTransactionData.suggestedGasLimitHex;
			transactionToSend.gasPrice = addHexPrefix(LegacyTransactionData.suggestedGasPriceHex);
		}

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
			chainId,
		} = this.props;
		const { fromSelectedAddress } = this.state;
		if (assetType === 'ERC721' && chainId !== NetworksChainId.mainnet) {
			const { CollectiblesController } = Engine.context;
			removeFavoriteCollectible(fromSelectedAddress, chainId, selectedAsset);
			CollectiblesController.removeCollectible(selectedAsset.address, selectedAsset.tokenId);
		}
	};

	/**
	 * Validates crypto value only
	 * Independent of current internalPrimaryCurrencyIsCrypto
	 *
	 * @param {string} - Crypto value
	 * @returns - Whether there is an error with the amount
	 */
	validateAmount = ({ transaction, total }) => {
		const {
			accounts,
			contractBalances,
			selectedAsset,
			transactionState: {
				ticker,
				transaction: { value },
			},
		} = this.props;
		const selectedAddress = transaction.from;
		let weiBalance, weiInput, error;

		if (isDecimal(value)) {
			if (selectedAsset.isETH || selectedAsset.tokenId) {
				weiBalance = hexToBN(accounts[selectedAddress].balance);
				const totalTransactionValue = hexToBN(total);
				if (!weiBalance.gte(totalTransactionValue)) {
					const amount = renderFromWei(totalTransactionValue.sub(weiBalance));
					const tokenSymbol = getTicker(ticker);
					error = strings('transaction.insufficient_amount', { amount, tokenSymbol });
				}
			} else {
				const [, , amount] = decodeTransferData('transfer', transaction.data);
				weiBalance = contractBalances[selectedAsset.address];
				weiInput = hexToBN(amount);
				error =
					weiBalance && weiBalance.gte(weiInput)
						? undefined
						: strings('transaction.insufficient_tokens', { token: selectedAsset.symbol });
			}
		} else {
			error = strings('transaction.invalid_amount');
		}

		return error;
	};

	setError = (errorMessage) => {
		this.setState({ errorMessage }, () => {
			if (errorMessage) {
				this.scrollView.scrollToEnd({ animated: true });
			}
		});
	};

	onNext = async () => {
		const { TransactionController } = Engine.context;
		const {
			transactionState: { assetType },
			navigation,
			resetTransaction,
			gasEstimateType,
		} = this.props;
		const { EIP1559TransactionData, LegacyTransactionData, transactionConfirmed } = this.state;
		if (transactionConfirmed) return;
		this.setState({ transactionConfirmed: true, stopUpdateGas: true });
		try {
			const transaction = this.prepareTransactionToSend();
			let error;
			if (gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
				error = this.validateAmount({ transaction, total: EIP1559TransactionData.totalMaxHex });
			} else {
				error = this.validateAmount({ transaction, total: LegacyTransactionData.totalHex });
			}
			this.setError(error);
			if (error) {
				this.setState({ transactionConfirmed: false, stopUpdateGas: true });
				return;
			}

			const { result, transactionMeta } = await TransactionController.addTransaction(
				transaction,
				TransactionTypes.MMM,
				WalletDevice.MM_MOBILE
			);
			await TransactionController.approveTransaction(transactionMeta.id);
			await new Promise((resolve) => resolve(result));

			if (transactionMeta.error) {
				throw transactionMeta.error;
			}

			InteractionManager.runAfterInteractions(() => {
				NotificationManager.watchSubmittedTransaction({
					...transactionMeta,
					assetType,
				});
				this.checkRemoveCollectible();
				AnalyticsV2.trackEvent(
					AnalyticsV2.ANALYTICS_EVENTS.SEND_TRANSACTION_COMPLETED,
					this.getAnalyticsParams()
				);
				resetTransaction();
				navigation && navigation.dangerouslyGetParent()?.pop();
			});
		} catch (error) {
			Alert.alert(strings('transactions.transaction_error'), error && error.message, [
				{ text: strings('navigation.ok') },
			]);
			Logger.error(error, 'error while trying to send transaction (Confirm)');
		}
		this.setState({ transactionConfirmed: false });
	};

	getBalanceError = (balance) => {
		const {
			transactionState: {
				transaction: { value = '0x0', gas = '0x0', gasPrice = '0x0' },
			},
		} = this.props;

		const gasBN = hexToBN(gas);
		const weiTransactionFee = gasBN.mul(hexToBN(gasPrice));
		const valueBN = hexToBN(value);
		const transactionTotalAmountBN = weiTransactionFee.add(valueBN);

		const balanceIsInsufficient = hexToBN(balance).lt(transactionTotalAmountBN);

		return balanceIsInsufficient ? strings('transaction.insufficient') : null;
	};

	onAccountChange = async (accountAddress) => {
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
			balanceIsZero: hexToBN(accounts[accountAddress].balance).isZero(),
		});
		this.parseTransactionDataHeader();
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

	cancelGasEdition = () => {
		this.setState({
			EIP1559TransactionDataTemp: { ...this.state.EIP1559TransactionData },
			LegacyTransactionDataTemp: { ...this.state.LegacyTransactionData },
			stopUpdateGas: false,
			gasSelectedTemp: this.state.gasSelected,
		});
		this.review();
	};

	saveGasEdition = (gasSelected) => {
		this.setState({
			EIP1559TransactionData: { ...this.state.EIP1559TransactionDataTemp },
			LegacyTransactionData: { ...this.state.LegacyTransactionDataTemp },
			gasSelected,
			gasSelectedTemp: gasSelected,
			advancedGasInserted: !gasSelected,
			stopUpdateGas: false,
		});

		const error = this.state.EIP1559TransactionDataTemp.error || this.state.LegacyTransactionDataTemp.error;
		this.setError(error);

		this.review();
	};

	renderCustomGasModalEIP1559 = () => {
		const { primaryCurrency, chainId, gasFeeEstimates } = this.props;
		const { EIP1559TransactionDataTemp, gasSelected, isAnimating, animateOnChange } = this.state;

		return (
			<Modal
				isVisible
				animationIn="slideInUp"
				animationOut="slideOutDown"
				style={styles.bottomModal}
				backdropOpacity={0.7}
				animationInTiming={600}
				animationOutTiming={600}
				onBackdropPress={this.cancelGasEdition}
				onBackButtonPress={this.cancelGasEdition}
				onSwipeComplete={this.cancelGasEdition}
				swipeDirection={'down'}
				propagateSwipe
			>
				<KeyboardAwareScrollView contentContainerStyle={styles.keyboardAwareWrapper}>
					<EditGasFee1559
						selected={gasSelected}
						gasFee={EIP1559TransactionDataTemp}
						gasOptions={gasFeeEstimates}
						onChange={this.calculateTempGasFee}
						gasFeeNative={EIP1559TransactionDataTemp.renderableGasFeeMinNative}
						gasFeeConversion={EIP1559TransactionDataTemp.renderableGasFeeMinConversion}
						gasFeeMaxNative={EIP1559TransactionDataTemp.renderableGasFeeMaxNative}
						gasFeeMaxConversion={EIP1559TransactionDataTemp.renderableGasFeeMaxConversion}
						maxPriorityFeeNative={EIP1559TransactionDataTemp.renderableMaxPriorityFeeNative}
						maxPriorityFeeConversion={EIP1559TransactionDataTemp.renderableMaxPriorityFeeConversion}
						maxFeePerGasNative={EIP1559TransactionDataTemp.renderableMaxFeePerGasNative}
						maxFeePerGasConversion={EIP1559TransactionDataTemp.renderableMaxFeePerGasConversion}
						primaryCurrency={primaryCurrency}
						chainId={chainId}
						timeEstimate={EIP1559TransactionDataTemp.timeEstimate}
						timeEstimateColor={EIP1559TransactionDataTemp.timeEstimateColor}
						timeEstimateId={EIP1559TransactionDataTemp.timeEstimateId}
						onCancel={this.cancelGasEdition}
						onSave={this.saveGasEdition}
						error={EIP1559TransactionDataTemp.error}
						animateOnChange={animateOnChange}
						isAnimating={isAnimating}
						analyticsParams={this.getGasAnalyticsParams()}
						view={'SendTo (Confirm)'}
					/>
				</KeyboardAwareScrollView>
			</Modal>
		);
	};

	renderCustomGasModalLegacy = () => {
		const { primaryCurrency, chainId, gasEstimateType, gasFeeEstimates } = this.props;
		const { LegacyTransactionDataTemp, gasSelected, isAnimating, animateOnChange } = this.state;
		return (
			<Modal
				isVisible
				animationIn="slideInUp"
				animationOut="slideOutDown"
				style={styles.bottomModal}
				backdropOpacity={0.7}
				animationInTiming={600}
				animationOutTiming={600}
				onBackdropPress={this.cancelGasEdition}
				onBackButtonPress={this.cancelGasEdition}
				onSwipeComplete={this.cancelGasEdition}
				swipeDirection={'down'}
				propagateSwipe
			>
				<KeyboardAwareScrollView contentContainerStyle={styles.keyboardAwareWrapper}>
					<EditGasFeeLegacy
						selected={gasSelected}
						gasFee={LegacyTransactionDataTemp}
						gasEstimateType={gasEstimateType}
						gasOptions={gasFeeEstimates}
						onChange={this.calculateTempGasFeeLegacy}
						gasFeeNative={LegacyTransactionDataTemp.transactionFee}
						gasFeeConversion={LegacyTransactionDataTemp.transactionFeeFiat}
						gasPriceConversion={LegacyTransactionDataTemp.transactionFeeFiat}
						error={LegacyTransactionDataTemp.error}
						primaryCurrency={primaryCurrency}
						chainId={chainId}
						onCancel={this.cancelGasEdition}
						onSave={this.saveGasEdition}
						animateOnChange={animateOnChange}
						isAnimating={isAnimating}
						analyticsParams={this.getGasAnalyticsParams()}
						view={'SendTo (Confirm)'}
					/>
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
		try {
			navigation.navigate('FiatOnRamp');
		} catch (error) {
			Logger.error(error, 'Navigation: Error when navigating to buy ETH.');
		}
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.RECEIVE_OPTIONS_PAYMENT_REQUEST);
		});
	};

	gotoFaucet = () => {
		const mmFaucetUrl = 'https://faucet.metamask.io/';
		InteractionManager.runAfterInteractions(() => {
			this.props.navigation.navigate('BrowserView', {
				newTabUrl: mmFaucetUrl,
			});
		});
	};

	calculateTempGasFee = (gas, selected) => {
		const {
			transactionState: { transaction },
		} = this.props;
		if (selected && gas) {
			gas.suggestedGasLimit = fromWei(transaction.gas, 'wei');
		}
		this.setState({
			EIP1559TransactionDataTemp: this.parseTransactionDataEIP1559({ ...gas, selectedOption: selected }),
			stopUpdateGas: !selected,
			gasSelectedTemp: selected,
		});
	};

	calculateTempGasFeeLegacy = (gas, selected) => {
		const {
			transactionState: { transaction },
		} = this.props;
		if (selected && gas) {
			gas.suggestedGasLimit = fromWei(transaction.gas, 'wei');
		}

		this.setState({
			LegacyTransactionDataTemp: this.parseTransactionDataLegacy(gas),
			stopUpdateGas: !selected,
			gasSelectedTemp: selected,
		});
	};

	onUpdatingValuesStart = () => {
		this.setState({ isAnimating: true });
	};
	onUpdatingValuesEnd = () => {
		this.setState({ isAnimating: false });
	};

	render = () => {
		const { transactionToName, selectedAsset, paymentRequest } = this.props.transactionState;
		const { addressBook, showHexData, showCustomNonce, primaryCurrency, network, chainId, gasEstimateType } =
			this.props;
		const { nonce } = this.props.transaction;
		const {
			gasEstimationReady,
			fromAccountBalance,
			fromAccountName,
			fromSelectedAddress,
			transactionValue = '',
			transactionValueFiat = '',
			transactionTo = '',
			errorMessage,
			transactionConfirmed,
			warningGasPriceHigh,
			confusableCollection,
			mode,
			over,
			warningModalVisible,
			LegacyTransactionData,
			isAnimating,
			animateOnChange,
		} = this.state;

		const showFeeMarket =
			!gasEstimateType ||
			gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET ||
			gasEstimateType === GAS_ESTIMATE_TYPES.NONE;
		const checksummedAddress = transactionTo && toChecksumAddress(transactionTo);
		const existingContact = checksummedAddress && addressBook[network] && addressBook[network][checksummedAddress];
		const displayExclamation = !existingContact && !!confusableCollection.length;

		const AdressToComponent = () => (
			<AddressTo
				addressToReady
				toSelectedAddress={transactionTo}
				toAddressName={transactionToName}
				onToSelectedAddressChange={this.onToSelectedAddressChange}
				confusableCollection={(!existingContact && confusableCollection) || []}
				displayExclamation={displayExclamation}
			/>
		);

		const AdressToComponentWrap = () =>
			!existingContact && confusableCollection.length ? (
				<TouchableOpacity onPress={this.toggleWarningModal}>
					<AdressToComponent />
				</TouchableOpacity>
			) : (
				<AdressToComponent />
			);

		const is_main_net = isMainNet(network);
		const errorPress = is_main_net ? this.buyEth : this.gotoFaucet;
		const networkName = capitalize(getNetworkName(network));
		const errorLinkText = is_main_net
			? strings('transaction.buy_more_eth')
			: strings('transaction.get_ether', { networkName });

		const { EIP1559TransactionData } = this.state;

		return (
			<SafeAreaView edges={['bottom']} style={styles.wrapper} testID={'txn-confirm-screen'}>
				<View style={styles.inputWrapper}>
					<AddressFrom
						onPressIcon={!paymentRequest ? null : this.toggleFromAccountModal}
						fromAccountAddress={fromSelectedAddress}
						fromAccountName={fromAccountName}
						fromAccountBalance={fromAccountBalance}
					/>
					<AdressToComponentWrap />
				</View>

				<InfoModal
					isVisible={warningModalVisible}
					toggleModal={this.toggleWarningModal}
					title={strings('transaction.confusable_title')}
					body={<Text style={styles.text}>{strings('transaction.confusable_msg')}</Text>}
				/>

				<ScrollView style={baseStyles.flexGrow} ref={this.setScrollViewRef}>
					{!selectedAsset.tokenId ? (
						<View style={styles.amountWrapper}>
							<Text style={styles.textAmountLabel}>{strings('transaction.amount')}</Text>
							<Text style={styles.textAmount} testID={'confirm-txn-amount'}>
								{transactionValue}
							</Text>
							{isMainnetByChainId(chainId) && (
								<Text style={styles.textAmountLabel}>{transactionValueFiat}</Text>
							)}
						</View>
					) : (
						<View style={styles.amountWrapper}>
							<Text style={styles.textAmountLabel}>{strings('transaction.asset')}</Text>
							<View style={styles.CollectibleMediaWrapper}>
								<CollectibleMedia
									small
									iconStyle={styles.CollectibleMedia}
									containerStyle={styles.CollectibleMedia}
									collectible={selectedAsset}
								/>
							</View>
							<View>
								<Text style={styles.collectibleName}>{selectedAsset.name}</Text>
								<Text style={styles.collectibleTokenId}>{`#${renderShortText(
									selectedAsset.tokenId,
									10
								)}`}</Text>
							</View>
						</View>
					)}
					{!showFeeMarket ? (
						<TransactionReviewEIP1559
							totalNative={LegacyTransactionData.transactionTotalAmount}
							totalConversion={LegacyTransactionData.transactionTotalAmountFiat}
							gasFeeNative={LegacyTransactionData.transactionFee}
							gasFeeConversion={LegacyTransactionData.transactionFeeFiat}
							primaryCurrency={primaryCurrency}
							onEdit={() => this.edit(EDIT)}
							over={Boolean(LegacyTransactionData.error)}
							onUpdatingValuesStart={this.onUpdatingValuesStart}
							onUpdatingValuesEnd={this.onUpdatingValuesEnd}
							animateOnChange={animateOnChange}
							isAnimating={isAnimating}
							gasEstimationReady={gasEstimationReady}
							legacy
						/>
					) : (
						<TransactionReviewEIP1559
							totalNative={EIP1559TransactionData.renderableTotalMinNative}
							totalConversion={EIP1559TransactionData.renderableTotalMinConversion}
							totalMaxNative={EIP1559TransactionData.renderableTotalMaxNative}
							gasFeeNative={EIP1559TransactionData.renderableGasFeeMinNative}
							gasFeeConversion={EIP1559TransactionData.renderableGasFeeMinConversion}
							gasFeeMaxNative={EIP1559TransactionData.renderableGasFeeMaxNative}
							gasFeeMaxConversion={EIP1559TransactionData.renderableGasFeeMaxConversion}
							primaryCurrency={primaryCurrency}
							timeEstimate={EIP1559TransactionData.timeEstimate}
							timeEstimateColor={EIP1559TransactionData.timeEstimateColor}
							timeEstimateId={EIP1559TransactionData.timeEstimateId}
							onEdit={() => this.edit(EDIT_EIP1559)}
							over={Boolean(EIP1559TransactionData.error)}
							onUpdatingValuesStart={this.onUpdatingValuesStart}
							onUpdatingValuesEnd={this.onUpdatingValuesEnd}
							animateOnChange={animateOnChange}
							isAnimating={isAnimating}
							gasEstimationReady={gasEstimationReady}
						/>
					)}

					{showCustomNonce && <CustomNonce nonce={nonce} onNonceEdit={() => this.edit(EDIT_NONCE)} />}

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
						disabled={transactionConfirmed || !gasEstimationReady || Boolean(errorMessage) || isAnimating}
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
				{mode === EDIT && this.renderCustomGasModalLegacy()}
				{mode === EDIT_NONCE && this.renderCustomNonceModal()}
				{mode === EDIT_EIP1559 && this.renderCustomGasModalEIP1559()}
				{this.renderHexDataModal()}
			</SafeAreaView>
		);
	};
}

const mapStateToProps = (state) => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	addressBook: state.engine.backgroundState.AddressBookController?.addressBook,
	contractBalances: state.engine.backgroundState.TokenBalancesController.contractBalances,
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	nativeCurrency: state.engine.backgroundState.CurrencyRateController.nativeCurrency,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	network: state.engine.backgroundState.NetworkController.network,
	identities: state.engine.backgroundState.PreferencesController.identities,
	providerType: state.engine.backgroundState.NetworkController.provider.type,
	showHexData: state.settings.showHexData,
	showCustomNonce: state.settings.showCustomNonce,
	chainId: state.engine.backgroundState.NetworkController.provider.chainId,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	keyrings: state.engine.backgroundState.KeyringController.keyrings,
	transaction: getNormalizedTxState(state),
	selectedAsset: state.transaction.selectedAsset,
	transactionState: state.transaction,
	primaryCurrency: state.settings.primaryCurrency,
	gasFeeEstimates: state.engine.backgroundState.GasFeeController.gasFeeEstimates,
	gasEstimateType: state.engine.backgroundState.GasFeeController.gasEstimateType,
	isPaymentRequest: state.transaction.paymentRequest,
	networkType: state.engine.backgroundState.NetworkController.provider.type,
});

const mapDispatchToProps = (dispatch) => ({
	prepareTransaction: (transaction) => dispatch(prepareTransaction(transaction)),
	resetTransaction: () => dispatch(resetTransaction()),
	setNonce: (nonce) => dispatch(setNonce(nonce)),
	setProposedNonce: (nonce) => dispatch(setProposedNonce(nonce)),
	removeFavoriteCollectible: (selectedAddress, chainId, collectible) =>
		dispatch(removeFavoriteCollectible(selectedAddress, chainId, collectible)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Confirm);
