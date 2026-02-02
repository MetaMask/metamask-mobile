import React, { PureComponent } from 'react';
import { TransactionEnvelopeType } from '@metamask/transaction-controller';
import { StyleSheet, AppState, Alert, InteractionManager } from 'react-native';
import Engine from '../../../../../core/Engine';
import PropTypes from 'prop-types';
import TransactionEditor from './components/TransactionEditor';
import Modal from 'react-native-modal';
import { safeBNToHex } from '../../../../../util/number';
import { getTransactionOptionsTitle } from '../../../../UI/Navbar';
import { resetTransaction } from '../../../../../actions/transaction';
import { connect } from 'react-redux';
import NotificationManager from '../../../../../core/NotificationManager';
import AppConstants from '../../../../../core/AppConstants';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  getTransactionReviewActionKey,
  getNormalizedTxState,
  getActiveTabUrl,
} from '../../../../../util/transactions';
import { strings } from '../../../../../../locales/i18n';
import {
  getAddressAccountType,
  isQRHardwareAccount,
  isHardwareAccount,
} from '../../../../../util/address';
import { WALLET_CONNECT_ORIGIN } from '../../../../../util/walletconnect';
import Logger from '../../../../../util/Logger';
import { KEYSTONE_TX_CANCELED } from '../../../../../constants/error';
import { ThemeContext, mockTheme } from '../../../../../util/theme';
import { createLedgerTransactionModalNavDetails } from '../../../../UI/LedgerModals/LedgerTransactionModal';
import {
  TX_CANCELLED,
  TX_CONFIRMED,
  TX_FAILED,
  TX_SUBMITTED,
  TX_REJECTED,
} from '../../../../../constants/transaction';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { providerErrors } from '@metamask/rpc-errors';
import { getDeviceId } from '../../../../../core/Ledger/Ledger';
import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import ExtendedKeyringTypes from '../../../../../constants/keyringTypes';
import { getBlockaidMetricsParams } from '../../../../../util/blockaid';
import { getDecimalChainId } from '../../../../../util/networks';
import Routes from '../../../../../constants/navigation/Routes';

