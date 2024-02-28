import React, { PureComponent } from 'react';
import { Alert, AppState, View } from 'react-native';
import PropTypes from 'prop-types';
import { getApproveNavbar } from '../../../../UI/Navbar';
import { connect } from 'react-redux';
import {
  safeToChecksumAddress,
  isHardwareAccount,
} from '../../../../../util/address';
import Engine from '../../../../../core/Engine';
import AnimatedTransactionModal from '../../../../UI/AnimatedTransactionModal';
import ApproveTransactionReview from '../../components/ApproveTransactionReview';
import AddNickname from '../../components/ApproveTransactionReview/AddNickname';
import Modal from 'react-native-modal';
import { strings } from '../../../../../../locales/i18n';
import { getNetworkNonce } from '../../../../../util/networks';

import {
  setTransactionObject,
  setNonce,
  setProposedNonce,
} from '../../../../../actions/transaction';
import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';
import { BNToHex } from '@metamask/controller-utils';
import {
  addHexPrefix,
  fromWei,
  renderFromWei,
  hexToBN,
} from '../../../../../util/number';
import {
  getNormalizedTxState,
  getTicker,
} from '../../../../../util/transactions';
import { getGasLimit } from '../../../../../util/custom-gas';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import NotificationManager from '../../../../../core/NotificationManager';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import Logger from '../../../../../util/Logger';
import EditGasFee1559 from '../../components/EditGasFee1559Update';
import EditGasFeeLegacy from '../../components/EditGasFeeLegacyUpdate';
import AppConstants from '../../../../../core/AppConstants';
import { shallowEqual } from '../../../../../util/general';
import { KEYSTONE_TX_CANCELED } from '../../../../../constants/error';
import GlobalAlert from '../../../../UI/GlobalAlert';
import checkIfAddressIsSaved from '../../../../../util/checkAddress';
import { ThemeContext, mockTheme } from '../../../../../util/theme';
import { createLedgerTransactionModalNavDetails } from '../../../../UI/LedgerModals/LedgerTransactionModal';
import {
  startGasPolling,
  stopGasPolling,
} from '../../../../../core/GasPolling/GasPolling';
import {
  selectChainId,
  selectProviderType,
  selectTicker,
  selectRpcUrl,
  selectNetworkConfigurations,
} from '../../../../../selectors/networkController';
import {
  selectConversionRate,
  selectCurrentCurrency,
  selectNativeCurrency,
} from '../../../../../selectors/currencyRateController';
import { selectTokensLength } from '../../../../../selectors/tokensController';
import {
  selectAccounts,
  selectAccountsLength,
} from '../../../../../selectors/accountTrackerController';
import ShowBlockExplorer from '../../components/ApproveTransactionReview/ShowBlockExplorer';
import createStyles from './styles';
import { ethErrors } from 'eth-rpc-errors';
import { getLedgerKeyring } from '../../../../../core/Ledger/Ledger';
import ExtendedKeyringTypes from '../../../../../constants/keyringTypes';
import { updateTransaction } from '../../../../../util/transaction-controller';
import { withMetricsAwareness } from '../../../../../components/hooks/useMetrics';
import { selectGasFeeEstimates } from '../../../../../selectors/confirmTransaction';
import { selectGasFeeControllerEstimateType } from '../../../../../selectors/gasFeeController';

const EDIT = 'edit';
const REVIEW = 'review';

/**
 * PureComponent that manages ERC20 approve from the dapp browser
 */
