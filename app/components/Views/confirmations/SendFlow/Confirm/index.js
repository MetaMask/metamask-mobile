import React, { PureComponent } from 'react';
import { baseStyles } from '../../../../../styles/common';
import {
  InteractionManager,
  View,
  Alert,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { connect } from 'react-redux';
import { getSendFlowTitle } from '../../../../UI/Navbar';
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
} from '../../../../../util/number';
import {
  getTicker,
  decodeTransferData,
  getNormalizedTxState,
} from '../../../../../util/transactions';
import StyledButton from '../../../../UI/StyledButton';
import { WalletDevice } from '@metamask/transaction-controller';
import { ChainId } from '@metamask/controller-utils';
import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';
import {
  prepareTransaction,
  resetTransaction,
  setNonce,
  setProposedNonce,
  setTransactionId,
} from '../../../../../actions/transaction';
import { getGasLimit } from '../../../../../util/custom-gas';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { WALLET_CONNECT_ORIGIN } from '../../../../../util/walletconnect';
import CustomNonceModal from '../components/CustomNonceModal';
import NotificationManager from '../../../../../core/NotificationManager';
import { strings } from '../../../../../../locales/i18n';
import CollectibleMedia from '../../../../UI/CollectibleMedia';
import Modal from 'react-native-modal';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import TransactionTypes from '../../../../../core/TransactionTypes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { shallowEqual, renderShortText } from '../../../../../util/general';
import {
  isTestNet,
  getNetworkNonce,
  isMainnetByChainId,
  isMultiLayerFeeNetwork,
  fetchEstimatedMultiLayerL1Fee,
  TESTNET_FAUCETS,
  isTestNetworkWithFaucet,
  getDecimalChainId,
} from '../../../../../util/networks';
import Text from '../../../../Base/Text';
import { addHexPrefix } from 'ethereumjs-util';
import { removeFavoriteCollectible } from '../../../../../actions/collectibles';
import { SafeAreaView } from 'react-native-safe-area-context';
import AccountFromToInfoCard from '../../../../UI/AccountFromToInfoCard';
import TransactionReview from '../../components/TransactionReview/TransactionReviewEIP1559Update';
import CustomNonce from '../../components/CustomNonce';
import AppConstants from '../../../../../core/AppConstants';
import {
  getAddressAccountType,
  isQRHardwareAccount,
  isHardwareAccount,
} from '../../../../../util/address';
import { KEYSTONE_TX_CANCELED } from '../../../../../constants/error';
import { ThemeContext, mockTheme } from '../../../../../util/theme';
import Routes from '../../../../../constants/navigation/Routes';
import WarningMessage from '../WarningMessage';
import { showAlert } from '../../../../../actions/alert';
import ClipboardManager from '../../../../../core/ClipboardManager';
import GlobalAlert from '../../../../UI/GlobalAlert';
import createStyles from './styles';
import {
  startGasPolling,
  stopGasPolling,
} from '../../../../../core/GasPolling/GasPolling';
import {
  selectChainId,
  selectProviderType,
  selectTicker,
} from '../../../../../selectors/networkController';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';

import { selectContractExchangeRates } from '../../../../../selectors/tokenRatesController';
import { selectAccounts } from '../../../../../selectors/accountTrackerController';
import { selectContractBalances } from '../../../../../selectors/tokenBalancesController';
import { isNetworkRampNativeTokenSupported } from '../../../../../components/UI/Ramp/utils';
import { getRampNetworks } from '../../../../../reducers/fiatOrders';
import { ConfirmViewSelectorsIDs } from '../../../../../../e2e/selectors/SendFlow/ConfirmView.selectors';
import ExtendedKeyringTypes from '../../../../../constants/keyringTypes';
import { getLedgerKeyring } from '../../../../../core/Ledger/Ledger';
import {
  getBlockaidTransactionMetricsParams,
  isBlockaidFeatureEnabled,
} from '../../../../../util/blockaid';
import ppomUtil from '../../../../../lib/ppom/ppom-util';
import TransactionBlockaidBanner from '../../components/TransactionBlockaidBanner/TransactionBlockaidBanner';
import { createLedgerTransactionModalNavDetails } from '../../../../../components/UI/LedgerModals/LedgerTransactionModal';
import CustomGasModal from './components/CustomGasModal';
import { ResultType } from '../../components/BlockaidBanner/BlockaidBanner.types';
import { withMetricsAwareness } from '../../../../../components/hooks/useMetrics';
import { selectTransactionGasFeeEstimates } from '../../../../../selectors/confirmTransaction';
import { selectGasFeeControllerEstimateType } from '../../../../../selectors/gasFeeController';
import { updateTransaction } from '../../../../../util/transaction-controller';
import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import { STX_NO_HASH_ERROR } from '../../../../../util/smart-transactions/smart-publish-hook';
import { getSmartTransactionMetricsProperties } from '../../../../../util/smart-transactions';
import { TransactionConfirmViewSelectorsIDs } from '../../../../../../e2e/selectors/TransactionConfirmView.selectors.js';

