import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import {
	ScrollView,
	ActivityIndicator,
	RefreshControl,
	StyleSheet,
	Text,
	View,
	FlatList,
	Dimensions,
	InteractionManager,
	TouchableOpacity,
} from 'react-native';
import { getNetworkTypeById, findBlockExplorerForRpc, getBlockExplorerName } from '../../../util/networks';
import { getEtherscanAddressUrl, getEtherscanBaseUrl } from '../../../util/etherscan';
import { colors, fontStyles, baseStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import TransactionElement from '../TransactionElement';
import Engine from '../../../core/Engine';
import { showAlert } from '../../../actions/alert';
import { shallowEqual } from '../../../util/general';
import NotificationManager from '../../../core/NotificationManager';
import { util, CANCEL_RATE, SPEED_UP_RATE, GAS_ESTIMATE_TYPES } from '@metamask/controllers';
import { isDecimal, renderFromWei, fromWei } from '../../../util/number';
import Device from '../../../util/device';
import { RPC, NO_RPC_BLOCK_EXPLORER } from '../../../constants/network';
import TransactionActionModal from '../TransactionActionModal';
import Logger from '../../../util/Logger';
import { getTicker, parseTransactionEIP1559, validateTransactionActionBalance } from '../../../util/transactions';
import BigNumber from 'bignumber.js';
import { SafeAreaView } from 'react-native-safe-area-context';
import Modal from 'react-native-modal';
import AppConstants from '../../../core/AppConstants';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import EditGasFee1559 from '../EditGasFee1559';

const { hexToBN } = util;

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0,
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: colors.white,
		minHeight: Dimensions.get('window').height / 2,
	},
	keyboardAwareWrapper: {
		flex: 1,
		justifyContent: 'flex-end',
	},
	loader: {
		alignSelf: 'center',
	},
	text: {
		fontSize: 20,
		color: colors.fontTertiary,
		...fontStyles.normal,
	},
	viewMoreBody: {
		marginBottom: 36,
		marginTop: 24,
	},
	viewOnEtherscan: {
		fontSize: 16,
		color: colors.blue,
		...fontStyles.normal,
		textAlign: 'center',
	},
	modalView: {
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 24,
		paddingHorizontal: 24,
		width: '100%',
	},
	modalText: {
		...fontStyles.normal,
		fontSize: 14,
		textAlign: 'center',
		paddingVertical: 8,
		color: colors.black,
	},
	modalTitle: {
		...fontStyles.bold,
		fontSize: 22,
		textAlign: 'center',
		color: colors.black,
	},
	modal: {
		margin: 0,
		width: '100%',
	},
});

import ActionModal from '../ActionModal';

const RetryModal = ({ retryIsOpen, onConfirmPress, onCancelPress, errorMsg }) => {
	const confirmText = 'Retry?';
	const cancelText = 'Cancel';
	return (
		<ActionModal
			modalStyle={styles.modal}
			modalVisible={retryIsOpen}
			confirmText={confirmText}
			cancelText={cancelText}
			onConfirmPress={onConfirmPress}
			onCancelPress={onCancelPress}
			onRequestClose={onCancelPress}
		>
			<View style={styles.modalView}>
				<Text style={styles.modalTitle}>Speed Up Failed</Text>
				{errorMsg && <Text style={styles.modalText}>Reason: {errorMsg}</Text>}
				<Text style={styles.modalText}>would you like to try again?</Text>
			</View>
		</ActionModal>
	);
};

RetryModal.propTypes = {
	retryIsOpen: PropTypes.bool,
	onConfirmPress: PropTypes.func,
	onCancelPress: PropTypes.func,
	errorMsg: PropTypes.oneOfType([PropTypes.undefined, PropTypes.string]),
};

const ROW_HEIGHT = (Device.isIos() ? 95 : 100) + StyleSheet.hairlineWidth;

/**
 * View that renders a list of transactions for a specific asset
 */
