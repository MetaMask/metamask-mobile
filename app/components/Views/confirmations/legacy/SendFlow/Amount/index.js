import React, { PureComponent } from 'react';
import { fontStyles } from '../../../../../../styles/common';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  FlatList,
  InteractionManager,
  ScrollView,
} from 'react-native';
import { connect } from 'react-redux';
import {
  setSelectedAsset,
  prepareTransaction,
  resetTransaction,
  setMaxValueMode,
} from '../../../../../../actions/transaction';
import { getSendFlowTitle } from '../../../../../UI/Navbar';
import StyledButton from '../../../../../UI/StyledButton';
import PropTypes from 'prop-types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Modal from 'react-native-modal';
import TokenImage from '../../../../../UI/TokenImage';
import {
  renderFromTokenMinimalUnit,
  balanceToFiat,
  renderFromWei,
  weiToFiat,
  fromWei,
  toWei,
  isDecimal,
  toTokenMinimalUnit,
  fiatNumberToWei,
  fiatNumberToTokenMinimalUnit,
  weiToFiatNumber,
  balanceToFiatNumber,
  getCurrencySymbol,
  handleWeiNumber,
  fromTokenMinimalUnitString,
  toHexadecimal,
  hexToBN,
  formatValueToMatchTokenDecimals,
} from '../../../../../../util/number';
import {
  getTicker,
  generateTransferData,
  getEther,
  calculateEIP1559GasFeeHexes,
} from '../../../../../../util/transactions';
import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';
import { BNToHex } from '@metamask/controller-utils';
import ErrorMessage from '../ErrorMessage';
import { getGasLimit } from '../../../../../../util/custom-gas';
import Engine from '../../../../../../core/Engine';
import CollectibleMedia from '../../../../../UI/CollectibleMedia';
import collectiblesTransferInformation from '../../../../../../util/collectibles-transfer';
import { strings } from '../../../../../../../locales/i18n';
import Device from '../../../../../../util/device';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import dismissKeyboard from 'react-native/Libraries/Utilities/dismissKeyboard';
import NetworkMainAssetLogo from '../../../../../UI/NetworkMainAssetLogo';
import { renderShortText } from '../../../../../../util/general';
import { SafeAreaView } from 'react-native-safe-area-context';
import { decGWEIToHexWEI } from '../../../../../../util/conversions';
import AppConstants from '../../../../../../core/AppConstants';
import {
  collectibleContractsSelector,
  collectiblesSelector,
} from '../../../../../../reducers/collectibles';
import { gte } from '../../../../../../util/lodash';
import { ThemeContext, mockTheme } from '../../../../../../util/theme';
import Alert, { AlertType } from '../../../../../Base/Alert';

import {
  selectConversionRateByChainId,
  selectCurrentCurrency,
} from '../../../../../../selectors/currencyRateController';
import {
  selectTokens,
  selectAllTokens,
} from '../../../../../../selectors/tokensController';
import {
  selectAccounts,
  selectAccountsByContextualChainId,
} from '../../../../../../selectors/accountTrackerController';
import {
  selectContractBalances,
  selectAllTokenBalances,
  selectContractBalancesByContextualChainId,
} from '../../../../../../selectors/tokenBalancesController';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import Routes from '../../../../../../constants/navigation/Routes';
import { getRampNetworks } from '../../../../../../reducers/fiatOrders';
import { swapsLivenessSelector } from '../../../../../../reducers/swaps';
import { isSwapsAllowed } from '../../../../../UI/Swaps/utils';
import { swapsUtils } from '@metamask/swaps-controller';
import { regex } from '../../../../../../util/regex';
import { AmountViewSelectorsIDs } from '../../../../../../../e2e/selectors/SendFlow/AmountView.selectors';
import { isNetworkRampNativeTokenSupported } from '../../../../../UI/Ramp/Aggregator/utils';
import { addTransaction } from '../../../../../../util/transaction-controller';
import { withMetricsAwareness } from '../../../../../../components/hooks/useMetrics';
import { selectGasFeeEstimates } from '../../../../../../selectors/confirmTransaction';
import { selectGasFeeControllerEstimateType } from '../../../../../../selectors/gasFeeController';
import { createBuyNavigationDetails } from '../../../../../UI/Ramp/Aggregator/routes/utils';
import {
  // Pending updated multichain UX to specify the send chain.
  /* eslint-disable no-restricted-syntax */
  selectEvmChainId,
  selectNetworkClientId,
  /* eslint-enable no-restricted-syntax */
  selectNativeCurrencyByChainId,
  selectProviderTypeByChainId,
  selectNetworkConfigurationByChainId,
  selectNetworkConfigurations,
} from '../../../../../../selectors/networkController';
import { selectContractExchangeRatesByChainId } from '../../../../../../selectors/tokenRatesController';
import { isNativeToken } from '../../../utils/generic';
import { selectConfirmationRedesignFlags } from '../../../../../../selectors/featureFlagController/confirmations';
import { MMM_ORIGIN } from '../../../constants/confirmations';
import { selectSendFlowContextualChainId } from '../../../../../../selectors/sendFlow';
import { isRemoveGlobalNetworkSelectorEnabled } from '../../../../../../util/networks';
import { setTransactionSendFlowContextualChainId } from '../../../../../../actions/sendFlow';
import { selectNetworkImageSourceByChainId } from '../../../../../../selectors/networkInfos';
import ContextualNetworkPicker from '../../../../../UI/ContextualNetworkPicker/ContextualNetworkPicker';

