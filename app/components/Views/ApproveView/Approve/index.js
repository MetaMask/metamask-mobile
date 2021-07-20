import React, { PureComponent } from 'react';
import { StyleSheet, Alert, InteractionManager, AppState } from 'react-native';
import PropTypes from 'prop-types';
import { getApproveNavbar } from '../../../UI/Navbar';
import { connect } from 'react-redux';
import { safeToChecksumAddress } from '../../../../util/address';
import Engine from '../../../../core/Engine';
import CustomGas from '../../../UI/CustomGas';
import AnimatedTransactionModal from '../../../UI/AnimatedTransactionModal';
import ApproveTransactionReview from '../../../UI/ApproveTransactionReview';
import Modal from 'react-native-modal';
import { strings } from '../../../../../locales/i18n';
import { setTransactionObject } from '../../../../actions/transaction';
import { GAS_ESTIMATE_TYPES, util } from '@metamask/controllers';
import { addHexPrefix, fromWei, renderFromWei } from '../../../../util/number';
import {
	getNormalizedTxState,
	getTicker,
	parseTransactionEIP1559,
	parseTransactionLegacy
} from '../../../../util/transactions';
import { apiEstimateModifiedToWEI, getBasicGasEstimatesByChainId, getGasLimit } from '../../../../util/custom-gas';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import NotificationManager from '../../../../core/NotificationManager';
import Analytics from '../../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../../util/analytics';
import Logger from '../../../../util/Logger';
import AnalyticsV2 from '../../../../util/analyticsV2';
import EditGasFee1559 from '../../../UI/EditGasFee1559';
import EditGasFeeLegacy from '../../../UI/EditGasFeeLegacy';

const { BNToHex, hexToBN } = util;

const EDIT = 'edit';
const REVIEW = 'review';

const styles = StyleSheet.create({
	keyboardAwareWrapper: {
		flex: 1,
		justifyContent: 'flex-end'
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	}
});

/**
 * PureComponent that manages ERC20 approve from the dapp browser
 */
class Approve extends PureComponent {
	static navigationOptions = ({ navigation }) => getApproveNavbar('approve.title', navigation);

	static propTypes = {
		/**
		 * List of accounts from the AccountTrackerController
		 */
		accounts: PropTypes.object,
		/**
		 * Transaction state
		 */
		transaction: PropTypes.object.isRequired,
		/**
		 * Action that sets transaction attributes from object to a transaction
		 */
		setTransactionObject: PropTypes.func.isRequired,
		/**
		 * List of transactions
		 */
		transactions: PropTypes.array,
		/**
		 * Number of tokens
		 */
		tokensLength: PropTypes.number,
		/**
		 * Number of accounts
		 */
		accountsLength: PropTypes.number,
		/**
		 * A string representing the network name
		 */
		providerType: PropTypes.string,
		/**
		 * Whether the modal is visible
		 */
		modalVisible: PropTypes.bool,
		/**
		/* Token approve modal visible or not
		*/
		toggleApproveModal: PropTypes.func,
		/**
		 * Current selected ticker
		 */
		ticker: PropTypes.string,
		/**
		 * Gas fee estimates returned by the gas fee controller
		 */
		gasFeeEstimates: PropTypes.object,
		/**
		 * Estimate type returned by the gas fee controller, can be market-fee, legacy or eth_gasPrice
		 */
		gasEstimateType: PropTypes.string,
		/**
		 * ETH or fiat, depending on user setting
		 */
		primaryCurrency: PropTypes.string,
		/**
		 * A string representing the network chainId
		 */
		chainId: PropTypes.string,
		/**
		 * A string representing the network type
		 */
		networkType: PropTypes.string
	};

	state = {
		approved: false,
		gasError: undefined,
		warningGasPriceHigh: undefined,
		ready: false,
		mode: REVIEW,
		over: false,
		analyticsParams: {},
		gasSelected: 'medium',
		gasSelectedTemp: 'medium',
		EIP1559GasData: {},
		EIP1559GasDataTemp: {},
		LegacyGasData: {},
		LegacyGasDataTemp: {}
	};