import { updateTransaction } from '../../../../../util/transaction-controller';
import { withMetricsAwareness } from '../../../../../components/hooks/useMetrics';
import { STX_NO_HASH_ERROR } from '../../../../../util/smart-transactions/smart-publish-hook';
import { getSmartTransactionMetricsProperties } from '../../../../../util/smart-transactions';
import { selectConfirmationMetrics } from '../../../../../core/redux/slices/confirmationMetrics';
import {
  selectCurrentTransactionSecurityAlertResponse,
  selectCurrentTransactionMetadata,
} from '../../../../../selectors/confirmTransaction';
import { selectTransactions } from '../../../../../selectors/transactionController';
import { buildTransactionParams } from '../../../../../util/confirmation/transactions';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import SDKConnect from '../../../../../core/SDKConnect/SDKConnect';
import WC2Manager from '../../../../../core/WalletConnect/WalletConnectV2';
import { selectProviderTypeByChainId } from '../../../../../selectors/networkController';

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

  #transactionFinishedListener;

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
     * Object containing confirmation metrics by id
     */
    confirmationMetricsById: PropTypes.object,

    /**
     * Object containing blockaid validation response for confirmation
     */
    securityAlertResponse: PropTypes.object,

    /**
     * Object containing simulation data
     */
    simulationData: PropTypes.object,
  };

  state = {
    mode: REVIEW,
    transactionHandled: false,
    transactionConfirmed: false,
    isChangeInSimulationModalOpen: false,
  };

  originIsWalletConnect = false;
  originIsMMSDKRemoteConn = false;

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

      const isLedgerAccount = isHardwareAccount(selectedAddress, [
        ExtendedKeyringTypes.ledger,
      ]);

      if (!transactionHandled) {
        if (isQRHardwareAccount(selectedAddress)) {
          Engine.getQrKeyringScanner().rejectPendingScan(
            new Error('Transaction cancelled'),
          );
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
      }

      // Always perform cleanup operations regardless of account type
      Engine.controllerMessenger.tryUnsubscribe(
        'TransactionController:transactionFinished',
        this.#transactionFinishedListener,
      );

      this.appStateListener?.remove();

      this.clear();
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
    this.initialise();
  };

  initialise = async () => {
    // Detect origin: WalletConnect / SDK / InAppBrowser
    await this.detectOrigin(); // Ensure detectOrigin finishes before proceeding

    this.props.metrics.trackEvent(
      this.props.metrics
        .createEventBuilder(MetaMetricsEvents.DAPP_TRANSACTION_STARTED)
        .addProperties(this.getAnalyticsParams())
        .build(),
    );
  };

  detectOrigin = async () => {
    const { transaction } = this.props;
    const { origin } = transaction;

    const connection = SDKConnect.getInstance().getConnection({
      channelId: origin,
    });
    if (connection) {
      this.originIsMMSDKRemoteConn = true;
    } else {
      // Check if origin is WalletConnect
      const wc2Manager = await WC2Manager.getInstance();
      const sessions = wc2Manager.getSessions();
      this.originIsWalletConnect = sessions.some((session) => {
        // Otherwise, compare the origin with the metadata URL
        if (
          session.peer.metadata.url === origin ||
          origin.startsWith(WALLET_CONNECT_ORIGIN)
        ) {
          DevLogger.log(
            `Approval::detectOrigin Comparing session URL ${session.peer.metadata.url} with origin ${origin}`,
          );
          return true;
        }
        return false;
      });
    }
    DevLogger.log(
      `Approval::detectOrigin originIsWalletConnect=${this.originIsWalletConnect} originIsMMSDKRemoteConn=${this.originIsMMSDKRemoteConn}`,
    );
  };

  /**
   * Call Analytics to track confirm started event for approval screen
   */
  trackConfirmScreen = () => {
    this.props.metrics.trackEvent(
      this.props.metrics
        .createEventBuilder(MetaMetricsEvents.TRANSACTIONS_CONFIRM_STARTED)
        .addProperties(this.getTrackingParams())
        .build(),
    );
  };

  /**
   * Call Analytics to track confirm started event for approval screen
   */
  trackEditScreen = async () => {
    const { transaction, metrics } = this.props;
    const actionKey = await getTransactionReviewActionKey({ transaction });
    metrics.trackEvent(
      metrics
        .createEventBuilder(MetaMetricsEvents.TRANSACTIONS_EDIT_TRANSACTION)
        .addProperties({
          ...this.getTrackingParams(),
          actionKey,
        })
        .build(),
    );
  };

  /**
   * Call Analytics to track cancel pressed
   */
  trackOnCancel = () => {
    this.props.metrics.trackEvent(
      this.props.metrics
        .createEventBuilder(MetaMetricsEvents.TRANSACTIONS_CANCEL_TRANSACTION)
        .addProperties(this.getTrackingParams())
        .build(),
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
    const { securityAlertResponse } = this.props;
    return securityAlertResponse
      ? getBlockaidMetricsParams(securityAlertResponse)
      : {};
  };

  getAnalyticsParams = ({ gasEstimateType, gasSelected } = {}) => {
    const { chainId, transaction, selectedAddress, shouldUseSmartTransaction } =
      this.props;

    const baseParams = {
      dapp_host_name: transaction?.origin || 'N/A',
      asset_type: { value: transaction?.assetType, anonymous: true },
      request_source: this.originIsMMSDKRemoteConn
        ? AppConstants.REQUEST_SOURCES.SDK_REMOTE_CONN
        : this.originIsWalletConnect
          ? AppConstants.REQUEST_SOURCES.WC
          : AppConstants.REQUEST_SOURCES.IN_APP_BROWSER,
    };

    try {
      const { selectedAsset } = transaction;
      const { TransactionController, SmartTransactionsController } =
        Engine.context;

      const transactionMeta = TransactionController.getTransactions({
        chainId,
        searchCriteria: { id: transaction.id },
      })?.[0];

      const smartTransactionMetricsProperties =
        getSmartTransactionMetricsProperties(
          SmartTransactionsController,
          transactionMeta,
        );

      return {
        ...baseParams,
        account_type: getAddressAccountType(selectedAddress),
        chain_id: getDecimalChainId(chainId),
        active_currency: { value: selectedAsset?.symbol, anonymous: true },
        gas_estimate_type: gasEstimateType,
        gas_mode: gasSelected ? 'Basic' : 'Advanced',
        speed_set: gasSelected || undefined,
        is_smart_transaction: shouldUseSmartTransaction,
        ...smartTransactionMetricsProperties,
      };
    } catch (error) {
      Logger.error(
        error,
        'Error while getting analytics params for approval screen',
      );
      return baseParams;
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
      this.props.metrics
        .createEventBuilder(MetaMetricsEvents.DAPP_TRANSACTION_CANCELLED)
        .addProperties({
          ...this.getAnalyticsParams(),
          ...this.getBlockaidMetricsParams(),
          ...this.getTransactionMetrics(),
        })
        .build(),
    );
  };

  onLedgerConfirmation = (approve, transactionId, gaParams) => {
    try {
      //manual cancel from UI when transaction is awaiting from ledger confirmation
      if (!approve) {
        //cancelTransaction will change transaction status to reject and throw error from event listener
        //component is being unmounted, error will be unhandled, hence remove listener before cancel
        Engine.controllerMessenger.tryUnsubscribe(
          'TransactionController:transactionFinished',
          this.#transactionFinishedListener,
        );

        this.showWalletConnectNotification();

        this.props.metrics.trackEvent(
          this.props.metrics
            .createEventBuilder(MetaMetricsEvents.DAPP_TRANSACTION_CANCELLED)
            .addProperties(gaParams)
            .build(),
        );
      } else {
        this.showWalletConnectNotification(true);
      }
    } finally {
      this.props.metrics.trackEvent(
        this.props.metrics
          .createEventBuilder(MetaMetricsEvents.DAPP_TRANSACTION_COMPLETED)
          .addProperties(gaParams)
          .build(),
      );
    }
  };

  /**
   * Callback on confirm transaction
   */
  onConfirm = async ({ gasEstimateType, EIP1559GasData, gasSelected }) => {
    const { KeyringController, ApprovalController } = Engine.context;
    const {
      transactions,
      shouldUseSmartTransaction,
      simulationData: { isUpdatedAfterSecurityCheck } = {},
      navigation,
    } = this.props;
    let { transaction } = this.props;
    const { transactionConfirmed } = this.state;
    if (transactionConfirmed) return;

    const isLedgerAccount = isHardwareAccount(transaction.from, [
      ExtendedKeyringTypes.ledger,
    ]);

    if (isUpdatedAfterSecurityCheck) {
      this.setState({ isChangeInSimulationModalOpen: true });

      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.CHANGE_IN_SIMULATION_MODAL,
        params: {
          onProceed: () => {
            this.setState({ isChangeInSimulationModalOpen: false });
            this.setState({ transactionConfirmed: false });
          },
          onReject: () => {
            this.setState({ isChangeInSimulationModalOpen: false });
            this.onCancel();
          },
        },
      });
      return;
    }

    this.setState({ transactionConfirmed: true });

    try {
      transaction = this.prepareTransaction({
        gasEstimateType,
        EIP1559GasData,
      });

      // For STX, don't wait for TxController to get finished event, since it will take some time to get hash for STX
      if (shouldUseSmartTransaction) {
        this.setState({ transactionHandled: true });
        this.props.hideModal();
      }

      this.#transactionFinishedListener =
        Engine.controllerMessenger.subscribeOnceIf(
          'TransactionController:transactionFinished',
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
              Logger.error(
                transactionMeta.error,
                'error while trying to finish a transaction (Approval)',
              );
            }
          },
          (transactionMeta) => transactionMeta.id === transaction.id,
        );

      const fullTx = transactions.find(({ id }) => id === transaction.id);

      if (fullTx.txParams.type !== TransactionEnvelopeType.legacy) {
        // For EIP-1559 transactions, we need to remove gasPrice as it's not compatible
        delete transaction.gasPrice;
      }

      const updatedTx = {
        ...fullTx,
        txParams: {
          ...transaction,
        },
      };

      await updateTransaction(updatedTx);

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
          this.props.metrics
            .createEventBuilder(
              MetaMetricsEvents.QR_HARDWARE_TRANSACTION_CANCELED,
            )
            .build(),
        );
      }
      this.setState({ transactionHandled: false });
    }

    this.props.metrics.trackEvent(
      this.props.metrics
        .createEventBuilder(MetaMetricsEvents.DAPP_TRANSACTION_COMPLETED)
        .addProperties({
          ...this.getAnalyticsParams({
            gasEstimateType,
            gasSelected,
          }),
          ...this.getBlockaidMetricsParams(),
          ...this.getTransactionMetrics(),
        })
        .build(),
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
   * Returns transaction object with gas and gasPrice in hex format, value set to 0 in hex format
   * and to set to selectedAsset address
   *
   * @param {object} transaction - Transaction object
   * @param {object} selectedAsset - Asset object
   */
  prepareTransaction = ({ EIP1559GasData, gasEstimateType }) => {
    const { transaction: rawTransaction } = this.props;
    const { assetType, gas, gasPrice, selectedAsset } = rawTransaction;

    const transaction = {
      ...rawTransaction,
    };

    if (assetType !== 'ETH') {
      transaction.to = selectedAsset.address;
      transaction.value = '0x0';
    }

    const gasDataLegacy = {
      suggestedGasLimitHex: safeBNToHex(gas),
      suggestedGasPriceHex: safeBNToHex(gasPrice),
    };

    return buildTransactionParams({
      gasDataEIP1559: EIP1559GasData,
      gasDataLegacy,
      gasEstimateType,
      transaction,
    });
  };

  getTransactionMetrics = () => {
    const { confirmationMetricsById, transaction } = this.props;
    const { id: transactionId } = transaction;

    // Skip sensitiveProperties for now as it's not supported by mobile Metametrics client
    return confirmationMetricsById[transactionId]?.properties || {};
  };

  render = () => {
    const { dappTransactionModalVisible } = this.props;
    const { mode, transactionConfirmed, isChangeInSimulationModalOpen } =
      this.state;
    const colors = this.context.colors || mockTheme.colors;

    return (
      <Modal
        isVisible={
          dappTransactionModalVisible && !isChangeInSimulationModalOpen
        }
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

const mapStateToProps = (state) => {
  const transaction = getNormalizedTxState(state);
  const chainId = transaction?.chainId;

  return {
    transaction,
    transactions: selectTransactions(state),
    simulationData: selectCurrentTransactionMetadata(state)?.simulationData,
    selectedAddress: selectSelectedInternalAccountFormattedAddress(state),
    networkType: selectProviderTypeByChainId(state, chainId),
    chainId,
    activeTabUrl: getActiveTabUrl(state),
    shouldUseSmartTransaction: selectShouldUseSmartTransaction(state, chainId),
    confirmationMetricsById: selectConfirmationMetrics(state),
    securityAlertResponse: selectCurrentTransactionSecurityAlertResponse(state),
  };
};

const mapDispatchToProps = (dispatch) => ({
  resetTransaction: () => dispatch(resetTransaction()),
});

Approval.contextType = ThemeContext;

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withMetricsAwareness(Approval));