const KEYBOARD_OFFSET = Device.isSmallDevice() ? 80 : 120;

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    scrollWrapper: {
      marginBottom: 60,
    },
    buttonNextWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    buttonNext: {
      flex: 1,
      marginHorizontal: 24,
    },
    inputWrapper: {
      flex: 1,
      marginTop: 30,
      marginHorizontal: 24,
    },
    actionsWrapper: {
      flexDirection: 'row',
    },
    action: {
      flex: 1,
      alignItems: 'center',
    },
    actionBorder: {
      flex: 0.8,
    },
    actionDropdown: {
      ...fontStyles.normal,
      backgroundColor: colors.primary.default,
      paddingHorizontal: 16,
      paddingVertical: 2,
      borderRadius: 100,
      flexDirection: 'row',
      alignItems: 'center',
    },
    textDropdown: {
      ...fontStyles.normal,
      fontSize: 14,
      color: colors.primary.inverse,
      paddingVertical: 2,
    },
    iconDropdown: {
      paddingLeft: 10,
    },
    maxText: {
      ...fontStyles.normal,
      fontSize: 12,
      color: colors.primary.default,
      alignSelf: 'flex-end',
      textTransform: 'uppercase',
    },
    maxTextDisabled: {
      ...fontStyles.normal,
      fontSize: 12,
      color: colors.text.alternative,
      alignSelf: 'flex-end',
      textTransform: 'uppercase',
    },
    actionMax: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    actionMaxTouchable: {},
    inputContainerWrapper: {
      marginVertical: 16,
      alignItems: 'center',
    },
    inputContainer: {
      flexDirection: 'row',
    },
    inputCurrencyText: {
      ...fontStyles.light,
      color: colors.text.default,
      fontSize: 44,
      marginRight: 8,
      paddingVertical: Device.isIos() ? 0 : 8,
      justifyContent: 'center',
      alignItems: 'center',
      textTransform: 'uppercase',
    },
    textInput: {
      ...fontStyles.light,
      fontSize: 44,
      textAlign: 'center',
      color: colors.text.default,
    },
    switch: {
      flex: 1,
      marginTop: Device.isIos() ? 0 : 2,
    },
    actionSwitch: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      flexDirection: 'row',
      borderColor: colors.text.alternative,
      borderWidth: 1,
      right: -2,
    },
    textSwitch: {
      ...fontStyles.normal,
      fontSize: 14,
      color: colors.text.alternative,
      textTransform: 'uppercase',
    },
    switchWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    bottomModal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    tokenImage: {
      width: 36,
      height: 36,
      overflow: 'hidden',
    },
    assetElementWrapper: {
      height: 70,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border.muted,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    assetElement: {
      flexDirection: 'row',
      flex: 1,
    },
    assetsModalWrapper: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      height: 450,
    },
    titleWrapper: {
      width: '100%',
      height: 33,
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border.muted,
    },
    dragger: {
      width: 48,
      height: 5,
      borderRadius: 4,
      backgroundColor: colors.border.default,
    },
    textAssetTitle: {
      ...fontStyles.normal,
      fontSize: 18,
      color: colors.text.default,
    },
    assetInformationWrapper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginLeft: 16,
    },
    assetBalanceWrapper: {
      flexDirection: 'column',
    },
    textAssetBalance: {
      ...fontStyles.normal,
      fontSize: 18,
      textAlign: 'right',
      color: colors.text.default,
    },
    textAssetFiat: {
      ...fontStyles.normal,
      fontSize: 12,
      color: colors.text.alternative,
      textAlign: 'right',
      textTransform: 'uppercase',
    },
    errorMessageWrapper: {
      marginVertical: 16,
    },
    errorBuyWrapper: {
      marginHorizontal: 24,
      marginTop: 12,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: colors.error.muted,
      borderColor: colors.error.default,
      borderRadius: 8,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    CollectibleMedia: {
      width: 120,
      height: 120,
    },
    collectibleName: {
      ...fontStyles.normal,
      fontSize: 32,
      color: colors.text.alternative,
      textAlign: 'center',
    },
    collectibleId: {
      ...fontStyles.normal,
      fontSize: 14,
      color: colors.text.alternative,
      marginTop: 8,
      textAlign: 'center',
    },
    collectibleInputWrapper: {
      margin: 24,
    },
    collectibleInputImageWrapper: {
      flexDirection: 'column',
      alignItems: 'center',
    },
    collectibleInputInformationWrapper: {
      marginTop: 12,
    },
    nextActionWrapper: {
      flex: 1,
      marginBottom: 16,
    },
    balanceWrapper: {
      marginVertical: 16,
    },
    balanceText: {
      ...fontStyles.normal,
      alignSelf: 'center',
      fontSize: 12,
      lineHeight: 16,
      color: colors.text.default,
    },
    warningTextContainer: {
      lineHeight: 20,
      paddingLeft: 4,
    },
    warningText: {
      lineHeight: 20,
      color: colors.text.default,
    },
    warningContainer: {
      marginTop: 20,
      marginHorizontal: 20,
    },
    swapOrBuyButton: { width: '100%', marginTop: 16 },
    error: {
      color: colors.text.default,
      fontSize: 12,
      lineHeight: 16,
      ...fontStyles.normal,
      textAlign: 'center',
    },
    underline: {
      textDecorationLine: 'underline',
      ...fontStyles.bold,
    },
  });

/**
 * View that wraps the wraps the "Send" screen
 */
class Amount extends PureComponent {
  static propTypes = {
    /**
     * Map of accounts to information objects including balances
     */
    accounts: PropTypes.object,
    /**
     * Array of collectible objects
     */
    collectibles: PropTypes.array,
    /**
     * An array that represents the user collectible contracts
     */
    collectibleContracts: PropTypes.array,
    /**
     * Object containing token balances in the format address => balance
     */
    contractBalances: PropTypes.object,
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
     * Object that represents the navigator
     */
    navigation: PropTypes.object,
    /**
     * Object that contains navigation props
     */
    route: PropTypes.object,
    /**
     * A string that represents the selected address
     */
    selectedAddress: PropTypes.string,
    /**
     * An array that represents the user tokens
     */
    tokens: PropTypes.array,
    /**
     * Current provider ticker
     */
    ticker: PropTypes.string,
    /**
     * Set selected in transaction state
     */
    setSelectedAsset: PropTypes.func,
    /**
     * Set transaction object to be sent
     */
    prepareTransaction: PropTypes.func,
    /**
     * Primary currency, either ETH or Fiat
     */
    primaryCurrency: PropTypes.string,
    /**
     * Selected asset from current transaction state
     */
    selectedAsset: PropTypes.object,
    /**
     * Current transaction state
     */
    transactionState: PropTypes.object,
    /**
     * Network provider type as mainnet
     */
    providerType: PropTypes.string,
    /**
     * function to call when the 'Next' button is clicked
     */
    onConfirm: PropTypes.func,
    /**
     * Indicates whether the current transaction is a deep link transaction
     */
    isPaymentRequest: PropTypes.bool,
    /**
     * Resets transaction state
     */
    resetTransaction: PropTypes.func,
    /**
     * Boolean that indicates if the network supports buy
     */
    isNetworkBuyNativeTokenSupported: PropTypes.bool,
    /**
     * Boolean that indicates if the swap is live
     */
    swapsIsLive: PropTypes.bool,
    /**
     * String that indicates the current chain id
     */
    globalChainId: PropTypes.string,
    /**
     * Metrics injected by withMetricsAwareness HOC
     */
    metrics: PropTypes.object,
    /**
     * Gas fee estimates for the transaction.
     */
    gasFeeEstimates: PropTypes.object,
    /**
     * Type of gas fee estimate provided by the gas fee controller.
     */
    gasEstimateType: PropTypes.string,
    /**
     * Function that sets the max value mode
     */
    setMaxValueMode: PropTypes.func,
    /**
     * Network client id
     */
    globalNetworkClientId: PropTypes.string,
    /**
     * Boolean that indicates if the redesigned transfer confirmation is enabled
     */
    isRedesignedTransferConfirmationEnabledForTransfer: PropTypes.bool,
    /**
     * Object containing token balances in the format address => balance by contextual chain id
     */
    contractBalancesByContextualChainId: PropTypes.object,
    /**
     * Send flow contextual chain id
     */
    contextualChainId: PropTypes.string,
    /**
     * All token balances
     */
    allTokenBalances: PropTypes.object,
    /**
     * Accounts by contextual chain id
     */
    accountsByContextualChainId: PropTypes.object,
    /**
     * Send flow contextual network configuration
     */
    contextualNetworkConfiguration: PropTypes.object,
    /**
     * Object containing token exchange rates in the format address => exchangeRate by contextual chain id
     */
    contractExchangeRatesByContextualChainId: PropTypes.object,
    /**
     * Current provider ticker by contextual chain id
     */
    tickerByContextualChainId: PropTypes.string,
    /**
     * All tokens by chain id
     */
    allTokensByChainId: PropTypes.object,
    /**
     * Network name
     */
    networkName: PropTypes.string,
    /**
     * Network image source
     */
    networkImageSource: PropTypes.object,
  };

