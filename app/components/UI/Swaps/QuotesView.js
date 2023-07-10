import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Eth from 'ethjs-query';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  InteractionManager,
  Linking,
} from 'react-native';
import { connect } from 'react-redux';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import BigNumber from 'bignumber.js';
import { useNavigation, useRoute } from '@react-navigation/native';
import { swapsUtils } from '@metamask/swaps-controller';
import {
  WalletDevice,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { query } from '@metamask/controller-utils';
import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';

import {
  addHexPrefix,
  fromTokenMinimalUnit,
  fromTokenMinimalUnitString,
  hexToBN,
  renderFromTokenMinimalUnit,
  renderFromWei,
  toWei,
  weiToFiat,
  calculateEthFeeForMultiLayer,
} from '../../../util/number';
import {
  isMainnetByChainId,
  isMultiLayerFeeNetwork,
  fetchEstimatedMultiLayerL1Fee,
} from '../../../util/networks';
import {
  getErrorMessage,
  getFetchParams,
  getQuotesNavigationsParams,
  isSwapsNativeAsset,
} from './utils';
import { strings } from '../../../../locales/i18n';

import Engine from '../../../core/Engine';
import AppConstants from '../../../core/AppConstants';
import Analytics from '../../../core/Analytics/Analytics';
import Device from '../../../util/device';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { getSwapsQuotesNavbar } from '../Navbar';
import ScreenView from '../../Base/ScreenView';
import Text from '../../Base/Text';
import Alert, { AlertType } from '../../Base/Alert';
import StyledButton from '../StyledButton';
import SliderButton from '../SliderButton';

import LoadingAnimation from './components/LoadingAnimation';
import TokenIcon from './components/TokenIcon';
import QuotesSummary from './components/QuotesSummary';
import QuotesModal from './components/QuotesModal';
import Ratio from './components/Ratio';
import ActionAlert from './components/ActionAlert';
import ApprovalTransactionEditionModal from './components/ApprovalTransactionEditionModal';
import GasEditModal from './components/GasEditModal';
import InfoModal from './components/InfoModal';
import useModalHandler from '../../Base/hooks/useModalHandler';
import useBalance from './utils/useBalance';
import { trackErrorAsAnalytics } from '../../../util/analyticsV2';
import { decodeApproveData, getTicker } from '../../../util/transactions';
import { toLowerCaseEquals } from '../../../util/general';
import { swapsTokensSelector } from '../../../reducers/swaps';
import { decGWEIToHexWEI } from '../../../util/conversions';
import FadeAnimationView from '../FadeAnimationView';
import Logger from '../../../util/Logger';
import { useTheme } from '../../../util/theme';
import { isQRHardwareAccount } from '../../../util/address';
import {
  selectChainId,
  selectTicker,
} from '../../../selectors/networkController';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../selectors/currencyRateController';
import { selectAccounts } from '../../../selectors/accountTrackerController';
import { selectContractBalances } from '../../../selectors/tokenBalancesController';
import { selectSelectedAddress } from '../../../selectors/preferencesController';
import { resetTransaction, setRecipient } from '../../../actions/transaction';

const POLLING_INTERVAL = 30000;
const SLIPPAGE_BUCKETS = {
  MEDIUM: AppConstants.GAS_OPTIONS.MEDIUM,
  HIGH: AppConstants.GAS_OPTIONS.HIGH,
};

const DEFAULT_GAS_FEE_OPTION_LEGACY = AppConstants.GAS_OPTIONS.MEDIUM;
const DEFAULT_GAS_FEE_OPTION_FEE_MARKET = AppConstants.GAS_OPTIONS.HIGH;

const createStyles = (colors) =>
  StyleSheet.create({
    screen: {
      flexGrow: 1,
      justifyContent: 'space-between',
      backgroundColor: colors.background.default,
    },
    container: {
      backgroundColor: colors.background.default,
    },
    topBar: {
      alignItems: 'center',
      marginVertical: 12,
    },
    alertBar: {
      paddingHorizontal: 20,
      marginVertical: 10,
      width: '100%',
    },
    timerWrapper: {
      backgroundColor: colors.background.alternative,
      borderRadius: 20,
      marginVertical: 12,
      paddingVertical: 4,
      paddingHorizontal: 15,
      flexDirection: 'row',
      alignItems: 'center',
    },
    timer: {
      fontVariant: ['tabular-nums'],
    },
    timerHiglight: {
      color: colors.error.default,
    },
    content: {
      paddingHorizontal: 20,
      alignItems: 'center',
    },
    errorViewContent: {
      flex: 1,
      marginHorizontal: Device.isSmallDevice() ? 20 : 55,
      justifyContent: 'center',
    },
    errorTitle: {
      fontSize: 24,
      marginVertical: 10,
    },
    errorText: {
      fontSize: 14,
    },
    sourceTokenContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    tokenIcon: {
      marginHorizontal: 5,
    },
    tokenText: {
      color: colors.text.alternative,
      fontSize: Device.isSmallDevice() ? 16 : 18,
    },
    tokenTextDestination: {
      color: colors.text.default,
    },
    arrowDown: {
      color: colors.icon.alternative,
      fontSize: Device.isSmallDevice() ? 22 : 25,
      marginHorizontal: 15,
      marginTop: Device.isSmallDevice() ? 2 : 4,
      marginBottom: Device.isSmallDevice() ? 0 : 2,
    },
    amount: {
      textAlignVertical: 'center',
      fontSize: Device.isSmallDevice() ? 45 : 60,
      marginBottom: Device.isSmallDevice() ? 8 : 24,
    },
    exchangeRate: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: Device.isSmallDevice() ? 1 : 1,
    },
    bottomSection: {
      marginBottom: 6,
      alignItems: 'stretch',
      paddingHorizontal: 20,
    },
    sliderButtonText: {
      fontSize: 16,
      color: colors.primary.inverse,
    },
    quotesSummary: {
      marginVertical: Device.isSmallDevice() ? 12 : 24,
    },
    quotesSummaryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    bestQuoteText: {
      color: colors.text.default,
    },
    quotesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    quotesDescription: {
      flex: 1,
      flexWrap: 'wrap',
      flexDirection: 'row',
      marginRight: 3,
    },
    quotesLegend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginRight: 2,
      alignItems: 'center',
    },
    quotesFiatColumn: {
      flex: 1,
      marginLeft: 3,
      flexWrap: 'wrap',
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    infoIcon: {
      fontSize: 12,
      margin: 3,
      color: colors.icon.alternative,
    },
    ctaButton: {
      width: '100%',
    },
    errorIcon: {
      fontSize: 46,
      marginVertical: 4,
      color: colors.error.default,
    },
    expiredIcon: {
      color: colors.icon.default,
    },
    disabled: {
      opacity: 0.4,
    },
    termsButton: {
      marginTop: 10,
      marginBottom: 6,
    },
    gasInfoContainer: {
      paddingHorizontal: 2,
    },
    gasInfoIcon: {
      color: colors.icon.alternative,
    },
    hitSlop: {
      top: 10,
      left: 10,
      bottom: 10,
      right: 10,
    },
    text: {
      lineHeight: 20,
      color: colors.text.default,
    },
    fetchingText: {
      color: colors.text.default,
    },
  });

async function resetAndStartPolling({
  slippage,
  sourceToken,
  destinationToken,
  sourceAmount,
  walletAddress,
}) {
  if (!sourceToken || !destinationToken) {
    return;
  }
  const { SwapsController } = Engine.context;

  const fetchParams = getFetchParams({
    slippage,
    sourceToken,
    destinationToken,
    sourceAmount,
    walletAddress,
  });
  await SwapsController.stopPollingAndResetState();
  await SwapsController.startFetchAndSetQuotes(
    fetchParams,
    fetchParams.metaData,
  );
}

/**
 * Multiplies gasLimit by multiplier if both defined
 * @param {string} gasLimit
 * @param {number} multiplier
 */
const gasLimitWithMultiplier = (gasLimit, multiplier) => {
  if (!gasLimit || !multiplier) return;
  return new BigNumber(gasLimit).times(multiplier).integerValue();
};

function getTransactionPropertiesFromGasEstimates(gasEstimateType, estimates) {
  if (gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
    return {
      maxFeePerGas: addHexPrefix(
        decGWEIToHexWEI(
          estimates.maxFeePerGas ||
            estimates[DEFAULT_GAS_FEE_OPTION_FEE_MARKET].suggestedMaxFeePerGas,
        ),
      ),
      maxPriorityFeePerGas: addHexPrefix(
        decGWEIToHexWEI(
          estimates.maxPriorityFeePerGas ||
            estimates[DEFAULT_GAS_FEE_OPTION_FEE_MARKET]
              .suggestedMaxPriorityFeePerGas,
        ),
      ),
      estimatedBaseFee: addHexPrefix(
        decGWEIToHexWEI(
          estimates.estimatedBaseFee ||
            estimates[DEFAULT_GAS_FEE_OPTION_FEE_MARKET].estimatedBaseFee,
        ),
      ),
    };
  }

  return {
    gasPrice: addHexPrefix(
      decGWEIToHexWEI(
        estimates.gasPrice || estimates[DEFAULT_GAS_FEE_OPTION_LEGACY],
      ),
    ),
  };
}

