import React, { PureComponent } from 'react';
import BigNumber from 'bignumber.js';
import { fontStyles } from '../../../../../styles/common';
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
  setTransactionObject,
  resetTransaction,
  setMaxValueMode,
} from '../../../../../actions/transaction';
import { getSendFlowTitle } from '../../../../UI/Navbar';
import StyledButton from '../../../../UI/StyledButton';
import PropTypes from 'prop-types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Modal from 'react-native-modal';
import TokenImage from '../../../../UI/TokenImage';
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
} from '../../../../../util/number';
import {
  getTicker,
  generateTransferData,
  getEther,
  calculateEIP1559GasFeeHexes,
} from '../../../../../util/transactions';
import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';
import { BNToHex } from '@metamask/controller-utils';
import ErrorMessage from '../ErrorMessage';
import { getGasLimit } from '../../../../../util/custom-gas';
import Engine from '../../../../../core/Engine';
import CollectibleMedia from '../../../../UI/CollectibleMedia';
import collectiblesTransferInformation from '../../../../../util/collectibles-transfer';
import { strings } from '../../../../../../locales/i18n';
import Device from '../../../../../util/device';
import { BN } from 'ethereumjs-util';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import dismissKeyboard from 'react-native/Libraries/Utilities/dismissKeyboard';
import NetworkMainAssetLogo from '../../../../UI/NetworkMainAssetLogo';
import { renderShortText } from '../../../../../util/general';
import { SafeAreaView } from 'react-native-safe-area-context';
import { decGWEIToHexWEI } from '../../../../../util/conversions';
import AppConstants from '../../../../../core/AppConstants';
import {
  collectibleContractsSelector,
  collectiblesSelector,
} from '../../../../../reducers/collectibles';
import { gte } from '../../../../../util/lodash';
import { ThemeContext, mockTheme } from '../../../../../util/theme';
import Alert, { AlertType } from '../../../../Base/Alert';