  state = {
    amountError: undefined,
    inputValue: undefined,
    inputValueConversion: undefined,
    displayableInputValueConversion: undefined,
    assetsModalVisible: false,
    internalPrimaryCurrencyIsCrypto: this.props.primaryCurrency === 'ETH',
    estimatedTotalGas: undefined,
    hasExchangeRate: false,
    isRedesignedTransferTransactionLoading: false,
  };

  amountInput = React.createRef();
  tokens = [];
  collectibles = [];

  updateNavBar = () => {
    const { navigation, route, resetTransaction } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    navigation.setOptions(
      getSendFlowTitle(
        'send.amount',
        navigation,
        route,
        colors,
        resetTransaction,
        null,
      ),
    );
  };

  componentDidMount = async () => {
    const {
      tokens,
      ticker,
      transactionState: { readableValue },
      navigation,
      providerType,
      selectedAsset,
      isPaymentRequest,
      gasEstimateType,
      gasFeeEstimates,
      allTokensByChainId,
      selectedAddress,
      contextualChainId,
      tickerByContextualChainId,
    } = this.props;
    // For analytics
    this.updateNavBar();
    navigation.setParams({
      providerType,
      isPaymentRequest,
    });
    const allTokensByChainIdAndAddress =
      allTokensByChainId?.[contextualChainId]?.[
        selectedAddress?.toLowerCase()
      ] ?? [];
    const tokensToRender = isRemoveGlobalNetworkSelectorEnabled()
      ? allTokensByChainIdAndAddress
      : tokens;
    const currentTicker = isRemoveGlobalNetworkSelectorEnabled()
      ? tickerByContextualChainId
      : ticker;

    this.tokens = [getEther(currentTicker), ...tokensToRender];

    this.collectibles = this.processCollectibles();
    // Wait until navigation finishes to focus
    InteractionManager.runAfterInteractions(() =>
      this.amountInput?.current?.focus?.(),
    );
    this.onInputChange(readableValue);
    !selectedAsset.tokenId && this.handleSelectedAssetBalance(selectedAsset);

    const [gas] = await Promise.all([this.estimateGasLimit()]);

    if (gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
      const mediumGasFeeEstimates =
        gasFeeEstimates[AppConstants.GAS_OPTIONS.MEDIUM];
      const estimatedBaseFeeHex = decGWEIToHexWEI(
        gasFeeEstimates.estimatedBaseFee,
      );
      const suggestedMaxPriorityFeePerGasHex = decGWEIToHexWEI(
        mediumGasFeeEstimates.suggestedMaxPriorityFeePerGas,
      );
      const suggestedMaxFeePerGasHex = decGWEIToHexWEI(
        mediumGasFeeEstimates.suggestedMaxFeePerGas,
      );
      const gasLimitHex = BNToHex(gas);
      const gasHexes = calculateEIP1559GasFeeHexes({
        gasLimitHex,
        estimatedBaseFeeHex,
        suggestedMaxFeePerGasHex,
        suggestedMaxPriorityFeePerGasHex,
      });
      this.setState({
        estimatedTotalGas: hexToBN(gasHexes.gasFeeMaxHex),
      });
    } else if (gasEstimateType === GAS_ESTIMATE_TYPES.LEGACY) {
      const gasPrice = hexToBN(
        decGWEIToHexWEI(gasFeeEstimates[AppConstants.GAS_OPTIONS.MEDIUM]),
      );
      this.setState({ estimatedTotalGas: gas.mul(gasPrice) });
    } else {
      const gasPrice = hexToBN(decGWEIToHexWEI(gasFeeEstimates.gasPrice));
      this.setState({ estimatedTotalGas: gas.mul(gasPrice) });
    }

    const hasExchangeRate = this.hasExchangeRate();
    let internalPrimaryCurrencyIsCrypto =
      this.state.internalPrimaryCurrencyIsCrypto;

    // Default to crypto if exchange rate is not available while on Fiat primary currency
    if (this.props.primaryCurrency === 'Fiat' && !hasExchangeRate) {
      internalPrimaryCurrencyIsCrypto = true;
    }

    this.setState({
      inputValue: readableValue,
      internalPrimaryCurrencyIsCrypto,
      hasExchangeRate,
    });
  };

  componentDidUpdate = () => {
    this.updateNavBar();
  };

  hasExchangeRate = () => {
    const {
      selectedAsset,
      conversionRate,
      contractExchangeRates,
      contractExchangeRatesByContextualChainId,
    } = this.props;
    if (isNativeToken(selectedAsset)) {
      return !!conversionRate;
    }
    const globallySelectedExchangeRate =
      contractExchangeRates?.[selectedAsset.address]?.price ?? null;
    const contextuallySelectedExchangeRate =
      contractExchangeRatesByContextualChainId?.[selectedAsset.address]
        ?.price ?? null;
    const exchangeRate = isRemoveGlobalNetworkSelectorEnabled()
      ? contextuallySelectedExchangeRate
      : globallySelectedExchangeRate;

    return !!exchangeRate;
  };

  /**
   * Method to validate collectible ownership.
   *
   * @returns Promise that resolves ownership as a boolean.
   */
  validateCollectibleOwnership = async () => {
    const { NftController } = Engine.context;
    const {
      transactionState: {
        selectedAsset: { address, tokenId },
      },
      selectedAddress,
      globalNetworkClientId,
    } = this.props;
    try {
      return await NftController.isNftOwner(
        selectedAddress,
        address,
        tokenId,
        globalNetworkClientId,
      );
    } catch (e) {
      return false;
    }
  };

