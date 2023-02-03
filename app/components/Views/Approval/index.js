import React, { PureComponent } from 'react';
import { StyleSheet, AppState, Alert, InteractionManager } from 'react-native';
import Engine from '../../../core/Engine';
import PropTypes from 'prop-types';
import TransactionEditor from '../../UI/TransactionEditor';
import Modal from 'react-native-modal';
import { addHexPrefix, BNToHex } from '../../../util/number';
import { getTransactionOptionsTitle } from '../../UI/Navbar';
import { resetTransaction } from '../../../actions/transaction';
import { connect } from 'react-redux';
import NotificationManager from '../../../core/NotificationManager';
import Analytics from '../../../core/Analytics/Analytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import {
  getTransactionReviewActionKey,
  getNormalizedTxState,
  getActiveTabUrl,
} from '../../../util/transactions';
import { strings } from '../../../../locales/i18n';
import {
  getAddressAccountType,
  isQRHardwareAccount,
  safeToChecksumAddress,
} from '../../../util/address';
import { WALLET_CONNECT_ORIGIN } from '../../../util/walletconnect';
import Logger from '../../../util/Logger';
import AnalyticsV2 from '../../../util/analyticsV2';
import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';
import { KEYSTONE_TX_CANCELED } from '../../../constants/error';
import { ThemeContext, mockTheme } from '../../../util/theme';
import {
  TX_CANCELLED,
  TX_CONFIRMED,
  TX_FAILED,
  TX_SUBMITTED,
  TX_REJECTED,
} from '../../../constants/transaction';

const REVIEW = 'review';
const EDIT = 'edit';
const APPROVAL = 'Approval';

const styles = StyleSheet.create({
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
});

/**
 * PureComponent that manages transaction approval from the dapp browser
 */
class Approval extends PureComponent {
  static propTypes = {
    /**
     * A string that represents the selected address
     */
    selectedAddress: PropTypes.string,
    /**
     * react-navigation object used for switching between screens
     */
    navigation: PropTypes.object.isRequired,
    /**
     * Action that cleans transaction state
     */
    resetTransaction: PropTypes.func.isRequired,
    /**
     * Transaction state
     */
    transaction: PropTypes.object.isRequired,
    /**
     * List of transactions
     */
    transactions: PropTypes.array,
    /**
     * A string representing the network name
     */
    networkType: PropTypes.string,
    /**
     * Hides or shows the dApp transaction modal
     */
    toggleDappTransactionModal: PropTypes.func,
    /**
     * Tells whether or not dApp transaction modal is visible
     */
    dappTransactionModalVisible: PropTypes.bool,
    /**
     * Indicates whether custom nonce should be shown in transaction editor
     */
    showCustomNonce: PropTypes.bool,
    nonce: PropTypes.number,
    /**
     * Active tab URL, the currently active tab url
     */
    activeTabUrl: PropTypes.string,
    /**
     * A string representing the network chainId
     */
    chainId: PropTypes.string,
  };

  state = {
    mode: REVIEW,
    transactionHandled: false,
    transactionConfirmed: false,
  };

  updateNavBar = () => {
    const colors = this.context.colors || mockTheme.colors;
    const { navigation } = this.props;
    navigation.setOptions(
      getTransactionOptionsTitle('approval.title', navigation, {}, colors),
    );
  };

  componentDidUpdate = () => {
    this.updateNavBar();
  };

  componentWillUnmount = () => {
    try {
      const { transactionHandled } = this.state;
      const { transaction, selectedAddress } = this.props;
      const { KeyringController } = Engine.context;
      if (!transactionHandled) {
        if (isQRHardwareAccount(selectedAddress)) {
          KeyringController.cancelQRSignRequest();
        } else {
          Engine.context.TransactionController.cancelTransaction(
            transaction.id,
          );
        }
        Engine.context.TransactionController.hub.removeAllListeners(
          `${transaction.id}:finished`,
        );
        AppState.removeEventListener('change', this.handleAppStateChange);
        this.clear();
      }
    } catch (e) {
      if (e) {
        throw e;
      }
    }
  };

  isTxStatusCancellable = (transaction) => {
    if (
      transaction?.status === TX_SUBMITTED ||
      transaction?.status === TX_REJECTED ||
      transaction?.status === TX_CONFIRMED ||
      transaction?.status === TX_CANCELLED ||
      transaction?.status === TX_FAILED
    ) {
      return false;
    }
    return true;
  };

  handleAppStateChange = (appState) => {
    try {
      if (appState !== 'active') {
        const { transaction, transactions } = this.props;
        const currentTransaction = transactions.find(
          (tx) => tx.id === transaction.id,
        );

        transaction &&
          transaction.id &&
          this.isTxStatusCancellable(currentTransaction) &&
          Engine.context.TransactionController.cancelTransaction(
            transaction.id,
          );
        this.props.toggleDappTransactionModal(false);
      }
    } catch (e) {
      if (e) {
        throw e;
      }
    }
  };

