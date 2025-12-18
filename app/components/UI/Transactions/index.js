import { providerErrors } from '@metamask/rpc-errors';
import { CANCEL_RATE, SPEED_UP_RATE } from '@metamask/transaction-controller';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import {
  ActivityIndicator,
  FlatList,
  InteractionManager,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Modal from 'react-native-modal';
import { connect } from 'react-redux';
import { ActivitiesViewSelectorsIDs } from '../../../../e2e/selectors/Transactions/ActivitiesView.selectors';
import { strings } from '../../../../locales/i18n';
import { showAlert } from '../../../actions/alert';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import { NO_RPC_BLOCK_EXPLORER, RPC } from '../../../constants/network';
import Engine from '../../../core/Engine';
import { getDeviceId } from '../../../core/Ledger/Ledger';
import { isNonEvmChainId } from '../../../core/Multichain/utils';
import NotificationManager from '../../../core/NotificationManager';
import { TransactionError } from '../../../core/Transaction/TransactionError';
import { collectibleContractsSelector } from '../../../reducers/collectibles';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { selectAccounts } from '../../../selectors/accountTrackerController';
import { selectGasFeeEstimates } from '../../../selectors/confirmTransaction';
import { selectCurrentCurrency } from '../../../selectors/currencyRateController';
import { selectGasFeeControllerEstimateType } from '../../../selectors/gasFeeController';
import {
  selectChainId,
  selectNetworkClientId,
  selectNetworkConfigurations,
  selectProviderConfig,
  selectProviderType,
} from '../../../selectors/networkController';
import { selectPrimaryCurrency } from '../../../selectors/settings';
import { baseStyles, fontStyles } from '../../../styles/common';
import { isHardwareAccount } from '../../../util/address';
import { decGWEIToHexWEI } from '../../../util/conversions';
import Device from '../../../util/device';
import Logger from '../../../util/Logger';
import {
  findBlockExplorerForNonEvmChainId,
  findBlockExplorerForRpc,
  getBlockExplorerAddressUrl,
  getBlockExplorerName,
} from '../../../util/networks';
import { addHexPrefix, hexToBN, renderFromWei } from '../../../util/number';
import { mockTheme, ThemeContext } from '../../../util/theme';
import {
  speedUpTransaction,
  updateIncomingTransactions,
} from '../../../util/transaction-controller';
import { validateTransactionActionBalance } from '../../../util/transactions';
import { createLedgerTransactionModalNavDetails } from '../../UI/LedgerModals/LedgerTransactionModal';
import UpdateEIP1559Tx from '../../Views/confirmations/legacy/components/UpdateEIP1559Tx';
import PriceChartContext, {
  PriceChartProvider,
} from '../AssetOverview/PriceChart/PriceChart.context';
import withQRHardwareAwareness from '../QRHardware/withQRHardwareAwareness';
import TransactionActionModal from '../TransactionActionModal';
import TransactionElement from '../TransactionElement';
import RetryModal from './RetryModal';
import TransactionsFooter from './TransactionsFooter';
import { filterDuplicateOutgoingTransactions } from './utils';
import { selectMultichainAccountsState2Enabled } from '../../../selectors/featureFlagController/multichainAccounts';
import { TabEmptyState } from '../../../component-library/components-temp/TabEmptyState';

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    listContentContainer: {
      paddingBottom: 80,
    },
    bottomModal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    emptyContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 24,
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
      color: colors.text.muted,
      ...fontStyles.normal,
    },
    textTransactions: {
      fontSize: 20,
      color: colors.text.muted,
      textAlign: 'center',
      marginLeft: 6,
      marginRight: 6,
      ...fontStyles.normal,
    },
  });

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
     * Network configurations
     */
    networkConfigurations: PropTypes.object,
    /**
    /* navigation object required to push new views
    */
    navigation: PropTypes.object,
    /**
     * Object representing the configuration of the current selected network
     */
    providerConfig: PropTypes.object,
    /**
     * An array that represents the user collectible contracts
     */
    collectibleContracts: PropTypes.array,
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
     * Currency code of the currently-active currency
     */
    currentCurrency: PropTypes.string,
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
    isSigningQRObject: PropTypes.bool,
    chainId: PropTypes.string,
    /**
     * On scroll past navbar callback
     */
    onScrollThroughContent: PropTypes.func,
    gasFeeEstimates: PropTypes.object,
    /**
     * Chain ID of the token
     */
    tokenChainId: PropTypes.string,
    /**
     * Whether multichain accounts state 2 is enabled
     */
    isMultichainAccountsState2Enabled: PropTypes.bool,
  };

  static defaultProps = {
    headerHeight: 0,
  };

  state = {
    selectedTx: new Map(),
    ready: false,
    refreshing: false,
    cancelIsOpen: false,
    cancel1559IsOpen: false,
    cancelConfirmDisabled: false,
    speedUpIsOpen: false,
    speedUp1559IsOpen: false,
    retryIsOpen: false,
    speedUpConfirmDisabled: false,
    rpcBlockExplorer: undefined,
    errorMsg: undefined,
    isQRHardwareAccount: false,
    isLedgerAccount: false,
  };

  existingGas = null;
  existingTx = null;
  cancelTxId = null;
  speedUpTxId = null;
  selectedTx = null;

  flatList = React.createRef();

  get isNonEvmChain() {
    return isNonEvmChainId(this.props.chainId);
  }

  get isTokenNonEvmChain() {
    return isNonEvmChainId(this.props.tokenChainId);
  }

  componentDidMount = () => {
    this.mounted = true;
    setTimeout(() => {
      this.mounted && this.setState({ ready: true });
      this.init();
      this.props.onRefSet && this.props.onRefSet(this.flatList);
    }, 100);
    this.setState({
      isQRHardwareAccount: isHardwareAccount(this.props.selectedAddress),
    });
  };

  componentWillUnmount() {
    this.mounted = false;
  }

  updateBlockExplorer = () => {
    const {
      providerConfig: { type, rpcUrl },
      networkConfigurations,
      chainId,
    } = this.props;
    let blockExplorer;
    if (type === RPC) {
      blockExplorer =
        findBlockExplorerForRpc(rpcUrl, networkConfigurations) ||
        NO_RPC_BLOCK_EXPLORER;
    } else if (this.isNonEvmChain) {
      // TODO: [SOLANA] - block explorer needs to be implemented
      blockExplorer = findBlockExplorerForNonEvmChainId(chainId);
    }

    this.setState({ rpcBlockExplorer: blockExplorer });
    this.setState({
      isQRHardwareAccount: isHardwareAccount(this.props.selectedAddress, [
        ExtendedKeyringTypes.qr,
      ]),
      isLedgerAccount: isHardwareAccount(this.props.selectedAddress, [
        ExtendedKeyringTypes.ledger,
      ]),
    });
  };

  componentDidUpdate() {
    this.updateBlockExplorer();
    if (
      this.props.confirmedTransactions.some(
        ({ id }) => id === this.existingTx?.id,
      )
    ) {
      this.onSpeedUpCompleted();
      this.onCancelCompleted();
    }
  }

  init() {
    this.mounted && this.setState({ ready: true });
    const txToView = NotificationManager.getTransactionToView();
    if (txToView) {
      setTimeout(() => {
        const index = this.props.transactions.findIndex(
          (tx) => txToView === tx.id,
        );
        if (index >= 0) {
          this.toggleDetailsView(txToView, index);
        }
      }, 1000);
    }
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

  // TODO: we should delete this is dead code.
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

    await updateIncomingTransactions();

    this.setState({ refreshing: false });
  };

  renderLoader = () => {
    const { colors } = this.context || mockTheme;
    const styles = createStyles(colors);

    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator style={styles.loader} size="small" />
      </View>
    );
  };

  renderEmpty = () => {
    const { colors } = this.context || mockTheme;
    const styles = createStyles(colors);

    const shouldShowSwitchNetwork = () => {
      if (this.props.isMultichainAccountsState2Enabled) {
        return false;
      }
      if (!this.props.tokenChainId || !this.props.chainId) {
        return false;
      }

      if (this.isNonEvmChain || this.isTokenNonEvmChain) {
        return this.props.tokenChainId !== this.props.chainId;
      }

      return this.props.tokenChainId !== this.props.chainId;
    };

    if (shouldShowSwitchNetwork()) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.textTransactions}>
            {strings('wallet.switch_network_to_view_transactions')}
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <TabEmptyState description={strings('wallet.no_transactions')} />
      </View>
    );
  };

  viewOnBlockExplore = () => {
    const {
      navigation,
      providerConfig: { type },
      selectedAddress,
      close,
      chainId,
    } = this.props;
    const { rpcBlockExplorer } = this.state;
    try {
      let url, title;

      if (this.isNonEvmChain && rpcBlockExplorer) {
        url = `${rpcBlockExplorer}/address/${selectedAddress}`;
        title = getBlockExplorerName(rpcBlockExplorer);
      } else {
        const result = getBlockExplorerAddressUrl(
          type,
          selectedAddress,
          rpcBlockExplorer,
        );
        url = result.url;
        title = result.title;
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
      Logger.error(e, {
        message: `can't get a block explorer link for network `,
        type,
      });
    }
  };

  getItemLayout = (_data, index) => ({
    length: ROW_HEIGHT,
    offset: this.props.headerHeight + ROW_HEIGHT * index,
    index,
  });

  keyExtractor = (item) => item.id.toString();

  onSpeedUpAction = (speedUpAction, existingGas, tx) => {
    this.existingGas = existingGas;
    this.speedUpTxId = tx.id;
    this.existingTx = tx;
    if (existingGas.isEIP1559Transaction) {
      this.setState({ speedUp1559IsOpen: speedUpAction });
    } else {
      const speedUpConfirmDisabled = validateTransactionActionBalance(
        tx,
        SPEED_UP_RATE,
        this.props.accounts,
      );
      this.setState({ speedUpIsOpen: speedUpAction, speedUpConfirmDisabled });
    }
  };

  onSpeedUpCompleted = () => {
    this.setState({ speedUp1559IsOpen: false, speedUpIsOpen: false });
    this.existingGas = null;
    this.speedUpTxId = null;
    this.existingTx = null;
  };

  onCancelAction = (cancelAction, existingGas, tx) => {
    this.existingGas = existingGas;
    this.cancelTxId = tx.id;
    this.existingTx = tx;

    if (existingGas.isEIP1559Transaction) {
      this.setState({ cancel1559IsOpen: cancelAction });
    } else {
      const cancelConfirmDisabled = validateTransactionActionBalance(
        tx,
        CANCEL_RATE,
        this.props.accounts,
      );
      this.setState({ cancelIsOpen: cancelAction, cancelConfirmDisabled });
    }
  };

  onCancelCompleted = () => {
    this.setState({ cancel1559IsOpen: false, cancelIsOpen: false });
    this.existingGas = null;
    this.cancelTxId = null;
    this.existingTx = null;
  };

  onScroll = (event) => {
    const { nativeEvent } = event;
    const { contentOffset } = nativeEvent;
    // 16 is the top padding of the list
    if (this.props.onScrollThroughContent) {
      this.props.onScrollThroughContent(contentOffset.y);
    }
  };

  handleSpeedUpTransactionFailure = (e) => {
    const speedUpTxId = this.speedUpTxId;
    const message = e instanceof TransactionError ? e.message : undefined;
    Logger.error(e, { message: `speedUpTransaction failed `, speedUpTxId });
    InteractionManager.runAfterInteractions(this.toggleRetry(message));
    this.setState({
      speedUp1559IsOpen: false,
      speedUpIsOpen: false,
    });
  };

  handleCancelTransactionFailure = (e) => {
    const cancelTxId = this.cancelTxId;
    const message = e instanceof TransactionError ? e.message : undefined;
    Logger.error(e, { message: `cancelTransaction failed `, cancelTxId });
    InteractionManager.runAfterInteractions(this.toggleRetry(message));
    this.setState({
      cancel1559IsOpen: false,
      cancelIsOpen: false,
    });
  };

  speedUpTransaction = async (transactionObject) => {
    try {
      if (transactionObject?.error) {
        // We don't need to throw an error here because the error is already in the UI
        return;
      }

      const isLedgerAccount = isHardwareAccount(this.props.selectedAddress, [
        ExtendedKeyringTypes.ledger,
      ]);

      if (isLedgerAccount) {
        await this.signLedgerTransaction({
          id: this.speedUpTxId,
          replacementParams: {
            type: 'speedUp',
            eip1559GasFee: {
              maxFeePerGas: `0x${transactionObject?.suggestedMaxFeePerGasHex}`,
              maxPriorityFeePerGas: `0x${transactionObject?.suggestedMaxPriorityFeePerGasHex}`,
            },
          },
        });
      } else {
        await speedUpTransaction(
          this.speedUpTxId,
          this.getCancelOrSpeedupValues(transactionObject),
        );
      }
      this.onSpeedUpCompleted();
    } catch (e) {
      this.handleSpeedUpTransactionFailure(e);
    }
  };

  signQRTransaction = async (tx) => {
    const { ApprovalController } = Engine.context;
    await ApprovalController.accept(tx.id, undefined, { waitForResult: true });
  };

  signLedgerTransaction = async (transaction) => {
    const deviceId = await getDeviceId();

    const onConfirmation = (isComplete) => {
      if (isComplete) {
        transaction.speedUpParams &&
        transaction.speedUpParams?.type === 'SpeedUp'
          ? this.onSpeedUpCompleted()
          : this.onCancelCompleted();
      }
    };

    this.props.navigation.navigate(
      ...createLedgerTransactionModalNavDetails({
        transactionId: transaction.id,
        deviceId,
        onConfirmationComplete: onConfirmation,
        type: 'signTransaction',
        replacementParams: transaction?.replacementParams,
      }),
    );
  };

  cancelUnsignedQRTransaction = async (tx) => {
    await Engine.context.ApprovalController.reject(
      tx.id,
      providerErrors.userRejectedRequest(),
    );
  };

  cancelTransaction = async (transactionObject) => {
    try {
      if (transactionObject?.error) {
        // We don't need to throw an error here because the error is already in the UI
        return;
      }

      const isLedgerAccount = isHardwareAccount(this.props.selectedAddress, [
        ExtendedKeyringTypes.ledger,
      ]);

      if (isLedgerAccount) {
        await this.signLedgerTransaction({
          id: this.cancelTxId,
          replacementParams: {
            type: 'cancel',
            eip1559GasFee: {
              maxFeePerGas: `0x${transactionObject?.suggestedMaxFeePerGasHex}`,
              maxPriorityFeePerGas: `0x${transactionObject?.suggestedMaxPriorityFeePerGasHex}`,
            },
          },
        });
      } else {
        await Engine.context.TransactionController.stopTransaction(
          this.cancelTxId,
          this.getCancelOrSpeedupValues(transactionObject),
        );
      }
      this.onCancelCompleted();
    } catch (e) {
      this.handleCancelTransactionFailure(e);
    }
  };

  renderItem = ({ item, index }) => (
    <TransactionElement
      tx={item}
      i={index}
      assetSymbol={this.props.assetSymbol}
      onSpeedUpAction={this.onSpeedUpAction}
      isQRHardwareAccount={this.state.isQRHardwareAccount}
      isLedgerAccount={this.state.isLedgerAccount}
      signQRTransaction={this.signQRTransaction}
      signLedgerTransaction={this.signLedgerTransaction}
      cancelUnsignedQRTransaction={this.cancelUnsignedQRTransaction}
      onCancelAction={this.onCancelAction}
      onPressItem={this.toggleDetailsView}
      selectedAddress={this.props.selectedAddress}
      collectibleContracts={this.props.collectibleContracts}
      exchangeRate={this.props.exchangeRate}
      currentCurrency={this.props.currentCurrency}
      navigation={this.props.navigation}
      txChainId={item.chainId}
    />
  );

  toggleRetry = (errorMsg) =>
    this.setState((state) => ({ retryIsOpen: !state.retryIsOpen, errorMsg }));

  retry = () => {
    this.setState((state) => ({
      retryIsOpen: !state.retryIsOpen,
      errorMsg: undefined,
    }));

    //If the exitsing TX id true then it is a speed up retry
    if (this.speedUpTxId) {
      InteractionManager.runAfterInteractions(() => {
        this.onSpeedUpAction(true, this.existingGas, this.existingTx);
      });
    }
    if (this.cancelTxId) {
      InteractionManager.runAfterInteractions(() => {
        this.onCancelAction(true, this.existingGas, this.existingTx);
      });
    }
  };

  renderUpdateTxEIP1559Gas = (isCancel) => {
    const { isSigningQRObject } = this.props;
    const { colors } = this.context || mockTheme;
    const styles = createStyles(colors);

    if (!this.existingGas) return null;
    if (this.existingGas.isEIP1559Transaction && !isSigningQRObject) {
      return (
        <Modal
          isVisible
          animationIn="slideInUp"
          animationOut="slideOutDown"
          style={styles.bottomModal}
          backdropColor={colors.overlay.default}
          backdropOpacity={1}
          animationInTiming={600}
          animationOutTiming={600}
          onBackdropPress={
            isCancel ? this.onCancelCompleted : this.onSpeedUpCompleted
          }
          onBackButtonPress={
            isCancel ? this.onCancelCompleted : this.onSpeedUpCompleted
          }
          onSwipeComplete={
            isCancel ? this.onCancelCompleted : this.onSpeedUpCompleted
          }
          swipeDirection={'down'}
          propagateSwipe
        >
          <KeyboardAwareScrollView
            contentContainerStyle={styles.keyboardAwareWrapper}
          >
            <UpdateEIP1559Tx
              gas={this.existingTx.txParams.gas}
              onSave={
                isCancel ? this.cancelTransaction : this.speedUpTransaction
              }
              onCancel={
                isCancel ? this.onCancelCompleted : this.onSpeedUpCompleted
              }
              existingGas={this.existingGas}
              isCancel={isCancel}
            />
          </KeyboardAwareScrollView>
        </Modal>
      );
    }
  };

  get footer() {
    const {
      chainId,
      providerConfig: { type },
    } = this.props;

    return (
      <TransactionsFooter
        chainId={chainId}
        providerType={type}
        rpcBlockExplorer={this.state.rpcBlockExplorer}
        isNonEvmChain={this.isNonEvmChain}
        onViewBlockExplorer={this.viewOnBlockExplore}
        showDisclaimer
      />
    );
  }

  renderList = () => {
    const {
      submittedTransactions,
      confirmedTransactions,
      header,
      isSigningQRObject,
    } = this.props;
    const { cancelConfirmDisabled, speedUpConfirmDisabled } = this.state;
    const { colors } = this.context || mockTheme;
    const styles = createStyles(colors);

    const transactions =
      submittedTransactions && submittedTransactions.length
        ? submittedTransactions
            .sort((a, b) => b.time - a.time)
            .concat(confirmedTransactions)
        : this.props.transactions;

    const filteredTransactions =
      filterDuplicateOutgoingTransactions(transactions);

    const renderRetryGas = (rate) => {
      if (!this.existingGas) return null;

      if (this.existingGas.isEIP1559Transaction) return null;

      const gasPrice = this.existingGas.gasPrice;

      const increasedGasPrice =
        gasPrice === 0
          ? hexToBN(this.getGasPriceEstimate())
          : Math.floor(gasPrice * rate);

      return `${renderFromWei(increasedGasPrice)} ${strings('unit.eth')}`;
    };

    const renderSpeedUpGas = () => renderRetryGas(SPEED_UP_RATE);
    const renderCancelGas = () => renderRetryGas(CANCEL_RATE);

    return (
      <View style={styles.wrapper}>
        <PriceChartContext.Consumer>
          {({ isChartBeingTouched }) => (
            <FlatList
              testID={ActivitiesViewSelectorsIDs.CONTAINER}
              ref={this.flatList}
              getItemLayout={this.getItemLayout}
              data={filteredTransactions}
              extraData={this.state}
              keyExtractor={this.keyExtractor}
              refreshControl={
                <RefreshControl
                  colors={[colors.primary.default]}
                  tintColor={colors.icon.default}
                  refreshing={this.state.refreshing}
                  onRefresh={this.onRefresh}
                />
              }
              renderItem={this.renderItem}
              initialNumToRender={10}
              maxToRenderPerBatch={2}
              onEndReachedThreshold={0.5}
              ListHeaderComponent={header}
              ListFooterComponent={
                filteredTransactions.length > 0
                  ? this.footer
                  : this.renderEmpty()
              }
              contentContainerStyle={styles.listContentContainer}
              style={baseStyles.flexGrow}
              scrollIndicatorInsets={{ right: 1 }}
              onScroll={this.onScroll}
              scrollEnabled={!isChartBeingTouched}
            />
          )}
        </PriceChartContext.Consumer>

        {!isSigningQRObject && this.state.cancelIsOpen && (
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
        )}
        {!isSigningQRObject && this.state.speedUpIsOpen && (
          <TransactionActionModal
            isVisible={this.state.speedUpIsOpen && !isSigningQRObject}
            confirmDisabled={speedUpConfirmDisabled}
            onCancelPress={this.onSpeedUpCompleted}
            onConfirmPress={this.speedUpTransaction}
            confirmText={strings('transaction.lets_try')}
            confirmButtonMode={'confirm'}
            cancelText={strings('transaction.nevermind')}
            feeText={renderSpeedUpGas()}
            titleText={strings('transaction.speedup_tx_title')}
            gasTitleText={strings('transaction.gas_speedup_fee')}
            descriptionText={strings('transaction.speedup_tx_message')}
          />
        )}
      </View>
    );
  };

  render = () => {
    const { colors } = this.context || mockTheme;
    const styles = createStyles(colors);

    return (
      <PriceChartProvider>
        <View style={styles.wrapper}>
          {!this.state.ready || this.props.loading
            ? this.renderLoader()
            : this.renderList()}
          {(this.state.speedUp1559IsOpen || this.state.cancel1559IsOpen) &&
            this.renderUpdateTxEIP1559Gas(this.state.cancel1559IsOpen)}
        </View>
        <RetryModal
          onCancelPress={() => this.toggleRetry(undefined)}
          onConfirmPress={this.retry}
          retryIsOpen={this.state.retryIsOpen}
          errorMsg={this.state.errorMsg}
        />
      </PriceChartProvider>
    );
  };

  getCancelOrSpeedupValues(transactionObject) {
    const { suggestedMaxFeePerGasHex, suggestedMaxPriorityFeePerGasHex } =
      transactionObject ?? {};

    if (suggestedMaxFeePerGasHex) {
      return {
        maxFeePerGas: `0x${suggestedMaxFeePerGasHex}`,
        maxPriorityFeePerGas: `0x${suggestedMaxPriorityFeePerGasHex}`,
      };
    }

    if (this.existingGas.gasPrice !== 0) {
      // Transaction controller will multiply existing gas price by the rate.
      return undefined;
    }

    return { gasPrice: this.getGasPriceEstimate() };
  }

  getGasPriceEstimate() {
    const { gasFeeEstimates } = this.props;

    const estimateGweiDecimal =
      gasFeeEstimates?.medium?.suggestedMaxFeePerGas ??
      gasFeeEstimates?.medium ??
      gasFeeEstimates.gasPrice ??
      '0';

    return addHexPrefix(decGWEIToHexWEI(estimateGweiDecimal));
  }
}

const mapStateToProps = (state) => ({
  accounts: selectAccounts(state),
  chainId: selectChainId(state),
  networkClientId: selectNetworkClientId(state),
  collectibleContracts: collectibleContractsSelector(state),
  currentCurrency: selectCurrentCurrency(state),
  selectedAddress: selectSelectedInternalAccountFormattedAddress(state),
  networkConfigurations: selectNetworkConfigurations(state),
  providerConfig: selectProviderConfig(state),
  gasFeeEstimates: selectGasFeeEstimates(state),
  primaryCurrency: selectPrimaryCurrency(state),
  gasEstimateType: selectGasFeeControllerEstimateType(state),
  networkType: selectProviderType(state),
  isMultichainAccountsState2Enabled:
    selectMultichainAccountsState2Enabled(state),
});

Transactions.contextType = ThemeContext;

const mapDispatchToProps = (dispatch) => ({
  showAlert: (config) => dispatch(showAlert(config)),
});

export { Transactions as UnconnectedTransactions };

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withQRHardwareAwareness(Transactions));
