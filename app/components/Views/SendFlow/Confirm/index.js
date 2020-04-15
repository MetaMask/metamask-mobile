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
	toWei
} from '../../../../util/number';
import { getTicker, decodeTransferData, getTransactionToName } from '../../../../util/transactions';
import StyledButton from '../../../UI/StyledButton';
import { hexToBN, BNToHex } from 'gaba/dist/util';
import { prepareTransaction } from '../../../../actions/newTransaction';
import { fetchBasicGasEstimates, convertApiValueToGWEI } from '../../../../util/custom-gas';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import ActionModal from '../../../UI/ActionModal';
import AccountList from '../../../UI/AccountList';
import CustomGas from '../CustomGas';
import ErrorMessage from '../ErrorMessage';
import { doENSReverseLookup } from '../../../../util/ENSUtils';
import TransactionsNotificationManager from '../../../../core/TransactionsNotificationManager';
import { strings } from '../../../../../locales/i18n';
import collectiblesTransferInformation from '../../../../util/collectibles-transfer';
import CollectibleImage from '../../../UI/CollectibleImage';
import Modal from 'react-native-modal';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import TransactionTypes from '../../../../core/TransactionTypes';
import Analytics from '../../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../../util/analytics';

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
	summaryWrapper: {
		flexDirection: 'column',
		borderWidth: 1,
		borderColor: colors.grey050,
		borderRadius: 8,
		padding: 16,
		marginHorizontal: 24
	},
	summaryRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginVertical: 6
	},
	totalCryptoRow: {
		alignItems: 'flex-end',
		marginTop: 8
	},
	textSummary: {
		...fontStyles.normal,
		color: colors.black,
		fontSize: 12
	},
	textSummaryAmount: {
		textTransform: 'uppercase'
	},
	textCrypto: {
		...fontStyles.normal,
		textAlign: 'right',
		fontSize: 12,
		textTransform: 'uppercase',
		color: colors.grey500
	},
	textBold: {
		...fontStyles.bold,
		alignSelf: 'flex-end'
	},
	separator: {
		borderBottomWidth: 1,
		borderBottomColor: colors.grey050,
		marginVertical: 6
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
	transactionEditText: {
		fontSize: 12,
		marginLeft: 8
	},
	actionsWrapper: {
		margin: 24
	},
	loader: {
		backgroundColor: colors.white,
		height: 10
	},
	customGasModalTitle: {
		borderBottomColor: colors.grey100,
		borderBottomWidth: 1
	},
	customGasModalTitleText: {
		...fontStyles.bold,
		color: colors.black,
		fontSize: 18,
		alignSelf: 'center',
		margin: 16
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
	transactionFeeLeft: {
		display: 'flex',
		flexDirection: 'row'
	}
});

/**
 * View that wraps the wraps the "Send" screen
 */
