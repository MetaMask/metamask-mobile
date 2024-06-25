import React, { PureComponent } from 'react';
import { StyleSheet, AppState, Alert, InteractionManager } from 'react-native';
import Engine from '../../../../core/Engine';
import PropTypes from 'prop-types';
import TransactionEditor from './components/TransactionEditor';
import Modal from 'react-native-modal';
import { addHexPrefix, BNToHex } from '../../../../util/number';
import { getTransactionOptionsTitle } from '../../../UI/Navbar';
import { resetTransaction } from '../../../../actions/transaction';
import { connect } from 'react-redux';
import NotificationManager from '../../../../core/NotificationManager';
import AppConstants from '../../../../core/AppConstants';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  getTransactionReviewActionKey,
  getNormalizedTxState,
  getActiveTabUrl,
} from '../../../../util/transactions';
import { strings } from '../../../../../locales/i18n';
import {
  getAddressAccountType,
  isQRHardwareAccount,
  safeToChecksumAddress,
  isHardwareAccount,
} from '../../../../util/address';
import { WALLET_CONNECT_ORIGIN } from '../../../../util/walletconnect';
import Logger from '../../../../util/Logger';
import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';
import { KEYSTONE_TX_CANCELED } from '../../../../constants/error';
import { ThemeContext, mockTheme } from '../../../../util/theme';
import { createLedgerTransactionModalNavDetails } from '../../../UI/LedgerModals/LedgerTransactionModal';
import {
  TX_CANCELLED,
  TX_CONFIRMED,
  TX_FAILED,
  TX_SUBMITTED,
  TX_REJECTED,
} from '../../../../constants/transaction';
import {
  selectChainId,
  selectProviderType,
} from '../../../../selectors/networkController';
import { selectSelectedInternalAccountChecksummedAddress } from '../../../../selectors/accountsController';
import { providerErrors } from '@metamask/rpc-errors';
import { getDeviceId } from '../../../../core/Ledger/Ledger';
import { selectShouldUseSmartTransaction } from '../../../../selectors/smartTransactionsController';
import ExtendedKeyringTypes from '../../../../constants/keyringTypes';
import { getBlockaidMetricsParams } from '../../../../util/blockaid';
import { getDecimalChainId } from '../../../../util/networks';