class Transactions extends PureComponent {
	static propTypes = {
		assetSymbol: PropTypes.string,
		/**
		 * Map of accounts to information objects including balances
		 */
		accounts: PropTypes.object,
		/**
		 * Callback to close the view
		 */
		close: PropTypes.func,
		/**
		 * Object containing token exchange rates in the format address => exchangeRate
		 */
		contractExchangeRates: PropTypes.object,
		/**
		 * Frequent RPC list from PreferencesController
		 */
		frequentRpcList: PropTypes.array,
		/**
		 * Gas fee estimates returned by the gas fee controller
		 */
		gasFeeEstimates: PropTypes.object,
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object,
		/**
		 * Object representing the selected network
		 */
		network: PropTypes.object,
		/**
		 * An array that represents the user collectible contracts
		 */
		collectibleContracts: PropTypes.array,
		/**
		 * An array that represents the user tokens
		 */
		tokens: PropTypes.object,
		/**
		 * An array of transactions objects
		 */
		transactions: PropTypes.array,
		/**
		 * An array of transactions objects that have been submitted
		 */
		submittedTransactions: PropTypes.array,
		/**
		 * An array of transactions objects that have been confirmed
		 */
		confirmedTransactions: PropTypes.array,
		/**
		 * A string that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * Selected asset from current transaction state
		 */
		selectedAsset: PropTypes.object,
		/**
		 * ETH to current currency conversion rate
		 */
		conversionRate: PropTypes.number,
		/**
		 * Currency code of the currently-active currency
		 */
		currentCurrency: PropTypes.string,
		/**
		 * Primary code of the currently-active currency
		 */
		primaryCurrency: PropTypes.string,
		/**
		 * Loading flag from an external call
		 */
		loading: PropTypes.bool,
		/**
		 * Pass the flatlist ref to the parent
		 */
		onRefSet: PropTypes.func,
		/**
		 * Optional header component
		 */
		header: PropTypes.object,
		/**
		 * Optional header height
		 */
		headerHeight: PropTypes.number,
		exchangeRate: PropTypes.number,
		/**
		 * Indicates whether third party API mode is enabled
		 */
		thirdPartyApiMode: PropTypes.bool,
		/**
		 * The network native currency
		 */
		nativeCurrency: PropTypes.string,
		/**
		 * Estimate type returned by the gas fee controller, can be market-fee, legacy or eth_gasPrice
		 */
		gasEstimateType: PropTypes.string,
		/**
		 * A string representing the network type
		 */
		networkType: PropTypes.string,
		/**
		 * Current provider ticker
		 */
		ticker: PropTypes.string,		
	};

	static defaultProps = {
		headerHeight: 0,
	};

	state = {
		selectedTx: (new Map(): Map<string, boolean>),
		ready: false,
		refreshing: false,
		cancelIsOpen: false,
		cancelConfirmDisabled: false,
		speedUpIsOpen: false,
		retryIsOpen: false,
		speedUpConfirmDisabled: false,
		rpcBlockExplorer: undefined,
		errorMsg: undefined,
		gasSelected: AppConstants.GAS_OPTIONS.MEDIUM,
		gasSelectedTemp: AppConstants.GAS_OPTIONS.MEDIUM,
		stopUpdateGas: false,
		advancedGasInserted: false,
		EIP1559TransactionDataTemp: {},
	};

	existingGas = null;
	existingTx = null;
	cancelTxId = null;
	speedUpTxId = null;

	selectedTx = null;

	flatList = React.createRef();

	componentDidMount = async () => {
		this.mounted = true;
		setTimeout(() => {
			this.mounted && this.setState({ ready: true });
			this.init();
			this.props.onRefSet && this.props.onRefSet(this.flatList);
		}, 100);

		const {
			network: {
				provider: { rpcTarget, type },
			},
			frequentRpcList,
		} = this.props;
		let blockExplorer;
		if (type === RPC) {
			blockExplorer = findBlockExplorerForRpc(rpcTarget, frequentRpcList) || NO_RPC_BLOCK_EXPLORER;
		}
		this.setState({ rpcBlockExplorer: blockExplorer });
		const { GasFeeController } = Engine.context;
		const pollToken = await GasFeeController.getGasFeeEstimatesAndStartPolling(this.state.pollToken);
		this.setState({ pollToken });
	};