  componentDidMount = () => {
    const { navigation } = this.props;
    this.updateNavBar();
    AppState.addEventListener('change', this.handleAppStateChange);
    navigation &&
      navigation.setParams({ mode: REVIEW, dispatch: this.onModeChange });

    AnalyticsV2.trackEvent(
      MetaMetricsEvents.DAPP_TRANSACTION_STARTED,
      this.getAnalyticsParams(),
    );
  };

  /**
   * Call Analytics to track confirm started event for approval screen
   */
  trackConfirmScreen = () => {
    Analytics.trackEventWithParameters(
      MetaMetricsEvents.TRANSACTIONS_CONFIRM_STARTED,
      this.getTrackingParams(),
    );
  };

  /**
   * Call Analytics to track confirm started event for approval screen
   */
  trackEditScreen = async () => {
    const { transaction } = this.props;
    const actionKey = await getTransactionReviewActionKey(transaction);
    Analytics.trackEventWithParameters(
      MetaMetricsEvents.TRANSACTIONS_EDIT_TRANSACTION,
      {
        ...this.getTrackingParams(),
        actionKey,
      },
    );
  };

  /**
   * Call Analytics to track cancel pressed
   */
  trackOnCancel = () => {
    Analytics.trackEventWithParameters(
      MetaMetricsEvents.TRANSACTIONS_CANCEL_TRANSACTION,
      this.getTrackingParams(),
    );
  };

  /**
   * Returns corresponding tracking params to send
   *
   * @return {object} - Object containing view, network, activeCurrency and assetType
   */
  getTrackingParams = () => {
    const {
      networkType,
      transaction: { selectedAsset, assetType },
    } = this.props;
    return {
      view: APPROVAL,
      network: networkType,
      activeCurrency: selectedAsset.symbol || selectedAsset.contractName,
      assetType,
    };
  };

  getAnalyticsParams = ({ gasEstimateType, gasSelected } = {}) => {
    try {
      const { activeTabUrl, chainId, transaction, selectedAddress } =
        this.props;
      const { selectedAsset } = transaction;
      return {
        account_type: getAddressAccountType(selectedAddress),
        dapp_host_name: transaction?.origin,
        dapp_url: activeTabUrl,
        chain_id: chainId,
        active_currency: { value: selectedAsset?.symbol, anonymous: true },
        asset_type: { value: transaction?.assetType, anonymous: true },
        gas_estimate_type: gasEstimateType,
        gas_mode: gasSelected ? 'Basic' : 'Advanced',
        speed_set: gasSelected || undefined,
      };
    } catch (error) {
      return {};
    }
  };

  /**
   * Transaction state is erased, ready to create a new clean transaction
   */
  clear = () => {
    this.props.resetTransaction();
  };

  showWalletConnectNotification = (confirmation = false) => {
    const { transaction } = this.props;
    InteractionManager.runAfterInteractions(() => {
      transaction.origin &&
        transaction.origin.startsWith(WALLET_CONNECT_ORIGIN) &&
        NotificationManager.showSimpleNotification({
          status: `simple_notification${!confirmation ? '_rejected' : ''}`,
          duration: 5000,
          title: confirmation
            ? strings('notifications.wc_sent_tx_title')
            : strings('notifications.wc_sent_tx_rejected_title'),
          description: strings('notifications.wc_description'),
        });
    });
  };

  onCancel = () => {
    this.props.toggleDappTransactionModal();
    this.state.mode === REVIEW && this.trackOnCancel();
    this.showWalletConnectNotification();
    AnalyticsV2.trackEvent(
      MetaMetricsEvents.DAPP_TRANSACTION_CANCELLED,
      this.getAnalyticsParams(),
    );
  };

