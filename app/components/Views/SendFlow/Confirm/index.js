import React, { PureComponent } from 'react';
import { baseStyles } from '../../../../styles/common';
import {
  InteractionManager,
  View,
  Alert,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { connect } from 'react-redux';
import { getSendFlowTitle } from '../../../UI/Navbar';
import PropTypes from 'prop-types';
import Eth from 'ethjs-query';
import {
  renderFromWei,
  renderFromTokenMinimalUnit,
  weiToFiat,
  balanceToFiat,
  isDecimal,
  hexToBN,
  BNToHex,
} from '../../../../util/number';
import {
  getTicker,
  decodeTransferData,
  getNormalizedTxState,
} from '../../../../util/transactions';
import StyledButton from '../../../UI/StyledButton';
import { KeyringTypes } from '@metamask/keyring-controller';
import { WalletDevice } from '@metamask/transaction-controller';
import { NetworksChainId } from '@metamask/controller-utils';
import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';
import {
  prepareTransaction,
  resetTransaction,
  setNonce,
  setProposedNonce,
} from '../../../../actions/transaction';
import { getGasLimit } from '../../../../util/custom-gas';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { WALLET_CONNECT_ORIGIN } from '../../../../util/walletconnect';
import CustomNonceModal from '../../../UI/CustomNonceModal';
import NotificationManager from '../../../../core/NotificationManager';
import { strings } from '../../../../../locales/i18n';
import CollectibleMedia from '../../../UI/CollectibleMedia';
import Modal from 'react-native-modal';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import TransactionTypes from '../../../../core/TransactionTypes';
import Analytics from '../../../../core/Analytics/Analytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { shallowEqual, renderShortText } from '../../../../util/general';
import {
  isTestNet,
  getNetworkNonce,
  isMainnetByChainId,
  isMultiLayerFeeNetwork,
  fetchEstimatedMultiLayerL1Fee,
} from '../../../../util/networks';
import Text from '../../../Base/Text';
import AnalyticsV2 from '../../../../util/analyticsV2';
import { addHexPrefix } from 'ethereumjs-util';
import { removeFavoriteCollectible } from '../../../../actions/collectibles';
import { SafeAreaView } from 'react-native-safe-area-context';
import AccountFromToInfoCard from '../../../UI/AccountFromToInfoCard';
import TransactionReview from '../../../UI/TransactionReview/TransactionReviewEIP1559Update';
import CustomNonce from '../../../UI/CustomNonce';
import AppConstants from '../../../../core/AppConstants';
import {
  getAddressAccountType,
  isQRHardwareAccount,
  isHardwareAccount,
} from '../../../../util/address';
import { KEYSTONE_TX_CANCELED } from '../../../../constants/error';
import { ThemeContext, mockTheme } from '../../../../util/theme';
import Routes from '../../../../constants/navigation/Routes';
import { createLedgerTransactionModalNavDetails } from '../../../UI/LedgerModals/LedgerTransactionModal';
import WarningMessage from '../WarningMessage';
import { showAlert } from '../../../../actions/alert';
import ClipboardManager from '../../../../core/ClipboardManager';
import GlobalAlert from '../../../UI/GlobalAlert';
import createStyles from './styles';
import {
  startGasPolling,
  stopGasPolling,
} from '../../../../core/GasPolling/GasPolling';
import {
  selectChainId,
  selectNetwork,
  selectProviderType,
  selectTicker,
} from '../../../../selectors/networkController';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectContractExchangeRates } from '../../../../selectors/tokenRatesController';
import { selectAccounts } from '../../../../selectors/accountTrackerController';
import { selectContractBalances } from '../../../../selectors/tokenBalancesController';
import generateTestId from '../../../../../wdio/utils/generateTestId';
import { COMFIRM_TXN_AMOUNT } from '../../../../../wdio/screen-objects/testIDs/Screens/TransactionConfirm.testIds';
import { isNetworkBuyNativeTokenSupported } from '../../../UI/Ramp/utils';
import { getRampNetworks } from '../../../../reducers/fiatOrders';
import CustomGasModal from '../../../UI/CustomGasModal';
import {
  TXN_CONFIRM_SCREEN,
  TXN_CONFIRM_SEND_BUTTON,
} from '../../../../constants/test-ids';