	init() {
		this.mounted && this.setState({ ready: true });
		const txToView = NotificationManager.getTransactionToView();
		if (txToView) {
			setTimeout(() => {
				const index = this.props.transactions.findIndex((tx) => txToView === tx.id);
				if (index >= 0) {
					this.toggleDetailsView(txToView, index);
				}
			}, 1000);
		}
	}

	componentDidUpdate = (prevProps) => {
		if (
			this.props.gasFeeEstimates &&
			this.existingTx?.transaction?.gas &&
			!shallowEqual(prevProps.gasFeeEstimates, this.props.gasFeeEstimates)
		) {
			const gas = this.existingTx.transaction.gas;
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

					// eslint-disable-next-line react/no-did-update-set-state
					this.setState(
						{
							gasEstimationReady: true,
							EIP1559TransactionDataTemp,
							animateOnChange: true,
							gasSelected,
							gasSelectedTemp,
						},
						() => {
							this.setState({ animateOnChange: false });
						}
					);
				}
			}
		}
	};

	componentWillUnmount() {
		const { GasFeeController } = Engine.context;
		GasFeeController.stopPolling(this.state.pollToken);
		this.mounted = false;
	}

	scrollToIndex = (index) => {
		if (!this.scrolling && (this.props.headerHeight || index)) {
			this.scrolling = true;
			// eslint-disable-next-line no-unused-expressions
			this.flatList?.current?.scrollToIndex({ index, animated: true });
			setTimeout(() => {
				this.scrolling = false;
			}, 300);
		}
	};

	toggleDetailsView = (id, index) => {
		const oldId = this.selectedTx && this.selectedTx.id;
		const oldIndex = this.selectedTx && this.selectedTx.index;

		if (this.selectedTx && oldId !== id && oldIndex !== index) {
			this.selectedTx = null;
			this.toggleDetailsView(oldId, oldIndex);
			InteractionManager.runAfterInteractions(() => {
				this.toggleDetailsView(id, index);
			});
		} else {
			this.setState((state) => {
				const selectedTx = new Map(state.selectedTx);
				const show = !selectedTx.get(id);
				selectedTx.set(id, show);
				if (show && (this.props.headerHeight || index)) {
					InteractionManager.runAfterInteractions(() => {
						this.scrollToIndex(index);
					});
				}
				this.selectedTx = show ? { id, index } : null;
				return { selectedTx };
			});
		}
	};

	onRefresh = async () => {
		this.setState({ refreshing: true });
		this.props.thirdPartyApiMode && (await Engine.refreshTransactionHistory());
		this.setState({ refreshing: false });
	};

	renderLoader = () => (
		<View style={styles.emptyContainer}>
			<ActivityIndicator style={styles.loader} size="small" />
		</View>
	);

	renderEmpty = () => (
		<ScrollView
			contentContainerStyle={styles.emptyContainer}
			refreshControl={<RefreshControl refreshing={this.state.refreshing} onRefresh={this.onRefresh} />}
		>
			{this.props.header ? this.props.header : null}
			<View style={styles.emptyContainer}>
				<Text style={styles.text}>{strings('wallet.no_transactions')}</Text>
			</View>
		</ScrollView>
	);

	viewOnBlockExplore = () => {
		const {
			navigation,
			network: {
				network,
				provider: { type },
			},
			selectedAddress,
			close,
		} = this.props;
		const { rpcBlockExplorer } = this.state;
		try {
			let url;
			let title;
			if (type === RPC) {
				url = `${rpcBlockExplorer}/address/${selectedAddress}`;
				title = new URL(rpcBlockExplorer).hostname;
			} else {
				const networkResult = getNetworkTypeById(network);
				url = getEtherscanAddressUrl(networkResult, selectedAddress);
				title = getEtherscanBaseUrl(networkResult).replace('https://', '');
			}
			navigation.push('Webview', {
				screen: 'SimpleWebview',
				params: {
					url,
					title,
				},
			});
			close && close();
		} catch (e) {
			Logger.error(e, { message: `can't get a block explorer link for network `, network });
		}
	};

	renderViewMore = () => (
		<View style={styles.viewMoreBody}>
			<TouchableOpacity onPress={this.viewOnBlockExplore} style={styles.touchableViewOnEtherscan}>
				<Text reset style={styles.viewOnEtherscan}>
					{(this.state.rpcBlockExplorer &&
						`${strings('transactions.view_full_history_on')} ${getBlockExplorerName(
							this.state.rpcBlockExplorer
						)}`) ||
						strings('transactions.view_full_history_on_etherscan')}
				</Text>
			</TouchableOpacity>
		</View>
	);

	getGasAnalyticsParams = () => {
		const { selectedAsset, gasEstimateType, networkType } = this.props;
		const { chainId, gasSelected } = this.state;

		return {
			active_currency: { value: selectedAsset?.symbol, anonymous: true },
			network_name: networkType,
			chain_id: chainId,
			gas_estimate_type: gasEstimateType,
			gas_mode: gasSelected ? 'Basic' : 'Advanced',
			speed_set: gasSelected || undefined,
		};
	};

	getItemLayout = (data, index) => ({
		length: ROW_HEIGHT,
		offset: this.props.headerHeight + ROW_HEIGHT * index,
		index,
	});

	keyExtractor = (item) => item.id.toString();

	onSpeedUpAction = (speedUpAction, existingGas, tx) => {
		const { gasFeeEstimates } = this.props;
		this.setState({ speedUpIsOpen: speedUpAction });
		this.existingGas = existingGas;
		this.existingTx = tx;
		this.speedUpTxId = tx.id;

		//Create the inital 1559 speed up transaction as speed up initializes
		if (existingGas.isEIP1559Transaction) {
			this.setState({
				EIP1559TransactionDataTemp: parseTransactionEIP1559(
					{
						...this.props,
						selectedGasFee: {
							suggestedMaxFeePerGas: gasFeeEstimates.medium.suggestedMaxFeePerGas,
							suggestedMaxPriorityFeePerGas: gasFeeEstimates.medium.suggestedMaxPriorityFeePerGas,
							suggestedGasLimit: fromWei(this.existingTx?.transaction?.gas, 'wei'),
						},
					},
					{ onlyGas: true }
				),
			});
		} else {
			const speedUpConfirmDisabled = validateTransactionActionBalance(tx, SPEED_UP_RATE, this.props.accounts);
			this.setState({ speedUpIsOpen: speedUpAction, speedUpConfirmDisabled });
		}
	};

	calculateTempGasFee = (gas, options) => {
		if (options && gas) {
			gas.suggestedGasLimit = fromWei(this.existingTx?.transaction?.gas, 'wei');
		}

		this.setState({
			EIP1559TransactionDataTemp: this.parseTransactionDataEIP1559({ ...gas, selectedOption: options }),
			stopUpdateGas: !options,
			gasSelectedTemp: options,
		});
	};

	parseTransactionDataEIP1559 = (gasFee, options) => {
		const parsedTransactionEIP1559 = parseTransactionEIP1559(
			{
				...this.props,
				selectedGasFee: { ...gasFee, estimatedBaseFee: this.props.gasFeeEstimates.estimatedBaseFee },
			},
			{ onlyGas: true },
			options
		);

		// parsedTransactionEIP1559.error = this.validateSpeedUpAmount(
		// 	this.existingTx.transaction,
		// 	parsedTransactionEIP1559.totalMaxHex
		// );

		console.log('Error', parsedTransactionEIP1559.error);

		return parsedTransactionEIP1559;
	};

	// validateSpeedUpAmount = (transaction, total) => {
	// 	const { accounts, selectedAsset, selectedAddress, ticker } = this.props;
	// 	let weiBalance, weiInput, error;

	// 	console.log('tx.value', transaction.value);
	// 	console.log('total', `0x${total}`);hus
	// 	if (isDecimal(transaction.value)) {
	// 		if (selectedAsset.isETH || selectedAsset.tokenId) {
	// 			weiBalance = hexToBN(accounts[selectedAddress].balance);
	// 			const totalTransactionValue = hexToBN(`0x${total}`);
	// 			if (!weiBalance.gte(totalTransactionValue)) {
	// 				const amount = renderFromWei(totalTransactionValue.sub(weiBalance));
	// 				const tokenSymbol = getTicker(ticker);
	// 				error = strings('transaction.insufficient_amount', { amount, tokenSymbol });
	// 			}
	// 		}
	// 	// 	} else {
	// 	// 		const [, , amount] = decodeTransferData('transfer', transaction.data);
	// 	// 		weiBalance = contractBalances[selectedAsset.address];
	// 	// 		weiInput = hexToBN(amount);
	// 	// 		error =
	// 	// 			weiBalance && weiBalance.gte(weiInput)
	// 	// 				? undefined
	// 	// 				: strings('transaction.insufficient_tokens', { token: selectedAsset.symbol });
	// 	// 	}
	// 	} else {
	// 		error = strings('transaction.invalid_amount');
	// 	}

	// 	return error;
	// };

	onSpeedUpCompleted = () => {
		this.setState({ speedUpIsOpen: false });
		this.existingGas = null;
		this.speedUpTxId = null;
		this.existingTx = null;
	};

	onCancelAction = (cancelAction, existingGas, tx) => {
		this.existingGas = existingGas;
		this.cancelTxId = tx.id;
		const cancelConfirmDisabled = validateTransactionActionBalance(tx, CANCEL_RATE, this.props.accounts);
		this.setState({ cancelIsOpen: cancelAction, cancelConfirmDisabled });
	};
	onCancelCompleted = () => {
		this.setState({ cancelIsOpen: false });
		this.existingGas = null;
		this.cancelTxId = null;
	};

	handleSpeedUpTransactionFailure = (e) => {
		const speedUpTxId = this.speedUpTxId;
		Logger.error(e, { message: `speedUpTransaction failed `, speedUpTxId });
		InteractionManager.runAfterInteractions(this.toggleRetry);
		// do we want to bubble up the error message?
		// could be helpful for CS and giving users the opportunity to get "unstuck"
		this.setState({ errorMsg: e.message });
	};

	handleCancelTransactionFailure = (e) => {
		const cancelTxId = this.cancelTxId;
		Logger.error(e, { message: `cancelTransaction failed `, cancelTxId });
	};

	speedUpTransaction = () => {
		try {
			const { EIP1559TransactionDataTemp } = this.state;
			console.log(this.existingGas);
			//Do we have a place in the app where we convert a hex string (0232323) to the hex string format (0x0232323)?
			Engine.context.TransactionController.speedUpTransaction(this.speedUpTxId, {
				maxFeePerGas: `0x${EIP1559TransactionDataTemp?.suggestedMaxFeePerGasHex}`,
				maxPriorityFeePerGas: `0x${EIP1559TransactionDataTemp?.suggestedMaxPriorityFeePerGasHex}`,
			});
		} catch (e) {
			this.handleSpeedUpTransactionFailure(e);
		}
		this.onSpeedUpCompleted();
	};

	cancelTransaction = () => {
		try {
			Engine.context.TransactionController.stopTransaction(this.cancelTxId);
		} catch (e) {
			this.handleCancelTransactionFailure(e);
		}
		this.onCancelCompleted();
	};

	renderItem = ({ item, index }) => (
		<TransactionElement
			tx={item}
			i={index}
			assetSymbol={this.props.assetSymbol}
			onSpeedUpAction={this.onSpeedUpAction}
			onCancelAction={this.onCancelAction}
			testID={'txn-item'}
			onPressItem={this.toggleDetailsView}
			selectedAddress={this.props.selectedAddress}
			tokens={this.props.tokens}
			collectibleContracts={this.props.collectibleContracts}
			contractExchangeRates={this.props.contractExchangeRates}
			exchangeRate={this.props.exchangeRate}
			conversionRate={this.props.conversionRate}
			currentCurrency={this.props.currentCurrency}
			navigation={this.props.navigation}
		/>
	);

	toggleRetry = () => this.setState((state) => ({ retryIsOpen: !state.retryIsOpen, errorMsg: undefined }));

	renderSpeedUpGas = () => {
		const { primaryCurrency, gasFeeEstimates } = this.props;
		const { chainId, gasSelected, isAnimating, animateOnChange, EIP1559TransactionDataTemp } = this.state;

		if (!this.existingGas) return null;
		if (this.existingGas.isEIP1559Transaction) {
			return (
				<Modal
					isVisible
					animationIn="slideInUp"
					animationOut="slideOutDown"
					style={styles.bottomModal}
					backdropOpacity={0.7}
					animationInTiming={600}
					animationOutTiming={600}
					onBackdropPress={this.onSpeedUpCompleted}
					onBackButtonPress={this.onSpeedUpCompleted}
					onSwipeComplete={this.onSpeedUpCompleted}
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
							onCancel={this.onSpeedUpCompleted}
							onSave={this.speedUpTransaction}
							error={EIP1559TransactionDataTemp.error}
							animateOnChange={animateOnChange}
							ignoreOptions={[AppConstants.GAS_OPTIONS.LOW]}
							speedUpOption
							isAnimating={isAnimating}
							analyticsParams={this.getGasAnalyticsParams()}
							view={'Transactions (Speed Up)'}
						/>
					</KeyboardAwareScrollView>
				</Modal>
			);
		}
		return `${renderFromWei(Math.floor(this.existingGas.gasPrice * SPEED_UP_RATE))} ${strings('unit.eth')}`;
	};

	render = () => {
		if (!this.state.ready || this.props.loading) {
			return this.renderLoader();
		}
		if (!this.props.transactions.length) {
			return this.renderEmpty();
		}
		const {
			submittedTransactions,
			confirmedTransactions,
			header,
			currentCurrency,
			conversionRate,
			nativeCurrency,
		} = this.props;
		const { cancelConfirmDisabled, speedUpConfirmDisabled } = this.state;
		const transactions =
			submittedTransactions && submittedTransactions.length
				? submittedTransactions.concat(confirmedTransactions)
				: this.props.transactions;

		const renderCancelGas = () => {
			if (!this.existingGas) return null;
			if (this.existingGas.isEIP1559Transaction) {
				const newDecMaxFeePerGas = new BigNumber(this.existingGas.maxFeePerGas).times(
					new BigNumber(CANCEL_RATE)
				);
				const newDecMaxPriorityFeePerGas = new BigNumber(this.existingGas.maxPriorityFeePerGas).times(
					new BigNumber(CANCEL_RATE)
				);
				const gasEIP1559 = parseTransactionEIP1559(
					{
						currentCurrency,
						conversionRate,
						nativeCurrency,
						selectedGasFee: {
							suggestedMaxFeePerGas: newDecMaxFeePerGas,
							suggestedMaxPriorityFeePerGas: newDecMaxPriorityFeePerGas,
							suggestedGasLimit: '1',
						},
					},
					{ onlyGas: true }
				);

				return `Max fee per gas\n ${gasEIP1559.renderableMaxFeePerGasNative} \n\n Max priority fee per gas\n ${gasEIP1559.renderableMaxPriorityFeeNative}`;
			}
			return `${renderFromWei(Math.floor(this.existingGas.gasPrice * CANCEL_RATE))} ${strings('unit.eth')}`;
		};

		return (
			<SafeAreaView edges={['bottom']} style={styles.wrapper} testID={'txn-screen'}>
				<View style={styles.wrapper} testID={'transactions-screen'}>
					<FlatList
						ref={this.flatList}
						getItemLayout={this.getItemLayout}
						data={transactions}
						extraData={this.state}
						keyExtractor={this.keyExtractor}
						refreshControl={
							<RefreshControl refreshing={this.state.refreshing} onRefresh={this.onRefresh} />
						}
						renderItem={this.renderItem}
						initialNumToRender={10}
						maxToRenderPerBatch={2}
						onEndReachedThreshold={0.5}
						ListHeaderComponent={header}
						ListFooterComponent={this.renderViewMore}
						style={baseStyles.flexGrow}
						scrollIndicatorInsets={{ right: 1 }}
					/>

					<TransactionActionModal
						isVisible={this.state.cancelIsOpen}
						confirmDisabled={cancelConfirmDisabled}
						onCancelPress={this.onCancelCompleted}
						onConfirmPress={this.cancelTransaction}
						confirmText={strings('transaction.lets_try')}
						confirmButtonMode={'confirm'}
						cancelText={strings('transaction.nevermind')}
						feeText={renderCancelGas()}
						titleText={strings('transaction.cancel_tx_title')}
						gasTitleText={strings('transaction.gas_cancel_fee')}
						descriptionText={strings('transaction.cancel_tx_message')}
					/>
{/* 
					<TransactionActionModal
						isVisible={this.state.speedUpIsOpen}
						confirmDisabled={speedUpConfirmDisabled}
						onCancelPress={this.onSpeedUpCompleted}
						onConfirmPress={this.speedUpTransaction}
						confirmText={strings('transaction.lets_try')}
						confirmButtonMode={'confirm'}
						cancelText={strings('transaction.nevermind')}
						feeText={this.renderSpeedUpGas}
						titleText={strings('transaction.speedup_tx_title')}
						gasTitleText={strings('transaction.gas_speedup_fee')}
						descriptionText={strings('transaction.speedup_tx_message')}
					/> */}

					<RetryModal
						errorMsg={this.state.errorMsg}
						onCancelPress={this.toggleRetry}
						retryIsOpen={this.state.retryIsOpen}
					/>
				</View>
				{/* {mode === EDIT && this.renderCustomGasModalLegacy()} */}
				{this.state.speedUpIsOpen && this.renderSpeedUpGas()}
			</SafeAreaView>
		);
	};
}

const mapStateToProps = (state) => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	chainId: state.engine.backgroundState.NetworkController.provider.chainId,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	collectibleContracts: state.engine.backgroundState.CollectiblesController.collectibleContracts,
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	thirdPartyApiMode: state.privacy.thirdPartyApiMode,
	frequentRpcList: state.engine.backgroundState.PreferencesController.frequentRpcList,
	network: state.engine.backgroundState.NetworkController,
	gasFeeEstimates: state.engine.backgroundState.GasFeeController.gasFeeEstimates,
	primaryCurrency: state.settings.primaryCurrency,
	tokens: state.engine.backgroundState.TokensController.tokens.reduce((tokens, token) => {
		tokens[token.address] = token;
		return tokens;
	}, {}),
	nativeCurrency: state.engine.backgroundState.CurrencyRateController.nativeCurrency,
	gasEstimateType: state.engine.backgroundState.GasFeeController.gasEstimateType,
	networkType: state.engine.backgroundState.NetworkController.provider.type,
	selectedAsset: state.transaction.selectedAsset,
	transactionState: state.transaction,
});

const mapDispatchToProps = (dispatch) => ({
	showAlert: (config) => dispatch(showAlert(config)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Transactions);