  onNext = async () => {
    const {
      navigation,
      selectedAsset,
      transactionState: { transaction },
      providerType,
      onConfirm,
      globalNetworkClientId,
      isRedesignedTransferConfirmationEnabledForTransfer,
      contextualNetworkConfiguration,
      conversionRate,
    } = this.props;
    const {
      inputValue,
      inputValueConversion,
      internalPrimaryCurrencyIsCrypto,
      maxFiatInput,
    } = this.state;

    let value;
    if (internalPrimaryCurrencyIsCrypto) {
      value = inputValue;
    } else {
      value = inputValueConversion;
      if (maxFiatInput) {
        value = `${renderFromWei(
          fiatNumberToWei(handleWeiNumber(maxFiatInput), conversionRate),
          18,
        )}`;
      }
    }
    if (value && value.includes(',')) {
      value = inputValue.replace(',', '.');
    }

    value = formatValueToMatchTokenDecimals(value, selectedAsset.decimals);
    if (
      !selectedAsset.tokenId &&
      this.validateAmount(value, internalPrimaryCurrencyIsCrypto)
    ) {
      return;
    } else if (selectedAsset.tokenId) {
      const isOwner = await this.validateCollectibleOwnership();
      if (!isOwner) {
        this.setState({
          amountError: strings('transaction.invalid_collectible_ownership'),
        });
        dismissKeyboard();
        return;
      }
    }

    await this.prepareTransaction(value);

    this.props.metrics.trackEvent(
      this.props.metrics
        .createEventBuilder(MetaMetricsEvents.SEND_FLOW_ADDS_AMOUNT)
        .addProperties({ network: providerType })
        .build(),
    );

    const shouldUseRedesignedTransferConfirmation =
      isRedesignedTransferConfirmationEnabledForTransfer;

    if (onConfirm) {
      onConfirm();
    } else if (shouldUseRedesignedTransferConfirmation) {
      this.setState({ isRedesignedTransferTransactionLoading: true });

      const transactionParams = {
        data: transaction.data,
        from: transaction.from,
        to: transaction.to,
        value:
          typeof transaction.value === 'string'
            ? transaction.value
            : BNToHex(transaction.value),
      };

      const { rpcEndpoints, defaultRpcEndpointIndex } =
        contextualNetworkConfiguration;
      const { networkClientId: sendFlowContextualNetworkClientId } =
        rpcEndpoints[defaultRpcEndpointIndex];

      const effectiveNetworkClientId =
        sendFlowContextualNetworkClientId || globalNetworkClientId;
      const currentNetworkClientId = isRemoveGlobalNetworkSelectorEnabled()
        ? effectiveNetworkClientId
        : globalNetworkClientId;

      await addTransaction(transactionParams, {
        origin: MMM_ORIGIN,
        networkClientId: currentNetworkClientId,
      });
      this.setState({ isRedesignedTransferTransactionLoading: false });
      navigation.navigate('SendFlowView', {
        screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      });
    } else {
      navigation.navigate(Routes.SEND_FLOW.CONFIRM);
    }
  };

  getCollectibleTransferTransactionProperties() {
    const {
      selectedAsset,
      transactionState: { transaction, transactionTo },
    } = this.props;

    const collectibleTransferTransactionProperties = {};

    const collectibleTransferInformation =
      collectiblesTransferInformation[selectedAsset.address.toLowerCase()];
    if (
      !collectibleTransferInformation ||
      (collectibleTransferInformation.tradable &&
        collectibleTransferInformation.method === 'transferFrom')
    ) {
      collectibleTransferTransactionProperties.data = generateTransferData(
        'transferFrom',
        {
          fromAddress: transaction.from,
          toAddress: transactionTo,
          tokenId: toHexadecimal(selectedAsset.tokenId),
        },
      );
    } else if (
      collectibleTransferInformation.tradable &&
      collectibleTransferInformation.method === 'transfer'
    ) {
      collectibleTransferTransactionProperties.data = generateTransferData(
        'transfer',
        {
          toAddress: transactionTo,
          amount: selectedAsset.tokenId.toString(16),
        },
      );
    }
    collectibleTransferTransactionProperties.to = selectedAsset.address;
    collectibleTransferTransactionProperties.value = '0x0';

    return collectibleTransferTransactionProperties;
  }

  prepareTransaction = async (value) => {
    const {
      prepareTransaction,
      selectedAsset,
      transactionState: { transaction, transactionTo },
    } = this.props;

    if (isNativeToken(selectedAsset)) {
      transaction.data = '0x';
      transaction.to = transactionTo;
      transaction.value = BNToHex(toWei(value));
    } else if (selectedAsset.tokenId) {
      const collectibleTransferTransactionProperties =
        this.getCollectibleTransferTransactionProperties();
      transaction.data = collectibleTransferTransactionProperties.data;
      transaction.to = collectibleTransferTransactionProperties.to;
      transaction.value = collectibleTransferTransactionProperties.value;
    } else {
      const tokenAmount = toTokenMinimalUnit(value, selectedAsset.decimals);
      transaction.data = generateTransferData('transfer', {
        toAddress: transactionTo,
        amount: BNToHex(tokenAmount),
      });
      transaction.to = selectedAsset.address;
      transaction.value = '0x0';
    }
    prepareTransaction(transaction);
  };

  /**
   * Validates crypto value only
   *
   * @param {string} - Crypto value
   * @returns - Whether there is an error with the amount
   */
  validateAmount = (inputValue, internalPrimaryCurrencyIsCrypto) => {
    const {
      accounts,
      selectedAddress,
      selectedAsset,
      contractBalances,
      allTokenBalances,
      accountsByContextualChainId,
      contextualChainId,
    } = this.props;
    const { estimatedTotalGas, inputValueConversion } = this.state;
    let value = inputValue;

    if (!internalPrimaryCurrencyIsCrypto) {
      value = inputValueConversion;
    }

    const contextuallySelectedAccount =
      accountsByContextualChainId?.[selectedAddress];
    const contextuallySelectedTokenBalance =
      allTokenBalances?.[selectedAddress?.toLowerCase()]?.[contextualChainId]?.[
        selectedAsset.address
      ];

    let weiBalance, weiInput, amountError;
    if (isDecimal(value)) {
      // toWei can throw error if input is not a number: Error: while converting number to string, invalid number value
      let weiValue = 0;
      try {
        weiValue = toWei(value);
      } catch (error) {
        amountError = strings('transaction.invalid_amount');
      }

      if (!amountError && Number(value) < 0) {
        amountError = strings('transaction.invalid_amount');
      }

      if (!amountError) {
        if (isNativeToken(selectedAsset)) {
          const globallySelectedBalance =
            accounts?.[selectedAddress]?.balance || '0x0';
          const contextuallySelectedNativeBalance = hexToBN(
            contextuallySelectedAccount?.balance || '0x0',
          );
          const balance = isRemoveGlobalNetworkSelectorEnabled()
            ? contextuallySelectedNativeBalance
            : hexToBN(globallySelectedBalance);

          weiBalance = hexToBN(balance);
          weiInput = weiValue.add(estimatedTotalGas);
        } else {
          const globallySelectedBalance =
            contractBalances?.[selectedAsset.address] || '0x0';
          const balance = isRemoveGlobalNetworkSelectorEnabled()
            ? contextuallySelectedTokenBalance || '0x0'
            : globallySelectedBalance;

          weiBalance = hexToBN(balance);
          weiInput = toTokenMinimalUnit(value, selectedAsset.decimals);
        }
        // TODO: weiBalance is not always guaranteed to be type BN. Need to consolidate type.
        amountError = gte(weiBalance, weiInput)
          ? undefined
          : strings('transaction.insufficient');
      }
    } else {
      amountError = strings('transaction.invalid_amount');
    }
    if (amountError) {
      this.setState({ amountError });
      dismissKeyboard();
    }
    return !!amountError;
  };