class Approve extends PureComponent {
  appStateListener;

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
    /* Hide modal visible or not
    */
    hideModal: PropTypes.func,
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
    networkConfigurations: PropTypes.object,
    providerRpcTarget: PropTypes.string,
    /**
     * Set transaction nonce
     */
    setNonce: PropTypes.func,
    /**
     * Set proposed nonce (from network)
     */
    setProposedNonce: PropTypes.func,
    /**
     * Indicates whether custom nonce should be shown in transaction editor
     */
    showCustomNonce: PropTypes.bool,
    /**
     * Object that represents the navigator
     */
    navigation: PropTypes.object,
    /**
     * Metrics injected by withMetricsAwareness HOC
     */
    metrics: PropTypes.object,
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
    shouldAddNickname: false,
    shouldVerifyContractDetails: false,
    suggestedGasLimit: undefined,
    eip1559GasObject: {},
    eip1559GasTransaction: {},
    legacyGasObject: {},
    legacyGasTransaction: {},
    isBlockExplorerVisible: false,
    address: '',
    tokenAllowanceState: undefined,
    isGasEstimateStatusIn: false,
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

  showVerifyContractDetails = () =>
    this.setState({ shouldVerifyContractDetails: true });
  closeVerifyContractDetails = () =>
    this.setState({ shouldVerifyContractDetails: false });

  toggleModal = (val) => {
    this.setState({
      shouldAddNickname: !this.state.shouldAddNickname,
      address: val,
    });
  };

  startPolling = async () => {
    const pollToken = await startGasPolling(this.state.pollToken);
    this.setState({ pollToken });
  };

  setNetworkNonce = async () => {
    const { setNonce, setProposedNonce, transaction } = this.props;
    const proposedNonce = await getNetworkNonce(transaction);
    setNonce(proposedNonce);
    setProposedNonce(proposedNonce);
  };

  componentDidMount = async () => {
    const { showCustomNonce } = this.props;
    if (!this.props?.transaction?.id) {
      this.props.hideModal();
      return null;
    }
    if (!this.props?.transaction?.gas) this.handleGetGasLimit();

    this.startPolling();

    if (showCustomNonce) {
      await this.setNetworkNonce();
    }
    this.appStateListener = AppState.addEventListener(
      'change',
      this.handleAppStateChange,
    );
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
    const { TransactionController } = Engine.context;
    const { approved } = this.state;
    const { transaction } = this.props;

    await stopGasPolling(this.state.pollToken);

    const isLedgerAccount = isHardwareAccount(transaction.from, [
      ExtendedKeyringTypes.ledger,
    ]);

    this.appStateListener?.remove();
    if (!isLedgerAccount) {
      TransactionController.hub.removeAllListeners(
        `${transaction.id}:finished`,
      );
      if (!approved)
        Engine.rejectPendingApproval(
          transaction.id,
          ethErrors.provider.userRejectedRequest(),
          {
            ignoreMissing: true,
            logErrors: false,
          },
        );
    }
  };

  handleAppStateChange = (appState) => {
    if (appState !== 'active') {
      const { transaction } = this.props;
      Engine.rejectPendingApproval(
        transaction?.id,
        ethErrors.provider.userRejectedRequest(),
        {
          ignoreMissing: true,
          logErrors: false,
        },
      );

      this.props.hideModal();
    }
  };

  trackApproveEvent = (event) => {
    const { transaction, tokensLength, accountsLength, providerType, metrics } =
      this.props;

    metrics.trackEvent(event, {
      view: transaction.origin,
      numberOfTokens: tokensLength,
      numberOfAccounts: accountsLength,
      network: providerType,
    });
  };

  cancelGasEdition = () => {
    this.setState({
      stopUpdateGas: false,
    });
    this.review();
  };