const EDIT = 'edit';
const EDIT_NONCE = 'edit_nonce';
const REVIEW = 'review';
const POLLING_INTERVAL_ESTIMATED_L1_FEE = 30000;

let intervalIdForEstimatedL1Fee;
//REBASE_CONFIRM
/**
 * View that wraps the wraps the "Send" screen
 */
class Confirm extends PureComponent {
  static propTypes = {
    /**
     * Object that represents the navigator
     */
    navigation: PropTypes.object,
    /**
     * Object that contains navigation props
     */
    route: PropTypes.object,
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
     * Triggers global alert
     */
    showAlert: PropTypes.func,
    /**
     * Boolean that indicates if the network supports buy
     */
    isNativeTokenBuySupported: PropTypes.bool,
  };

  state = {
    gasEstimationReady: false,
    fromSelectedAddress: this.props.transactionState.transaction.from,
    hexDataModalVisible: false,
    warningGasPriceHigh: undefined,
    ready: false,
    transactionValue: undefined,
    transactionValueFiat: undefined,
    errorMessage: undefined,
    mode: REVIEW,
    gasSelected: AppConstants.GAS_OPTIONS.MEDIUM,
    stopUpdateGas: false,
    advancedGasInserted: false,
    EIP1559GasTransaction: {},
    EIP1559GasObject: {},
    legacyGasObject: {},
    legacyGasTransaction: {},
    multiLayerL1FeeTotal: '0x0',
  };

  originIsWalletConnect = this.props.transaction.origin?.startsWith(
    WALLET_CONNECT_ORIGIN,
  );

  originIsMMSDKRemoteConn = this.props.transaction.origin?.startsWith(
    AppConstants.MM_SDK.SDK_REMOTE_ORIGIN,
  );

  setNetworkNonce = async () => {
    const { setNonce, setProposedNonce, transaction } = this.props;
    const proposedNonce = await getNetworkNonce(transaction);
    setNonce(proposedNonce);
    setProposedNonce(proposedNonce);
  };

  getAnalyticsParams = () => {
    try {
      const { selectedAsset, gasEstimateType, chainId } = this.props;
      const { gasSelected, fromSelectedAddress } = this.state;

      return {
        active_currency: { value: selectedAsset?.symbol, anonymous: true },
        account_type: getAddressAccountType(fromSelectedAddress),
        chain_id: chainId,
        gas_estimate_type: gasEstimateType,
        gas_mode: gasSelected ? 'Basic' : 'Advanced',
        speed_set: gasSelected || undefined,
        request_source: this.originIsMMSDKRemoteConn
          ? AppConstants.REQUEST_SOURCES.SDK_REMOTE_CONN
          : this.originIsWalletConnect
          ? AppConstants.REQUEST_SOURCES.WC
          : AppConstants.REQUEST_SOURCES.IN_APP_BROWSER,
      };
    } catch (error) {
      return {};
    }
  };

  updateNavBar = () => {
    const { navigation, route, resetTransaction } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    navigation.setOptions(
      getSendFlowTitle(
        'send.confirm',
        navigation,
        route,
        colors,
        resetTransaction,
      ),
    );
  };

  componentWillUnmount = async () => {
    const {
      contractBalances,
      transactionState: { selectedAsset },
    } = this.props;
    const { TokensController } = Engine.context;
    await stopGasPolling(this.state.pollToken);
    clearInterval(intervalIdForEstimatedL1Fee);

    /**
     * Remove token that was added to the account temporarily
     * Ref.: https://github.com/MetaMask/metamask-mobile/pull/3989#issuecomment-1367558394
     */
    if (selectedAsset.isETH || selectedAsset.tokenId) {
      return;
    }

    const weiBalance = contractBalances[selectedAsset.address];
    if (weiBalance?.isZero()) {
      await TokensController.ignoreTokens([selectedAsset.address]);
    }
  };