import { updateTransaction } from '../../../../util/transaction-controller';
import { withMetricsAwareness } from '../../../../components/hooks/useMetrics';
import { STX_NO_HASH_ERROR } from '../../../../util/smart-transactions/smart-publish-hook';
import { getSmartTransactionMetricsProperties } from '../../../../util/smart-transactions';
import { selectTransactionMetrics } from '../../../../core/redux/slices/transactionMetrics';

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
  appStateListener;

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
     * Hide dapp transaction modal
     */
    hideModal: PropTypes.func,
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
     * A string representing the network chainId
     */
    chainId: PropTypes.string,
    /**
     * Metrics injected by withMetricsAwareness HOC
     */
    metrics: PropTypes.object,

    /**
     * Boolean that indicates if smart transaction should be used
     */
    shouldUseSmartTransaction: PropTypes.bool,

    /**
     * Object containing transaction metrics by id
     */
    transactionMetricsById: PropTypes.object,
  };

  state = {
    mode: REVIEW,
    transactionHandled: false,
    transactionConfirmed: false,
  };

  originIsWalletConnect = this.props.transaction.origin?.startsWith(
    WALLET_CONNECT_ORIGIN,
  );

  originIsMMSDKRemoteConn = this.props.transaction.origin?.startsWith(
    AppConstants.MM_SDK.SDK_REMOTE_ORIGIN,
  );

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
          Engine.rejectPendingApproval(
            transaction?.id,
            providerErrors.userRejectedRequest(),
            {
              ignoreMissing: true,
              logErrors: false,
            },
          );
        }
        Engine.context.TransactionController.hub.removeAllListeners(
          `${transaction.id}:finished`,
        );
        this.appStateListener?.remove();
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

        if (transaction?.id && this.isTxStatusCancellable(currentTransaction)) {
          Engine.rejectPendingApproval(
            transaction.id,
            providerErrors.userRejectedRequest(),
            {
              ignoreMissing: true,
              logErrors: false,
            },
          );
        }
        this.props.hideModal();
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
    this.appStateListener = AppState.addEventListener(
      'change',
      this.handleAppStateChange,
    );
    navigation &&
      navigation.setParams({ mode: REVIEW, dispatch: this.onModeChange });

    this.props.metrics.trackEvent(
      MetaMetricsEvents.DAPP_TRANSACTION_STARTED,
      this.getAnalyticsParams(),
    );
  };

  /**
   * Call Analytics to track confirm started event for approval screen
   */
  trackConfirmScreen = () => {
    this.props.metrics.trackEvent(
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
    this.props.metrics.trackEvent(
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
    this.props.metrics.trackEvent(
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
      shouldUseSmartTransaction,
    } = this.props;
    return {
      view: APPROVAL,
      network: networkType,
      activeCurrency: selectedAsset.symbol || selectedAsset.contractName,
      assetType,
      is_smart_transaction: shouldUseSmartTransaction,
    };
  };

  getBlockaidMetricsParams = () => {
    const { transaction } = this.props;

    let blockaidParams = {};

    if (
      transaction.id === transaction.currentTransactionSecurityAlertResponse?.id
    ) {
      blockaidParams = getBlockaidMetricsParams(
        transaction.currentTransactionSecurityAlertResponse?.response,
      );
    }

    return blockaidParams;
  };

  getAnalyticsParams = ({ gasEstimateType, gasSelected } = {}) => {
    try {
      const {
        chainId,
        transaction,
        selectedAddress,
        shouldUseSmartTransaction,
      } = this.props;
      const { selectedAsset } = transaction;
      const { TransactionController, SmartTransactionsController } =
        Engine.context;

      const transactionMeta = TransactionController.getTransaction(
        transaction.id,
      );

      const smartTransactionMetricsProperties =
        getSmartTransactionMetricsProperties(
          SmartTransactionsController,
          transactionMeta,
        );

      return {
        account_type: getAddressAccountType(selectedAddress),
        dapp_host_name: transaction?.origin,
        chain_id: getDecimalChainId(chainId),
        active_currency: { value: selectedAsset?.symbol, anonymous: true },
        asset_type: { value: transaction?.assetType, anonymous: true },
        gas_estimate_type: gasEstimateType,
        gas_mode: gasSelected ? 'Basic' : 'Advanced',
        speed_set: gasSelected || undefined,
        request_source: this.originIsMMSDKRemoteConn
          ? AppConstants.REQUEST_SOURCES.SDK_REMOTE_CONN
          : this.originIsWalletConnect
          ? AppConstants.REQUEST_SOURCES.WC
          : AppConstants.REQUEST_SOURCES.IN_APP_BROWSER,
        is_smart_transaction: shouldUseSmartTransaction,
        ...smartTransactionMetricsProperties,
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
    this.props.hideModal();
    this.state.mode === REVIEW && this.trackOnCancel();
    this.showWalletConnectNotification();
    this.props.metrics.trackEvent(
      MetaMetricsEvents.DAPP_TRANSACTION_CANCELLED,
      {
        ...this.getAnalyticsParams(),
        ...this.getBlockaidMetricsParams(),
        ...this.getTransactionMetrics(),
      },
    );
  };

  onLedgerConfirmation = (approve, transactionId, gaParams) => {
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

        this.showWalletConnectNotification();

        this.props.metrics.trackEvent(
          MetaMetricsEvents.DAPP_TRANSACTION_CANCELLED,
          gaParams,
        );
      } else {
        this.showWalletConnectNotification(true);
      }
    } finally {
      this.props.metrics.trackEvent(
        MetaMetricsEvents.DAPP_TRANSACTION_COMPLETED,
        gaParams,
      );
    }
  };

  /**
   * Callback on confirm transaction
   */
  onConfirm = async ({ gasEstimateType, EIP1559GasData, gasSelected }) => {
    const { TransactionController, KeyringController, ApprovalController } =
      Engine.context;
    const {
      transactions,
      transaction: { assetType, selectedAsset },
      showCustomNonce,
      chainId,
      shouldUseSmartTransaction,
    } = this.props;
    let { transaction } = this.props;
    const { nonce } = transaction;
    const { transactionConfirmed } = this.state;
    if (transactionConfirmed) return;

    if (showCustomNonce && nonce) {
      transaction.nonce = BNToHex(nonce);
    } else {
      // If nonce is not set in transaction, TransactionController will set it to the next nonce
      transaction.nonce = undefined;
    }

    const isLedgerAccount = isHardwareAccount(transaction.from, [
      ExtendedKeyringTypes.ledger,
    ]);

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

      // For STX, don't wait for TxController to get finished event, since it will take some time to get hash for STX
      if (shouldUseSmartTransaction) {
        this.setState({ transactionHandled: true });
        this.props.hideModal();
      }

      TransactionController.hub.once(
        `${transaction.id}:finished`,
        (transactionMeta) => {
          if (transactionMeta.status === 'submitted') {
            if (!isLedgerAccount) {
              this.setState({ transactionHandled: true });
              this.props.hideModal();
            }
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

      const updatedTx = {
        ...fullTx,
        txParams: {
          ...fullTx.txParams,
          ...transaction,
          chainId,
        },
      };

      await updateTransaction(updatedTx);
      await KeyringController.resetQRKeyringState();

      // For Ledger Accounts we handover the signing to the confirmation flow
      if (isLedgerAccount) {
        const deviceId = await getDeviceId();
        this.setState({ transactionHandled: true });
        this.setState({ transactionConfirmed: false });

        this.props.navigation.navigate(
          ...createLedgerTransactionModalNavDetails({
            transactionId: transaction.id,
            deviceId,
            onConfirmationComplete: (approve) =>
              this.onLedgerConfirmation(approve, transaction.id, {
                ...this.getAnalyticsParams({ gasEstimateType, gasSelected }),
                ...this.getTransactionMetrics(),
              }),
            type: 'signTransaction',
          }),
        );
        this.props.hideModal();
        return;
      }

      await ApprovalController.accept(transaction.id, undefined, {
        waitForResult: true,
      });

      this.showWalletConnectNotification(true);
    } catch (error) {
      if (
        !error?.message.startsWith(KEYSTONE_TX_CANCELED) &&
        !error?.message.startsWith(STX_NO_HASH_ERROR)
      ) {
        Alert.alert(
          strings('transactions.transaction_error'),
          error && error.message,
          [{ text: strings('navigation.ok') }],
        );
        Logger.error(
          error,
          'error while trying to send transaction (Approval)',
        );
        this.setState({ transactionHandled: true });
        this.props.hideModal();
      } else {
        this.props.metrics.trackEvent(
          MetaMetricsEvents.QR_HARDWARE_TRANSACTION_CANCELED,
        );
      }
      this.setState({ transactionHandled: false });
    }

    this.props.metrics.trackEvent(
      MetaMetricsEvents.DAPP_TRANSACTION_COMPLETED,
      {
        ...this.getAnalyticsParams({
          gasEstimateType,
          gasSelected,
        }),
        ...this.getBlockaidMetricsParams(),
        ...this.getTransactionMetrics(),
      },
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

  getTransactionMetrics = () => {
    const { transactionMetricsById, transaction } = this.props;
    const { id: transactionId } = transaction;

    // Skip sensitiveProperties for now as it's not supported by mobile Metametrics client
    return transactionMetricsById[transactionId]?.properties || {};
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
  selectedAddress: selectSelectedInternalAccountChecksummedAddress(state),
  networkType: selectProviderType(state),
  showCustomNonce: state.settings.showCustomNonce,
  chainId: selectChainId(state),
  activeTabUrl: getActiveTabUrl(state),
  shouldUseSmartTransaction: selectShouldUseSmartTransaction(state),
  transactionMetricsById: selectTransactionMetrics(state),
});

const mapDispatchToProps = (dispatch) => ({
  resetTransaction: () => dispatch(resetTransaction()),
});

Approval.contextType = ThemeContext;

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withMetricsAwareness(Approval));