  /**
   * Callback on confirm transaction
   */
  onConfirm = async ({ gasEstimateType, EIP1559GasData, gasSelected }) => {
    const { TransactionController, KeyringController } = Engine.context;
    const {
      transactions,
      transaction: { assetType, selectedAsset },
      showCustomNonce,
    } = this.props;
    let { transaction } = this.props;
    const { nonce } = transaction;
    const { transactionConfirmed } = this.state;
    if (transactionConfirmed) return;
    if (showCustomNonce && nonce) transaction.nonce = BNToHex(nonce);
    this.setState({ transactionConfirmed: true });
    try {
      if (assetType === 'ETH') {
        transaction = this.prepareTransaction({
          transaction,
          gasEstimateType,
          EIP1559GasData,
        });
      } else {
        transaction = this.prepareAssetTransaction({
          transaction,
          selectedAsset,
          gasEstimateType,
          EIP1559GasData,
        });
      }

      TransactionController.hub.once(
        `${transaction.id}:finished`,
        (transactionMeta) => {
          if (transactionMeta.status === 'submitted') {
            this.setState({ transactionHandled: true });
            this.props.toggleDappTransactionModal();
            NotificationManager.watchSubmittedTransaction({
              ...transactionMeta,
              assetType: transaction.assetType,
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
      this.showWalletConnectNotification(true);
    } catch (error) {
      if (!error?.message.startsWith(KEYSTONE_TX_CANCELED)) {
        Alert.alert(
          strings('transactions.transaction_error'),
          error && error.message,
          [{ text: strings('navigation.ok') }],
        );
        Logger.error(
          error,
          'error while trying to send transaction (Approval)',
        );
      } else {
        AnalyticsV2.trackEvent(
          MetaMetricsEvents.QR_HARDWARE_TRANSACTION_CANCELED,
        );
      }
      this.setState({ transactionHandled: false });
    }
    AnalyticsV2.trackEvent(
      MetaMetricsEvents.DAPP_TRANSACTION_COMPLETED,
      this.getAnalyticsParams({ gasEstimateType, gasSelected }),
    );
    this.setState({ transactionConfirmed: false });
  };

  /**
   * Handle approval mode change
   * If changed to 'review' sends an Analytics track event
   *
   * @param mode - Transaction mode, review or edit
   */
  onModeChange = (mode) => {
    const { navigation } = this.props;
    navigation && navigation.setParams({ mode });
    this.setState({ mode });
    InteractionManager.runAfterInteractions(() => {
      mode === REVIEW && this.trackConfirmScreen();
      mode === EDIT && this.trackEditScreen();
    });
  };

  /**
   * Returns transaction object with gas, gasPrice and value in hex format
   *
   * @param {object} transaction - Transaction object
   */
  prepareTransaction = ({ transaction, gasEstimateType, EIP1559GasData }) => {
    const transactionToSend = {
      ...transaction,
      value: BNToHex(transaction.value),
      to: safeToChecksumAddress(transaction.to),
    };

    if (gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
      transactionToSend.gas = EIP1559GasData.gasLimitHex;
      transactionToSend.maxFeePerGas = addHexPrefix(
        EIP1559GasData.suggestedMaxFeePerGasHex,
      ); //'0x2540be400'
      transactionToSend.maxPriorityFeePerGas = addHexPrefix(
        EIP1559GasData.suggestedMaxPriorityFeePerGasHex,
      ); //'0x3b9aca00';
      transactionToSend.to = safeToChecksumAddress(transaction.to);
      delete transactionToSend.gasPrice;
    } else {
      transactionToSend.gas = BNToHex(transaction.gas);
      transactionToSend.gasPrice = BNToHex(transaction.gasPrice);
    }

    return transactionToSend;
  };

  /**
   * Returns transaction object with gas and gasPrice in hex format, value set to 0 in hex format
   * and to set to selectedAsset address
   *
   * @param {object} transaction - Transaction object
   * @param {object} selectedAsset - Asset object
   */
  prepareAssetTransaction = ({
    transaction,
    selectedAsset,
    gasEstimateType,
    EIP1559GasData,
  }) => {
    const transactionToSend = {
      ...transaction,
      value: '0x0',
      to: selectedAsset.address,
    };

    if (gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
      transactionToSend.gas = EIP1559GasData.gasLimitHex;
      transactionToSend.maxFeePerGas = addHexPrefix(
        EIP1559GasData.suggestedMaxFeePerGasHex,
      ); //'0x2540be400'
      transactionToSend.maxPriorityFeePerGas = addHexPrefix(
        EIP1559GasData.suggestedMaxPriorityFeePerGasHex,
      ); //'0x3b9aca00';
      delete transactionToSend.gasPrice;
    } else {
      transactionToSend.gas = BNToHex(transaction.gas);
      transactionToSend.gasPrice = BNToHex(transaction.gasPrice);
    }

    return transactionToSend;
  };

  render = () => {
    const { dappTransactionModalVisible } = this.props;
    const { mode, transactionConfirmed } = this.state;
    const colors = this.context.colors || mockTheme.colors;

    return (
      <Modal
        isVisible={dappTransactionModalVisible}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        style={styles.bottomModal}
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
        <TransactionEditor
          promptedFromApproval
          mode={mode}
          onCancel={this.onCancel}
          onConfirm={this.onConfirm}
          onModeChange={this.onModeChange}
          dappTransactionModalVisible={dappTransactionModalVisible}
          transactionConfirmed={transactionConfirmed}
        />
      </Modal>
    );
  };
}

const mapStateToProps = (state) => ({
  transaction: getNormalizedTxState(state),
  transactions: state.engine.backgroundState.TransactionController.transactions,
  selectedAddress:
    state.engine.backgroundState.PreferencesController.selectedAddress,
  networkType: state.engine.backgroundState.NetworkController.provider.type,
  showCustomNonce: state.settings.showCustomNonce,
  chainId: state.engine.backgroundState.NetworkController.provider.chainId,
  activeTabUrl: getActiveTabUrl(state),
});

const mapDispatchToProps = (dispatch) => ({
  resetTransaction: () => dispatch(resetTransaction()),
});

Approval.contextType = ThemeContext;

export default connect(mapStateToProps, mapDispatchToProps)(Approval);