  fetchEstimatedL1Fee = async () => {
    const { transaction, chainId } = this.props;
    if (!transaction?.transaction) {
      return;
    }
    try {
      const eth = new Eth(
        Engine.context.NetworkController.getProviderAndBlockTracker().provider,
      );
      const result = await fetchEstimatedMultiLayerL1Fee(eth, {
        txParams: transaction.transaction,
        chainId,
      });
      this.setState({
        multiLayerL1FeeTotal: result,
      });
    } catch (e) {
      Logger.error(e, 'fetchEstimatedMultiLayerL1Fee call failed');
      this.setState({
        multiLayerL1FeeTotal: '0x0',
      });
    }
  };

  componentDidMount = async () => {
    const {
      chainId,
      showCustomNonce,
      navigation,
      providerType,
      isPaymentRequest,
    } = this.props;
    this.updateNavBar();
    this.getGasLimit();

    const pollToken = await startGasPolling(this.state.pollToken);
    this.setState({
      pollToken,
    });
    // For analytics
    AnalyticsV2.trackEvent(
      MetaMetricsEvents.SEND_TRANSACTION_STARTED,
      this.getAnalyticsParams(),
    );

    showCustomNonce && (await this.setNetworkNonce());
    navigation.setParams({ providerType, isPaymentRequest });
    this.parseTransactionDataHeader();
    if (isMultiLayerFeeNetwork(chainId)) {
      this.fetchEstimatedL1Fee();
      intervalIdForEstimatedL1Fee = setInterval(
        this.fetchEstimatedL1Fee,
        POLLING_INTERVAL_ESTIMATED_L1_FEE,
      );
    }
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
    this.updateNavBar();

    if (this.state?.closeModal) this.toggleConfirmationModal(REVIEW);

    const { errorMessage, fromSelectedAddress } = this.state;
    const valueChanged = prevProps.transactionState.transaction.value !== value;
    const fromAddressChanged =
      prevState.fromSelectedAddress !== fromSelectedAddress;
    const previousContractBalance =
      prevProps.contractBalances[selectedAsset.address];
    const newContractBalance = contractBalances[selectedAsset.address];
    const contractBalanceChanged =
      previousContractBalance !== newContractBalance;
    const recipientIsDefined = transactionTo !== undefined;
    if (
      recipientIsDefined &&
      (valueChanged || fromAddressChanged || contractBalanceChanged)
    ) {
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
      const gasEstimateTypeChanged =
        prevProps.gasEstimateType !== this.props.gasEstimateType;
      const gasSelected = gasEstimateTypeChanged
        ? AppConstants.GAS_OPTIONS.MEDIUM
        : this.state.gasSelected;

      if (
        (!this.state.stopUpdateGas && !this.state.advancedGasInserted) ||
        gasEstimateTypeChanged
      ) {
        if (this.props.gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
          // eslint-disable-next-line react/no-did-update-set-state
          this.setState(
            {
              gasEstimationReady: true,
              animateOnChange: true,
              gasSelected,
            },
            () => {
              this.setState({ animateOnChange: false });
            },
          );
        } else if (this.props.gasEstimateType !== GAS_ESTIMATE_TYPES.NONE) {
          this.setError(this.state.legacyGasTransaction.error);
          // eslint-disable-next-line react/no-did-update-set-state
          this.setState(
            {
              gasEstimationReady: true,
              animateOnChange: true,
              gasSelected,
            },
            () => {
              this.setState({ animateOnChange: false });
            },
          );
        }
        this.parseTransactionDataHeader();
      }
    }
  };

  setScrollViewRef = (ref) => {
    this.scrollView = ref;
  };