  saveGasEditionLegacy = (legacyGasTransaction, legacyGasObject) => {
    legacyGasTransaction.error = this.validateGas(
      legacyGasTransaction.totalHex,
    );
    this.setState({
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
    const { gasEstimateType, showCustomNonce } = this.props;
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

    if (showCustomNonce && transactionToSend.nonce) {
      transactionToSend.nonce = BNToHex(transactionToSend.nonce);
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

  onLedgerConfirmation = (approve, transactionId, gaParams) => {
    const { metrics } = this.props;
    const { TransactionController } = Engine.context;
    try {
      //manual cancel from UI when transaction is awaiting from ledger confirmation
      if (!approve) {
        //cancelTransaction will change transaction status to reject and throw error from event listener
        //component is being unmounted, error will be unhandled, hence remove listener before cancel
        TransactionController.hub.removeAllListeners(
          `${transactionId}:finished`,
        );

        TransactionController.cancelTransaction(transactionId);

        metrics.trackEvent(MetaMetricsEvents.APPROVAL_CANCELLED, gaParams);

        NotificationManager.showSimpleNotification({
          status: `simple_notification_rejected`,
          duration: 5000,
          title: strings('notifications.wc_sent_tx_rejected_title'),
          description: strings('notifications.wc_description'),
        });
      }
    } finally {
      metrics.trackEvent(MetaMetricsEvents.APPROVAL_COMPLETED, gaParams);
    }
  };

  onConfirm = async () => {
    const { TransactionController, KeyringController, ApprovalController } =
      Engine.context;
    const { transactions, gasEstimateType, metrics } = this.props;
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
      const isLedgerAccount = isHardwareAccount(transaction.from, [
        ExtendedKeyringTypes.ledger,
      ]);

      TransactionController.hub.once(
        `${transaction.id}:finished`,
        (transactionMeta) => {
          if (transactionMeta.status === 'submitted') {
            if (!isLedgerAccount) {
              this.setState({ approved: true });
              this.props.hideModal();
            }
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
      await updateTransaction(updatedTx);
      await KeyringController.resetQRKeyringState();

      // For Ledger Accounts we handover the signing to the confirmation flow
      if (isLedgerAccount) {
        const ledgerKeyring = await getLedgerKeyring();
        this.setState({ transactionHandled: true });
        this.setState({ transactionConfirmed: false });

        this.props.navigation.navigate(
          ...createLedgerTransactionModalNavDetails({
            transactionId: transaction.id,
            deviceId: ledgerKeyring.deviceId,
            onConfirmationComplete: (approve) =>
              this.onLedgerConfirmation(
                approve,
                transaction.id,
                this.getAnalyticsParams(),
              ),
            type: 'signTransaction',
          }),
        );
        this.props.hideModal();
        return;
      }
      await ApprovalController.accept(transaction.id, undefined, {
        waitForResult: true,
      });

      metrics.trackEvent(
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
        metrics.trackEvent(MetaMetricsEvents.QR_HARDWARE_TRANSACTION_CANCELED);
      }
      this.setState({ transactionHandled: false });
    }
    this.setState({ transactionConfirmed: true });
  };

  onCancel = () => {
    const { metrics, hideModal } = this.props;
    Engine.rejectPendingApproval(
      this.props.transaction.id,
      ethErrors.provider.userRejectedRequest(),
      {
        ignoreMissing: true,
        logErrors: false,
      },
    );
    metrics.trackEvent(
      MetaMetricsEvents.APPROVAL_CANCELLED,
      this.getAnalyticsParams(),
    );
    hideModal();

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
    const { metrics } = this.props;
    this.setState({ mode });
    if (mode === EDIT) {
      metrics.trackEvent(MetaMetricsEvents.SEND_FLOW_ADJUSTS_TRANSACTION_FEE);
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
      isGasEstimateStatusIn: true,
      gasError,
    });
  };

  setIsBlockExplorerVisible = () => {
    this.setState({
      isBlockExplorerVisible: !this.state.isBlockExplorerVisible,
    });
  };

  updateTokenAllowanceState = (value) => {
    this.setState({ tokenAllowanceState: value });
  };

  render = () => {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

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
      address,
      shouldAddNickname,
      tokenAllowanceState,
      isGasEstimateStatusIn,
      legacyGasTransaction,
    } = this.state;

    const {
      transaction,
      addressBook,
      gasEstimateType,
      gasFeeEstimates,
      primaryCurrency,
      chainId,
      providerType,
      providerRpcTarget,
      networkConfigurations,
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

    const savedContactList = checkIfAddressIsSaved(
      addressBook,
      chainId,
      transaction,
    );

    const savedContactListToArray = Object.values(addressBook).flatMap(
      (value) => Object.values(value),
    );

    let addressNickname = '';

    const filteredSavedContactList = savedContactListToArray.filter(
      (contact) => contact.address === safeToChecksumAddress(address),
    );

    if (filteredSavedContactList.length > 0) {
      addressNickname = filteredSavedContactList[0].name;
    }

    if (!transaction.id) return null;
    return (
      <Modal
        isVisible={this.props.modalVisible}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        style={
          this.state.shouldAddNickname
            ? styles.updateNickView
            : styles.bottomModal
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
        {shouldAddNickname ? (
          <AddNickname
            closeModal={this.toggleModal}
            address={address}
            savedContactListToArray={savedContactListToArray}
            addressNickname={addressNickname}
          />
        ) : this.state.isBlockExplorerVisible ? (
          <ShowBlockExplorer
            setIsBlockExplorerVisible={this.setIsBlockExplorerVisible}
            type={providerType}
            address={transaction.to}
            headerWrapperStyle={styles.headerWrapper}
            headerTextStyle={styles.headerText}
            iconStyle={styles.icon}
            providerRpcTarget={providerRpcTarget}
            networkConfigurations={networkConfigurations}
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
                  savedContactListToArray={savedContactListToArray}
                  transactionConfirmed={transactionConfirmed}
                  showBlockExplorer={this.setIsBlockExplorerVisible}
                  toggleModal={this.toggleModal}
                  showVerifyContractDetails={this.showVerifyContractDetails}
                  shouldVerifyContractDetails={
                    this.state.shouldVerifyContractDetails
                  }
                  closeVerifyContractDetails={this.closeVerifyContractDetails}
                  nicknameExists={savedContactList && !!savedContactList.length}
                  nickname={
                    savedContactList && savedContactList.length > 0
                      ? savedContactList[0].nickname
                      : ''
                  }
                  chainId={chainId}
                  updateTokenAllowanceState={this.updateTokenAllowanceState}
                  tokenAllowanceState={tokenAllowanceState}
                  updateTransactionState={this.updateTransactionState}
                  legacyGasObject={this.state.legacyGasObject}
                  eip1559GasObject={this.state.eip1559GasObject}
                  isGasEstimateStatusIn={isGasEstimateStatusIn}
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
                  onCancel={this.cancelGasEdition}
                  onSave={this.saveGasEditionLegacy}
                  animateOnChange={animateOnChange}
                  isAnimating={isAnimating}
                  view={'Approve'}
                  analyticsParams={this.getGasAnalyticsParams()}
                  onlyGas
                  selectedGasObject={selectedLegacyGasObject}
                  error={legacyGasTransaction.error}
                  onUpdatingValuesStart={this.onUpdatingValuesStart}
                  onUpdatingValuesEnd={this.onUpdatingValuesEnd}
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
  accounts: selectAccounts(state),
  ticker: selectTicker(state),
  transaction: getNormalizedTxState(state),
  transactions: state.engine.backgroundState.TransactionController.transactions,
  tokensLength: selectTokensLength(state),
  accountsLength: selectAccountsLength(state),
  primaryCurrency: state.settings.primaryCurrency,
  chainId: selectChainId(state),
  gasFeeEstimates: selectGasFeeEstimates(state),
  gasEstimateType: selectGasFeeControllerEstimateType(state),
  conversionRate: selectConversionRate(state),
  currentCurrency: selectCurrentCurrency(state),
  nativeCurrency: selectNativeCurrency(state),
  showCustomNonce: state.settings.showCustomNonce,
  addressBook: state.engine.backgroundState.AddressBookController.addressBook,
  providerType: selectProviderType(state),
  providerRpcTarget: selectRpcUrl(state),
  networkConfigurations: selectNetworkConfigurations(state),
});

const mapDispatchToProps = (dispatch) => ({
  setTransactionObject: (transaction) =>
    dispatch(setTransactionObject(transaction)),
  setNonce: (nonce) => dispatch(setNonce(nonce)),
  setProposedNonce: (nonce) => dispatch(setProposedNonce(nonce)),
});

Approve.contextType = ThemeContext;

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withMetricsAwareness(Approve));
