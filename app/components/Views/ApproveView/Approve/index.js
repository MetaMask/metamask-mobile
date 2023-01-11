import React, { PureComponent } from 'react';
import {
  StyleSheet,
  Alert,
  InteractionManager,
  AppState,
  View,
} from 'react-native';
import PropTypes from 'prop-types';
import { getApproveNavbar } from '../../../UI/Navbar';
import { connect } from 'react-redux';
import { safeToChecksumAddress } from '../../../../util/address';
import Engine from '../../../../core/Engine';
import AnimatedTransactionModal from '../../../UI/AnimatedTransactionModal';
import ApproveTransactionReview from '../../../UI/ApproveTransactionReview';
import AddNickname from '../../../UI/ApproveTransactionReview/AddNickname';
import Modal from 'react-native-modal';
import { strings } from '../../../../../locales/i18n';
import { setTransactionObject } from '../../../../actions/transaction';
import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';
import { BNToHex, hexToBN } from '@metamask/controller-utils';
import { addHexPrefix, fromWei, renderFromWei } from '../../../../util/number';
import { getNormalizedTxState, getTicker } from '../../../../util/transactions';
import { getGasLimit } from '../../../../util/custom-gas';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import NotificationManager from '../../../../core/NotificationManager';
import Analytics from '../../../../core/Analytics/Analytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import Logger from '../../../../util/Logger';
import AnalyticsV2 from '../../../../util/analyticsV2';
import EditGasFee1559 from '../../../UI/EditGasFee1559Update';
import EditGasFeeLegacy from '../../../UI/EditGasFeeLegacyUpdate';
import AppConstants from '../../../../core/AppConstants';
import { shallowEqual } from '../../../../util/general';
import { KEYSTONE_TX_CANCELED } from '../../../../constants/error';
import GlobalAlert from '../../../UI/GlobalAlert';
import checkIfAddressIsSaved from '../../../../util/checkAddress';
import { ThemeContext, mockTheme } from '../../../../util/theme';
import {
  startGasPolling,
  stopGasPolling,
} from '../../../../core/GasPolling/GasPolling';

const EDIT = 'edit';
const REVIEW = 'review';

const styles = StyleSheet.create({
  keyboardAwareWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  updateNickView: {
    margin: 0,
  },
});

/**
 * PureComponent that manages ERC20 approve from the dapp browser
 */