  /**
   * Estimate transaction gas with information available
   */
  estimateGasLimit = async () => {
    const {
      globalNetworkClientId,
      transactionState,
      contextualNetworkConfiguration,
    } = this.props;
    const {
      transaction: { from },
      transactionTo,
    } = transactionState;

    const { rpcEndpoints, defaultRpcEndpointIndex } =
      contextualNetworkConfiguration;
    const { networkClientId: sendFlowContextualNetworkClientId } =
      rpcEndpoints[defaultRpcEndpointIndex];
    const effectiveNetworkClientId =
      sendFlowContextualNetworkClientId || globalNetworkClientId;

    const currentNetworkClientId = isRemoveGlobalNetworkSelectorEnabled()
      ? effectiveNetworkClientId
      : globalNetworkClientId;

    const { gas } = await getGasLimit(
      {
        from,
        to: transactionTo,
      },
      false,
      currentNetworkClientId,
    );
    return gas;
  };

  useMax = () => {
    const {
      accounts,
      selectedAddress,
      contractBalances,
      selectedAsset,
      conversionRate,
      contractExchangeRates,
      contractBalancesByContextualChainId,
      contractExchangeRatesByContextualChainId,
      accountsByContextualChainId,
    } = this.props;
    const { internalPrimaryCurrencyIsCrypto, estimatedTotalGas } = this.state;
    const contextuallySelectedBalance =
      contractBalancesByContextualChainId?.[selectedAsset.address];
    const globallySelectedBalance =
      contractBalances?.[selectedAsset.address] || '0x0';
    const tokenBalance =
      isRemoveGlobalNetworkSelectorEnabled() && contextuallySelectedBalance
        ? contextuallySelectedBalance
        : globallySelectedBalance;

    let input;
    if (isNativeToken(selectedAsset)) {
      const currentBalance = isRemoveGlobalNetworkSelectorEnabled()
        ? accountsByContextualChainId?.[selectedAddress]?.balance || '0x0'
        : accounts?.[selectedAddress]?.balance || '0x0';
      const balanceBN = hexToBN(currentBalance);
      const realMaxValue = balanceBN.sub(estimatedTotalGas);
      const maxValue =
        balanceBN.isZero() || realMaxValue.isNeg()
          ? hexToBN('0x0')
          : realMaxValue;

      if (internalPrimaryCurrencyIsCrypto) {
        input = fromWei(maxValue);
      } else {
        input = `${weiToFiatNumber(maxValue, conversionRate)}`;
        this.setState({
          maxFiatInput: `${weiToFiatNumber(maxValue, conversionRate, 12)}`,
        });
      }
    } else {
      const globallySelectedExchangeRate =
        contractExchangeRates?.[selectedAsset.address]?.price ?? null;
      const contextuallySelectedExchangeRate =
        contractExchangeRatesByContextualChainId?.[selectedAsset.address]
          ?.price ?? null;
      const exchangeRate = isRemoveGlobalNetworkSelectorEnabled()
        ? contextuallySelectedExchangeRate
        : globallySelectedExchangeRate;

      if (internalPrimaryCurrencyIsCrypto || !exchangeRate) {
        input = fromTokenMinimalUnitString(
          tokenBalance,
          selectedAsset.decimals,
        );
      } else {
        input = `${balanceToFiatNumber(
          fromTokenMinimalUnitString(tokenBalance, selectedAsset.decimals),
          conversionRate,
          exchangeRate,
        )}`;
      }
    }
    this.onInputChange(input, undefined, true);
  };

  onInputChange = (inputValue, selectedAsset, useMax) => {
    const {
      contractExchangeRates,
      conversionRate,
      currentCurrency,
      ticker,
      setMaxValueMode,
      contractExchangeRatesByContextualChainId,
    } = this.props;
    const { internalPrimaryCurrencyIsCrypto } = this.state;

    setMaxValueMode(useMax ?? false);

    let inputValueConversion,
      displayableInputValueConversion,
      hasExchangeRate,
      comma;
    // Remove spaces from input
    inputValue = inputValue && inputValue.replace(regex.whiteSpaces, '');
    // Handle semicolon for other languages
    if (inputValue && inputValue.includes(',')) {
      comma = true;
      inputValue = inputValue.replace(',', '.');
    }
    const processedTicker = getTicker(ticker);
    const processedInputValue = isDecimal(inputValue)
      ? handleWeiNumber(inputValue)
      : '0';
    selectedAsset = selectedAsset || this.props.selectedAsset;
    if (isNativeToken(selectedAsset)) {
      // toWei can throw error if input is not a number: Error: while converting number to string, invalid number value
      let weiValue = 0;

      try {
        weiValue = toWei(processedInputValue);
      } catch (error) {
        // Do nothing
      }

      hasExchangeRate = !!conversionRate;

      if (internalPrimaryCurrencyIsCrypto) {
        inputValueConversion = `${weiToFiatNumber(weiValue, conversionRate)}`;
        displayableInputValueConversion = `${weiToFiat(
          weiValue,
          conversionRate,
          currentCurrency,
        )}`;
      } else {
        inputValueConversion = `${renderFromWei(
          fiatNumberToWei(processedInputValue, conversionRate),
        )}`;
        displayableInputValueConversion = `${inputValueConversion} ${processedTicker}`;
      }
    } else {
      const globallySelectedExchangeRate =
        contractExchangeRates?.[selectedAsset.address]?.price ?? null;
      const contextuallySelectedExchangeRate =
        contractExchangeRatesByContextualChainId?.[selectedAsset.address]
          ?.price ?? null;
      const exchangeRatePrice = isRemoveGlobalNetworkSelectorEnabled()
        ? contextuallySelectedExchangeRate
        : globallySelectedExchangeRate;

      hasExchangeRate = !!exchangeRatePrice;
      if (internalPrimaryCurrencyIsCrypto) {
        inputValueConversion = `${balanceToFiatNumber(
          processedInputValue,
          conversionRate,
          exchangeRatePrice,
        )}`;
        displayableInputValueConversion = `${balanceToFiat(
          processedInputValue,
          conversionRate,
          exchangeRatePrice,
          currentCurrency,
        )}`;
      } else {
        inputValueConversion = `${renderFromTokenMinimalUnit(
          fiatNumberToTokenMinimalUnit(
            processedInputValue,
            conversionRate,
            exchangeRatePrice,
            selectedAsset.decimals,
          ),
          selectedAsset.decimals,
        )}`;
        displayableInputValueConversion = `${inputValueConversion} ${selectedAsset.symbol}`;
      }
    }
    if (comma) inputValue = inputValue && inputValue.replace('.', ',');
    inputValueConversion =
      inputValueConversion === '0' ? undefined : inputValueConversion;
    this.setState({
      inputValue,
      inputValueConversion,
      displayableInputValueConversion,
      amountError: undefined,
      hasExchangeRate,
      maxFiatInput: !useMax && undefined,
    });
  };