async function addTokenToAssetsController(newToken) {
  const { TokensController } = Engine.context;
  if (
    !isSwapsNativeAsset(newToken) &&
    !TokensController.state.tokens.includes((token) =>
      toLowerCaseEquals(token.address, newToken.address),
    )
  ) {
    const { address, symbol, decimals, name } = newToken;
    await TokensController.addToken(address, symbol, decimals, null, name);
  }
}

function SwapsQuotesView({
  swapsTokens,
  accounts,
  balances,
  selectedAddress,
  currentCurrency,
  conversionRate,
  chainId,
  ticker,
  primaryCurrency,
  isInPolling,
  quotesLastFetched,
  pollingCyclesLeft,
  approvalTransaction: originalApprovalTransaction,
  topAggId,
  aggregatorMetadata,
  quotes,
  quoteValues,
  error,
  quoteRefreshSeconds,
  gasEstimateType,
  gasFeeEstimates,
  usedGasEstimate,
  usedCustomGas,
  setRecipient,
  resetTransaction,
}) {
  const navigation = useNavigation();
  /* Get params from navigation */
  const route = useRoute();

  const { colors } = useTheme();
  const styles = createStyles(colors);

  const {
    sourceTokenAddress,
    destinationTokenAddress,
    sourceAmount,
    slippage,
    tokens,
  } = useMemo(() => getQuotesNavigationsParams(route), [route]);

  /* Get tokens from the tokens list */
  const sourceToken = [...swapsTokens, ...tokens].find((token) =>
    toLowerCaseEquals(token.address, sourceTokenAddress),
  );
  const destinationToken = [...swapsTokens, ...tokens].find((token) =>
    toLowerCaseEquals(token.address, destinationTokenAddress),
  );

  /* State */
  const isMainnet = isMainnetByChainId(chainId);
  const multiLayerFeeNetwork = isMultiLayerFeeNetwork(chainId);
  const [firstLoadTime, setFirstLoadTime] = useState(Date.now());
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [shouldFinishFirstLoad, setShouldFinishFirstLoad] = useState(false);
  const [remainingTime, setRemainingTime] = useState(POLLING_INTERVAL);

  const [allQuotesFetchTime, setAllQuotesFetchTime] = useState(null);
  const [trackedRequestedQuotes, setTrackedRequestedQuotes] = useState(false);
  const [trackedReceivedQuotes, setTrackedReceivedQuotes] = useState(false);
  const [trackedError, setTrackedError] = useState(false);
  const [animateOnGasChange, setAnimateOnGasChange] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [multiLayerL1ApprovalFeeTotal, setMultiLayerL1ApprovalFeeTotal] =
    useState(null);

  /* Selected quote, initially topAggId (see effects) */
  const [selectedQuoteId, setSelectedQuoteId] = useState(null);

  /* Slippage alert dismissed, values: false, 'high', medium, 'low' */
  const [hasDismissedSlippageAlert, setHasDismissedSlippageAlert] =
    useState(false);

  const [editQuoteTransactionsVisible, setEditQuoteTransactionsVisible] =
    useState(false);

  const [customGasEstimate, setCustomGasEstimate] = useState(null);
  const [customGasLimit, setCustomGasLimit] = useState(null);

  const [isSwiping, setIsSwiping] = useState(false);

  // TODO: use this variable in the future when calculating savings
  const [isSaving] = useState(false);
  const [isInFetch, setIsInFetch] = useState(false);

  useEffect(() => {
    navigation.setOptions(getSwapsQuotesNavbar(navigation, route, colors));
  }, [navigation, route, colors]);

  const hasConversionRate = useMemo(
    () =>
      Boolean(destinationToken) &&
      (isSwapsNativeAsset(destinationToken) ||
        (Object.keys(quotes).length > 0 &&
          (Object.values(quotes)[0]?.destinationTokenRate ?? null) !== null)),
    [destinationToken, quotes],
  );

  /* Get quotes as an array sorted by overallValue */
  const allQuotes = useMemo(() => {
    if (
      !quotes ||
      !quoteValues ||
      Object.keys(quotes).length === 0 ||
      Object.keys(quoteValues).length === 0
    ) {
      return [];
    }

    const orderedAggregators = hasConversionRate
      ? Object.values(quoteValues).sort(
          (a, b) =>
            Number(b.overallValueOfQuote) - Number(a.overallValueOfQuote),
        )
      : Object.values(quotes).sort((a, b) => {
          const comparison = new BigNumber(b.destinationAmount).comparedTo(
            a.destinationAmount,
          );
          if (comparison === 0) {
            // If the  destination amount is the same, we sort by fees ascending
            return (
              Number(quoteValues[a.aggregator]?.ethFee) -
                Number(quoteValues[b.aggregator]?.ethFee) || 0
            );
          }
          return comparison;
          // eslint-disable-next-line no-mixed-spaces-and-tabs
        });

    return orderedAggregators.map(
      (quoteValue) => quotes[quoteValue.aggregator],
    );
  }, [hasConversionRate, quoteValues, quotes]);

  /* Get the selected quote, by default is topAggId */
  const selectedQuote = useMemo(
    () => allQuotes.find((quote) => quote?.aggregator === selectedQuoteId),
    [allQuotes, selectedQuoteId],
  );
  const selectedQuoteValue = useMemo(() => {
    if (!quoteValues[selectedQuoteId] || !multiLayerL1ApprovalFeeTotal) {
      return quoteValues[selectedQuoteId];
    }
    const fees = {
      ethFee: calculateEthFeeForMultiLayer({
        multiLayerL1FeeTotal: multiLayerL1ApprovalFeeTotal,
        ethFee: quoteValues[selectedQuoteId].ethFee,
      }),
      maxEthFee: calculateEthFeeForMultiLayer({
        multiLayerL1FeeTotal: multiLayerL1ApprovalFeeTotal,
        ethFee: quoteValues[selectedQuoteId].maxEthFee,
      }),
    };
    return {
      ...quoteValues[selectedQuoteId],
      ...fees,
    };
  }, [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    quoteValues[selectedQuoteId],
    multiLayerL1ApprovalFeeTotal,
    quoteValues,
    selectedQuoteId,
  ]);

  const gasEstimates = useMemo(
    () => customGasEstimate || usedGasEstimate,
    [customGasEstimate, usedGasEstimate],
  );
  const initialGasLimit = useMemo(() => {
    if (!selectedQuote) {
      return '0';
    }
    return (
      selectedQuoteValue?.tradeMaxGasLimit ||
      gasLimitWithMultiplier(
        selectedQuote?.gasEstimate,
        selectedQuote?.gasMultiplier,
      )?.toString(10) ||
      selectedQuote?.maxGas?.toString(10)
    );
  }, [selectedQuote, selectedQuoteValue]);
  const gasLimit = useMemo(
    () => customGasLimit || initialGasLimit,
    [customGasLimit, initialGasLimit],
  );
  /* Balance */
  const checkEnoughEthBalance = useCallback(
    (gasAmountHex) => {
      const gasBN = new BigNumber(gasAmountHex || '0', 16);
      const ethAmountBN = isSwapsNativeAsset(sourceToken)
        ? new BigNumber(sourceAmount)
        : new BigNumber(0);
      const ethBalanceBN = new BigNumber(accounts[selectedAddress].balance);
      const hasEnoughEthBalance = ethBalanceBN.gte(ethAmountBN.plus(gasBN));
      return hasEnoughEthBalance;
    },
    [accounts, selectedAddress, sourceAmount, sourceToken],
  );

  const balance = useBalance(accounts, balances, selectedAddress, sourceToken, {
    asUnits: true,
  });
  const [
    hasEnoughTokenBalance,
    missingTokenBalance,
    hasEnoughEthBalance,
    missingEthBalance,
  ] = useMemo(() => {
    // Token
    const sourceBN = new BigNumber(sourceAmount);
    const tokenBalanceBN = new BigNumber(balance.toString(10));
    const hasEnoughTokenBalance = tokenBalanceBN.gte(sourceBN);
    const missingTokenBalance = hasEnoughTokenBalance
      ? null
      : sourceBN.minus(tokenBalanceBN);

    const ethAmountBN = isSwapsNativeAsset(sourceToken)
      ? sourceBN
      : new BigNumber(0);
    const ethBalanceBN = new BigNumber(accounts[selectedAddress].balance);
    const gasBN = toWei(selectedQuoteValue?.maxEthFee || '0');
    const hasEnoughEthBalance = ethBalanceBN.gte(ethAmountBN.plus(gasBN));
    const missingEthBalance = hasEnoughEthBalance
      ? null
      : ethAmountBN.plus(gasBN).minus(ethBalanceBN);

    return [
      hasEnoughTokenBalance,
      missingTokenBalance,
      hasEnoughEthBalance,
      missingEthBalance,
    ];
  }, [
    accounts,
    balance,
    selectedQuoteValue,
    selectedAddress,
    sourceAmount,
    sourceToken,
  ]);

  /* Selected quote slippage */
  const shouldDisplaySlippage = useMemo(
    () =>
      (selectedQuote &&
        [SLIPPAGE_BUCKETS.MEDIUM, SLIPPAGE_BUCKETS.HIGH].includes(
          selectedQuote?.priceSlippage?.bucket,
        )) ||
      selectedQuote?.priceSlippage?.calculationError?.length > 0,
    [selectedQuote],
  );

  const slippageRatio = useMemo(
    () =>
      parseFloat(
        new BigNumber(selectedQuote?.priceSlippage?.ratio || 0, 10)
          .minus(1, 10)
          .times(100, 10)
          .toFixed(2),
        10,
      ),
    [selectedQuote],
  );

  const unableToSwap = useMemo(
    () =>
      !isInPolling ||
      isInFetch ||
      !selectedQuote ||
      !hasEnoughTokenBalance ||
      !hasEnoughEthBalance,
    [
      isInPolling,
      isInFetch,
      selectedQuote,
      hasEnoughTokenBalance,
      hasEnoughEthBalance,
    ],
  );

  /* Approval transaction if any */
  const [approvalTransaction, setApprovalTransaction] = useState(
    originalApprovalTransaction,
  );

  const approvalMinimumSpendLimit = useMemo(() => {
    if (!approvalTransaction) return '0';
    return fromTokenMinimalUnit(sourceAmount, sourceToken.decimals);
  }, [approvalTransaction, sourceAmount, sourceToken.decimals]);

  const onCancelEditQuoteTransactions = useCallback(
    () => setEditQuoteTransactionsVisible(false),
    [],
  );

  useEffect(() => {
    setApprovalTransaction(originalApprovalTransaction);
  }, [originalApprovalTransaction]);

  /* Modals, state and handlers */
  const [isFeeModalVisible, toggleFeeModal, , hideFeeModal] =
    useModalHandler(false);
  const [isQuotesModalVisible, toggleQuotesModal, , hideQuotesModal] =
    useModalHandler(false);
  const [isUpdateModalVisible, toggleUpdateModal, , hideUpdateModal] =
    useModalHandler(false);
  const [
    isPriceDifferenceModalVisible,
    togglePriceDifferenceModal,
    ,
    hidePriceDifferenceModal,
  ] = useModalHandler(false);
  const [
    isPriceImpactModalVisible,
    togglePriceImpactModal,
    ,
    hidePriceImpactModal,
  ] = useModalHandler(false);

  const [isEditingGas, , showEditingGas, hideEditingGas] =
    useModalHandler(false);
  const [isGasTooltipVisible, , showGasTooltip, hideGasTooltip] =
    useModalHandler(false);

  const handleGasFeeUpdate = useCallback(
    (changedGasEstimate, changedGasLimit) => {
      const { SwapsController } = Engine.context;
      setCustomGasEstimate(changedGasEstimate);
      SwapsController.updateQuotesWithGasPrice(changedGasEstimate);
      if (changedGasLimit && changedGasLimit !== gasLimit) {
        setCustomGasLimit(changedGasLimit);
        SwapsController.updateSelectedQuoteWithGasLimit(
          addHexPrefix(new BigNumber(changedGasLimit).toString(16)),
        );
      }
      InteractionManager.runAfterInteractions(() => {
        const parameters = {
          speed_set: changedGasEstimate?.selected,
          gas_mode: changedGasEstimate?.selected ? 'Basic' : 'Advanced',
          // TODO: how should we track EIP1559 values?
          gas_fees: [
            GAS_ESTIMATE_TYPES.LEGACY,
            GAS_ESTIMATE_TYPES.ETH_GASPRICE,
          ].includes(gasEstimateType)
            ? weiToFiat(
                toWei(
                  swapsUtils.calcTokenAmount(
                    new BigNumber(changedGasLimit, 10).times(
                      decGWEIToHexWEI(changedGasEstimate.gasPrice),
                      16,
                    ),
                    18,
                  ),
                ),
                conversionRate,
                currentCurrency,
                // eslint-disable-next-line no-mixed-spaces-and-tabs
              )
            : '',
          chain_id: chainId,
        };
        Analytics.trackEventWithParameters(
          MetaMetricsEvents.GAS_FEES_CHANGED,
          {},
        );
        Analytics.trackEventWithParameters(
          MetaMetricsEvents.GAS_FEES_CHANGED,
          parameters,
          true,
        );
      });
    },
    [chainId, conversionRate, currentCurrency, gasEstimateType, gasLimit],
  );

  /* Handlers */
  const handleAnimationEnd = useCallback(() => {
    setIsFirstLoad(false);
    if (!error?.key) {
      navigation.setParams({ leftAction: strings('swaps.edit') });
    }
  }, [error, navigation]);

  const handleRetryFetchQuotes = useCallback(() => {
    if (error?.key === swapsUtils.SwapsError.QUOTES_EXPIRED_ERROR) {
      navigation.setParams({ leftAction: strings('navigation.back') });
      setFirstLoadTime(Date.now());
      setIsFirstLoad(true);
      setTrackedRequestedQuotes(false);
      setTrackedReceivedQuotes(false);
      setTrackedError(false);
      resetAndStartPolling({
        slippage,
        sourceToken,
        destinationToken,
        sourceAmount,
        walletAddress: selectedAddress,
      });
    } else {
      navigation.pop();
    }
  }, [
    error,
    slippage,
    sourceToken,
    destinationToken,
    sourceAmount,
    selectedAddress,
    navigation,
  ]);

  const updateSwapsTransactions = useCallback(
    async (
      transactionMeta,
      approvalTransactionMetaId,
      newSwapsTransactions,
    ) => {
      const { TransactionController } = Engine.context;
      const blockNumber = await query(
        TransactionController.ethQuery,
        'blockNumber',
        [],
      );
      const currentBlock = await query(
        TransactionController.ethQuery,
        'getBlockByNumber',
        [blockNumber, false],
      );
      newSwapsTransactions[transactionMeta.id] = {
        action: 'swap',
        sourceToken: {
          address: sourceToken.address,
          decimals: sourceToken.decimals,
        },
        destinationToken: {
          address: destinationToken.address,
          decimals: destinationToken.decimals,
        },
        sourceAmount,
        destinationAmount: selectedQuote.destinationAmount,
        sourceAmountInFiat: weiToFiat(
          toWei(selectedQuote.priceSlippage?.sourceAmountInETH),
          conversionRate,
          currentCurrency,
        ),
        analytics: {
          token_from: sourceToken.symbol,
          token_from_amount: fromTokenMinimalUnitString(
            sourceAmount,
            sourceToken.decimals,
          ),
          token_to: destinationToken.symbol,
          token_to_amount: fromTokenMinimalUnitString(
            selectedQuote.destinationAmount,
            destinationToken.decimals,
          ),
          request_type: hasEnoughTokenBalance ? 'Order' : 'Quote',
          custom_slippage: slippage !== AppConstants.SWAPS.DEFAULT_SLIPPAGE,
          best_quote_source: selectedQuote.aggregator,
          available_quotes: allQuotes.length,
          network_fees_USD: weiToFiat(
            toWei(selectedQuoteValue?.ethFee),
            conversionRate,
            currentCurrency,
          ),
          network_fees_ETH: renderFromWei(toWei(selectedQuoteValue?.ethFee)),
          other_quote_selected: allQuotes[selectedQuoteId] === selectedQuote,
          chain_id: chainId,
        },
        paramsForAnalytics: {
          sentAt: currentBlock.timestamp,
          gasEstimate: selectedQuote?.gasEstimate || selectedQuote?.maxGas,
          ethAccountBalance: accounts[selectedAddress].balance,
          approvalTransactionMetaId,
        },
      };
      TransactionController.update({ swapsTransactions: newSwapsTransactions });
    },
    [
      chainId,
      accounts,
      selectedAddress,
      currentCurrency,
      selectedQuote,
      sourceToken,
      sourceAmount,
      destinationToken,
      hasEnoughTokenBalance,
      slippage,
      allQuotes,
      selectedQuoteId,
      conversionRate,
      selectedQuoteValue,
    ],
  );

  const startSwapAnalytics = useCallback(
    (selectedQuote) => {
      InteractionManager.runAfterInteractions(() => {
        const parameters = {
          token_from: sourceToken.symbol,
          token_from_amount: fromTokenMinimalUnitString(
            sourceAmount,
            sourceToken.decimals,
          ),
          token_to: destinationToken.symbol,
          token_to_amount: fromTokenMinimalUnitString(
            selectedQuote.destinationAmount,
            destinationToken.decimals,
          ),
          request_type: hasEnoughTokenBalance ? 'Order' : 'Quote',
          slippage,
          custom_slippage: slippage !== AppConstants.SWAPS.DEFAULT_SLIPPAGE,
          best_quote_source: selectedQuote.aggregator,
          available_quotes: allQuotes,
          other_quote_selected: allQuotes[selectedQuoteId] === selectedQuote,
          network_fees_USD: weiToFiat(
            toWei(selectedQuoteValue?.ethFee),
            conversionRate,
            'usd',
          ),
          network_fees_ETH: renderFromWei(toWei(selectedQuoteValue?.ethFee)),
          chain_id: chainId,
        };
        Analytics.trackEventWithParameters(MetaMetricsEvents.SWAP_STARTED, {});
        Analytics.trackEventWithParameters(
          MetaMetricsEvents.SWAP_STARTED,
          parameters,
          true,
        );
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      chainId,
      sourceAmount,
      hasEnoughTokenBalance,
      slippage,
      allQuotes,
      selectedQuoteValue,
      selectedQuoteId,
      conversionRate,
      destinationToken,
    ],
  );

  const handleSwapTransaction = useCallback(
    async (
      TransactionController,
      newSwapsTransactions,
      approvalTransactionMetaId,
    ) => {
      if (!selectedQuote) {
        return;
      }

      try {
        resetTransaction();
        const { transactionMeta } = await TransactionController.addTransaction(
          {
            ...selectedQuote.trade,
            ...getTransactionPropertiesFromGasEstimates(
              gasEstimateType,
              gasEstimates,
            ),
            gas: new BigNumber(gasLimit).toString(16),
          },
          process.env.MM_FOX_CODE,
          WalletDevice.MM_MOBILE,
        );
        updateSwapsTransactions(
          transactionMeta,
          approvalTransactionMetaId,
          newSwapsTransactions,
        );
        setRecipient(selectedAddress);
        await addTokenToAssetsController(destinationToken);
        await addTokenToAssetsController(sourceToken);
      } catch (e) {
        // send analytics
      }
    },
    [
      destinationToken,
      gasEstimateType,
      gasEstimates,
      gasLimit,
      selectedQuote,
      sourceToken,
      updateSwapsTransactions,
      selectedAddress,
      setRecipient,
      resetTransaction,
    ],
  );

  const handleApprovaltransaction = useCallback(
    async (
      TransactionController,
      newSwapsTransactions,
      approvalTransactionMetaId,
      isHardwareAccount,
    ) => {
      try {
        resetTransaction();
        const { transactionMeta } = await TransactionController.addTransaction(
          {
            ...approvalTransaction,
            ...getTransactionPropertiesFromGasEstimates(
              gasEstimateType,
              gasEstimates,
            ),
          },
          process.env.MM_FOX_CODE,
          WalletDevice.MM_MOBILE,
        );

        setRecipient(selectedAddress);

        approvalTransactionMetaId = transactionMeta.id;
        newSwapsTransactions[transactionMeta.id] = {
          action: 'approval',
          sourceToken: {
            address: sourceToken.address,
            decimals: sourceToken.decimals,
          },
          destinationToken: { swaps: 'swaps' },
          upTo: new BigNumber(
            decodeApproveData(approvalTransaction.data).encodedAmount,
            16,
          ).toString(10),
        };
        if (isHardwareAccount) {
          TransactionController.hub.once(
            `${transactionMeta.id}:finished`,
            (transactionMeta) => {
              if (transactionMeta.status === TransactionStatus.submitted) {
                handleSwapTransaction(
                  TransactionController,
                  newSwapsTransactions,
                  approvalTransactionMetaId,
                  isHardwareAccount,
                );
              }
            },
          );
        }
      } catch (e) {
        // send analytics
      }
    },
    [
      approvalTransaction,
      gasEstimateType,
      gasEstimates,
      handleSwapTransaction,
      sourceToken.address,
      sourceToken.decimals,
      selectedAddress,
      setRecipient,
      resetTransaction,
    ],
  );

  const handleCompleteSwap = useCallback(async () => {
    if (!selectedQuote) {
      return;
    }

    const isHardwareAccount = isQRHardwareAccount(selectedAddress);

    startSwapAnalytics(selectedQuote);

    const { TransactionController } = Engine.context;
    const newSwapsTransactions =
      TransactionController.state.swapsTransactions || {};
    let approvalTransactionMetaId;

    if (approvalTransaction) {
      handleApprovaltransaction(
        TransactionController,
        newSwapsTransactions,
        approvalTransactionMetaId,
        isHardwareAccount,
      );

      if (isHardwareAccount) {
        navigation.dangerouslyGetParent()?.pop();
        return;
      }
    }

    handleSwapTransaction(
      TransactionController,
      newSwapsTransactions,
      approvalTransactionMetaId,
      isHardwareAccount,
    );

    navigation.dangerouslyGetParent()?.pop();
  }, [
    selectedQuote,
    selectedAddress,
    approvalTransaction,
    startSwapAnalytics,
    handleApprovaltransaction,
    handleSwapTransaction,
    navigation,
  ]);

  const onEditQuoteTransactionsGas = useCallback(() => {
    showEditingGas();
  }, [showEditingGas]);

  const onEditQuoteTransactionsApproveAmount = useCallback(() => {
    if (!approvalTransaction || !originalApprovalTransaction) {
      return;
    }
    const originalApprovalTransactionEncodedAmount = decodeApproveData(
      originalApprovalTransaction.data,
    ).encodedAmount;
    const originalAmount = fromTokenMinimalUnitString(
      hexToBN(originalApprovalTransactionEncodedAmount).toString(10),
      sourceToken.decimals,
    );
    const currentApprovalTransactionEncodedAmount = approvalTransaction
      ? decodeApproveData(approvalTransaction.data).encodedAmount
      : '0';
    const currentAmount = fromTokenMinimalUnitString(
      hexToBN(currentApprovalTransactionEncodedAmount).toString(10),
      sourceToken.decimals,
    );

    setEditQuoteTransactionsVisible(true);

    InteractionManager.runAfterInteractions(() => {
      const parameters = {
        token_from: sourceToken.symbol,
        token_from_amount: fromTokenMinimalUnitString(
          sourceAmount,
          sourceToken.decimals,
        ),
        token_to: destinationToken.symbol,
        token_to_amount: fromTokenMinimalUnitString(
          selectedQuote.destinationAmount,
          destinationToken.decimals,
        ),
        request_type: hasEnoughTokenBalance ? 'Order' : 'Quote',
        slippage,
        custom_slippage: slippage !== AppConstants.SWAPS.DEFAULT_SLIPPAGE,
        available_quotes: allQuotes.length,
        best_quote_source: selectedQuote.aggregator,
        other_quote_selected: allQuotes[selectedQuoteId] === selectedQuote,
        gas_fees: weiToFiat(
          toWei(selectedQuoteValue?.ethFee),
          conversionRate,
          currentCurrency,
        ),
        custom_spend_limit_set: originalAmount !== currentAmount,
        custom_spend_limit_amount: currentAmount,
        chain_id: chainId,
      };
      Analytics.trackEventWithParameters(
        MetaMetricsEvents.EDIT_SPEND_LIMIT_OPENED,
        {},
      );
      Analytics.trackEventWithParameters(
        MetaMetricsEvents.EDIT_SPEND_LIMIT_OPENED,
        parameters,
        true,
      );
    });
  }, [
    chainId,
    allQuotes,
    approvalTransaction,
    conversionRate,
    currentCurrency,
    destinationToken,
    selectedQuoteValue,
    hasEnoughTokenBalance,
    originalApprovalTransaction,
    selectedQuote,
    selectedQuoteId,
    slippage,
    sourceAmount,
    sourceToken,
  ]);

  const handleQuotesReceivedMetric = useCallback(() => {
    if (!selectedQuote || !selectedQuoteValue) return;
    InteractionManager.runAfterInteractions(() => {
      const parameters = {
        token_from: sourceToken.symbol,
        token_from_amount: fromTokenMinimalUnitString(
          sourceAmount,
          sourceToken.decimals,
        ),
        token_to: destinationToken.symbol,
        token_to_amount: fromTokenMinimalUnitString(
          selectedQuote.destinationAmount,
          destinationToken.decimals,
        ),
        request_type: hasEnoughTokenBalance ? 'Order' : 'Quote',
        slippage,
        custom_slippage: slippage !== AppConstants.SWAPS.DEFAULT_SLIPPAGE,
        response_time: allQuotesFetchTime,
        best_quote_source: selectedQuote.aggregator,
        network_fees_USD: weiToFiat(
          toWei(selectedQuoteValue.ethFee),
          conversionRate,
          'usd',
        ),
        network_fees_ETH: renderFromWei(toWei(selectedQuoteValue.ethFee)),
        available_quotes: allQuotes.length,
        chain_id: chainId,
      };
      Analytics.trackEventWithParameters(MetaMetricsEvents.QUOTES_RECEIVED, {});
      Analytics.trackEventWithParameters(
        MetaMetricsEvents.QUOTES_RECEIVED,
        parameters,
        true,
      );
    });
  }, [
    chainId,
    sourceToken,
    sourceAmount,
    destinationToken,
    selectedQuote,
    hasEnoughTokenBalance,
    slippage,
    allQuotesFetchTime,
    selectedQuoteValue,
    allQuotes,
    conversionRate,
  ]);

  const handleOpenQuotesModal = useCallback(() => {
    if (!selectedQuote || !selectedQuoteValue) return;
    toggleQuotesModal();
    InteractionManager.runAfterInteractions(() => {
      const parameters = {
        token_from: sourceToken.symbol,
        token_from_amount: fromTokenMinimalUnitString(
          sourceAmount,
          sourceToken.decimals,
        ),
        token_to: destinationToken.symbol,
        token_to_amount: fromTokenMinimalUnitString(
          selectedQuote.destinationAmount,
          destinationToken.decimals,
        ),
        request_type: hasEnoughTokenBalance ? 'Order' : 'Quote',
        slippage,
        custom_slippage: slippage !== AppConstants.SWAPS.DEFAULT_SLIPPAGE,
        response_time: allQuotesFetchTime,
        best_quote_source: selectedQuote.aggregator,
        network_fees_USD: weiToFiat(
          toWei(selectedQuoteValue.ethFee),
          conversionRate,
          'usd',
        ),
        network_fees_ETH: renderFromWei(toWei(selectedQuoteValue.ethFee)),
        available_quotes: allQuotes.length,
        chain_id: chainId,
      };
      Analytics.trackEventWithParameters(
        MetaMetricsEvents.ALL_AVAILABLE_QUOTES_OPENED,
        {},
      );
      Analytics.trackEventWithParameters(
        MetaMetricsEvents.ALL_AVAILABLE_QUOTES_OPENED,
        parameters,
        true,
      );
    });
  }, [
    chainId,
    selectedQuote,
    selectedQuoteValue,
    toggleQuotesModal,
    sourceToken,
    sourceAmount,
    destinationToken,
    hasEnoughTokenBalance,
    slippage,
    allQuotesFetchTime,
    conversionRate,
    allQuotes.length,
  ]);

  const handleQuotesErrorMetric = useCallback(
    (error) => {
      const data = {
        token_from: sourceToken.symbol,
        token_from_amount: fromTokenMinimalUnitString(
          sourceAmount,
          sourceToken.decimals,
        ),
        token_to: destinationToken.symbol,
        request_type: hasEnoughTokenBalance ? 'Order' : 'Quote',
        slippage,
        custom_slippage: slippage !== AppConstants.SWAPS.DEFAULT_SLIPPAGE,
        chain_id: chainId,
      };
      if (error?.key === swapsUtils.SwapsError.QUOTES_EXPIRED_ERROR) {
        InteractionManager.runAfterInteractions(() => {
          const parameters = {
            ...data,
            gas_fees: '',
          };
          Analytics.trackEventWithParameters(
            MetaMetricsEvents.QUOTES_TIMED_OUT,
            {},
          );
          Analytics.trackEventWithParameters(
            MetaMetricsEvents.QUOTES_TIMED_OUT,
            parameters,
            true,
          );
        });
      } else if (
        error?.key === swapsUtils.SwapsError.QUOTES_NOT_AVAILABLE_ERROR
      ) {
        InteractionManager.runAfterInteractions(() => {
          const parameters = { ...data };
          Analytics.trackEventWithParameters(
            MetaMetricsEvents.NO_QUOTES_AVAILABLE,
            {},
          );
          Analytics.trackEventWithParameters(
            MetaMetricsEvents.NO_QUOTES_AVAILABLE,
            parameters,
            true,
          );
        });
      } else {
        trackErrorAsAnalytics(`Swaps: ${error?.key}`, error?.description);
      }
    },
    [
      chainId,
      sourceToken,
      sourceAmount,
      destinationToken,
      hasEnoughTokenBalance,
      slippage,
    ],
  );

  const handleSlippageAlertPress = useCallback(() => {
    if (!selectedQuote) {
      return;
    }
    setHasDismissedSlippageAlert(selectedQuote.priceSlippage?.bucket ?? false);
  }, [selectedQuote]);

  const buyEth = useCallback(() => {
    try {
      navigation.navigate('FiatOnRampAggregator');
    } catch (error) {
      Logger.error(error, 'Navigation: Error when navigating to buy ETH.');
    }
    InteractionManager.runAfterInteractions(() => {
      Analytics.trackEvent(MetaMetricsEvents.RECEIVE_OPTIONS_PAYMENT_REQUEST);
    });
  }, [navigation]);

  const handleTermsPress = useCallback(
    () =>
      navigation.navigate('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: AppConstants.URLS.TERMS_AND_CONDITIONS,
        },
      }),
    [navigation],
  );

  /* Effects */

  /* Main polling effect */
  useEffect(() => {
    resetAndStartPolling({
      slippage,
      sourceToken,
      destinationToken,
      sourceAmount,
      walletAddress: selectedAddress,
    });

    return () => {
      const { SwapsController } = Engine.context;
      SwapsController.stopPollingAndResetState();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    destinationToken.address,
    selectedAddress,
    slippage,
    sourceAmount,
    sourceToken.address,
  ]);

  /** selectedQuote alert effect */
  useEffect(() => {
    if (!selectedQuote) {
      return setHasDismissedSlippageAlert(false);
    }
    if (
      Boolean(hasDismissedSlippageAlert) &&
      selectedQuote?.priceSlippage?.bucket !== hasDismissedSlippageAlert
    ) {
      return setHasDismissedSlippageAlert(false);
    }
  }, [hasDismissedSlippageAlert, selectedQuote]);

  /* First load effect: handle initial animation */
  useEffect(() => {
    if (isFirstLoad && !shouldFinishFirstLoad) {
      if (firstLoadTime < quotesLastFetched || error) {
        setShouldFinishFirstLoad(true);
        if (!error) {
          navigation.setParams({ leftAction: strings('swaps.edit') });
        }
      }
    }
  }, [
    error,
    firstLoadTime,
    isFirstLoad,
    navigation,
    quotesLastFetched,
    shouldFinishFirstLoad,
  ]);

  useEffect(() => {
    let maxFetchTime = 0;
    allQuotes.forEach((quote) => {
      maxFetchTime = Math.max(maxFetchTime, quote?.fetchTime);
    });
    setAllQuotesFetchTime(maxFetchTime);
  }, [allQuotes]);

  /* selectedQuoteId effect: when topAggId changes make it selected by default */
  useEffect(() => setSelectedQuoteId(topAggId), [topAggId]);

  /* IsInFetch effect: hide every modal, handle countdown */
  useEffect(() => {
    const tick = setInterval(() => {
      const newRemainingTime =
        quotesLastFetched + quoteRefreshSeconds * 1000 - Date.now() + 1000;
      // If newRemainingTime > remainingTime means that a new set of quotes were fetched
      if (newRemainingTime > remainingTime) {
        hideFeeModal();
        hideQuotesModal();
        hidePriceDifferenceModal();
        hidePriceImpactModal();
        onCancelEditQuoteTransactions();
        hideEditingGas();
      }

      // If newRemainingTime < 0 means that quotes are still being fetched
      // then we show a loader
      if (!isInFetch && newRemainingTime < 0) {
        setIsInFetch(true);
      } else if (isInFetch && newRemainingTime > 0) {
        setIsInFetch(false);
      }

      setRemainingTime(newRemainingTime);
    }, 1000);
    return () => {
      clearInterval(tick);
    };
  }, [
    hideFeeModal,
    hideEditingGas,
    hideQuotesModal,
    onCancelEditQuoteTransactions,
    isInFetch,
    quotesLastFetched,
    quoteRefreshSeconds,
    remainingTime,
    hidePriceDifferenceModal,
    hidePriceImpactModal,
  ]);

  /* errorKey effect: hide every modal */
  useEffect(() => {
    if (error) {
      hideFeeModal();
      hideQuotesModal();
      hideUpdateModal();
      hidePriceDifferenceModal();
      onCancelEditQuoteTransactions();
      hideEditingGas();
    }
  }, [
    error,
    hideFeeModal,
    hideEditingGas,
    hideQuotesModal,
    handleQuotesErrorMetric,
    onCancelEditQuoteTransactions,
    hidePriceDifferenceModal,
    hideUpdateModal,
  ]);

  /** Gas Effects */

  const [pollToken, setPollToken] = useState(null);

  useEffect(() => {
    const { GasFeeController } = Engine.context;
    async function polling() {
      const newPollToken =
        await GasFeeController.getGasFeeEstimatesAndStartPolling(pollToken);
      setPollToken(newPollToken);
    }
    if (isInPolling) {
      polling();
      return () => {
        GasFeeController.stopPolling(pollToken);
        setPollToken(null);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInPolling]);

  useEffect(
    () => {
      if (selectedQuote) {
        const { SwapsController } = Engine.context;
        let gasEstimate = null;
        let customGasAreIncompatible = false;
        if (gasEstimateType === GAS_ESTIMATE_TYPES.ETH_GASPRICE) {
          // Added a selected property because for ETH_GASPRICE any user change will lead
          // to stop updating the estimates, unless there is an option selected.
          customGasAreIncompatible =
            Boolean(customGasEstimate) &&
            'estimatedBaseFee' in customGasEstimate;
          gasEstimate = {
            gasPrice: gasFeeEstimates.gasPrice,
            selected: DEFAULT_GAS_FEE_OPTION_LEGACY,
          };
        } else if (gasEstimateType === GAS_ESTIMATE_TYPES.LEGACY) {
          customGasAreIncompatible =
            Boolean(customGasEstimate) &&
            'estimatedBaseFee' in customGasEstimate;
          const selected =
            customGasEstimate?.selected || DEFAULT_GAS_FEE_OPTION_LEGACY;
          gasEstimate = { gasPrice: gasFeeEstimates[selected], selected };
        } else if (gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
          customGasAreIncompatible =
            Boolean(customGasEstimate) && 'gasPrice' in customGasEstimate;
          const selected =
            customGasEstimate?.selected || DEFAULT_GAS_FEE_OPTION_FEE_MARKET;
          gasEstimate = {
            maxFeePerGas: gasFeeEstimates[selected].suggestedMaxFeePerGas,
            maxPriorityFeePerGas:
              gasFeeEstimates[selected].suggestedMaxPriorityFeePerGas,
            estimatedBaseFee: gasFeeEstimates.estimatedBaseFee,
            selected,
          };
        }
        if (
          gasEstimate &&
          (!customGasEstimate ||
            customGasEstimate?.selected ||
            customGasAreIncompatible)
        ) {
          setAnimateOnGasChange(true);
          setCustomGasEstimate(gasEstimate);
          SwapsController.updateQuotesWithGasPrice(gasEstimate);
        }
      }
    },
    // `customGasEstimate` is removed from dependency array because handleGasFeeUpdate updates it
    // leading to a infinite recursive call
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gasEstimateType, gasFeeEstimates, selectedQuote],
  );

  useEffect(() => {
    if (animateOnGasChange) setAnimateOnGasChange(false);
  }, [animateOnGasChange]);

  const onGasAnimationStart = useCallback(() => setIsAnimating(true), []);
  const onGasAnimationEnd = useCallback(() => setIsAnimating(false), []);

  /** Metrics Effects */
  /* Metrics: Quotes requested */
  useEffect(() => {
    if (!isInFetch) return;
    if (trackedRequestedQuotes) return;
    setTrackedRequestedQuotes(true);
    const data = {
      token_from: sourceToken.symbol,
      token_from_amount: fromTokenMinimalUnitString(
        sourceAmount,
        sourceToken.decimals,
      ),
      token_to: destinationToken.symbol,
      request_type: hasEnoughTokenBalance ? 'Order' : 'Quote',
      custom_slippage: slippage !== AppConstants.SWAPS.DEFAULT_SLIPPAGE,
      chain_id: chainId,
    };
    navigation.setParams({ requestedTrade: data });
    navigation.setParams({ selectedQuote: undefined });
    navigation.setParams({ quoteBegin: Date.now() });
    InteractionManager.runAfterInteractions(() => {
      Analytics.trackEventWithParameters(
        MetaMetricsEvents.QUOTES_REQUESTED,
        {},
      );
      Analytics.trackEventWithParameters(
        MetaMetricsEvents.QUOTES_REQUESTED,
        data,
        true,
      );
    });
  }, [
    chainId,
    destinationToken,
    hasEnoughTokenBalance,
    isInFetch,
    navigation,
    slippage,
    sourceAmount,
    sourceToken,
    trackedRequestedQuotes,
  ]);

  /* Metrics: Quotes received */
  useEffect(() => {
    if (isInFetch) return;
    if (!selectedQuote) return;
    if (trackedReceivedQuotes) return;
    setTrackedReceivedQuotes(true);
    navigation.setParams({ selectedQuote });
    handleQuotesReceivedMetric();
  }, [
    isInFetch,
    navigation,
    selectedQuote,
    quotesLastFetched,
    handleQuotesReceivedMetric,
    trackedReceivedQuotes,
  ]);

  /* Metrics: Quotes error */
  useEffect(() => {
    if (!error?.key || trackedError) return;
    setTrackedError(true);
    handleQuotesErrorMetric(error);
  }, [error, handleQuotesErrorMetric, trackedError]);

  useEffect(() => {
    if (!multiLayerFeeNetwork) {
      return;
    }
    const getEstimatedL1ApprovalFee = async () => {
      try {
        const eth = new Eth(Engine.context.NetworkController.provider);
        let l1ApprovalFeeTotal = '0x0';
        if (approvalTransaction) {
          l1ApprovalFeeTotal = await fetchEstimatedMultiLayerL1Fee(eth, {
            txParams: {
              ...approvalTransaction,
              value: '0x0', // For approval txs we need to use "0x0" here.
            },
            chainId,
          });
          setMultiLayerL1ApprovalFeeTotal(l1ApprovalFeeTotal);
        }
      } catch (e) {
        Logger.error(e, 'fetchEstimatedMultiLayerL1Fee call failed');
        setMultiLayerL1ApprovalFeeTotal(null);
      }
    };
    getEstimatedL1ApprovalFee();
  }, [multiLayerFeeNetwork, approvalTransaction, chainId]);

  const openLinkAboutGas = () =>
    Linking.openURL(
      'https://community.metamask.io/t/what-is-gas-why-do-transactions-take-so-long/3172',
    );

  /* Rendering */
  if (isFirstLoad || (!error?.key && !selectedQuote)) {
    return (
      <ScreenView contentContainerStyle={styles.screen} scrollEnabled={false}>
        <LoadingAnimation
          finish={shouldFinishFirstLoad}
          onAnimationEnd={handleAnimationEnd}
          aggregatorMetadata={aggregatorMetadata}
          headPan={false}
        />
      </ScreenView>
    );
  }

  if (!isInPolling && error?.key) {
    const [errorTitle, errorMessage, errorAction] = getErrorMessage(error?.key);
    const errorIcon =
      error?.key === swapsUtils.SwapsError.QUOTES_EXPIRED_ERROR ? (
        <MaterialCommunityIcons
          name="clock-outline"
          style={[styles.errorIcon, styles.expiredIcon]}
        />
      ) : (
        <MaterialCommunityIcons
          name="alert-outline"
          style={[styles.errorIcon]}
        />
      );

    return (
      <ScreenView contentContainerStyle={styles.screen}>
        <View style={[styles.content, styles.errorViewContent]}>
          {errorIcon}
          <Text primary centered style={styles.errorTitle}>
            {errorTitle}
          </Text>
          <Text centered style={styles.errorText}>
            {errorMessage}
          </Text>
        </View>
        <View style={styles.bottomSection}>
          <StyledButton
            type="blue"
            containerStyle={styles.ctaButton}
            onPress={handleRetryFetchQuotes}
          >
            {errorAction}
          </StyledButton>
        </View>
      </ScreenView>
    );
  }

  const disabledView =
    shouldDisplaySlippage &&
    !hasDismissedSlippageAlert &&
    hasEnoughTokenBalance &&
    hasEnoughEthBalance;

  return (
    <ScreenView
      contentContainerStyle={styles.screen}
      style={styles.container}
      keyboardShouldPersistTaps="handled"
      scrollEnabled={!isSwiping}
    >
      <View style={styles.topBar}>
        {(!hasEnoughTokenBalance || !hasEnoughEthBalance) && (
          <View style={styles.alertBar}>
            <Alert small type={AlertType.Info}>
              {`${strings('swaps.you_need')} `}
              <Text reset bold>
                {!hasEnoughTokenBalance && !isSwapsNativeAsset(sourceToken)
                  ? `${renderFromTokenMinimalUnit(
                      missingTokenBalance,
                      sourceToken.decimals,
                    )} ${
                      sourceToken.symbol
                      // eslint-disable-next-line no-mixed-spaces-and-tabs
                    } `
                  : `${renderFromWei(missingEthBalance)} ${getTicker(ticker)} `}
              </Text>
              {!hasEnoughTokenBalance
                ? `${strings('swaps.more_to_complete')} `
                : `${strings('swaps.more_gas_to_complete')} `}
              {(isSwapsNativeAsset(sourceToken) ||
                (hasEnoughTokenBalance && !hasEnoughEthBalance)) && (
                <Text link underline small onPress={buyEth}>
                  {strings('swaps.buy_more', { ticker: getTicker(ticker) })}
                </Text>
              )}
            </Alert>
          </View>
        )}
        {!!selectedQuote &&
          hasEnoughTokenBalance &&
          hasEnoughEthBalance &&
          shouldDisplaySlippage && (
            <View style={styles.alertBar}>
              <ActionAlert
                type={
                  selectedQuote.priceSlippage?.bucket === SLIPPAGE_BUCKETS.HIGH
                    ? AlertType.Error
                    : AlertType.Warning
                }
                action={
                  hasDismissedSlippageAlert
                    ? undefined
                    : strings('swaps.i_understand')
                }
                onPress={handleSlippageAlertPress}
                onInfoPress={
                  selectedQuote.priceSlippage?.calculationError?.length > 0
                    ? togglePriceImpactModal
                    : togglePriceDifferenceModal
                }
              >
                {(textStyle) =>
                  selectedQuote.priceSlippage?.calculationError?.length > 0 ? (
                    <>
                      <Text style={textStyle} bold centered>
                        {strings('swaps.market_price_unavailable_title')}
                      </Text>
                      <Text style={textStyle} small centered>
                        {strings('swaps.market_price_unavailable')}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={textStyle} bold centered>
                        {strings('swaps.price_difference', {
                          amount: `~${slippageRatio}%`,
                        })}
                      </Text>
                      <Text style={textStyle} centered>
                        {strings('swaps.about_to_swap')}{' '}
                        {renderFromTokenMinimalUnit(
                          selectedQuote.sourceAmount,
                          sourceToken.decimals,
                        )}{' '}
                        {sourceToken.symbol} (~
                        <Text reset upper>
                          {weiToFiat(
                            toWei(
                              selectedQuote.priceSlippage?.sourceAmountInETH ||
                                0,
                            ),
                            conversionRate,
                            currentCurrency,
                          )}
                        </Text>
                        ) {strings('swaps.for')}{' '}
                        {renderFromTokenMinimalUnit(
                          selectedQuote.destinationAmount,
                          destinationToken.decimals,
                        )}{' '}
                        {destinationToken.symbol} (~
                        <Text reset upper>
                          {weiToFiat(
                            toWei(
                              selectedQuote.priceSlippage
                                ?.destinationAmountInETH || 0,
                            ),
                            conversionRate,
                            currentCurrency,
                          )}
                        </Text>
                        ).
                      </Text>
                    </>
                  )
                }
              </ActionAlert>
            </View>
          )}
        {isInPolling && (
          <TouchableOpacity
            onPress={toggleUpdateModal}
            disabled={disabledView}
            style={[styles.timerWrapper, disabledView && styles.disabled]}
          >
            {isInFetch ? (
              <>
                <ActivityIndicator size="small" />
                <Text style={styles.fetchingText}>
                  {' '}
                  {strings('swaps.fetching_new_quotes')}
                </Text>
              </>
            ) : (
              <Text primary>
                {pollingCyclesLeft > 0
                  ? strings('swaps.new_quotes_in')
                  : strings('swaps.quotes_expire_in')}{' '}
                <Text
                  bold
                  primary
                  style={[
                    styles.timer,
                    remainingTime < 30000 && styles.timerHiglight,
                  ]}
                >
                  {new Date(remainingTime).toISOString().substr(15, 4)}
                </Text>
              </Text>
            )}
          </TouchableOpacity>
        )}
        {!isInPolling && (
          <View style={[styles.timerWrapper, disabledView && styles.disabled]}>
            <Text>...</Text>
          </View>
        )}
      </View>

      <View
        style={[styles.content, disabledView && styles.disabled]}
        pointerEvents={disabledView ? 'none' : 'auto'}
      >
        {selectedQuote && (
          <>
            <View style={styles.sourceTokenContainer}>
              <Text style={styles.tokenText}>
                {renderFromTokenMinimalUnit(
                  selectedQuote.sourceAmount,
                  sourceToken.decimals,
                )}
              </Text>
              <TokenIcon
                style={styles.tokenIcon}
                icon={sourceToken.iconUrl}
                symbol={sourceToken.symbol}
              />
              <Text style={styles.tokenText}>{sourceToken.symbol}</Text>
            </View>
            <IonicIcon style={styles.arrowDown} name="md-arrow-down" />
            <View style={styles.sourceTokenContainer}>
              <TokenIcon
                style={styles.tokenIcon}
                icon={destinationToken.iconUrl}
                symbol={destinationToken.symbol}
              />
              <Text style={[styles.tokenText, styles.tokenTextDestination]}>
                {destinationToken.symbol}
              </Text>
            </View>
            <Text
              primary
              style={styles.amount}
              numberOfLines={1}
              adjustsFontSizeToFit
              allowFontScaling
            >
              ~
              {renderFromTokenMinimalUnit(
                selectedQuote.destinationAmount,
                destinationToken.decimals,
              )}
            </Text>
            <View style={styles.exchangeRate}>
              <Ratio
                sourceAmount={selectedQuote.sourceAmount}
                sourceToken={sourceToken}
                destinationAmount={selectedQuote.destinationAmount}
                destinationToken={destinationToken}
              />
            </View>
          </>
        )}
      </View>

      <View
        style={[styles.bottomSection, disabledView && styles.disabled]}
        pointerEvents={disabledView ? 'none' : 'auto'}
      >
        {selectedQuote && (
          <QuotesSummary style={styles.quotesSummary}>
            <QuotesSummary.Header
              style={styles.quotesSummaryHeader}
              savings={isSaving}
            >
              <QuotesSummary.HeaderText style={styles.bestQuoteText} bold>
                {isSaving
                  ? strings('swaps.savings')
                  : strings('swaps.using_best_quote')}
              </QuotesSummary.HeaderText>
              {allQuotes.length > 1 && (
                <TouchableOpacity
                  onPress={handleOpenQuotesModal}
                  disabled={isInFetch}
                >
                  <QuotesSummary.HeaderText small>
                    {strings('swaps.view_details')} →
                  </QuotesSummary.HeaderText>
                </TouchableOpacity>
              )}
            </QuotesSummary.Header>
            <QuotesSummary.Body>
              <View style={styles.quotesRow}>
                <View style={styles.quotesDescription}>
                  <View style={styles.quotesLegend}>
                    <Text primary bold>
                      {strings('swaps.estimated_gas_fee')}
                    </Text>
                    <TouchableOpacity
                      style={styles.gasInfoContainer}
                      onPress={showGasTooltip}
                      hitSlop={styles.hitSlop}
                    >
                      <MaterialCommunityIcons
                        name="information"
                        size={13}
                        style={styles.gasInfoIcon}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {usedGasEstimate.gasPrice ? (
                  <View style={styles.quotesFiatColumn}>
                    <Text primary bold>
                      {renderFromWei(toWei(selectedQuoteValue?.ethFee))}{' '}
                      {getTicker(ticker)}
                    </Text>
                    <Text primary bold upper>
                      {`  ${
                        weiToFiat(
                          toWei(selectedQuoteValue?.ethFee),
                          conversionRate,
                          currentCurrency,
                        ) || ''
                      }`}
                    </Text>
                  </View>
                ) : (
                  <FadeAnimationView
                    valueToWatch={`${selectedQuoteValue?.ethFee}${selectedQuoteValue?.maxEthFee}`}
                    animateOnChange={animateOnGasChange}
                    onAnimationStart={onGasAnimationStart}
                    onAnimationEnd={onGasAnimationEnd}
                    style={styles.quotesFiatColumn}
                  >
                    {primaryCurrency === 'ETH' ? (
                      <>
                        <Text>
                          {`${
                            weiToFiat(
                              toWei(selectedQuoteValue?.ethFee),
                              conversionRate,
                              currentCurrency,
                            ) || ''
                          } `}
                        </Text>
                        <TouchableOpacity
                          disabled={unableToSwap}
                          onPress={
                            unableToSwap
                              ? undefined
                              : onEditQuoteTransactionsGas
                          }
                        >
                          <Text
                            bold
                            upper
                            link={!unableToSwap}
                            underline={!unableToSwap}
                          >
                            {renderFromWei(toWei(selectedQuoteValue?.ethFee))}{' '}
                            {getTicker(ticker)}
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <TouchableOpacity
                          disabled={unableToSwap}
                          onPress={
                            unableToSwap
                              ? undefined
                              : onEditQuoteTransactionsGas
                          }
                        >
                          <Text
                            upper
                            link={!unableToSwap}
                            underline={!unableToSwap}
                          >
                            {renderFromWei(toWei(selectedQuoteValue?.ethFee))}{' '}
                            {getTicker(ticker)}
                          </Text>
                        </TouchableOpacity>
                        <Text primary bold>
                          {` ${
                            weiToFiat(
                              toWei(selectedQuoteValue?.ethFee),
                              conversionRate,
                              currentCurrency,
                            ) || ''
                          }`}
                        </Text>
                      </>
                    )}
                  </FadeAnimationView>
                )}
              </View>

              <View style={styles.quotesRow}>
                {usedGasEstimate.gasPrice ? (
                  <>
                    <View style={styles.quotesDescription}>
                      <View style={styles.quotesLegend}>
                        <Text>{strings('swaps.max_gas_fee')} </Text>
                      </View>
                    </View>
                    <View style={styles.quotesFiatColumn}>
                      <Text>
                        {renderFromWei(
                          toWei(selectedQuoteValue?.maxEthFee || '0x0'),
                        )}{' '}
                        {getTicker(ticker)}
                      </Text>
                      <Text upper>
                        {`  ${
                          weiToFiat(
                            toWei(selectedQuoteValue?.maxEthFee),
                            conversionRate,
                            currentCurrency,
                          ) || ''
                        }`}
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.quotesDescription} />
                    <FadeAnimationView
                      valueToWatch={`${selectedQuoteValue?.ethFee}${selectedQuoteValue?.maxEthFee}`}
                      animateOnChange={animateOnGasChange}
                      style={styles.quotesFiatColumn}
                    >
                      <Text small primary bold>
                        {strings('transaction_review_eip1559.max_fee')}:
                      </Text>
                      <Text small primary>
                        {primaryCurrency === 'ETH'
                          ? ` ${renderFromWei(
                              toWei(selectedQuoteValue?.maxEthFee || '0x0'),
                            )} ${getTicker(ticker)}` // eslint-disable-line
                          : ` ${
                              weiToFiat(
                                toWei(selectedQuoteValue?.maxEthFee),
                                conversionRate,
                                currentCurrency,
                              ) || '' // eslint-disable-next-line
                            }`}
                      </Text>
                    </FadeAnimationView>
                  </>
                )}
              </View>

              {!!approvalTransaction && !unableToSwap && (
                <View style={styles.quotesRow}>
                  <Text>
                    <Text>{`${strings('swaps.enable.this_will')} `}</Text>
                    <Text bold>
                      {`${strings('swaps.enable.enable_asset', {
                        asset: sourceToken.symbol,
                      })} `}
                    </Text>
                    <Text>{`${strings('swaps.enable.for_swapping')} `}</Text>
                  </Text>
                  <TouchableOpacity
                    onPress={onEditQuoteTransactionsApproveAmount}
                  >
                    <Text link>{`${strings('swaps.enable.edit_limit')}`}</Text>
                  </TouchableOpacity>
                </View>
              )}
              <QuotesSummary.Separator />
              <View style={styles.quotesRow}>
                <TouchableOpacity
                  style={styles.quotesRow}
                  onPress={toggleFeeModal}
                >
                  <Text small>
                    {`${strings('swaps.quotes_include_fee', {
                      fee: selectedQuote.fee,
                    })} `}
                    <MaterialCommunityIcons
                      name="information"
                      style={styles.infoIcon}
                    />
                  </Text>
                </TouchableOpacity>
              </View>
            </QuotesSummary.Body>
          </QuotesSummary>
        )}
        <SliderButton
          incompleteText={
            <Text style={styles.sliderButtonText}>
              {`${strings('swaps.swipe_to')} `}
              <Text reset bold>
                {strings('swaps.swap')}
              </Text>
            </Text>
          }
          onSwipeChange={setIsSwiping}
          completeText={
            <Text style={styles.sliderButtonText}>
              {strings('swaps.completed_swap')}
            </Text>
          }
          disabled={unableToSwap || isAnimating}
          onComplete={handleCompleteSwap}
        />
        <TouchableOpacity onPress={handleTermsPress} style={styles.termsButton}>
          <Text link centered>
            {strings('swaps.terms_of_service')}
          </Text>
        </TouchableOpacity>
      </View>

      <InfoModal
        isVisible={isUpdateModalVisible}
        toggleModal={toggleUpdateModal}
        title={strings('swaps.quotes_update_often')}
        body={
          <Text style={styles.text}>
            {strings('swaps.quotes_update_often_text')}
          </Text>
        }
      />
      <InfoModal
        isVisible={isPriceDifferenceModalVisible}
        toggleModal={togglePriceDifferenceModal}
        title={strings('swaps.price_difference_title')}
        body={
          <Text style={styles.text}>
            {strings('swaps.price_difference_body')}
          </Text>
        }
      />
      <InfoModal
        isVisible={isPriceImpactModalVisible}
        toggleModal={togglePriceImpactModal}
        title={strings('swaps.price_impact_title')}
        body={
          <Text style={styles.text}>{strings('swaps.price_impact_body')}</Text>
        }
      />
      <InfoModal
        isVisible={isFeeModalVisible}
        toggleModal={toggleFeeModal}
        title={strings('swaps.metamask_swap_fee')}
        body={
          <Text style={styles.text}>
            {strings('swaps.fee_text.get_the')}{' '}
            <Text bold>{strings('swaps.fee_text.best_price')}</Text>{' '}
            {strings('swaps.fee_text.from_the')}{' '}
            <Text bold>{strings('swaps.fee_text.top_liquidity')}</Text>{' '}
            {selectedQuote && selectedQuote?.fee > 0
              ? strings('swaps.fee_text.fee_is_applied', {
                  fee: `${selectedQuote.fee}%`,
                })
              : strings('swaps.fee_text.fee_is_not_applied')}
          </Text>
        }
      />
      <InfoModal
        isVisible={isGasTooltipVisible}
        title={strings(`swaps.gas_education_title`)}
        toggleModal={hideGasTooltip}
        body={
          <View>
            <Text grey infoModal>
              {strings('swaps.gas_education_1')}
              {strings(
                `swaps.gas_education_2${isMainnet ? '_ethereum' : ''}`,
              )}{' '}
              <Text bold>{strings('swaps.gas_education_3')}</Text>
            </Text>
            <Text grey infoModal>
              {strings('swaps.gas_education_4')}{' '}
              <Text bold>{strings('swaps.gas_education_5')} </Text>
              {strings('swaps.gas_education_6')}
            </Text>
            <Text grey infoModal>
              <Text bold>{strings('swaps.gas_education_7')} </Text>
              {strings('swaps.gas_education_8')}
            </Text>
            <TouchableOpacity onPress={openLinkAboutGas}>
              <Text grey link infoModal>
                {strings('swaps.gas_education_learn_more')}
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      <QuotesModal
        isVisible={isQuotesModalVisible}
        toggleModal={toggleQuotesModal}
        quotes={allQuotes}
        sourceToken={sourceToken}
        destinationToken={destinationToken}
        selectedQuote={selectedQuoteId}
        showOverallValue={hasConversionRate}
        ticker={getTicker(ticker)}
        multiLayerL1ApprovalFeeTotal={multiLayerL1ApprovalFeeTotal}
      />

      <ApprovalTransactionEditionModal
        approvalTransaction={approvalTransaction}
        editQuoteTransactionsVisible={editQuoteTransactionsVisible}
        minimumSpendLimit={approvalMinimumSpendLimit}
        onCancelEditQuoteTransactions={onCancelEditQuoteTransactions}
        setApprovalTransaction={setApprovalTransaction}
        sourceToken={sourceToken}
        chainId={chainId}
      />

      <GasEditModal
        isVisible={isEditingGas}
        gasEstimateType={gasEstimateType}
        gasFeeEstimates={gasFeeEstimates}
        defaultGasFeeOptionFeeMarket={DEFAULT_GAS_FEE_OPTION_FEE_MARKET}
        defaultGasFeeOptionFeeLegacy={DEFAULT_GAS_FEE_OPTION_LEGACY}
        onGasUpdate={handleGasFeeUpdate}
        dismiss={hideEditingGas}
        customGasFee={usedCustomGas}
        gasLimit={gasLimit}
        customGasLimit={customGasLimit}
        initialGasLimit={initialGasLimit}
        tradeGasLimit={selectedQuoteValue?.tradeGasLimit}
        isNativeAsset={isSwapsNativeAsset(sourceToken)}
        tradeValue={selectedQuote?.trade?.value || '0x0'}
        sourceAmount={sourceAmount}
        checkEnoughEthBalance={checkEnoughEthBalance}
        animateOnChange={animateOnGasChange}
      />
    </ScreenView>
  );
}

SwapsQuotesView.propTypes = {
  swapsTokens: PropTypes.arrayOf(PropTypes.object),
  /**
   * Map of accounts to information objects including balances
   */
  accounts: PropTypes.object,
  /**
   * An object containing token balances for current account and network in the format address => balance
   */
  balances: PropTypes.object,
  /**
   * ETH to current currency conversion rate
   */
  conversionRate: PropTypes.number,
  /**
   * Currency code of the currently-active currency
   */
  currentCurrency: PropTypes.string,
  /**
   * A string that represents the selected address
   */
  selectedAddress: PropTypes.string,
  /**
   * Chain Id
   */
  chainId: PropTypes.string,
  /**
   * Native asset ticker
   */
  ticker: PropTypes.string,
  /**
   * Primary currency, either ETH or Fiat
   */
  primaryCurrency: PropTypes.string,
  isInPolling: PropTypes.bool,
  quotesLastFetched: PropTypes.number,
  topAggId: PropTypes.string,
  /**
   * Aggregator metada from Swaps controller API
   */
  aggregatorMetadata: PropTypes.object,
  pollingCyclesLeft: PropTypes.number,
  quotes: PropTypes.object,
  quoteValues: PropTypes.object,
  approvalTransaction: PropTypes.object,
  error: PropTypes.object,
  quoteRefreshSeconds: PropTypes.number,
  gasEstimateType: PropTypes.string,
  gasFeeEstimates: PropTypes.object,
  usedGasEstimate: PropTypes.object,
  usedCustomGas: PropTypes.object,
  setRecipient: PropTypes.func,
  resetTransaction: PropTypes.func,
};

const mapStateToProps = (state) => ({
  accounts: selectAccounts(state),
  chainId: selectChainId(state),
  ticker: selectTicker(state),
  balances: selectContractBalances(state),
  selectedAddress: selectSelectedAddress(state),
  conversionRate: selectConversionRate(state),
  currentCurrency: selectCurrentCurrency(state),
  isInPolling: state.engine.backgroundState.SwapsController.isInPolling,
  quotesLastFetched:
    state.engine.backgroundState.SwapsController.quotesLastFetched,
  pollingCyclesLeft:
    state.engine.backgroundState.SwapsController.pollingCyclesLeft,
  topAggId: state.engine.backgroundState.SwapsController.topAggId,
  aggregatorMetadata:
    state.engine.backgroundState.SwapsController.aggregatorMetadata,
  quotes: state.engine.backgroundState.SwapsController.quotes,
  quoteValues: state.engine.backgroundState.SwapsController.quoteValues,
  approvalTransaction:
    state.engine.backgroundState.SwapsController.approvalTransaction,
  error: state.engine.backgroundState.SwapsController.error,
  quoteRefreshSeconds:
    state.engine.backgroundState.SwapsController.quoteRefreshSeconds,
  gasEstimateType:
    state.engine.backgroundState.GasFeeController.gasEstimateType,
  gasFeeEstimates:
    state.engine.backgroundState.GasFeeController.gasFeeEstimates,
  usedGasEstimate: state.engine.backgroundState.SwapsController.usedGasEstimate,
  usedCustomGas: state.engine.backgroundState.SwapsController.usedCustomGas,
  primaryCurrency: state.settings.primaryCurrency,
  swapsTokens: swapsTokensSelector(state),
});

const mapDispatchToProps = (dispatch) => ({
  setRecipient: (from) => dispatch(setRecipient(from, '', '', '', '')),
  resetTransaction: () => dispatch(resetTransaction()),
});

export default connect(mapStateToProps, mapDispatchToProps)(SwapsQuotesView);