class Confirm extends PureComponent {
	static navigationOptions = ({ navigation }) => getSendFlowTitle('send.confirm', navigation);

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
		keyrings: PropTypes.array
	};

	state = {
		customGasModalVisible: false,
		currentCustomGasSelected: 'average',
		customGasSelected: 'average',
		gasEstimationReady: false,
		customGas: undefined,
		customGasPrice: undefined,
		fromAccountBalance: undefined,
		fromAccountName: this.props.transactionState.transactionFromName,
		fromSelectedAddress: this.props.transactionState.transaction.from,
		hexDataModalVisible: false,
		gasError: undefined,
		transactionValue: undefined,
		transactionValueFiat: undefined,
		transactionFee: undefined,
		transactionTotalAmount: undefined,
		transactionTotalAmountFiat: undefined,
		errorMessage: undefined,
		fromAccountModalVisible: false
	};

	componentDidMount = async () => {
		// For analytics
		const { navigation, providerType } = this.props;
		navigation.setParams({ providerType });
		this.parseTransactionData();
		this.prepareTransaction();
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

		if (selectedAsset.isETH) {
			fromAccountBalance = `${renderFromWei(accounts[from].balance)} ${parsedTicker}`;
			transactionValue = `${renderFromWei(value)} ${parsedTicker}`;
			transactionValueFiat = weiToFiat(valueBN, conversionRate, currentCurrency);
			const transactionTotalAmountBN = weiTransactionFee && weiTransactionFee.add(valueBN);
			transactionTotalAmount = `${renderFromWei(transactionTotalAmountBN)} ${parsedTicker}`;
			transactionTotalAmountFiat = weiToFiat(transactionTotalAmountBN, conversionRate, currentCurrency);
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
			transactionTotalAmount = `${renderFromWei(weiTransactionFee)} ${parsedTicker}`;
			transactionTotalAmountFiat = weiToFiat(transactionTotalAmountBN, conversionRate, currentCurrency);
		} else {
			let amount;
			const { address, symbol = 'ERC20', decimals } = selectedAsset;
			fromAccountBalance = `${renderFromTokenMinimalUnit(contractBalances[address], decimals)} ${symbol}`;
			[transactionTo, , amount] = decodeTransferData('transfer', data);
			const transferValue = renderFromTokenMinimalUnit(amount, decimals);
			transactionValue = `${transferValue} ${symbol}`;
			const exchangeRate = contractExchangeRates[address];
			const transactionFeeFiatNumber = weiToFiatNumber(weiTransactionFee, conversionRate);
			transactionValueFiat =
				balanceToFiat(transferValue, conversionRate, exchangeRate, currentCurrency) || `0 ${currentCurrency}`;
			const transactionValueFiatNumber = balanceToFiatNumber(transferValue, conversionRate, exchangeRate);
			transactionTotalAmount = `${transactionValue} + ${renderFromWei(weiTransactionFee)} ${parsedTicker}`;
			transactionTotalAmountFiat = renderFiatAddition(
				transactionValueFiatNumber,
				transactionFeeFiatNumber,
				currentCurrency
			);
		}
		this.setState({
			fromAccountBalance,
			transactionValue,
			transactionValueFiat,
			transactionFeeFiat,
			transactionTo,
			transactionTotalAmount,
			transactionTotalAmountFiat
		});
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

	handleGasFeeSelection = ({ gas, gasPrice, customGasSelected, error }) => {
		this.setState({ customGas: gas, customGasPrice: gasPrice, customGasSelected, gasError: error });
	};

	handleSetGasFee = () => {
		const { customGas, customGasPrice, customGasSelected } = this.state;
		if (!customGas || !customGasPrice) {
			this.toggleCustomGasModal();
			return;
		}
		this.setState({ gasEstimationReady: false });
		const { prepareTransaction, transactionState } = this.props;
		let transaction = transactionState.transaction;
		transaction = { ...transaction, gas: customGas, gasPrice: customGasPrice };

		prepareTransaction(transaction);
		setTimeout(() => {
			this.parseTransactionData();
			this.setState({
				customGas: undefined,
				customGasPrice: undefined,
				gasEstimationReady: true,
				currentCustomGasSelected: customGasSelected,
				errorMessage: undefined
			});
		}, 100);
		this.toggleCustomGasModal();
	};

	toggleCustomGasModal = () => {
		const { customGasModalVisible } = this.state;
		this.setState({ customGasModalVisible: !customGasModalVisible });
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.SEND_FLOW_ADJUSTS_TRANSACTION_FEE);
		});
	};

	toggleHexDataModal = () => {
		const { hexDataModalVisible } = this.state;
		this.setState({ hexDataModalVisible: !hexDataModalVisible });
	};

	renderCustomGasModal = () => {
		const { customGasModalVisible, currentCustomGasSelected, gasError } = this.state;
		const { gas, gasPrice } = this.props.transactionState.transaction;
		return (
			<ActionModal
				modalVisible={customGasModalVisible}
				confirmText={strings('transaction.set_gas')}
				cancelText={strings('transaction.cancel_gas')}
				onCancelPress={this.toggleCustomGasModal}
				onRequestClose={this.toggleCustomGasModal}
				onConfirmPress={this.handleSetGasFee}
				confirmDisabled={!!gasError}
				cancelButtonMode={'neutral'}
				confirmButtonMode={'confirm'}
			>
				<View style={baseStyles.flexGrow}>
					<View style={styles.customGasModalTitle}>
						<Text style={styles.customGasModalTitleText}>{strings('transaction.transaction_fee')}</Text>
					</View>
					<CustomGas
						selected={currentCustomGasSelected}
						handleGasFeeSelection={this.handleGasFeeSelection}
						gas={gas}
						gasPrice={gasPrice}
					/>
				</View>
			</ActionModal>
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
		transaction.gas = BNToHex(transaction.gas);
		transaction.gasPrice = BNToHex(transaction.gasPrice);
		transaction.from = fromSelectedAddress;
		return transaction;
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

	onNext = async () => {
		const { TransactionController } = Engine.context;
		const {
			transactionState: { assetType },
			navigation,
			providerType
		} = this.props;
		this.setState({ transactionConfirmed: true });
		if (this.validateGas()) {
			this.setState({ transactionConfirmed: false });
			return;
		}
		try {
			const transaction = this.prepareTransactionToSend();
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
				TransactionsNotificationManager.watchSubmittedTransaction({
					...transactionMeta,
					assetType
				});
				this.checkRemoveCollectible();
				Analytics.trackEventWithParameters(ANALYTICS_EVENT_OPTS.SEND_FLOW_CONFIRM_SEND, {
					network: providerType
				});
				navigation && navigation.dismiss();
			});
		} catch (error) {
			Alert.alert(strings('transactions.transaction_error'), error && error.message, [
				{ text: strings('navigation.ok') }
			]);
		}
		this.setState({ transactionConfirmed: false });
	};

	renderIfGastEstimationReady = children => {
		const { gasEstimationReady } = this.state;
		return !gasEstimationReady ? (
			<View style={styles.loader}>
				<ActivityIndicator size="small" />
			</View>
		) : (
			children
		);
	};

	getBalanceError = balance => {
		const {
			transactionState: {
				transaction: { value = '0x0', gas = '0x0', gasPrice = '0x0' }
			}
		} = this.props;

		const gasBN = hexToBN(gas);
		const weiTransactionFee = gasBN.mul(gasPrice);
		const valueBN = hexToBN(value);
		const transactionTotalAmountBN = weiTransactionFee.add(valueBN);

		const balanceIsInsufficient = hexToBN(balance).lt(transactionTotalAmountBN);

		return balanceIsInsufficient ? strings('transaction.insufficient') : null;
	};

	onAccountChange = async accountAddress => {
		const { identities, ticker, accounts } = this.props;
		const { name } = identities[accountAddress];
		const { PreferencesController } = Engine.context;
		const fromAccountBalance = `${renderFromWei(accounts[accountAddress].balance)} ${getTicker(ticker)}`;
		const ens = await doENSReverseLookup(accountAddress);
		const fromAccountName = ens || name;
		PreferencesController.setSelectedAddress(accountAddress);
		// If new account doesn't have the asset
		this.setState({
			fromAccountName,
			fromAccountBalance,
			fromSelectedAddress: accountAddress,
			balanceIsZero: hexToBN(accounts[accountAddress].balance).isZero()
		});
		this.toggleFromAccountModal();
	};

	toggleFromAccountModal = () => {
		const { fromAccountModalVisible } = this.state;
		this.setState({ fromAccountModalVisible: !fromAccountModalVisible });
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
		const { transactionToName, selectedAsset } = this.props.transactionState;
		const { showHexData } = this.props;
		const {
			gasEstimationReady,
			fromAccountBalance,
			fromAccountName,
			fromSelectedAddress,
			transactionValue,
			transactionValueFiat,
			transactionFeeFiat,
			transactionTo,
			transactionTotalAmount,
			transactionTotalAmountFiat,
			errorMessage,
			transactionConfirmed
		} = this.state;
		return (
			<SafeAreaView style={styles.wrapper} testID={'txn-confirm-screen'}>
				<View style={styles.inputWrapper}>
					<AddressFrom
						onPressIcon={this.toggleFromAccountModal}
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

				<ScrollView style={baseStyles.flexGrow}>
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

					<View style={styles.summaryWrapper}>
						<View style={styles.summaryRow}>
							<Text style={styles.textSummary}>{strings('transaction.amount')}</Text>
							<Text style={[styles.textSummary, styles.textSummaryAmount]}>{transactionValueFiat}</Text>
						</View>
						<View style={styles.summaryRow}>
							<View style={styles.transactionFeeLeft}>
								<Text style={styles.textSummary}>{strings('transaction.transaction_fee')}</Text>
								<TouchableOpacity
									disabled={!gasEstimationReady}
									onPress={this.toggleCustomGasModal}
									key="transactionFeeEdit"
								>
									<Text style={[styles.actionText, styles.transactionEditText]}>
										{strings('transaction.edit')}
									</Text>
								</TouchableOpacity>
							</View>
							{this.renderIfGastEstimationReady(
								<Text style={[styles.textSummary, styles.textSummaryAmount]}>{transactionFeeFiat}</Text>
							)}
						</View>
						<View style={styles.separator} />
						<View style={styles.summaryRow}>
							<Text style={[styles.textSummary, styles.textBold]}>
								{strings('transaction.total_amount')}
							</Text>
							{this.renderIfGastEstimationReady(
								<Text style={[styles.textSummary, styles.textSummaryAmount, styles.textBold]}>
									{transactionTotalAmountFiat}
								</Text>
							)}
						</View>
						<View style={styles.totalCryptoRow}>
							{this.renderIfGastEstimationReady(
								<Text style={[styles.textSummary, styles.textCrypto]}>{transactionTotalAmount}</Text>
							)}
						</View>
					</View>
					{errorMessage && (
						<View style={styles.errorMessageWrapper}>
							<ErrorMessage errorMessage={errorMessage} />
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
						disabled={!gasEstimationReady}
						containerStyle={styles.buttonNext}
						onPress={this.onNext}
						testID={'txn-confirm-send-button'}
					>
						{transactionConfirmed ? <ActivityIndicator size="small" color="white" /> : 'Send'}
					</StyledButton>
				</View>
				{this.renderFromAccountModal()}
				{this.renderCustomGasModal()}
				{this.renderHexDataModal()}
			</SafeAreaView>
		);
	};
}

const mapStateToProps = (state, ownProps) => {
	const { transaction: ownPropsTransaction } = ownProps;

	const identities = state.engine.backgroundState.PreferencesController.identities;
	const network = state.engine.backgroundState.NetworkController.network;
	let transactionState;

	if (ownPropsTransaction) {
		const { data, from, gas, gasPrice, to, value, ensRecipient, selectedAsset } = ownPropsTransaction;

		const selectedAddress = state.engine.backgroundState.PreferencesController.selectedAddress;
		const fromAddress = from || selectedAddress;

		const addressBook = state.engine.backgroundState.AddressBookController.addressBook;
		const transactionToName = getTransactionToName({
			addressBook,
			network,
			toAddress: to,
			identities,
			ensRecipient
		});

		transactionState = {
			...ownPropsTransaction,
			transaction: { data, from: fromAddress, gas, gasPrice, to, value },
			transactionTo: to,
			transactionToName,
			transactionFromName: identities[fromAddress].name,
			transactionValue: value,
			selectedAsset: selectedAsset || { isETH: true, symbol: 'ETH' }
		};
	} else {
		transactionState = state.newTransaction;
	}

	return {
		accounts: state.engine.backgroundState.AccountTrackerController.accounts,
		contractBalances: state.engine.backgroundState.TokenBalancesController.contractBalances,
		contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
		currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
		conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
		network,
		identities,
		providerType: state.engine.backgroundState.NetworkController.provider.type,
		showHexData: state.settings.showHexData,
		ticker: state.engine.backgroundState.NetworkController.provider.ticker,
		transactionState,
		keyrings: state.engine.backgroundState.KeyringController.keyrings
	};
};

const mapDispatchToProps = dispatch => ({
	prepareTransaction: transaction => dispatch(prepareTransaction(transaction))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Confirm);