	computeGasEstimates = (overrideGasPrice, overrideGasLimit) => {
		const { transaction, gasEstimateType, gasFeeEstimates } = this.props;
		const { gasSelected, gasSelectedTemp } = this.state;

		if (gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
			const overrideGas = overrideGasPrice
				? {
						suggestedMaxFeePerGas: fromWei(overrideGasPrice, 'gwei'),
						suggestedMaxPriorityFeePerGas: fromWei(overrideGasPrice, 'gwei')
						// eslint-disable-next-line no-mixed-spaces-and-tabs
				  }
				: null;

			const initialGas = overrideGas || gasFeeEstimates[gasSelected];
			const initialGasTemp = overrideGas || gasFeeEstimates[gasSelectedTemp];

			const suggestedGasLimit = fromWei(overrideGasLimit || transaction.gas, 'wei');

			const EIP1559GasData = this.parseTransactionDataEIP1559({
				...initialGas,
				suggestedGasLimit
			});

			let EIP1559GasDataTemp;
			if (gasSelected === gasSelectedTemp) {
				EIP1559GasDataTemp = EIP1559GasData;
			} else {
				EIP1559GasDataTemp = this.parseTransactionDataEIP1559({
					...initialGasTemp,
					suggestedGasLimit
				});
			}

			// eslint-disable-next-line react/no-did-update-set-state
			this.setState(
				{
					ready: true,
					EIP1559GasData,
					EIP1559GasDataTemp,
					animateOnChange: true
				},
				() => {
					this.setState({ animateOnChange: false });
				}
			);
		} else {
			const suggestedGasLimit = fromWei(overrideGasLimit || transaction.gas, 'wei');

			const getGas = selected =>
				overrideGasPrice
					? fromWei(overrideGasPrice, 'gwei')
					: gasEstimateType === GAS_ESTIMATE_TYPES.LEGACY
					? gasFeeEstimates[selected]
					: gasFeeEstimates.gasPrice;

			const LegacyGasData = this.parseTransactionDataLegacy(
				{
					suggestedGasPrice: getGas(gasSelected),
					suggestedGasLimit
				},
				{ onlyGas: true }
			);

			let LegacyGasDataTemp;
			if (gasSelected === gasSelectedTemp) {
				LegacyGasDataTemp = LegacyGasData;
			} else {
				LegacyGasDataTemp = this.parseTransactionDataLegacy(
					{
						suggestedGasPrice: getGas(gasSelectedTemp),
						suggestedGasLimit
					},
					{ onlyGas: true }
				);
			}

			// eslint-disable-next-line react/no-did-update-set-state
			this.setState(
				{
					ready: true,
					LegacyGasData,
					LegacyGasDataTemp,
					animateOnChange: true
				},
				() => {
					this.setState({ animateOnChange: false });
				}
			);
		}
	};

	startPolling = async () => {
		const { GasFeeController } = Engine.context;
		const pollToken = await GasFeeController.getGasFeeEstimatesAndStartPolling(this.state.pollToken);
		this.setState({ pollToken });
	};

	componentDidMount = () => {
		if (!this.props?.transaction?.id) {
			this.props.toggleApproveModal(false);
			return null;
		}
		if (!this.props?.transaction?.gas) this.handleGetGasLimit();

		this.startPolling();

		AppState.addEventListener('change', this.handleAppStateChange);
	};

	handleGetGasLimit = async () => {
		const { setTransactionObject, transaction } = this.props;
		const estimation = await getGasLimit({ ...transaction, gas: undefined });
		setTransactionObject({ gas: estimation.gas });
	};

	shallowEqual = (object1, object2) => {
		const keys1 = Object.keys(object1);
		const keys2 = Object.keys(object2);

		if (keys1.length !== keys2.length) {
			return false;
		}

		for (const key of keys1) {
			if (object1[key] !== object2[key]) {
				return false;
			}
		}

		return true;
	};

	componentDidUpdate = prevProps => {
		const { transaction } = this.props;

		if (!this.state.stopUpdateGas && !this.state.advancedGasInserted) {
			if (
				this.props.gasFeeEstimates &&
				transaction.gas &&
				(!this.shallowEqual(prevProps.gasFeeEstimates, this.props.gasFeeEstimates) ||
					!transaction.gas.eq(prevProps?.transaction?.gas))
			) {
				this.computeGasEstimates();
			}
		}
	};

	parseTransactionDataEIP1559 = (gasFee, options) => {
		const parsedTransactionEIP1559 = parseTransactionEIP1559(
			{
				...this.props,
				selectedGasFee: { ...gasFee, estimatedBaseFee: this.props.gasFeeEstimates.estimatedBaseFee }
			},
			{ onlyGas: true }
		);

		parsedTransactionEIP1559.error = this.validateGas(parsedTransactionEIP1559.totalMaxHex);
		return parsedTransactionEIP1559;
	};

	parseTransactionDataLegacy = (gasFee, options) => {
		const parsedTransactionLegacy = parseTransactionLegacy(
			{
				...this.props,
				selectedGasFee: gasFee
			},
			{ onlyGas: true }
		);
		parsedTransactionLegacy.error = this.validateGas(parsedTransactionLegacy.totalHex);
		return parsedTransactionLegacy;
	};