  toggleAssetsModal = () => {
    const { assetsModalVisible } = this.state;
    this.setState({ assetsModalVisible: !assetsModalVisible });
  };

  handleSelectedAssetBalance = (selectedAsset, displayableBalance) => {
    const {
      accounts,
      accountsByContextualChainId,
      selectedAddress,
      contractBalances,
      contextualChainId,
      allTokenBalances,
    } = this.props;
    const contextuallySelectedAccount =
      accountsByContextualChainId?.[selectedAddress];

    let currentBalance;
    if (displayableBalance) {
      currentBalance = `${displayableBalance} ${selectedAsset.symbol || ''}`;
    } else if (isNativeToken(selectedAsset)) {
      const globallySelectedBalance =
        accounts?.[selectedAddress]?.balance || '0x0';
      const contextuallySelectedBalance =
        contextuallySelectedAccount?.balance || '0x0';
      const balanceToRender = isRemoveGlobalNetworkSelectorEnabled()
        ? contextuallySelectedBalance
        : globallySelectedBalance;
      const balanceValue = renderFromWei(balanceToRender) || '0';
      const symbol = selectedAsset.symbol || 'ETH';
      currentBalance = `${balanceValue} ${symbol}`;
    } else {
      const globallySelectedBalance =
        contractBalances?.[selectedAsset.address] || '0x0';
      const contextuallySelectedBalance =
        allTokenBalances?.[selectedAddress?.toLowerCase()]?.[
          contextualChainId
        ]?.[selectedAsset.address] || '0x0';
      const balanceMinUnit =
        renderFromTokenMinimalUnit(
          contextuallySelectedBalance,
          selectedAsset.decimals,
        ) || '0';
      const balanceToRender = isRemoveGlobalNetworkSelectorEnabled()
        ? balanceMinUnit
        : renderFromTokenMinimalUnit(
            globallySelectedBalance,
            selectedAsset.decimals,
          ) || '0';
      const symbol = selectedAsset.symbol || '';
      currentBalance = `${balanceToRender} ${symbol}`;
    }
    this.setState({ currentBalance });
  };

  pickSelectedAsset = (selectedAsset) => {
    this.toggleAssetsModal();
    this.props.setSelectedAsset(selectedAsset);

    if (!selectedAsset.tokenId) {
      this.onInputChange(undefined, selectedAsset);
      this.handleSelectedAssetBalance(selectedAsset);
      // Wait for input to mount first
      setTimeout(
        () =>
          this.amountInput &&
          this.amountInput.current &&
          this.amountInput.current.focus(),
        500,
      );
    }
  };

  assetKeyExtractor = (asset) => {
    if (asset.tokenId) {
      return asset.address + asset.tokenId;
    }
    return asset.address;
  };