import {
  selectConversionRateByChainId,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import { selectTokens } from '../../../../../selectors/tokensController';
import { selectAccounts } from '../../../../../selectors/accountTrackerController';
import { selectContractBalances } from '../../../../../selectors/tokenBalancesController';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { PREFIX_HEX_STRING } from '../../../../../constants/transaction';
import Routes from '../../../../../constants/navigation/Routes';
import { getRampNetworks } from '../../../../../reducers/fiatOrders';
import { swapsLivenessSelector } from '../../../../../reducers/swaps';
import { isSwapsAllowed } from '../../../../UI/Swaps/utils';
import { swapsUtils } from '@metamask/swaps-controller';
import { regex } from '../../../../../util/regex';
import { AmountViewSelectorsIDs } from '../../../../../../e2e/selectors/SendFlow/AmountView.selectors';
import { isNetworkRampNativeTokenSupported } from '../../../../../components/UI/Ramp/utils';
import { withMetricsAwareness } from '../../../../../components/hooks/useMetrics';
import { selectGasFeeEstimates } from '../../../../../selectors/confirmTransaction';
import { selectGasFeeControllerEstimateType } from '../../../../../selectors/gasFeeController';
import { createBuyNavigationDetails } from '../../../../UI/Ramp/routes/utils';
import {
  // Pending updated multichain UX to specify the send chain.
  /* eslint-disable no-restricted-syntax */
  selectChainId,
  selectNetworkClientId,
  /* eslint-enable no-restricted-syntax */
  selectNativeCurrencyByChainId,
  selectProviderTypeByChainId,
} from '../../../../../selectors/networkController';
import { selectContractExchangeRatesByChainId } from '../../../../../selectors/tokenRatesController';
import { isNativeToken } from '../../utils/generic';

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
      paddingLeft: 10,
      paddingRight: 10,
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
     * Action that sets transaction attributes from object to a transaction
     */
    setTransactionObject: PropTypes.func,
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
  };

  state = {
    amountError: undefined,
    inputValue: undefined,
    inputValueConversion: undefined,
    renderableInputValueConversion: undefined,
    assetsModalVisible: false,
    internalPrimaryCurrencyIsCrypto: this.props.primaryCurrency === 'ETH',
    estimatedTotalGas: undefined,
    hasExchangeRate: false,
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
    } = this.props;
    // For analytics
    this.updateNavBar();
    navigation.setParams({ providerType, isPaymentRequest });

    this.tokens = [getEther(ticker), ...tokens];
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
    const { selectedAsset, conversionRate, contractExchangeRates } = this.props;

    if (isNativeToken(selectedAsset)) {
      return !!conversionRate;
    }
    const exchangeRate =
      contractExchangeRates?.[selectedAsset.address]?.price ?? null;
    return !!exchangeRate;
  };

  /**
   * Method to validate collectible ownership.
   *
   * @returns Promise that resolves ownershio as a boolean.
   */
  validateCollectibleOwnership = async () => {
    const { NftController } = Engine.context;
    const {
      transactionState: {
        selectedAsset: { address, tokenId },
      },
      selectedAddress,
    } = this.props;
    try {
      return await NftController.isNftOwner(selectedAddress, address, tokenId);
    } catch (e) {
      return false;
    }
  };

  onNext = async () => {
    const {
      navigation,
      selectedAsset,
      setSelectedAsset,
      transactionState: { transaction },
      providerType,
      onConfirm,
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
          fiatNumberToWei(
            handleWeiNumber(maxFiatInput),
            this.props.conversionRate,
          ),
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

    if (transaction.value !== undefined) {
      this.updateTransaction(value);
    } else {
      await this.prepareTransaction(value);
    }

    this.props.metrics.trackEvent(
      this.props.metrics
        .createEventBuilder(MetaMetricsEvents.SEND_FLOW_ADDS_AMOUNT)
        .addProperties({ network: providerType })
        .build(),
    );

    setSelectedAsset(selectedAsset);
    if (onConfirm) {
      onConfirm();
    } else {
      navigation.navigate(Routes.SEND_FLOW.CONFIRM);
    }
  };

  getCollectibleTranferTransactionProperties() {
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

  updateTransaction = (value = 0) => {
    const {
      selectedAsset,
      transactionState: { transaction, transactionTo },
      setTransactionObject,
      selectedAddress,
    } = this.props;

    const transactionObject = {
      ...transaction,
      value: BNToHex(toWei(value)),
      selectedAsset,
      from: selectedAddress,
    };

    if (selectedAsset.tokenId) {
      const collectibleTransferTransactionProperties =
        this.getCollectibleTranferTransactionProperties();
      transactionObject.data = collectibleTransferTransactionProperties.data;
      transactionObject.to = collectibleTransferTransactionProperties.to;
      transactionObject.value = collectibleTransferTransactionProperties.value;
    } else if (!isNativeToken(selectedAsset)) {
      const tokenAmount = toTokenMinimalUnit(value, selectedAsset.decimals);
      transactionObject.data = generateTransferData('transfer', {
        toAddress: transactionTo,
        amount: BNToHex(tokenAmount),
      });
      transactionObject.value = '0x0';
      transactionObject.to = selectedAsset.address;
    }

    if (selectedAsset.erc20) {
      transactionObject.readableValue = value;
    }

    if (isNativeToken(selectedAsset)) {
      transactionObject.data = PREFIX_HEX_STRING;
      transactionObject.to = transactionTo;
    }

    setTransactionObject(transactionObject);
  };

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
        this.getCollectibleTranferTransactionProperties();
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
    const { accounts, selectedAddress, selectedAsset, contractBalances } =
      this.props;
    const { estimatedTotalGas, inputValueConversion } = this.state;
    let value = inputValue;

    if (!internalPrimaryCurrencyIsCrypto) {
      value = inputValueConversion;
    }

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
          weiBalance = hexToBN(accounts[selectedAddress].balance);
          weiInput = weiValue.add(estimatedTotalGas);
        } else {
          weiBalance = hexToBN(contractBalances[selectedAsset.address]);
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
      transaction: { from },
      transactionTo,
    } = this.props.transactionState;
    const { globalNetworkClientId } = this.props;
    const { gas } = await getGasLimit(
      {
        from,
        to: transactionTo,
      },
      false,
      globalNetworkClientId,
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
    } = this.props;
    const { internalPrimaryCurrencyIsCrypto, estimatedTotalGas } = this.state;
    const tokenBalance = contractBalances[selectedAsset.address] || '0x0';
    let input;
    if (isNativeToken(selectedAsset)) {
      const balanceBN = hexToBN(accounts[selectedAddress].balance);
      const realMaxValue = balanceBN.sub(estimatedTotalGas);
      const maxValue =
        balanceBN.isZero() || realMaxValue.isNeg() ? new BN(0) : realMaxValue;
      if (internalPrimaryCurrencyIsCrypto) {
        input = fromWei(maxValue);
      } else {
        input = `${weiToFiatNumber(maxValue, conversionRate)}`;
        this.setState({
          maxFiatInput: `${weiToFiatNumber(maxValue, conversionRate, 12)}`,
        });
      }
    } else {
      const exchangeRate = contractExchangeRates
        ? contractExchangeRates[selectedAsset.address]?.price
        : undefined;
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
    } = this.props;
    const { internalPrimaryCurrencyIsCrypto } = this.state;

    setMaxValueMode(useMax ?? false);

    let inputValueConversion,
      renderableInputValueConversion,
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
        renderableInputValueConversion = `${weiToFiat(
          weiValue,
          conversionRate,
          currentCurrency,
        )}`;
      } else {
        inputValueConversion = `${renderFromWei(
          fiatNumberToWei(processedInputValue, conversionRate),
        )}`;
        renderableInputValueConversion = `${inputValueConversion} ${processedTicker}`;
      }
    } else {
      const exchangeRate = contractExchangeRates
        ? contractExchangeRates[selectedAsset.address]?.price
        : null;
      hasExchangeRate = !!exchangeRate;
      if (internalPrimaryCurrencyIsCrypto) {
        inputValueConversion = `${balanceToFiatNumber(
          processedInputValue,
          conversionRate,
          exchangeRate,
        )}`;
        renderableInputValueConversion = `${balanceToFiat(
          processedInputValue,
          conversionRate,
          exchangeRate,
          currentCurrency,
        )}`;
      } else {
        inputValueConversion = `${renderFromTokenMinimalUnit(
          fiatNumberToTokenMinimalUnit(
            processedInputValue,
            conversionRate,
            exchangeRate,
            selectedAsset.decimals,
          ),
          selectedAsset.decimals,
        )}`;
        renderableInputValueConversion = `${inputValueConversion} ${selectedAsset.symbol}`;
      }
    }
    if (comma) inputValue = inputValue && inputValue.replace('.', ',');
    inputValueConversion =
      inputValueConversion === '0' ? undefined : inputValueConversion;
    this.setState({
      inputValue,
      inputValueConversion,
      renderableInputValueConversion,
      amountError: undefined,
      hasExchangeRate,
      maxFiatInput: !useMax && undefined,
    });
  };

  toggleAssetsModal = () => {
    const { assetsModalVisible } = this.state;
    this.setState({ assetsModalVisible: !assetsModalVisible });
  };

  handleSelectedAssetBalance = (selectedAsset, renderableBalance) => {
    const { accounts, selectedAddress, contractBalances } = this.props;
    let currentBalance;
    if (renderableBalance) {
      currentBalance = `${renderableBalance} ${selectedAsset.symbol}`;
    } else if (isNativeToken(selectedAsset)) {
      currentBalance = `${renderFromWei(accounts[selectedAddress].balance)} ${
        selectedAsset.symbol
      }`;
    } else {
      currentBalance = `${renderFromTokenMinimalUnit(
        contractBalances[selectedAsset.address],
        selectedAsset.decimals,
      )} ${selectedAsset.symbol}`;
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
    } = this.props;
    let balance, balanceFiat;
    const { address, decimals, symbol } = token;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    if (isNativeToken(token)) {
      balance = renderFromWei(accounts[selectedAddress].balance);
      balanceFiat = weiToFiat(
        hexToBN(accounts[selectedAddress].balance),
        conversionRate,
        currentCurrency,
      );
    } else {
      balance = renderFromTokenMinimalUnit(contractBalances[address], decimals);
      const exchangeRate = contractExchangeRates
        ? contractExchangeRates[address]?.price
        : undefined;
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
            <NetworkMainAssetLogo big />
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
      renderableInputValueConversion,
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
              testID={AmountViewSelectorsIDs.AMOUNT_INPUT}
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
                  {renderableInputValueConversion}
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
    const { estimatedTotalGas, hasExchangeRate } = this.state;
    const {
      selectedAsset,
      transactionState: { isPaymentRequest },
    } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    const isEstimateedTotalGasValid = estimatedTotalGas
      ? BigNumber(estimatedTotalGas).gt(0)
      : false;

    return (
      <SafeAreaView
        edges={['bottom']}
        style={styles.wrapper}
        testID={AmountViewSelectorsIDs.CONTAINER}
      >
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
                      name="ios-arrow-down"
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
                    style={styles.actionMaxTouchable}
                    disabled={!isEstimateedTotalGasValid}
                    onPress={this.useMax}
                  >
                    <Text
                      style={
                        isEstimateedTotalGasValid
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
              disabled={!estimatedTotalGas}
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
  const globalChainId = selectChainId(state);
  const globalNetworkClientId = selectNetworkClientId(state);

  return {
    accounts: selectAccounts(state),
    contractExchangeRates: selectContractExchangeRatesByChainId(
      state,
      globalChainId,
    ),
    contractBalances: selectContractBalances(state),
    collectibles: collectiblesSelector(state),
    collectibleContracts: collectibleContractsSelector(state),
    conversionRate: selectConversionRateByChainId(state, globalChainId),
    currentCurrency: selectCurrentCurrency(state),
    gasEstimateType: selectGasFeeControllerEstimateType(state),
    gasFeeEstimates: selectGasFeeEstimates(state),
    providerType: selectProviderTypeByChainId(state, globalChainId),
    primaryCurrency: state.settings.primaryCurrency,
    selectedAddress: selectSelectedInternalAccountFormattedAddress(state),
    ticker: selectNativeCurrencyByChainId(state, globalChainId),
    tokens: selectTokens(state),
    transactionState: transaction,
    selectedAsset: state.transaction.selectedAsset,
    isPaymentRequest: state.transaction.paymentRequest,
    isNetworkBuyNativeTokenSupported: isNetworkRampNativeTokenSupported(
      globalChainId,
      getRampNetworks(state),
    ),
    swapsIsLive: swapsLivenessSelector(state),
    globalChainId,
    globalNetworkClientId,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setTransactionObject: (transaction) =>
    dispatch(setTransactionObject(transaction)),
  prepareTransaction: (transaction) =>
    dispatch(prepareTransaction(transaction)),
  setSelectedAsset: (selectedAsset) =>
    dispatch(setSelectedAsset(selectedAsset)),
  resetTransaction: () => dispatch(resetTransaction()),
  setMaxValueMode: (maxValueMode) => dispatch(setMaxValueMode(maxValueMode)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withMetricsAwareness(Amount));