  toggleConfirmationModal = (MODE) => {
    this.onModeChange(MODE);
    this.setState({ closeModal: false });
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

  getGasLimit = async () => {
    const {
      prepareTransaction,
      transactionState: { transaction },
    } = this.props;
    const estimation = await getGasLimit(transaction, true);
    prepareTransaction({ ...transaction, ...estimation });
  };

  parseTransactionDataHeader = async () => {
    const {
      contractBalances,
      contractExchangeRates,
      conversionRate,
      currentCurrency,
      transactionState: {
        selectedAsset,
        transaction: { value, data },
      },
      ticker,
    } = this.props;

    let transactionValue, transactionValueFiat;
    const valueBN = hexToBN(value);
    const parsedTicker = getTicker(ticker);

    if (selectedAsset.isETH) {
      transactionValue = `${renderFromWei(value)} ${parsedTicker}`;
      transactionValueFiat = weiToFiat(
        valueBN,
        conversionRate,
        currentCurrency,
      );
    } else if (selectedAsset.tokenId) {
      transactionValueFiat = weiToFiat(
        valueBN,
        conversionRate,
        currentCurrency,
      );
    } else {
      const {
        address,
        symbol = 'ERC20',
        decimals,
        image,
        name,
      } = selectedAsset;
      const { TokensController } = Engine.context;

      if (!contractBalances[address]) {
        await TokensController.addToken(address, symbol, decimals, {
          image,
          name,
        });
      }

      const [, , rawAmount] = decodeTransferData('transfer', data);
      const rawAmountString = parseInt(rawAmount, 16).toLocaleString(
        'fullwide',
        { useGrouping: false },
      );
      const transferValue = renderFromTokenMinimalUnit(
        rawAmountString,
        decimals,
      );
      transactionValue = `${transferValue} ${symbol}`;
      const exchangeRate = contractExchangeRates[address];
      transactionValueFiat =
        balanceToFiat(
          transferValue,
          conversionRate,
          exchangeRate,
          currentCurrency,
        ) || `0 ${currentCurrency}`;
    }
    this.setState({
      transactionValue,
      transactionValueFiat,
    });
  };

  prepareTransactionToSend = () => {
    const {
      transactionState: { transaction },
      showCustomNonce,
      gasEstimateType,
    } = this.props;
    const { fromSelectedAddress, legacyGasTransaction, EIP1559GasTransaction } =
      this.state;
    const { nonce } = this.props.transaction;
    const transactionToSend = { ...transaction };

    if (gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
      transactionToSend.gas = EIP1559GasTransaction.gasLimitHex;
      transactionToSend.maxFeePerGas = addHexPrefix(
        EIP1559GasTransaction.suggestedMaxFeePerGasHex,
      ); //'0x2540be400'
      transactionToSend.maxPriorityFeePerGas = addHexPrefix(
        EIP1559GasTransaction.suggestedMaxPriorityFeePerGasHex,
      ); //'0x3b9aca00';
      transactionToSend.estimatedBaseFee = addHexPrefix(
        EIP1559GasTransaction.estimatedBaseFeeHex,
      );
      delete transactionToSend.gasPrice;
    } else {
      transactionToSend.gas = legacyGasTransaction.suggestedGasLimitHex;
      transactionToSend.gasPrice = addHexPrefix(
        legacyGasTransaction.suggestedGasPriceHex,
      );
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
      const { NftController } = Engine.context;
      removeFavoriteCollectible(fromSelectedAddress, chainId, selectedAsset);
      NftController.removeNft(selectedAsset.address, selectedAsset.tokenId);
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
      ticker,
      transactionState: {
        transaction: { value },
      },
    } = this.props;
    const selectedAddress = transaction?.from;
    let weiBalance, weiInput, error;

    if (isDecimal(value)) {
      if (selectedAsset.isETH || selectedAsset.tokenId) {
        weiBalance = hexToBN(accounts[selectedAddress].balance);
        const totalTransactionValue = hexToBN(total);
        if (!weiBalance.gte(totalTransactionValue)) {
          const amount = renderFromWei(totalTransactionValue.sub(weiBalance));
          const tokenSymbol = getTicker(ticker);
          error = strings('transaction.insufficient_amount', {
            amount,
            tokenSymbol,
          });
        }
      } else {
        const [, , amount] = decodeTransferData('transfer', transaction.data);
        weiBalance = contractBalances[selectedAsset.address];
        weiInput = hexToBN(amount);
        error =
          weiBalance && weiBalance.gte(weiInput)
            ? undefined
            : strings('transaction.insufficient_tokens', {
                token: selectedAsset.symbol,
              });
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
    const { TransactionController, KeyringController, ApprovalController } =
      Engine.context;
    const {
      transactionState: { assetType },
      navigation,
      resetTransaction,
      gasEstimateType,
    } = this.props;

    const {
      legacyGasTransaction,
      transactionConfirmed,
      EIP1559GasTransaction,
    } = this.state;
    if (transactionConfirmed) return;
    this.setState({ transactionConfirmed: true, stopUpdateGas: true });
    try {
      const transaction = this.prepareTransactionToSend();
      let error;
      if (gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
        error = this.validateAmount({
          transaction,
          total: EIP1559GasTransaction.totalMaxHex,
        });
      } else {
        error = this.validateAmount({
          transaction,
          total: legacyGasTransaction.totalHex,
        });
      }
      this.setError(error);
      if (error) {
        this.setState({ transactionConfirmed: false, stopUpdateGas: true });
        return;
      }

      const { result, transactionMeta } =
        await TransactionController.addTransaction(
          transaction,
          TransactionTypes.MMM,
          WalletDevice.MM_MOBILE,
        );

      const isLedgerAccount = isHardwareAccount(transaction.from, [
        KeyringTypes.ledger,
      ]);

      const finalizeConfirmation = async (confirmed) => {
        const rejectTransaction = () => {
          if (isLedgerAccount) {
            TransactionController.cancelTransaction(transactionMeta.id);
            TransactionController.hub.removeAllListeners(
              `${transactionMeta.id}:finished`,
            );
          }
          this.setState({ transactionConfirmed: false });
          navigation && navigation.dangerouslyGetParent()?.popToTop();
        };

        if (confirmed === false) {
          // Transaction was rejected by the user
          return rejectTransaction();
        }

        try {
          await new Promise((resolve) => resolve(result));
        } catch (error) {
          // This is the LedgerCode for device rejection
          if (error.message.includes('0x6985')) {
            return rejectTransaction();
          }
        }

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
            MetaMetricsEvents.SEND_TRANSACTION_COMPLETED,
            this.getAnalyticsParams(),
          );
          stopGasPolling();
          resetTransaction();
          navigation && navigation.dangerouslyGetParent()?.pop();
        });
      };

      if (isLedgerAccount) {
        const ledgerKeyring = await KeyringController.getLedgerKeyring();
        // Approve transaction for ledger is called in the Confirmation Flow (modals) after user prompt

        this.props.navigation.navigate(
          ...createLedgerTransactionModalNavDetails({
            transactionId: transactionMeta.id,
            deviceId: ledgerKeyring.deviceId,
            onConfirmationComplete: finalizeConfirmation,
            type: 'signTransaction',
          }),
        );
      } else {
        await KeyringController.resetQRKeyringState();
        await ApprovalController.accept(transactionMeta.id, undefined, {
            waitForResult: true,
        });
        await finalizeConfirmation(true);
      }
    } catch (error) {
      if (!error?.message.startsWith(KEYSTONE_TX_CANCELED)) {
        Alert.alert(
          strings('transactions.transaction_error'),
          error && error.message,
          [{ text: 'OK' }],
        );
        Logger.error(error, 'error while trying to send transaction (Confirm)');
      } else {
        AnalyticsV2.trackEvent(
          MetaMetricsEvents.QR_HARDWARE_TRANSACTION_CANCELED,
        );
      }
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

  onSelectAccount = async (accountAddress) => {
    const { accounts } = this.props;
    // If new account doesn't have the asset
    this.setState({
      fromSelectedAddress: accountAddress,
      balanceIsZero: hexToBN(accounts[accountAddress].balance).isZero(),
    });
    this.parseTransactionDataHeader();
  };

  openAccountSelector = () => {
    const { navigation } = this.props;
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.ACCOUNT_SELECTOR,
      params: {
        isSelectOnly: true,
        onSelectAccount: this.onSelectAccount,
        checkBalanceError: this.getBalanceError,
      },
    });
  };