class Approve extends PureComponent {
  static navigationOptions = ({ navigation }) =>
    getApproveNavbar('approve.title', navigation);

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
     * An object of all saved addresses
     */
    addressBook: PropTypes.object,
    /**
     * The current network of the app
     */
    network: PropTypes.string,
  };

  state = {
    approved: false,
    gasError: undefined,
    ready: false,
    mode: REVIEW,
    over: false,
    analyticsParams: {},
    gasSelected: AppConstants.GAS_OPTIONS.MEDIUM,
    gasSelectedTemp: AppConstants.GAS_OPTIONS.MEDIUM,
    transactionConfirmed: false,
    addNickname: false,
    suggestedGasLimit: undefined,
    eip1559GasObject: {},
    eip1559GasTransaction: {},
    legacyGasObject: {},
    legacyGasTransaction: {},
  };

  computeGasEstimates = (overrideGasLimit, gasEstimateTypeChanged) => {
    const { transaction, gasEstimateType } = this.props;

    const gasSelected = gasEstimateTypeChanged
      ? AppConstants.GAS_OPTIONS.MEDIUM
      : this.state.gasSelected;
    const gasSelectedTemp = gasEstimateTypeChanged
      ? AppConstants.GAS_OPTIONS.MEDIUM
      : this.state.gasSelectedTemp;

    if (gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
      const suggestedGasLimit = fromWei(
        overrideGasLimit || transaction.gas,
        'wei',
      );

      // eslint-disable-next-line react/no-did-update-set-state
      this.setState(
        {
          ready: true,
          animateOnChange: true,
          gasSelected,
          gasSelectedTemp,
          suggestedGasLimit,
        },
        () => {
          this.setState({ animateOnChange: false });
        },
      );
    } else {
      const suggestedGasLimit = fromWei(
        overrideGasLimit || transaction.gas,
        'wei',
      );

      // eslint-disable-next-line react/no-did-update-set-state
      this.setState(
        {
          ready: true,
          animateOnChange: true,
          gasSelected,
          gasSelectedTemp,
          suggestedGasLimit,
        },
        () => {
          this.setState({ animateOnChange: false });
        },
      );
    }
  };

  onUpdateContractNickname = () => {
    this.setState({ addNickname: !this.state.addNickname });
  };

  startPolling = async () => {
    const pollToken = await startGasPolling(this.state.pollToken);
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

  componentDidUpdate = (prevProps) => {
    const { transaction } = this.props;

    const gasEstimateTypeChanged =
      prevProps.gasEstimateType !== this.props.gasEstimateType;

    if (
      (!this.state.stopUpdateGas && !this.state.advancedGasInserted) ||
      gasEstimateTypeChanged
    ) {
      if (
        this.props.gasFeeEstimates &&
        transaction.gas &&
        (!shallowEqual(prevProps.gasFeeEstimates, this.props.gasFeeEstimates) ||
          !transaction.gas.eq(prevProps?.transaction?.gas))
      ) {
        this.computeGasEstimates(null, null, gasEstimateTypeChanged);
      }
    }
  };

  componentWillUnmount = async () => {
    const { approved } = this.state;
    const { transaction } = this.props;

    await stopGasPolling(this.state.pollToken);
    AppState.removeEventListener('change', this.handleAppStateChange);
    Engine.context.TransactionController.hub.removeAllListeners(
      `${transaction.id}:finished`,
    );
    if (!approved)
      Engine.context.TransactionController.cancelTransaction(transaction.id);
  };

  handleAppStateChange = (appState) => {
    if (appState !== 'active') {
      const { transaction } = this.props;
      transaction &&
        transaction.id &&
        Engine.context.TransactionController.cancelTransaction(transaction.id);
      this.props.toggleApproveModal(false);
    }
  };

  trackApproveEvent = (event) => {
    const { transaction, tokensLength, accountsLength, providerType } =
      this.props;
    InteractionManager.runAfterInteractions(() => {
      Analytics.trackEventWithParameters(event, {
        view: transaction.origin,
        numberOfTokens: tokensLength,
        numberOfAccounts: accountsLength,
        network: providerType,
      });
    });
  };

  cancelGasEdition = () => {
    this.setState({
      stopUpdateGas: false,
      gasSelectedTemp: this.state.gasSelected,
    });
    this.review();
  };

  cancelGasEditionUpdate = () => {
    this.setState({
      stopUpdateGas: false,
      gasSelectedTemp: this.state.gasSelected,
    });
    this.review();
  };

  saveGasEditionLegacy = (
    legacyGasTransaction,
    legacyGasObject,
    gasSelected,
  ) => {
    legacyGasTransaction.error = this.validateGas(
      legacyGasTransaction.totalHex,
    );
    this.setState({
      gasSelected,
      gasSelectedTemp: gasSelected,
      advancedGasInserted: !gasSelected,
      stopUpdateGas: false,
      legacyGasTransaction,
      legacyGasObject,
    });
    this.review();
  };

  saveGasEdition = (eip1559GasTransaction, eip1559GasObject) => {
    this.setState({ eip1559GasTransaction, eip1559GasObject });
    this.review();
  };

  validateGas = (total) => {
    let error;
    const {
      ticker,
      transaction: { from },
      accounts,
    } = this.props;

    const fromAccount = accounts[safeToChecksumAddress(from)];

    const weiBalance = hexToBN(fromAccount.balance);
    const totalTransactionValue = hexToBN(total);
    if (!weiBalance.gte(totalTransactionValue)) {
      const amount = renderFromWei(totalTransactionValue.sub(weiBalance));
      const tokenSymbol = getTicker(ticker);
      error = strings('transaction.insufficient_amount', {
        amount,
        tokenSymbol,
      });
    }

    return error;
  };

  prepareTransaction = (transaction) => {
    const { gasEstimateType } = this.props;
    const { legacyGasTransaction, eip1559GasTransaction } = this.state;
    const transactionToSend = {
      ...transaction,
      value: BNToHex(transaction.value),
      to: safeToChecksumAddress(transaction.to),
      from: safeToChecksumAddress(transaction.from),
    };

    if (gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
      transactionToSend.gas = eip1559GasTransaction.gasLimitHex;
      transactionToSend.maxFeePerGas = addHexPrefix(
        eip1559GasTransaction.suggestedMaxFeePerGasHex,
      ); //'0x2540be400'
      transactionToSend.maxPriorityFeePerGas = addHexPrefix(
        eip1559GasTransaction.suggestedMaxPriorityFeePerGasHex,
      ); //'0x3b9aca00';
      delete transactionToSend.gasPrice;
    } else {
      transactionToSend.gas = legacyGasTransaction.suggestedGasLimitHex;
      transactionToSend.gasPrice = addHexPrefix(
        legacyGasTransaction.suggestedGasPriceHex,
      );
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
        speed_set: gasSelected || undefined,
      };
    } catch (error) {
      return {};
    }
  };

  onConfirm = async () => {
    const { TransactionController, KeyringController } = Engine.context;
    const { transactions, gasEstimateType } = this.props;
    const {
      legacyGasTransaction,
      transactionConfirmed,
      eip1559GasTransaction,
    } = this.state;

    if (gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
      if (this.validateGas(eip1559GasTransaction.totalMaxHex)) return;
    } else if (this.validateGas(legacyGasTransaction.totalHex)) return;
    if (transactionConfirmed) return;
    this.setState({ transactionConfirmed: true });
    try {
      const transaction = this.prepareTransaction(this.props.transaction);
      TransactionController.hub.once(
        `${transaction.id}:finished`,
        (transactionMeta) => {
          if (transactionMeta.status === 'submitted') {
            this.setState({ approved: true });
            this.props.toggleApproveModal();
            NotificationManager.watchSubmittedTransaction({
              ...transactionMeta,
              assetType: 'ETH',
            });
          } else {
            throw transactionMeta.error;
          }
        },
      );

      const fullTx = transactions.find(({ id }) => id === transaction.id);
      const updatedTx = { ...fullTx, transaction };
      await TransactionController.updateTransaction(updatedTx);
      await KeyringController.resetQRKeyringState();
      await TransactionController.approveTransaction(transaction.id);
      AnalyticsV2.trackEvent(
        MetaMetricsEvents.APPROVAL_COMPLETED,
        this.getAnalyticsParams(),
      );
    } catch (error) {
      if (!error?.message.startsWith(KEYSTONE_TX_CANCELED)) {
        Alert.alert(
          strings('transactions.transaction_error'),
          error && error.message,
          [{ text: 'OK' }],
        );
        Logger.error(error, 'error while trying to send transaction (Approve)');
      } else {
        AnalyticsV2.trackEvent(
          MetaMetricsEvents.QR_HARDWARE_TRANSACTION_CANCELED,
        );
      }
      this.setState({ transactionHandled: false });
    }
    this.setState({ transactionConfirmed: true });
  };

  onCancel = () => {
    const { TransactionController } = Engine.context;
    TransactionController.cancelTransaction(this.props.transaction.id);
    AnalyticsV2.trackEvent(
      MetaMetricsEvents.APPROVAL_CANCELLED,
      this.getAnalyticsParams(),
    );
    this.props.toggleApproveModal(false);

    NotificationManager.showSimpleNotification({
      status: `simple_notification_rejected`,
      duration: 5000,
      title: strings('notifications.approved_tx_rejected_title'),
      description: strings('notifications.wc_description'),
    });
  };

  review = () => {
    this.onModeChange(REVIEW);
  };

  onModeChange = (mode) => {
    this.setState({ mode });
    if (mode === EDIT) {
      InteractionManager.runAfterInteractions(() => {
        Analytics.trackEvent(
          MetaMetricsEvents.SEND_FLOW_ADJUSTS_TRANSACTION_FEE,
        );
      });
    }
  };

  setAnalyticsParams = (analyticsParams) => {
    this.setState({ analyticsParams });
  };

  getGasAnalyticsParams = () => {
    try {
      const { analyticsParams } = this.state;
      const { gasEstimateType } = this.props;
      return {
        dapp_host_name: analyticsParams?.dapp_host_name,
        dapp_url: analyticsParams?.dapp_url,
        active_currency: {
          value: analyticsParams?.active_currency,
          anonymous: true,
        },
        gas_estimate_type: gasEstimateType,
      };
    } catch (error) {
      return {};
    }
  };

  updateGasSelected = (selected) => {
    this.setState({
      stopUpdateGas: !selected,
      gasSelectedTemp: selected,
      gasSelected: selected,
    });
  };

  calculateTempGasFeeLegacy = (selected) => {
    this.setState({
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

  updateTransactionState = (gas) => {
    const gasError = this.validateGas(gas.totalMaxHex || gas.totalHex);

    this.setState({
      eip1559GasTransaction: gas,
      legacyGasTransaction: gas,
      gasError,
    });
  };

  render = () => {
    const {
      mode,
      ready,
      over,
      gasSelected,
      animateOnChange,
      isAnimating,
      transactionConfirmed,
      eip1559GasObject,
      eip1559GasTransaction,
      legacyGasObject,
      gasError,
    } = this.state;

    const {
      transaction,
      addressBook,
      network,
      gasEstimateType,
      gasFeeEstimates,
      primaryCurrency,
      chainId,
    } = this.props;

    const selectedGasObject = {
      suggestedMaxFeePerGas:
        eip1559GasObject.suggestedMaxFeePerGas ||
        gasFeeEstimates[gasSelected]?.suggestedMaxFeePerGas,
      suggestedMaxPriorityFeePerGas:
        eip1559GasObject.suggestedMaxPriorityFeePerGas ||
        gasFeeEstimates[gasSelected]?.suggestedMaxPriorityFeePerGas,
      suggestedGasLimit:
        eip1559GasObject.suggestedGasLimit ||
        eip1559GasTransaction.suggestedGasLimit,
    };

    const selectedLegacyGasObject = {
      legacyGasLimit: legacyGasObject?.legacyGasLimit,
      suggestedGasPrice: legacyGasObject?.suggestedGasPrice,
    };

    const colors = this.context.colors || mockTheme.colors;

    const addressData = checkIfAddressIsSaved(
      addressBook,
      network,
      transaction,
    );

    if (!transaction.id) return null;
    return (
      <Modal
        isVisible={this.props.modalVisible}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        style={
          this.state.addNickname ? styles.updateNickView : styles.bottomModal
        }
        backdropColor={colors.overlay.default}
        backdropOpacity={1}
        animationInTiming={600}
        animationOutTiming={600}
        onBackdropPress={this.onCancel}
        onBackButtonPress={this.onCancel}
        onSwipeComplete={this.onCancel}
        swipeDirection={'down'}
        propagateSwipe
      >
        {this.state.addNickname ? (
          <AddNickname
            onUpdateContractNickname={this.onUpdateContractNickname}
            contractAddress={transaction.to}
            nicknameExists={addressData && !!addressData.length}
            nickname={
              addressData && addressData.length > 0
                ? addressData[0].nickname
                : ''
            }
          />
        ) : (
          <KeyboardAwareScrollView
            contentContainerStyle={styles.keyboardAwareWrapper}
          >
            {mode === 'review' && (
              <AnimatedTransactionModal
                onModeChange={this.onModeChange}
                ready={ready}
                review={this.review}
              >
                <ApproveTransactionReview
                  gasError={gasError}
                  onCancel={this.onCancel}
                  onConfirm={this.onConfirm}
                  over={over}
                  gasSelected={gasSelected}
                  onSetAnalyticsParams={this.setAnalyticsParams}
                  gasEstimateType={gasEstimateType}
                  onUpdatingValuesStart={this.onUpdatingValuesStart}
                  onUpdatingValuesEnd={this.onUpdatingValuesEnd}
                  animateOnChange={animateOnChange}
                  isAnimating={isAnimating}
                  gasEstimationReady={ready}
                  transactionConfirmed={transactionConfirmed}
                  onUpdateContractNickname={this.onUpdateContractNickname}
                  nicknameExists={addressData && !!addressData.length}
                  nickname={
                    addressData && addressData.length > 0
                      ? addressData[0].nickname
                      : ''
                  }
                  chainId={chainId}
                  updateTransactionState={this.updateTransactionState}
                  legacyGasObject={this.state.legacyGasObject}
                  eip1559GasObject={this.state.eip1559GasObject}
                />
                {/** View fixes layout issue after removing <CustomGas/> */}
                <View />
              </AnimatedTransactionModal>
            )}

            {mode !== 'review' &&
              (gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET ? (
                <EditGasFee1559
                  selectedGasValue={gasSelected}
                  initialSuggestedGasLimit={this.state.suggestedGasLimit}
                  gasOptions={gasFeeEstimates}
                  onChange={this.updateGasSelected}
                  primaryCurrency={primaryCurrency}
                  chainId={chainId}
                  onCancel={this.cancelGasEdition}
                  onSave={this.saveGasEdition}
                  animateOnChange={animateOnChange}
                  isAnimating={isAnimating}
                  view={'Approve'}
                  analyticsParams={this.getGasAnalyticsParams()}
                  onlyGas
                  selectedGasObject={selectedGasObject}
                />
              ) : (
                <EditGasFeeLegacy
                  selected={gasSelected}
                  gasEstimateType={gasEstimateType}
                  gasOptions={gasFeeEstimates}
                  onChange={this.calculateTempGasFeeLegacy}
                  primaryCurrency={primaryCurrency}
                  chainId={chainId}
                  onCancel={this.cancelGasEdition}
                  onSave={this.saveGasEditionLegacy}
                  animateOnChange={animateOnChange}
                  isAnimating={isAnimating}
                  view={'Approve'}
                  analyticsParams={this.getGasAnalyticsParams()}
                  onlyGas
                  selectedGasObject={selectedLegacyGasObject}
                />
              ))}
          </KeyboardAwareScrollView>
        )}
        <GlobalAlert />
      </Modal>
    );
  };
}

const mapStateToProps = (state) => ({
  accounts: state.engine.backgroundState.AccountTrackerController.accounts,
  ticker: state.engine.backgroundState.NetworkController.provider.ticker,
  transaction: getNormalizedTxState(state),
  transactions: state.engine.backgroundState.TransactionController.transactions,
  accountsLength: Object.keys(
    state.engine.backgroundState.AccountTrackerController.accounts || {},
  ).length,
  tokensLength: state.engine.backgroundState.TokensController.tokens.length,
  primaryCurrency: state.settings.primaryCurrency,
  chainId: state.engine.backgroundState.NetworkController.provider.chainId,
  gasFeeEstimates:
    state.engine.backgroundState.GasFeeController.gasFeeEstimates,
  gasEstimateType:
    state.engine.backgroundState.GasFeeController.gasEstimateType,
  currentCurrency:
    state.engine.backgroundState.CurrencyRateController.currentCurrency,
  nativeCurrency:
    state.engine.backgroundState.CurrencyRateController.nativeCurrency,
  conversionRate:
    state.engine.backgroundState.CurrencyRateController.conversionRate,
  addressBook: state.engine.backgroundState.AddressBookController.addressBook,
  network: state.engine.backgroundState.NetworkController.network,
});

const mapDispatchToProps = (dispatch) => ({
  setTransactionObject: (transaction) =>
    dispatch(setTransactionObject(transaction)),
});

Approve.contextType = ThemeContext;

export default connect(mapStateToProps, mapDispatchToProps)(Approve);