	componentWillUnmount = () => {
		const { approved } = this.state;
		const { transaction } = this.props;

		const { GasFeeController } = Engine.context;
		GasFeeController.stopPolling(this.state.pollToken);
		AppState.removeEventListener('change', this.handleAppStateChange);
		if (!approved) Engine.context.TransactionController.cancelTransaction(transaction.id);
	};

	handleAppStateChange = appState => {
		if (appState !== 'active') {
			const { transaction } = this.props;
			transaction && transaction.id && Engine.context.TransactionController.cancelTransaction(transaction.id);
			this.props.toggleApproveModal(false);
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

	trackApproveEvent = event => {
		const { transaction, tokensLength, accountsLength, providerType } = this.props;
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEventWithParameters(event, {
				view: transaction.origin,
				numberOfTokens: tokensLength,
				numberOfAccounts: accountsLength,
				network: providerType
			});
		});
	};

	handleSetGasFee = (customGas, customGasPrice, warningGasPriceHigh) => {
		const { setTransactionObject } = this.props;
		this.setState({ gasEstimationReady: false });
		this.setState({ warningGasPriceHigh });
		setTransactionObject({ gas: customGas, gasPrice: customGasPrice });
		setTimeout(() => {
			this.setState({
				gasEstimationReady: true,
				errorMessage: undefined
			});
		}, 100);
	};

	cancelGasEdition = () => {
		this.setState({
			EIP1559GasDataTemp: { ...this.state.EIP1559GasData },
			LegacyGasDataTemp: { ...this.state.LegacyGasData },
			stopUpdateGas: false,
			gasSelectedTemp: this.state.gasSelected
		});
		this.review();
	};

	saveGasEdition = gasSelected => {
		this.setState({
			EIP1559GasData: { ...this.state.EIP1559GasDataTemp },
			LegacyGasData: { ...this.state.LegacyGasDataTemp },
			gasSelected,
			gasSelectedTemp: gasSelected,
			advancedGasInserted: !gasSelected,
			stopUpdateGas: false
		});
		this.review();
	};

	validateGas = total => {
		let error;
		const {
			ticker,
			transaction: { from },
			accounts
		} = this.props;

		const fromAccount = accounts[safeToChecksumAddress(from)];

		const weiBalance = hexToBN(fromAccount.balance);
		const totalTransactionValue = hexToBN(total);
		if (!weiBalance.gte(totalTransactionValue)) {
			const amount = renderFromWei(totalTransactionValue.sub(weiBalance));
			const tokenSymbol = getTicker(ticker);
			error = strings('transaction.insufficient_amount', { amount, tokenSymbol });
		}

		return error;
	};

	prepareTransaction = transaction => {
		const { gasEstimateType } = this.props;
		const { LegacyGasData, EIP1559GasData } = this.state;
		const transactionToSend = {
			...transaction,
			value: BNToHex(transaction.value),
			to: safeToChecksumAddress(transaction.to),
			from: safeToChecksumAddress(transaction.from)
		};

		if (gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
			transactionToSend.gas = EIP1559GasData.gasLimitHex;
			transactionToSend.maxFeePerGas = addHexPrefix(EIP1559GasData.suggestedMaxFeePerGasHex); //'0x2540be400'
			transactionToSend.maxPriorityFeePerGas = addHexPrefix(EIP1559GasData.suggestedMaxPriorityFeePerGasHex); //'0x3b9aca00';
			delete transactionToSend.gasPrice;
		} else {
			transactionToSend.gas = LegacyGasData.suggestedGasLimitHex;
			transactionToSend.gasPrice = addHexPrefix(LegacyGasData.suggestedGasPriceHex);
		}

		return transactionToSend;
	};

	getAnalyticsParams = () => {
		try {
			const { gasEstimateType } = this.props;
			const { analyticsParams, gasSelected } = this.state;
			return {
				...analyticsParams,
				gas_estimate_type: gasEstimateType,
				gas_mode: gasSelected ? 'Basic' : 'Advanced',
				speed_set: gasSelected || undefined
			};
		} catch (error) {
			return {};
		}
	};