  renderToken = (token, index) => {
    const {
      accounts,
      selectedAddress,
      conversionRate,
      currentCurrency,
      contractBalances,
      contractExchangeRates,
      accountsByContextualChainId,
      contextualChainId,
      ticker,
      tickerByContextualChainId,
      contractExchangeRatesByContextualChainId,
    } = this.props;
    const contextuallySelectedAccount =
      accountsByContextualChainId?.[selectedAddress];

    let balance, balanceFiat;
    const { address, decimals, symbol } = token;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    if (isNativeToken(token)) {
      const globallySelectedBalance =
        accounts?.[selectedAddress]?.balance || '0x0';
      const contextuallySelectedBalance =
        contextuallySelectedAccount?.balance || '0x0';
      const balanceToRender = isRemoveGlobalNetworkSelectorEnabled()
        ? contextuallySelectedBalance
        : globallySelectedBalance;

      balance = renderFromWei(balanceToRender) || '0';
      balanceFiat = weiToFiat(
        hexToBN(balanceToRender),
        conversionRate,
        currentCurrency,
      );
    } else {
      const globallySelectedBalance = contractBalances?.[address] || '0x0';
      const contextuallySelectedBalance =
        this.props.allTokenBalances?.[selectedAddress?.toLowerCase()]?.[
          contextualChainId
        ]?.[address] || '0x0';
      const balanceToRender = isRemoveGlobalNetworkSelectorEnabled()
        ? contextuallySelectedBalance
        : globallySelectedBalance;
      balance = renderFromTokenMinimalUnit(balanceToRender, decimals) || '0';
      const globallySelectedExchangeRate =
        contractExchangeRates?.[address]?.price ?? null;
      const contextuallySelectedExchangeRate =
        contractExchangeRatesByContextualChainId?.[address]?.price ?? null;
      const exchangeRate = isRemoveGlobalNetworkSelectorEnabled()
        ? contextuallySelectedExchangeRate
        : globallySelectedExchangeRate;

      balanceFiat = balanceToFiat(
        balance,
        conversionRate,
        exchangeRate,
        currentCurrency,
      );
    }

    return (
      <TouchableOpacity
        key={index}
        style={styles.assetElementWrapper}
        // eslint-disable-next-line react/jsx-no-bind
        onPress={() => this.pickSelectedAsset(token)}
      >
        <View style={styles.assetElement}>
          {isNativeToken(token) ? (
            <NetworkMainAssetLogo
              big
              ticker={
                isRemoveGlobalNetworkSelectorEnabled()
                  ? tickerByContextualChainId
                  : ticker
              }
              chainId={contextualChainId}
            />
          ) : (
            <TokenImage
              asset={token}
              iconStyle={styles.tokenImage}
              containerStyle={styles.tokenImage}
            />
          )}
          <View style={styles.assetInformationWrapper}>
            <Text style={styles.textAssetTitle}>{symbol}</Text>
            <View style={styles.assetBalanceWrapper}>
              <Text style={styles.textAssetBalance}>{balance}</Text>
              {!!balanceFiat && (
                <Text style={styles.textAssetFiat}>{balanceFiat}</Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  renderCollectible = (collectible, index) => {
    const { name } = collectible;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <TouchableOpacity
        key={index}
        style={styles.assetElementWrapper}
        // eslint-disable-next-line react/jsx-no-bind
        onPress={() => this.pickSelectedAsset(collectible)}
      >
        <View style={styles.assetElement}>
          <CollectibleMedia
            small
            collectible={collectible}
            iconStyle={styles.tokenImage}
            containerStyle={styles.tokenImage}
          />
          <View style={styles.assetInformationWrapper}>
            <Text style={styles.textAssetTitle}>{name}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  renderAsset = (props) => {
    const { item: asset, index } = props;
    if (!asset.tokenId) {
      return this.renderToken(asset, index);
    }
    return this.renderCollectible(asset, index);
  };

  processCollectibles = () => {
    const { collectibleContracts } = this.props;
    const collectibles = [];
    const sortedCollectibles = [...this.props.collectibles].sort((a, b) => {
      if (a.address < b.address) return -1;
      if (a.address > b.address) return 1;
      return 0;
    });
    sortedCollectibles.forEach((collectible) => {
      const address = collectible.address.toLowerCase();
      const isTradable =
        !collectiblesTransferInformation[address] ||
        collectiblesTransferInformation[address].tradable;
      if (!isTradable) return;
      const collectibleContract = collectibleContracts.find(
        (contract) => contract.address.toLowerCase() === address,
      );
      if (!collectible.name) collectible.name = collectibleContract.name;
      if (!collectible.image) collectible.image = collectibleContract.logo;
      collectibles.push(collectible);
    });
    return collectibles;
  };

  renderAssetsModal = () => {
    const { assetsModalVisible } = this.state;
    const tradableCollectibles = this.collectibles.filter(
      ({ standard }) => standard === 'ERC721',
    );
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <Modal
        isVisible={assetsModalVisible}
        style={styles.bottomModal}
        onBackdropPress={this.toggleAssetsModal}
        onBackButtonPress={this.toggleAssetsModal}
        onSwipeComplete={this.toggleAssetsModal}
        swipeDirection={'down'}
        propagateSwipe
        backdropColor={colors.overlay.default}
        backdropOpacity={1}
      >
        <SafeAreaView style={styles.assetsModalWrapper}>
          <View style={styles.titleWrapper}>
            <View style={styles.dragger} />
          </View>
          <FlatList
            data={[...this.tokens, ...tradableCollectibles]}
            keyExtractor={this.assetKeyExtractor}
            renderItem={this.renderAsset}
          />
        </SafeAreaView>
      </Modal>
    );
  };

  switchCurrency = async () => {
    const { internalPrimaryCurrencyIsCrypto, inputValueConversion } =
      this.state;
    this.setState(
      {
        internalPrimaryCurrencyIsCrypto: !internalPrimaryCurrencyIsCrypto,
      },
      () => {
        this.onInputChange(inputValueConversion);
      },
    );
  };

  renderTokenInput = () => {
    const {
      inputValue,
      displayableInputValueConversion,
      amountError,
      hasExchangeRate,
      internalPrimaryCurrencyIsCrypto,
      currentBalance,
    } = this.state;
    const {
      currentCurrency,
      selectedAsset,
      navigation,
      isNetworkBuyNativeTokenSupported,
      swapsIsLive,
      globalChainId,
      ticker,
    } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const themeAppearance = this.context.themeAppearance || 'light';
    const styles = createStyles(colors);
    const navigateToSwap = () => {
      navigation.replace('Swaps', {
        screen: 'SwapsAmountView',
        params: {
          sourceToken: swapsUtils.NATIVE_SWAPS_TOKEN_ADDRESS,
          destinationToken: selectedAsset.address,
          sourcePage: 'SendFlow',
        },
      });
    };

    const isSwappable =
      !isNativeToken(selectedAsset) &&
      AppConstants.SWAPS.ACTIVE &&
      swapsIsLive &&
      isSwapsAllowed(globalChainId) &&
      amountError === strings('transaction.insufficient');

    const navigateToBuyOrSwaps = () => {
      if (isSwappable) {
        this.props.metrics.trackEvent(
          this.props.metrics
            .createEventBuilder(MetaMetricsEvents.LINK_CLICKED)
            .addProperties({
              location: 'insufficient_funds_warning',
              text: 'swap_tokens',
            })
            .build(),
        );
        navigateToSwap();
      } else if (
        isNetworkBuyNativeTokenSupported &&
        isNativeToken(selectedAsset)
      ) {
        this.props.metrics.trackEvent(
          this.props.metrics
            .createEventBuilder(MetaMetricsEvents.LINK_CLICKED)
            .addProperties({
              location: 'insufficient_funds_warning',
              text: 'buy_more',
            })
            .build(),
        );
        navigation.navigate(...createBuyNavigationDetails());
      }
    };

    return (
      <View>
        <View style={styles.inputContainerWrapper}>
          <View style={styles.inputContainer}>
            {!internalPrimaryCurrencyIsCrypto && !!inputValue && (
              <Text style={styles.inputCurrencyText}>{`${getCurrencySymbol(
                currentCurrency,
              )} `}</Text>
            )}
            <TextInput
              ref={this.amountInput}
              style={styles.textInput}
              value={inputValue}
              onChangeText={this.onInputChange}
              keyboardType={'numeric'}
              placeholder={'0'}
              placeholderTextColor={colors.text.muted}
              keyboardAppearance={themeAppearance}
              testID={AmountViewSelectorsIDs.TRANSACTION_AMOUNT_INPUT}
            />
          </View>
        </View>
        {hasExchangeRate && (
          <View style={styles.actionsWrapper}>
            <View style={styles.action}>
              <TouchableOpacity
                style={styles.actionSwitch}
                onPress={this.switchCurrency}
                testID={AmountViewSelectorsIDs.CURRENCY_SWITCH}
              >
                <Text
                  style={styles.textSwitch}
                  numberOfLines={1}
                  testID={
                    AmountViewSelectorsIDs.TRANSACTION_AMOUNT_CONVERSION_VALUE
                  }
                >
                  {displayableInputValueConversion}
                </Text>
                <View styles={styles.switchWrapper}>
                  <MaterialCommunityIcons
                    name="swap-vertical"
                    size={16}
                    color={colors.primary.default}
                    style={styles.switch}
                  />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}
        <View style={styles.balanceWrapper}>
          <Text style={styles.balanceText}>{`${strings(
            'transaction.balance',
          )}: ${currentBalance}`}</Text>
        </View>
        {amountError && (
          <View
            style={styles.errorMessageWrapper}
            testID={AmountViewSelectorsIDs.AMOUNT_ERROR}
          >
            <TouchableOpacity
              onPress={navigateToBuyOrSwaps}
              style={styles.errorBuyWrapper}
            >
              {isNetworkBuyNativeTokenSupported &&
              isNativeToken(selectedAsset) ? (
                <Text style={[styles.error]}>
                  {strings('transaction.more_to_continue', {
                    ticker: getTicker(ticker),
                  })}
                  {'\n'}
                  <Text style={[styles.error, styles.underline]}>
                    {strings('transaction.token_Marketplace')}
                  </Text>
                  {'\n'}
                  {strings('transaction.you_can_also_send_funds')}
                </Text>
              ) : (
                <Text style={styles.error}>{amountError}</Text>
              )}

              {isSwappable && (
                <Text style={[styles.error, styles.underline]}>
                  {strings('transaction.swap_tokens')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  renderCollectibleInput = () => {
    const { amountError } = this.state;
    const { selectedAsset } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <View style={styles.collectibleInputWrapper}>
        <View style={styles.collectibleInputImageWrapper}>
          <CollectibleMedia
            small
            containerStyle={styles.CollectibleMedia}
            iconStyle={styles.CollectibleMedia}
            collectible={selectedAsset}
          />
        </View>
        <View style={styles.collectibleInputInformationWrapper}>
          <Text style={styles.collectibleName}>{selectedAsset.name}</Text>
          <Text style={styles.collectibleId}>{`#${renderShortText(
            selectedAsset.tokenId,
            10,
          )}`}</Text>
        </View>
        {amountError && (
          <View
            style={styles.errorMessageWrapper}
            testID={AmountViewSelectorsIDs.AMOUNT_ERROR}
          >
            <ErrorMessage errorMessage={amountError} />
          </View>
        )}
      </View>
    );
  };

  render = () => {
    const {
      estimatedTotalGas,
      hasExchangeRate,
      isRedesignedTransferTransactionLoading,
    } = this.state;
    const {
      selectedAsset,
      transactionState: { isPaymentRequest },
      networkName,
      networkImageSource,
    } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <SafeAreaView
        edges={['bottom']}
        style={styles.wrapper}
        testID={AmountViewSelectorsIDs.CONTAINER}
      >
        {isRemoveGlobalNetworkSelectorEnabled() ? (
          <ContextualNetworkPicker
            networkName={networkName}
            networkImageSource={networkImageSource}
            onPress={this.onNetworkSelectorPress}
            disabled
          />
        ) : null}
        <ScrollView style={styles.scrollWrapper}>
          {!hasExchangeRate && !selectedAsset.tokenId ? (
            <Alert
              small
              type={AlertType.Warning}
              renderIcon={() => (
                <MaterialCommunityIcons
                  name="information"
                  size={20}
                  color={colors.warning.default}
                />
              )}
              style={styles.warningContainer}
            >
              {() => (
                <View style={styles.warningTextContainer}>
                  <Text
                    red
                    style={styles.warningText}
                    testID={AmountViewSelectorsIDs.FIAT_CONVERSION_WARNING_TEXT}
                  >
                    {strings('transaction.fiat_conversion_not_available')}
                  </Text>
                </View>
              )}
            </Alert>
          ) : null}
          <View style={styles.inputWrapper}>
            <View style={styles.actionsWrapper}>
              <View style={styles.actionBorder} />
              <View style={styles.action}>
                <TouchableOpacity
                  style={styles.actionDropdown}
                  disabled={isPaymentRequest}
                  onPress={this.toggleAssetsModal}
                >
                  <Text style={styles.textDropdown}>
                    {selectedAsset.symbol || strings('wallet.collectible')}
                  </Text>
                  <View styles={styles.arrow}>
                    <Ionicons
                      name="arrow-down"
                      size={16}
                      color={colors.primary.inverse}
                      style={styles.iconDropdown}
                    />
                  </View>
                </TouchableOpacity>
              </View>
              <View style={[styles.actionBorder, styles.actionMax]}>
                {!selectedAsset.tokenId && (
                  <TouchableOpacity
                    testID={AmountViewSelectorsIDs.MAX_BUTTON}
                    style={styles.actionMaxTouchable}
                    disabled={!estimatedTotalGas}
                    onPress={this.useMax}
                  >
                    <Text
                      style={
                        estimatedTotalGas
                          ? styles.maxText
                          : styles.maxTextDisabled
                      }
                    >
                      {strings('transaction.use_max')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            {selectedAsset.tokenId
              ? this.renderCollectibleInput()
              : this.renderTokenInput()}
          </View>
        </ScrollView>

        <KeyboardAvoidingView
          style={styles.nextActionWrapper}
          behavior={'padding'}
          keyboardVerticalOffset={KEYBOARD_OFFSET}
          enabled={Device.isIos()}
        >
          <View style={styles.buttonNextWrapper}>
            <StyledButton
              type={'confirm'}
              containerStyle={styles.buttonNext}
              disabled={
                !estimatedTotalGas || isRedesignedTransferTransactionLoading
              }
              onPress={this.onNext}
              testID={AmountViewSelectorsIDs.NEXT_BUTTON}
            >
              {strings('transaction.next')}
            </StyledButton>
          </View>
        </KeyboardAvoidingView>
        {this.renderAssetsModal()}
      </SafeAreaView>
    );
  };
}

Amount.contextType = ThemeContext;

const mapStateToProps = (state, ownProps) => {
  const transaction = ownProps.transaction || state.transaction;
  const globalChainId = selectEvmChainId(state);
  const globalNetworkClientId = selectNetworkClientId(state);
  const contextualChainId =
    selectSendFlowContextualChainId(state) || globalChainId;
  const contextualNetworkConfiguration = selectNetworkConfigurationByChainId(
    state,
    toHexadecimal(contextualChainId),
  );

  const currentChainId = isRemoveGlobalNetworkSelectorEnabled()
    ? contextualChainId
    : globalChainId;

  return {
    accounts: selectAccounts(state),
    contractExchangeRates: selectContractExchangeRatesByChainId(
      state,
      globalChainId,
    ),
    contractBalances: selectContractBalances(state),
    collectibles: collectiblesSelector(state),
    collectibleContracts: collectibleContractsSelector(state),
    conversionRate: selectConversionRateByChainId(state, currentChainId),
    currentCurrency: selectCurrentCurrency(state),
    gasEstimateType: selectGasFeeControllerEstimateType(state),
    gasFeeEstimates: selectGasFeeEstimates(state),
    providerType: selectProviderTypeByChainId(state, currentChainId),
    primaryCurrency: state.settings.primaryCurrency,
    selectedAddress: selectSelectedInternalAccountFormattedAddress(state),
    ticker: selectNativeCurrencyByChainId(state, currentChainId),
    tokens: selectTokens(state),
    transactionState: transaction,
    selectedAsset: state.transaction.selectedAsset,
    isPaymentRequest: state.transaction.paymentRequest,
    isNetworkBuyNativeTokenSupported: isNetworkRampNativeTokenSupported(
      currentChainId,
      getRampNetworks(state),
    ),
    isRedesignedTransferConfirmationEnabledForTransfer:
      selectConfirmationRedesignFlags(state).transfer,
    swapsIsLive: swapsLivenessSelector(state),
    globalChainId,
    globalNetworkClientId,
    contextualChainId,
    contextualNetworkConfiguration,
    accountsByContextualChainId: selectAccountsByContextualChainId(state),
    contractExchangeRatesByContextualChainId:
      selectContractExchangeRatesByChainId(state, contextualChainId),
    contractBalancesByContextualChainId:
      selectContractBalancesByContextualChainId(state),
    allTokenBalances: selectAllTokenBalances(state),
    tickerByContextualChainId: selectNativeCurrencyByChainId(
      state,
      contextualChainId,
    ),
    allTokensByChainId: selectAllTokens(state),
    networkName:
      selectNetworkConfigurations(state)?.[currentChainId]?.name || '',
    networkImageSource: selectNetworkImageSourceByChainId(
      state,
      currentChainId,
    ),
  };
};

const mapDispatchToProps = (dispatch) => ({
  prepareTransaction: (transaction) =>
    dispatch(prepareTransaction(transaction)),
  setSelectedAsset: (selectedAsset) =>
    dispatch(setSelectedAsset(selectedAsset)),
  resetTransaction: () => {
    dispatch(setTransactionSendFlowContextualChainId(null));
    dispatch(resetTransaction());
  },
  setMaxValueMode: (maxValueMode) => dispatch(setMaxValueMode(maxValueMode)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withMetricsAwareness(Amount));