const EDIT = 'edit';
const EDIT_NONCE = 'edit_nonce';
const REVIEW = 'review';
const POLLING_INTERVAL_ESTIMATED_L1_FEE = 30000;

let intervalIdForEstimatedL1Fee;

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
    /**
     * Metrics injected by withMetricsAwareness HOC
     */
    metrics: PropTypes.object,
    /**
     * Set transaction ID
     */
    setTransactionId: PropTypes.func,
    /**
     * Boolean that indicates if smart transaction should be used
     */
    shouldUseSmartTransaction: PropTypes.bool,
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
    result: {},
    transactionMeta: {},
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

  getAnalyticsParams = (transactionMeta) => {
    try {
      const {
        selectedAsset,
        gasEstimateType,
        chainId,
        shouldUseSmartTransaction,
      } = this.props;
      const { gasSelected, fromSelectedAddress } = this.state;
      const { SmartTransactionsController } = Engine.context;

      const smartTransactionMetricsProperties =
        getSmartTransactionMetricsProperties(
          SmartTransactionsController,
          transactionMeta,
        );

      return {
        active_currency: { value: selectedAsset?.symbol, anonymous: true },
        account_type: getAddressAccountType(fromSelectedAddress),
        chain_id: getDecimalChainId(chainId),
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

  updateNavBar = () => {
    const { navigation, route, resetTransaction, transaction } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    navigation.setOptions(
      getSendFlowTitle(
        'send.confirm',
        navigation,
        route,
        colors,
        resetTransaction,
        transaction,
      ),
    );
  };

  componentWillUnmount = async () => {
    const {
      contractBalances,
      transactionState: { selectedAsset },
    } = this.props;

    const { transactionMeta } = this.state;
    const { TokensController } = Engine.context;
    await stopGasPolling(this.state.pollToken);
    clearInterval(intervalIdForEstimatedL1Fee);

    Engine.rejectPendingApproval(transactionMeta.id, undefined, {
      ignoreMissing: true,
      logErrors: false,
    });

    /**
     * Remove token that was added to the account temporarily
     * Ref.: https://github.com/MetaMask/metamask-mobile/pull/3989#issuecomment-1367558394
     */
    if (
      selectedAsset.isETH ||
      selectedAsset.tokenId ||
      !selectedAsset.address
    ) {
      return;
    }

    const weiBalance = hexToBN(contractBalances[selectedAsset.address]);
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
      setTransactionId,
    } = this.props;

    const {
      from,
      transactionTo: to,
      transactionValue: value,
      data,
    } = this.props.transaction;

    this.updateNavBar();
    this.getGasLimit();

    const pollToken = await startGasPolling(this.state.pollToken);
    this.setState({
      pollToken,
    });
    // For analytics
    this.props.metrics.trackEvent(
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
    // add transaction
    const { TransactionController } = Engine.context;
    const { result, transactionMeta } =
      await TransactionController.addTransaction(this.props.transaction, {
        deviceConfirmedOn: WalletDevice.MM_MOBILE,
        origin: TransactionTypes.MMM,
      });

    setTransactionId(transactionMeta.id);

    this.setState({ result, transactionMeta });

    if (isBlockaidFeatureEnabled()) {
      // start validate ppom
      const id = transactionMeta.id;
      const reqObject = {
        id,
        jsonrpc: '2.0',
        method: 'eth_sendTransaction',
        origin: TransactionTypes.MM,
        params: [
          {
            from,
            to,
            value,
            data,
          },
        ],
      };

      ppomUtil.validateRequest(reqObject, id);
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

    const transaction = this.prepareTransactionToSend();
    const { EIP1559GasTransaction, legacyGasTransaction } = this.state;

    let error;

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
      (!prevProps.gasFeeEstimates ||
        !shallowEqual(prevProps.gasFeeEstimates, this.props.gasFeeEstimates) ||
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
          error = this.validateAmount({
            transaction,
            total: EIP1559GasTransaction.totalMaxHex,
          });
          this.setError(error);
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
        } else {
          error = this.validateAmount({
            transaction,
            total: legacyGasTransaction.totalHex,
          });
          this.setError(error);
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
      this.props.metrics.trackEvent(
        MetaMetricsEvents.SEND_FLOW_ADJUSTS_TRANSACTION_FEE,
      );
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
        await TokensController.addToken({
          address,
          symbol,
          decimals,
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
    if (assetType === 'ERC721' && chainId !== ChainId.mainnet) {
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

        weiBalance = hexToBN(contractBalances[selectedAsset.address]);

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

  onLedgerConfirmation = async (
    approve,
    result,
    transactionMeta,
    assetType,
    gaParams,
  ) => {
    const { TransactionController } = Engine.context;
    const { navigation } = this.props;
    // Manual cancel from UI or rejected from ledger device.
    try {
      if (!approve) {
        TransactionController.hub.removeAllListeners(
          `${transactionMeta.id}:finished`,
        );
        TransactionController.cancelTransaction(transactionMeta.id);
      } else {
        await new Promise((resolve) => resolve(result));

        if (transactionMeta.error) {
          throw transactionMeta.error;
        }

        InteractionManager.runAfterInteractions(() => {
          NotificationManager.watchSubmittedTransaction({
            ...transactionMeta,
            assetType,
          });
          this.checkRemoveCollectible();
          this.props.metrics.trackEvent(
            MetaMetricsEvents.SEND_TRANSACTION_COMPLETED,
            gaParams,
          );
          stopGasPolling();
          resetTransaction();
        });
      }
    } finally {
      // Error handling derived to LedgerConfirmationModal component
      navigation && navigation.dangerouslyGetParent()?.popToTop();
    }
  };

  onNext = async () => {
    const { KeyringController, ApprovalController } = Engine.context;
    const {
      transactionState: { assetType },
      navigation,
      resetTransaction,
      gasEstimateType,
      shouldUseSmartTransaction,
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

      const { result, transactionMeta } = this.state;

      await this.persistTransactionParameters(transaction);

      const isLedgerAccount = isHardwareAccount(transaction.from, [
        ExtendedKeyringTypes.ledger,
      ]);

      if (isLedgerAccount) {
        const ledgerKeyring = await getLedgerKeyring();
        this.setState({ transactionConfirmed: false });
        // Approve transaction for ledger is called in the Confirmation Flow (modals) after user prompt
        this.props.navigation.navigate(
          ...createLedgerTransactionModalNavDetails({
            transactionId: transactionMeta.id,
            deviceId: ledgerKeyring.deviceId,
            onConfirmationComplete: async (approve) =>
              await this.onLedgerConfirmation(
                approve,
                result,
                transactionMeta,
                assetType,
                {
                  ...this.getAnalyticsParams(),
                  ...getBlockaidTransactionMetricsParams(transaction),
                },
              ),
            type: 'signTransaction',
          }),
        );
        return;
      }

      await KeyringController.resetQRKeyringState();

      if (shouldUseSmartTransaction) {
        await ApprovalController.accept(transactionMeta.id, undefined, {
          waitForResult: false,
        });
        navigation && navigation.dangerouslyGetParent()?.pop();
      } else {
        await ApprovalController.accept(transactionMeta.id, undefined, {
          waitForResult: true,
        });
      }

      await new Promise((resolve) => resolve(result));

      if (transactionMeta.error) {
        throw transactionMeta.error;
      }

      InteractionManager.runAfterInteractions(() => {
        NotificationManager.watchSubmittedTransaction({
          ...transactionMeta,
          assetType,
        });
        this.checkRemoveCollectible();
        this.props.metrics.trackEvent(
          MetaMetricsEvents.SEND_TRANSACTION_COMPLETED,
          {
            ...this.getAnalyticsParams(transactionMeta),
            ...getBlockaidTransactionMetricsParams(transaction),
          },
        );
        stopGasPolling();
        resetTransaction();

        if (!shouldUseSmartTransaction) {
          // We popped it already earlier
          navigation && navigation.dangerouslyGetParent()?.pop();
        }
      });
    } catch (error) {
      if (
        !error?.message.startsWith(KEYSTONE_TX_CANCELED) &&
        !error?.message.startsWith(STX_NO_HASH_ERROR)
      ) {
        Alert.alert(
          strings('transactions.transaction_error'),
          error && error.message,
          [{ text: 'OK' }],
        );
        Logger.error(error, 'error while trying to send transaction (Confirm)');
      } else {
        this.props.metrics.trackEvent(
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

  updateTransactionStateWithUpdatedNonce = (nonceValue) => {
    this.props.setNonce(nonceValue);
  };

  renderCustomNonceModal = () => {
    const { proposedNonce, nonce } = this.props.transaction;
    return (
      <CustomNonceModal
        proposedNonce={proposedNonce}
        nonceValue={nonce}
        close={() => this.toggleConfirmationModal(REVIEW)}
        save={this.updateTransactionStateWithUpdatedNonce}
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
      navigation.navigate(Routes.RAMP.BUY);
    } catch (error) {
      Logger.error(error, 'Navigation: Error when navigating to buy ETH.');
    }

    this.props.metrics.trackEvent(
      MetaMetricsEvents.RECEIVE_OPTIONS_PAYMENT_REQUEST,
    );
  };

  goToFaucet = () => {
    const { chainId } = this.props;
    InteractionManager.runAfterInteractions(() => {
      this.props.navigation.navigate(Routes.BROWSER.VIEW, {
        newTabUrl: TESTNET_FAUCETS[chainId],
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

  onContactUsClicked = () => {
    const { transaction } = this.props;
    const analyticsParams = {
      ...this.getAnalyticsParams(),
      ...getBlockaidTransactionMetricsParams(transaction),
      external_link_clicked: 'security_alert_support_link',
    };
    this.props.metrics.trackEvent(
      MetaMetricsEvents.CONTRACT_ADDRESS_COPIED,
      analyticsParams,
    );
  };

  getConfirmButtonStyles() {
    const { transactionMeta } = this.state;
    const { transaction } = this.props;
    const { currentTransactionSecurityAlertResponse } = transaction;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    let confirmButtonStyle = {};
    if (
      transactionMeta.id &&
      currentTransactionSecurityAlertResponse?.id &&
      currentTransactionSecurityAlertResponse.id === transactionMeta.id
    ) {
      if (
        currentTransactionSecurityAlertResponse?.response?.result_type ===
        ResultType.Malicious
      ) {
        confirmButtonStyle = styles.confirmButtonError;
      } else if (
        currentTransactionSecurityAlertResponse?.response?.result_type ===
        ResultType.Warning
      ) {
        confirmButtonStyle = styles.confirmButtonWarning;
      }
    }
    return confirmButtonStyle;
  }

  async persistTransactionParameters(transactionParams) {
    const { TransactionController } = Engine.context;
    const { transactionMeta } = this.state;
    const { id: transactionId } = transactionMeta;

    const controllerTransactionMeta =
      TransactionController.state.transactions.find(
        (tx) => tx.id === transactionId,
      );

    const updatedTx = {
      ...controllerTransactionMeta,
      txParams: {
        ...transactionParams,
        chainId: controllerTransactionMeta.chainId,
      },
    };
    await updateTransaction(updatedTx);
  }

  render = () => {
    const { selectedAsset, paymentRequest } = this.props.transactionState;
    const {
      showHexData,
      showCustomNonce,
      primaryCurrency,
      chainId,
      gasEstimateType,
      isNativeTokenBuySupported,
      shouldUseSmartTransaction,
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
      ExtendedKeyringTypes.ledger,
    ]);

    const isTestNetwork = isTestNet(chainId);

    const errorPress = isTestNetwork ? this.goToFaucet : this.buyEth;
    const errorLinkText = isTestNetwork
      ? strings('transaction.go_to_faucet')
      : strings('transaction.buy_more');

    return (
      <SafeAreaView
        edges={['bottom']}
        style={styles.wrapper}
        testID={ConfirmViewSelectorsIDs.CONTAINER}
      >
        <AccountFromToInfoCard
          transactionState={this.props.transactionState}
          onPressFromAddressIcon={
            !paymentRequest ? null : this.openAccountSelector
          }
          layout="vertical"
        />
        <ScrollView style={baseStyles.flexGrow} ref={this.setScrollViewRef}>
          {isBlockaidFeatureEnabled() && this.state.transactionMeta?.id && (
            <TransactionBlockaidBanner
              transactionId={this.state.transactionMeta.id}
              style={styles.blockaidBanner}
              onContactUsClicked={this.onContactUsClicked}
            />
          )}
          {!selectedAsset.tokenId ? (
            <View style={styles.amountWrapper}>
              <Text style={styles.textAmountLabel}>
                {strings('transaction.amount')}
              </Text>
              <Text
                style={styles.textAmount}
                testID={TransactionConfirmViewSelectorsIDs.COMFIRM_TXN_AMOUNT}
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
            gasObject={EIP1559GasObject}
            gasObjectLegacy={legacyGasObject}
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
          {showCustomNonce && !shouldUseSmartTransaction && (
            <CustomNonce
              nonce={nonce}
              onNonceEdit={() => this.toggleConfirmationModal(EDIT_NONCE)}
            />
          )}

          {errorMessage && (
            <View style={styles.errorWrapper}>
              {isTestNetworkWithFaucet(chainId) || isNativeTokenBuySupported ? (
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
            containerStyle={[styles.buttonNext, this.getConfirmButtonStyles()]}
            onPress={this.onNext}
            testID={ConfirmViewSelectorsIDs.SEND_BUTTON}
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
  providerType: selectProviderType(state),
  showHexData: state.settings.showHexData,
  showCustomNonce: state.settings.showCustomNonce,
  chainId: selectChainId(state),
  ticker: selectTicker(state),
  transaction: getNormalizedTxState(state),
  selectedAsset: state.transaction.selectedAsset,
  transactionState: state.transaction,
  primaryCurrency: state.settings.primaryCurrency,
  gasFeeEstimates: selectTransactionGasFeeEstimates(state),
  gasEstimateType: selectGasFeeControllerEstimateType(state),
  isPaymentRequest: state.transaction.paymentRequest,
  securityAlertResponse:
    state.transaction.currentTransactionSecurityAlertResponse,
  isNativeTokenBuySupported: isNetworkRampNativeTokenSupported(
    selectChainId(state),
    getRampNetworks(state),
  ),
  shouldUseSmartTransaction: selectShouldUseSmartTransaction(state),
});

const mapDispatchToProps = (dispatch) => ({
  prepareTransaction: (transaction) =>
    dispatch(prepareTransaction(transaction)),
  resetTransaction: () => dispatch(resetTransaction()),
  setTransactionId: (transactionId) =>
    dispatch(setTransactionId(transactionId)),
  setNonce: (nonce) => dispatch(setNonce(nonce)),
  setProposedNonce: (nonce) => dispatch(setProposedNonce(nonce)),
  removeFavoriteCollectible: (selectedAddress, chainId, collectible) =>
    dispatch(removeFavoriteCollectible(selectedAddress, chainId, collectible)),
  showAlert: (config) => dispatch(showAlert(config)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withMetricsAwareness(Confirm));