	onConfirm = async () => {
		const { TransactionController } = Engine.context;
		const { transactions, gasEstimateType } = this.props;
		const { EIP1559GasData, LegacyGasData } = this.state;

		if (gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
			if (this.validateGas(EIP1559GasData.totalMaxHex)) return;
		} else if (this.validateGas(LegacyGasData.totalHex)) return;

		try {
			const transaction = this.prepareTransaction(this.props.transaction);
			TransactionController.hub.once(`${transaction.id}:finished`, transactionMeta => {
				if (transactionMeta.status === 'submitted') {
					this.setState({ approved: true });
					this.props.toggleApproveModal();
					NotificationManager.watchSubmittedTransaction({
						...transactionMeta,
						assetType: 'ETH'
					});
				} else {
					throw transactionMeta.error;
				}
			});

			const fullTx = transactions.find(({ id }) => id === transaction.id);
			const updatedTx = { ...fullTx, transaction };
			await TransactionController.updateTransaction(updatedTx);
			await TransactionController.approveTransaction(transaction.id);
			AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.APPROVAL_COMPLETED, this.getAnalyticsParams());
		} catch (error) {
			Alert.alert(strings('transactions.transaction_error'), error && error.message, [{ text: 'OK' }]);
			Logger.error(error, 'error while trying to send transaction (Approve)');
			this.setState({ transactionHandled: false });
		}
	};

	onCancel = () => {
		AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.APPROVAL_CANCELLED, this.getAnalyticsParams());
		this.props.toggleApproveModal(false);
	};

	review = () => {
		this.onModeChange(REVIEW);
	};

	onModeChange = mode => {
		this.setState({ mode });
		if (mode === EDIT) {
			InteractionManager.runAfterInteractions(() => {
				Analytics.trackEvent(ANALYTICS_EVENT_OPTS.SEND_FLOW_ADJUSTS_TRANSACTION_FEE);
			});
		}
	};

	setAnalyticsParams = analyticsParams => {
		this.setState({ analyticsParams });
	};

	getGasAnalyticsParams = () => {
		try {
			const { analyticsParams } = this.state;
			const { gasEstimateType, networkType } = this.props;
			return {
				dapp_host_name: analyticsParams?.dapp_host_name,
				dapp_url: analyticsParams?.dapp_url,
				active_currency: { value: analyticsParams?.active_currency, anonymous: true },
				gas_estimate_type: gasEstimateType,
				network_name: networkType
			};
		} catch (error) {
			return {};
		}
	};

	calculateTempGasFee = (gas, selected) => {
		const { transaction } = this.props;
		if (selected && gas) {
			gas.suggestedGasLimit = fromWei(transaction.gas, 'wei');
		}
		this.setState({
			EIP1559GasDataTemp: this.parseTransactionDataEIP1559(gas),
			stopUpdateGas: !selected,
			gasSelectedTemp: selected
		});
	};

	calculateTempGasFeeLegacy = (gas, selected) => {
		const { transaction } = this.props;
		if (selected && gas) {
			gas.suggestedGasLimit = fromWei(transaction.gas, 'wei');
		}
		this.setState({
			LegacyGasDataTemp: this.parseTransactionDataLegacy(gas),
			stopUpdateGas: !selected,
			gasSelectedTemp: selected
		});
	};

	onUpdatingValuesStart = () => {
		this.setState({ isAnimating: true });
	};
	onUpdatingValuesEnd = () => {
		this.setState({ isAnimating: false });
	};

	render = () => {
		const {
			gasError,
			basicGasEstimates,
			mode,
			ready,
			over,
			warningGasPriceHigh,
			EIP1559GasData,
			EIP1559GasDataTemp,
			LegacyGasData,
			LegacyGasDataTemp,
			gasSelected,
			animateOnChange,
			isAnimating
		} = this.state;
		const { transaction, gasEstimateType, gasFeeEstimates, primaryCurrency, chainId } = this.props;

		if (!transaction.id) return null;
		return (
			<Modal
				isVisible={this.props.modalVisible}
				animationIn="slideInUp"
				animationOut="slideOutDown"
				style={styles.bottomModal}
				backdropOpacity={0.7}
				animationInTiming={600}
				animationOutTiming={600}
				onBackdropPress={this.onCancel}
				onBackButtonPress={this.onCancel}
				onSwipeComplete={this.onCancel}
				swipeDirection={'down'}
				propagateSwipe
			>
				<KeyboardAwareScrollView contentContainerStyle={styles.keyboardAwareWrapper}>
					{mode === 'review' && (
						<AnimatedTransactionModal onModeChange={this.onModeChange} ready={ready} review={this.review}>
							<ApproveTransactionReview
								gasError={EIP1559GasData.error || LegacyGasData.error}
								warningGasPriceHigh={warningGasPriceHigh}
								onCancel={this.onCancel}
								onConfirm={this.onConfirm}
								over={over}
								onSetAnalyticsParams={this.setAnalyticsParams}
								EIP1559GasData={EIP1559GasData}
								LegacyGasData={LegacyGasData}
								gasEstimateType={gasEstimateType}
								onUpdatingValuesStart={this.onUpdatingValuesStart}
								onUpdatingValuesEnd={this.onUpdatingValuesEnd}
								animateOnChange={animateOnChange}
								isAnimating={isAnimating}
							/>
							<CustomGas
								handleGasFeeSelection={this.handleSetGasFee}
								basicGasEstimates={basicGasEstimates}
								gas={transaction.gas}
								gasPrice={transaction.gasPrice}
								gasError={gasError}
								mode={mode}
								view={'Approve'}
								analyticsParams={this.getGasAnalyticsParams()}
							/>
						</AnimatedTransactionModal>
					)}

					{mode !== 'review' &&
						(gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET ? (
							<EditGasFee1559
								selected={gasSelected}
								gasFee={EIP1559GasDataTemp}
								gasOptions={gasFeeEstimates}
								onChange={this.calculateTempGasFee}
								gasFeeNative={EIP1559GasDataTemp.renderableGasFeeMinNative}
								gasFeeConversion={EIP1559GasDataTemp.renderableGasFeeMinConversion}
								gasFeeMaxNative={EIP1559GasDataTemp.renderableGasFeeMaxNative}
								gasFeeMaxConversion={EIP1559GasDataTemp.renderableGasFeeMaxConversion}
								maxPriorityFeeNative={EIP1559GasDataTemp.renderableMaxPriorityFeeNative}
								maxPriorityFeeConversion={EIP1559GasDataTemp.renderableMaxPriorityFeeConversion}
								maxFeePerGasNative={EIP1559GasDataTemp.renderableMaxFeePerGasNative}
								maxFeePerGasConversion={EIP1559GasDataTemp.renderableMaxFeePerGasConversion}
								primaryCurrency={primaryCurrency}
								chainId={chainId}
								timeEstimate={EIP1559GasDataTemp.timeEstimate}
								timeEstimateColor={EIP1559GasDataTemp.timeEstimateColor}
								onCancel={this.cancelGasEdition}
								onSave={this.saveGasEdition}
								error={EIP1559GasDataTemp.error}
								onUpdatingValuesStart={this.onUpdatingValuesStart}
								onUpdatingValuesEnd={this.onUpdatingValuesEnd}
								animateOnChange={animateOnChange}
								isAnimating={isAnimating}
								view={'Approve'}
								analyticsParams={this.getGasAnalyticsParams()}
							/>
						) : (
							<EditGasFeeLegacy
								selected={gasSelected}
								gasFee={LegacyGasDataTemp}
								gasEstimateType={gasEstimateType}
								gasOptions={gasFeeEstimates}
								onChange={this.calculateTempGasFeeLegacy}
								gasFeeNative={LegacyGasDataTemp.transactionFee}
								gasFeeConversion={LegacyGasDataTemp.transactionFeeFiat}
								gasPriceConversion={LegacyGasDataTemp.transactionFeeFiat}
								primaryCurrency={primaryCurrency}
								chainId={chainId}
								onCancel={this.cancelGasEdition}
								onSave={this.saveGasEdition}
								error={LegacyGasDataTemp.error}
								onUpdatingValuesStart={this.onUpdatingValuesStart}
								onUpdatingValuesEnd={this.onUpdatingValuesEnd}
								animateOnChange={animateOnChange}
								isAnimating={isAnimating}
								view={'Approve'}
								analyticsParams={this.getGasAnalyticsParams()}
							/>
						))}
				</KeyboardAwareScrollView>
			</Modal>
		);
	};
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	transaction: getNormalizedTxState(state),
	transactions: state.engine.backgroundState.TransactionController.transactions,
	accountsLength: Object.keys(state.engine.backgroundState.AccountTrackerController.accounts || {}).length,
	tokensLength: state.engine.backgroundState.AssetsController.tokens.length,
	primaryCurrency: state.settings.primaryCurrency,
	chainId: state.engine.backgroundState.NetworkController.provider.chainId,
	gasFeeEstimates: state.engine.backgroundState.GasFeeController.gasFeeEstimates,
	gasEstimateType: state.engine.backgroundState.GasFeeController.gasEstimateType,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	nativeCurrency: state.engine.backgroundState.CurrencyRateController.nativeCurrency,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	networkType: state.engine.backgroundState.NetworkController.provider.type
});

const mapDispatchToProps = dispatch => ({
	setTransactionObject: transaction => dispatch(setTransactionObject(transaction))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Approve);