  toggleHexDataModal = () => {
    const { hexDataModalVisible } = this.state;
    this.setState({ hexDataModalVisible: !hexDataModalVisible });
  };

  renderCustomNonceModal = () => {
    const { setNonce } = this.props;
    const { proposedNonce, nonce } = this.props.transaction;
    return (
      <CustomNonceModal
        proposedNonce={proposedNonce}
        nonceValue={nonce}
        close={() => this.toggleConfirmationModal(REVIEW)}
        save={setNonce}
      />
    );
  };

  handleCopyHex = () => {
    const { data } = this.props.transactionState.transaction;
    ClipboardManager.setString(data);
    this.props.showAlert({
      isVisible: true,
      autodismiss: 1500,
      content: 'clipboard-alert',
      data: { msg: strings('transaction.hex_data_copied') },
    });
  };

  renderHexDataModal = () => {
    const { hexDataModalVisible } = this.state;
    const { data } = this.props.transactionState.transaction;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);
    return (
      <Modal
        isVisible={hexDataModalVisible}
        onBackdropPress={this.toggleHexDataModal}
        onBackButtonPress={this.toggleHexDataModal}
        onSwipeComplete={this.toggleHexDataModal}
        swipeDirection={'down'}
        propagateSwipe
        backdropColor={colors.overlay.default}
        backdropOpacity={1}
      >
        <View style={styles.hexDataWrapper}>
          <TouchableOpacity
            style={styles.hexDataClose}
            onPress={this.toggleHexDataModal}
          >
            <IonicIcon
              name={'ios-close'}
              size={28}
              color={colors.text.default}
            />
          </TouchableOpacity>
          <View style={styles.qrCode}>
            <Text style={styles.addressTitle}>
              {strings('transaction.hex_data')}
            </Text>
            <TouchableOpacity
              disabled={!data}
              activeOpacity={0.8}
              onPress={this.handleCopyHex}
            >
              <Text style={styles.hexDataText}>
                {data || strings('unit.empty_data')}
              </Text>
            </TouchableOpacity>
          </View>
          <GlobalAlert />
        </View>
      </Modal>
    );
  };

  buyEth = () => {
    const { navigation } = this.props;
    try {
      navigation.navigate('FiatOnRampAggregator');
    } catch (error) {
      Logger.error(error, 'Navigation: Error when navigating to buy ETH.');
    }
    InteractionManager.runAfterInteractions(() => {
      Analytics.trackEvent(MetaMetricsEvents.RECEIVE_OPTIONS_PAYMENT_REQUEST);
    });
  };

  goToFaucet = () => {
    InteractionManager.runAfterInteractions(() => {
      this.props.navigation.navigate(Routes.BROWSER.VIEW, {
        newTabUrl: AppConstants.URLS.MM_FAUCET,
        timestamp: Date.now(),
      });
    });
  };

  onUpdatingValuesStart = () => {
    this.setState({ isAnimating: true });
  };
  onUpdatingValuesEnd = () => {
    this.setState({ isAnimating: false });
  };

  updateTransactionState = (gas) => {
    this.setState({
      EIP1559GasTransaction: gas,
      legacyGasTransaction: gas,
    });
  };

  onGasChanged = (gasValue) => {
    this.setState({ gasSelected: gasValue });
  };

  onGasCanceled = (gasValue) => {
    this.setState({
      stopUpdateGas: false,
      gasSelectedTemp: gasValue,
      closeModal: true,
    });
  };

  updateGasState = ({ gasTxn, gasObj, gasSelect, txnType }) => {
    this.setState({
      gasSelectedTemp: gasSelect,
      gasSelected: gasSelect,
      closeModal: true,
      ...(txnType
        ? {
            legacyGasTransaction: gasTxn,
            legacyGasObject: gasObj,
            advancedGasInserted: !gasSelect,
            stopUpdateGas: false,
          }
        : {
            EIP1559GasTransaction: gasTxn,
            EIP1559GasObject: gasObj,
          }),
    });
  };

  render = () => {
    const { selectedAsset, paymentRequest } = this.props.transactionState;
    const {
      showHexData,
      showCustomNonce,
      primaryCurrency,
      network,
      chainId,
      gasEstimateType,
      isNativeTokenBuySupported,
    } = this.props;
    const { nonce } = this.props.transaction;
    const {
      gasEstimationReady,
      fromSelectedAddress,
      transactionValue = '',
      transactionValueFiat = '',
      errorMessage,
      transactionConfirmed,
      warningGasPriceHigh,
      mode,
      isAnimating,
      animateOnChange,
      multiLayerL1FeeTotal,
      gasSelected,
      EIP1559GasObject,
      EIP1559GasTransaction,
      legacyGasObject,
    } = this.state;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);
    const showFeeMarket =
      !gasEstimateType ||
      gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET ||
      gasEstimateType === GAS_ESTIMATE_TYPES.NONE;
    const isQRHardwareWalletDevice = isQRHardwareAccount(fromSelectedAddress);
    const isLedgerAccount = isHardwareAccount(fromSelectedAddress, [
      KeyringTypes.ledger,
    ]);

    const isTestNetwork = isTestNet(network);

    const errorPress = isTestNetwork ? this.goToFaucet : this.buyEth;
    const errorLinkText = isTestNetwork
      ? strings('transaction.go_to_faucet')
      : strings('transaction.buy_more');

    return (
      <SafeAreaView
        edges={['bottom']}
        style={styles.wrapper}
        testID={TXN_CONFIRM_SCREEN}
      >
        <AccountFromToInfoCard
          transactionState={this.props.transactionState}
          onPressFromAddressIcon={
            !paymentRequest ? null : this.openAccountSelector
          }
          layout="vertical"
        />
        <ScrollView style={baseStyles.flexGrow} ref={this.setScrollViewRef}>
          {!selectedAsset.tokenId ? (
            <View style={styles.amountWrapper}>
              <Text style={styles.textAmountLabel}>
                {strings('transaction.amount')}
              </Text>
              <Text
                style={styles.textAmount}
                {...generateTestId(Platform, COMFIRM_TXN_AMOUNT)}
              >
                {transactionValue}
              </Text>
              {isMainnetByChainId(chainId) && (
                <Text style={styles.textAmountLabel}>
                  {transactionValueFiat}
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.amountWrapper}>
              <Text style={styles.textAmountLabel}>
                {strings('transaction.asset')}
              </Text>
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
                  10,
                )}`}</Text>
              </View>
            </View>
          )}
          <TransactionReview
            gasSelected={this.state.gasSelected}
            primaryCurrency={primaryCurrency}
            onEdit={() => this.toggleConfirmationModal(EDIT)}
            onUpdatingValuesStart={this.onUpdatingValuesStart}
            onUpdatingValuesEnd={this.onUpdatingValuesEnd}
            animateOnChange={animateOnChange}
            isAnimating={isAnimating}
            gasEstimationReady={gasEstimationReady}
            chainId={chainId}
            gasObject={!showFeeMarket ? legacyGasObject : EIP1559GasObject}
            updateTransactionState={this.updateTransactionState}
            legacy={!showFeeMarket}
            onlyGas={false}
            multiLayerL1FeeTotal={multiLayerL1FeeTotal}
          />
          {mode === EDIT && (
            <CustomGasModal
              gasSelected={gasSelected}
              animateOnChange={animateOnChange}
              isAnimating={isAnimating}
              legacyGasData={legacyGasObject}
              EIP1559GasData={EIP1559GasObject}
              EIP1559GasTxn={EIP1559GasTransaction}
              onlyGas={false}
              validateAmount={this.validateAmount}
              onGasChanged={this.onGasChanged}
              legacy={!showFeeMarket}
              onGasCanceled={this.onGasCanceled}
              updateGasState={this.updateGasState}
            />
          )}
          {showCustomNonce && (
            <CustomNonce
              nonce={nonce}
              onNonceEdit={() => this.toggleConfirmationModal(EDIT_NONCE)}
            />
          )}

          {errorMessage && (
            <View style={styles.errorWrapper}>
              {isTestNetwork || isNativeTokenBuySupported ? (
                <TouchableOpacity onPress={errorPress}>
                  <Text style={styles.error}>{errorMessage}</Text>
                  <Text style={[styles.error, styles.underline]}>
                    {errorLinkText}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.error}>{errorMessage}</Text>
              )}
            </View>
          )}
          {!!warningGasPriceHigh && (
            <View style={styles.errorWrapper}>
              <Text style={styles.error}>{warningGasPriceHigh}</Text>
            </View>
          )}

          {this.state.gasSelected === AppConstants.GAS_OPTIONS.LOW && (
            <WarningMessage
              style={styles.actionsWrapper}
              warningMessage={strings('edit_gas_fee_eip1559.low_fee_warning')}
            />
          )}

          <View style={styles.actionsWrapper}>
            {showHexData && (
              <TouchableOpacity
                style={styles.actionTouchable}
                onPress={this.toggleHexDataModal}
              >
                <Text style={styles.actionText}>
                  {strings('transaction.hex_data')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
        <View style={styles.buttonNextWrapper}>
          <StyledButton
            type={'confirm'}
            disabled={
              transactionConfirmed ||
              !gasEstimationReady ||
              Boolean(errorMessage) ||
              isAnimating
            }
            containerStyle={styles.buttonNext}
            onPress={this.onNext}
            testID={TXN_CONFIRM_SEND_BUTTON}
          >
            {transactionConfirmed ? (
              <ActivityIndicator size="small" color={colors.primary.inverse} />
            ) : isQRHardwareWalletDevice ? (
              strings('transaction.confirm_with_qr_hardware')
            ) : isLedgerAccount ? (
              strings('transaction.confirm_with_ledger_hardware')
            ) : (
              strings('transaction.send')
            )}
          </StyledButton>
        </View>
        {mode === EDIT_NONCE && this.renderCustomNonceModal()}
        {this.renderHexDataModal()}
      </SafeAreaView>
    );
  };
}

Confirm.contextType = ThemeContext;

const mapStateToProps = (state) => ({
  accounts: selectAccounts(state),
  contractExchangeRates: selectContractExchangeRates(state),
  contractBalances: selectContractBalances(state),
  conversionRate: selectConversionRate(state),
  currentCurrency: selectCurrentCurrency(state),
  network: selectNetwork(state),
  providerType: selectProviderType(state),
  showHexData: state.settings.showHexData,
  showCustomNonce: state.settings.showCustomNonce,
  chainId: selectChainId(state),
  ticker: selectTicker(state),
  transaction: getNormalizedTxState(state),
  selectedAsset: state.transaction.selectedAsset,
  transactionState: state.transaction,
  primaryCurrency: state.settings.primaryCurrency,
  gasFeeEstimates:
    state.engine.backgroundState.GasFeeController.gasFeeEstimates,
  gasEstimateType:
    state.engine.backgroundState.GasFeeController.gasEstimateType,
  isPaymentRequest: state.transaction.paymentRequest,
  isNativeTokenBuySupported: isNetworkBuyNativeTokenSupported(
    selectChainId(state),
    getRampNetworks(state),
  ),
});

const mapDispatchToProps = (dispatch) => ({
  prepareTransaction: (transaction) =>
    dispatch(prepareTransaction(transaction)),
  resetTransaction: () => dispatch(resetTransaction()),
  setNonce: (nonce) => dispatch(setNonce(nonce)),
  setProposedNonce: (nonce) => dispatch(setProposedNonce(nonce)),
  removeFavoriteCollectible: (selectedAddress, chainId, collectible) =>
    dispatch(removeFavoriteCollectible(selectedAddress, chainId, collectible)),
  showAlert: (config) => dispatch(showAlert(config)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Confirm);
