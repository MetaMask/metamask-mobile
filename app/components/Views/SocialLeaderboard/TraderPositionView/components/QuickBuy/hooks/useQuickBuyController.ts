import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  playSuccessNotification,
  playErrorNotification,
} from '../../../../../../../util/haptics';
import { TextInput } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type {
  QuickBuyAmountDisplayMode,
  QuickBuyAnalyticsContext,
  QuickBuyTarget,
} from '../types';
import { useQuickBuyAnalytics } from './useQuickBuyAnalytics';
import { formatExchangeRate } from '../utils/formatExchangeRate';
import { getMetamaskFeePercent } from '../utils/getMetamaskFeePercent';
import { snapToPercentageStep } from '../components/QuickBuyPercentageSlider';
import type { Hex } from '@metamask/utils';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import { selectDefaultSourceToken } from '../../../../utils/tokenSelection';
import { useQuickBuySetup } from './useQuickBuySetup';
import { useSourceTokenOptions } from './useSourceTokenOptions';
import { useQuickBuyQuotes } from './useQuickBuyQuotes';
import { isGaslessQuote } from '../../../../../../UI/Bridge/utils/isGaslessQuote';
import {
  isNumberValue,
  dotAndCommaDecimalFormatter,
} from '../../../../../../../util/number/bigint';
import { isNonEvmChainId } from '@metamask/bridge-controller';
import { useGasFeeEstimates } from '../../../../../confirmations/hooks/gas/useGasFeeEstimates';
import {
  setSourceAmount,
  setSourceToken,
  setDestToken,
  selectIsSubmittingTx,
  selectDestAddress,
  selectSlippage,
  selectIsEvmNonEvmBridge,
  selectIsNonEvmNonEvmBridge,
  selectIsSolanaSourced,
  selectBridgeFeatureFlags,
  setIsSubmittingTx,
} from '../../../../../../../core/redux/slices/bridge';
import { useLatestBalance } from '../../../../../../UI/Bridge/hooks/useLatestBalance';
import useIsInsufficientBalance from '../../../../../../UI/Bridge/hooks/useInsufficientBalance';
import { useHasSufficientGas } from '../../../../../../UI/Bridge/hooks/useHasSufficientGas';
import { useIsNetworkFeeUnavailable } from '../../../../../../UI/Bridge/hooks/useIsNetworkFeeUnavailable';
import { useInitialSlippage } from '../../../../../../UI/Bridge/hooks/useInitialSlippage';
import { usePriceImpactViewData } from '../../../../../../UI/Bridge/hooks/usePriceImpactViewData';
import {
  parsePriceImpact,
  exceedsPriceImpactErrorThreshold,
} from '../../../../../../UI/Bridge/utils/getPriceImpactViewData';
import { selectShouldUseSmartTransaction } from '../../../../../../../selectors/smartTransactionsController';
import { useRefreshSmartTransactionsLiveness } from '../../../../../../hooks/useRefreshSmartTransactionsLiveness';
import { useIsGasIncludedSTXSendBundleSupported } from '../../../../../../UI/Bridge/hooks/useIsGasIncludedSTXSendBundleSupported';
import { useRecipientInitialization } from '../../../../../../UI/Bridge/hooks/useRecipientInitialization';
import { selectSourceWalletAddress } from '../../../../../../../selectors/bridge';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../../selectors/accountsController';
import { isHardwareAccount } from '../../../../../../../util/address';
import Engine from '../../../../../../../core/Engine';
import Routes from '../../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../../locales/i18n';
import { calcTokenValue } from '../../../../../../../util/transactions';
import {
  SocialLeaderboardEventProperties,
  SocialLeaderboardEventValues,
} from '../../../../analytics';
import { chainNameToId } from '../../../../utils/chainMapping';
import { toAssetId } from '../../../../../../UI/Bridge/hooks/useAssetMetadata/utils';

export type QuickBuyButtonError =
  | 'insufficient_balance'
  | 'insufficient_gas'
  | 'no_quotes';

const BUTTON_ERROR_LABELS: Record<QuickBuyButtonError, string> = {
  insufficient_balance: 'bridge.insufficient_funds',
  insufficient_gas: 'bridge.insufficient_gas',
  no_quotes: 'social_leaderboard.quick_buy.no_quotes',
};

export interface UseQuickBuyControllerResult {
  // refs
  hiddenInputRef: React.RefObject<TextInput | null>;
  // setup
  destToken: BridgeToken | undefined;
  isSetupLoading: boolean;
  isUnsupportedChain: boolean;
  // source token
  sourceToken: BridgeToken | undefined;
  sourceChainId: Hex | undefined;
  sourceTokenOptions: BridgeToken[];
  selectedSourceToken: BridgeToken | undefined;
  isSourcePickerOpen: boolean;
  setIsSourcePickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedSourceToken: React.Dispatch<
    React.SetStateAction<BridgeToken | undefined>
  >;
  // amount
  amountDisplayMode: QuickBuyAmountDisplayMode;
  usdAmount: string;
  sliderPercent: number;
  maxSpendUsd: number;
  formattedExchangeRate: string | undefined;
  metamaskFeePercent: number;
  estimatedReceiveAmount: string | undefined;
  sourceBalanceFiat: string | undefined;
  sourceBalanceDisplay: string | undefined;
  formattedNetworkFee: string;
  formattedSlippage: string;
  formattedMinimumReceived: string;
  formattedPriceImpact: string;
  totalAmountUsd: string;
  // quote state
  isQuoteLoading: boolean;
  isSubmittingTx: boolean;
  isTotalLoading: boolean;
  // warnings (banner-level; can stack)
  isHardwareSolanaBlocked: boolean;
  priceImpactViewData: ReturnType<typeof usePriceImpactViewData>;
  isPriceImpactError: boolean;
  // button state (priority-encoded; the Buy button surfaces at most one)
  buttonError: QuickBuyButtonError | null;
  hasValidAmount: boolean;
  isConfirmDisabled: boolean;
  confirmButtonState: 'idle' | 'loading' | 'success';
  getButtonLabel: () => string;
  // handlers
  handleClose: () => void;
  handleSliderChange: (percent: number) => void;
  handleAmountAreaPress: () => void;
  handleAmountChange: (text: string) => void;
  handleToggleAmountDisplay: () => void;
  handleConfirm: () => Promise<void>;
}

export function useQuickBuyController(
  target: QuickBuyTarget,
  onClose: () => void,
  analyticsContext?: QuickBuyAnalyticsContext,
): UseQuickBuyControllerResult {
  const hiddenInputRef = useRef<TextInput>(null);
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const traderAddress = analyticsContext?.traderAddress ?? '';
  const caip19 = useMemo(() => {
    const caipChainId = chainNameToId(target.chain);
    if (!caipChainId) return '';
    return toAssetId(target.tokenAddress, caipChainId) ?? '';
  }, [target.chain, target.tokenAddress]);

  const {
    refs: { lastInputMethodRef, lastTrackedAmountRef, submitStartedAtRef },
    trackAmountSelected,
    trackTradeSubmitted,
    trackTradeCompleted,
    markTradeSubmitted,
  } = useQuickBuyAnalytics(traderAddress, caip19, analyticsContext);

  const [usdAmount, setUsdAmount] = useState('');
  const [amountDisplayMode, setAmountDisplayMode] =
    useState<QuickBuyAmountDisplayMode>('crypto');
  const [sliderPercent, setSliderPercent] = useState(0);
  const lastSnappedSliderPercentRef = useRef(0);
  const [txPhase, setTxPhase] = useState<'idle' | 'success'>('idle');

  const isSubmittingTx = useSelector(selectIsSubmittingTx);
  const walletAddress = useSelector(selectSourceWalletAddress);
  const destAddress = useSelector(selectDestAddress);
  const slippage = useSelector(selectSlippage);
  const isEvmNonEvmBridge = useSelector(selectIsEvmNonEvmBridge);
  const isNonEvmNonEvmBridge = useSelector(selectIsNonEvmNonEvmBridge);
  const isSolanaSourced = useSelector(selectIsSolanaSourced);
  const bridgeFeatureFlags = useSelector(selectBridgeFeatureFlags);
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const isHardwareAddress = selectedAddress
    ? !!isHardwareAccount(selectedAddress)
    : false;
  const isHardwareSolanaBlocked = isHardwareAddress && Boolean(isSolanaSourced);

  const {
    chainId: destChainId,
    destToken,
    isLoading: isSetupLoading,
    isUnsupportedChain,
  } = useQuickBuySetup(target);

  const { options: sourceTokenOptions } = useSourceTokenOptions(destChainId);
  const [selectedSourceToken, setSelectedSourceToken] = useState<
    BridgeToken | undefined
  >(undefined);
  const [isSourcePickerOpen, setIsSourcePickerOpen] = useState(false);

  // Auto-select default source token using smart priority rules (see selectDefaultSourceToken)
  useEffect(() => {
    if (sourceTokenOptions.length > 0 && !selectedSourceToken) {
      setSelectedSourceToken(
        selectDefaultSourceToken(sourceTokenOptions, destChainId),
      );
    }
  }, [sourceTokenOptions, selectedSourceToken, destChainId]);

  const sourceToken = selectedSourceToken;
  const sourceChainId = sourceToken?.chainId as Hex | undefined;

  // BridgeController.fetchQuotes does not start gas fee polling, so estimates
  // for the source chain may be missing when selectBridgeQuotesBase enriches
  // the quote — producing a $0 network fee. Poll explicitly for the source
  // chain's network client.
  const sourceNetworkClientId = useMemo(() => {
    if (!sourceChainId || isNonEvmChainId(sourceChainId)) return undefined;
    try {
      return Engine.context.NetworkController.findNetworkClientIdByChainId(
        sourceChainId,
      );
    } catch {
      return undefined;
    }
  }, [sourceChainId]);
  useGasFeeEstimates(sourceNetworkClientId);

  useRefreshSmartTransactionsLiveness(sourceChainId);
  useIsGasIncludedSTXSendBundleSupported(sourceChainId);
  useInitialSlippage();

  useEffect(() => {
    if (selectedSourceToken && destToken) {
      dispatch(setSourceToken(selectedSourceToken));
      dispatch(setDestToken(destToken));
    }
  }, [selectedSourceToken, destToken, dispatch]);

  const hasInitializedRecipient = useRef(false);
  useRecipientInitialization(hasInitializedRecipient);

  const sourceTokenAmount = useMemo(() => {
    if (!usdAmount || !sourceToken?.currencyExchangeRate) {
      return undefined;
    }
    const usd = parseFloat(usdAmount);
    if (isNaN(usd) || usd <= 0) return undefined;
    return (usd / sourceToken.currencyExchangeRate).toString();
  }, [usdAmount, sourceToken?.currencyExchangeRate]);

  useEffect(() => {
    if (sourceTokenAmount) {
      dispatch(setSourceAmount(sourceTokenAmount));
    } else {
      dispatch(setSourceAmount(undefined));
    }
  }, [sourceTokenAmount, dispatch]);

  const latestSourceBalance = useLatestBalance({
    address: sourceToken?.address,
    decimals: sourceToken?.decimals,
    chainId: sourceToken?.chainId,
    balance: sourceToken?.balance,
  });

  const usdAmountNumber = useMemo(() => {
    const v = Number(usdAmount);
    return Number.isFinite(v) ? v : 0;
  }, [usdAmount]);
  const quotesAnalyticsContext = useMemo(
    () => ({ traderAddress, caip19, amountUsd: usdAmountNumber }),
    [traderAddress, caip19, usdAmountNumber],
  );

  const {
    activeQuote,
    destTokenAmount: estimatedReceiveAmount,
    isQuoteLoading,
    isNoQuotesAvailable,
    quoteFetchError,
    isActiveQuoteForCurrentTokenPair,
  } = useQuickBuyQuotes({
    sourceToken,
    destToken,
    sourceTokenAmount,
    analyticsContext: quotesAnalyticsContext,
  });

  const networkFeeRawUsd = useMemo(() => {
    if (!activeQuote) return null;
    if (isGaslessQuote(activeQuote.quote)) {
      const v = activeQuote.includedTxFees?.valueInCurrency;
      return v != null && isNumberValue(v) ? parseFloat(v) : null;
    }
    const total = activeQuote.totalNetworkFee?.valueInCurrency;
    if (total != null && isNumberValue(total)) return parseFloat(total);
    const effective = activeQuote.gasFee?.effective?.valueInCurrency;
    if (effective != null && isNumberValue(effective))
      return parseFloat(effective);
    return null;
  }, [activeQuote]);

  const formattedNetworkFee = useMemo(() => {
    if (networkFeeRawUsd === null) return '-';
    return `$${networkFeeRawUsd.toFixed(2)}`;
  }, [networkFeeRawUsd]);

  const formattedSlippage = useMemo(() => {
    if (slippage == null) return '-';
    return `${slippage}%`;
  }, [slippage]);

  const formattedMinimumReceived = useMemo(() => {
    const amount = activeQuote?.minToTokenAmount?.amount;
    const symbol = destToken?.symbol;
    if (!amount || !symbol) return '-';
    const num = parseFloat(amount);
    if (isNaN(num)) return '-';
    const floored = Math.floor(num * 1e8) / 1e8;
    const formatted = String(parseFloat(floored.toFixed(8))) || '0';
    return `${formatted} ${symbol}`;
  }, [activeQuote, destToken]);

  const formattedPriceImpact = useMemo(() => {
    const priceImpact = activeQuote?.quote?.priceData?.priceImpact;
    if (!priceImpact) return '-';
    return `${(Number(priceImpact) * 100).toFixed(2)}%`;
  }, [activeQuote]);

  const priceImpactViewData = usePriceImpactViewData(
    activeQuote?.quote?.priceData?.priceImpact,
  );

  const isPriceImpactError = useMemo(
    () =>
      exceedsPriceImpactErrorThreshold(
        parsePriceImpact(activeQuote?.quote?.priceData?.priceImpact),
        bridgeFeatureFlags?.priceImpactThreshold?.error,
      ),
    [activeQuote, bridgeFeatureFlags],
  );

  const totalAmountUsd = useMemo(() => {
    const inputNum = parseFloat(usdAmount);
    if (!usdAmount || isNaN(inputNum)) return '$0';
    if (activeQuote && networkFeeRawUsd !== null) {
      return `$${(inputNum + networkFeeRawUsd).toFixed(2)}`;
    }
    return '$0';
  }, [usdAmount, activeQuote, networkFeeRawUsd]);

  const hasInsufficientBalance = useIsInsufficientBalance({
    amount: sourceTokenAmount,
    token: sourceToken,
    latestAtomicBalance: latestSourceBalance?.atomicBalance,
    quoteOverride: activeQuote ?? null,
  });

  const isNetworkFeeUnavailable = useIsNetworkFeeUnavailable(activeQuote);
  const hasSufficientGas = useHasSufficientGas({ quote: activeQuote });
  const hasInsufficientGas =
    !isNetworkFeeUnavailable && hasSufficientGas === false;

  const stxEnabled = useSelector(selectShouldUseSmartTransaction);
  const hasDestinationPicker = isEvmNonEvmBridge || isNonEvmNonEvmBridge;
  const isDestinationAddressMissing = hasDestinationPicker && !destAddress;

  const sourceBalanceFiat = useMemo(() => {
    if (
      !latestSourceBalance?.displayBalance ||
      !sourceToken?.currencyExchangeRate
    )
      return undefined;
    const balance = parseFloat(latestSourceBalance.displayBalance);
    if (isNaN(balance)) return undefined;
    return `$${(balance * sourceToken.currencyExchangeRate).toFixed(2)}`;
  }, [latestSourceBalance?.displayBalance, sourceToken?.currencyExchangeRate]);

  const sourceBalanceDisplay = useMemo(() => {
    if (!latestSourceBalance?.displayBalance || !sourceToken?.symbol) {
      return undefined;
    }
    const balance = parseFloat(latestSourceBalance.displayBalance);
    if (isNaN(balance)) return undefined;
    const formatted = balance.toFixed(6).replace(/\.?0+$/, '');
    return `${formatted} ${sourceToken.symbol}`;
  }, [latestSourceBalance?.displayBalance, sourceToken?.symbol]);

  const maxSpendUsd = useMemo(() => {
    if (!sourceBalanceFiat) return 0;
    const numeric = parseFloat(sourceBalanceFiat.replace(/[^0-9.]/g, ''));
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
  }, [sourceBalanceFiat]);

  const formattedExchangeRate = useMemo(
    () => formatExchangeRate(destToken, sourceToken),
    [destToken, sourceToken],
  );

  const metamaskFeePercent = useMemo(
    () => getMetamaskFeePercent(activeQuote),
    [activeQuote],
  );

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSliderChange = useCallback(
    (percent: number) => {
      const snapped = snapToPercentageStep(percent);
      if (snapped === lastSnappedSliderPercentRef.current) {
        return;
      }

      lastSnappedSliderPercentRef.current = snapped;
      setSliderPercent(snapped);
      if (maxSpendUsd <= 0) {
        setUsdAmount('');
        return;
      }
      const nextUsd =
        snapped === 0 ? '' : ((maxSpendUsd * snapped) / 100).toFixed(2);
      setUsdAmount(nextUsd);
      lastInputMethodRef.current =
        SocialLeaderboardEventValues.AMOUNT_SELECTION_METHOD.SLIDER;
      const numericUsd = Number(nextUsd);
      if (snapped > 0 && Number.isFinite(numericUsd) && numericUsd > 0) {
        trackAmountSelected(
          numericUsd,
          SocialLeaderboardEventValues.AMOUNT_SELECTION_METHOD.SLIDER,
          sourceToken?.symbol,
          snapped,
        );
      }
    },
    [maxSpendUsd, sourceToken?.symbol, trackAmountSelected, lastInputMethodRef],
  );

  const handleAmountAreaPress = useCallback(() => {
    // Ensure the user always types in fiat so the keyboard digits match what
    // they see. Crypto display mode is view-only; switch back on input focus.
    setAmountDisplayMode('fiat');
    hiddenInputRef.current?.focus();
  }, []);

  const handleToggleAmountDisplay = useCallback(() => {
    setAmountDisplayMode((mode) => (mode === 'fiat' ? 'crypto' : 'fiat'));
  }, []);

  const handleAmountChange = useCallback(
    (text: string) => {
      lastInputMethodRef.current =
        SocialLeaderboardEventValues.AMOUNT_SELECTION_METHOD.CUSTOM_INPUT;
      const cleaned = dotAndCommaDecimalFormatter(text).replace(/[^0-9.]/g, '');
      const normalized = cleaned.startsWith('.') ? `0${cleaned}` : cleaned;
      const parts = normalized.split('.');
      if (parts.length > 2) return;
      if (parts.length === 2 && parts[1].length > 2) return;
      setUsdAmount(normalized);
      lastSnappedSliderPercentRef.current = 0;
      setSliderPercent(0);
    },
    [lastInputMethodRef],
  );

  // Debounced track for custom amount entries — fires once after the user
  // stops typing for 500ms, so we don't emit on every keystroke.
  useEffect(() => {
    if (lastInputMethodRef.current !== 'custom_input') return;
    if (!usdAmount) return;
    const numeric = Number(usdAmount);
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    if (lastTrackedAmountRef.current === usdAmount) return;
    const handle = setTimeout(() => {
      trackAmountSelected(
        numeric,
        SocialLeaderboardEventValues.AMOUNT_SELECTION_METHOD.CUSTOM_INPUT,
        sourceToken?.symbol,
      );
    }, 500);
    return () => clearTimeout(handle);
  }, [
    usdAmount,
    sourceToken?.symbol,
    trackAmountSelected,
    lastInputMethodRef,
    lastTrackedAmountRef,
  ]);

  const handleConfirm = useCallback(async () => {
    if (!activeQuote || !walletAddress) return;

    const amountUsd = usdAmountNumber;
    const amountTokenRaw = activeQuote.toTokenAmount?.amount;
    const amountToken =
      amountTokenRaw != null && isNumberValue(amountTokenRaw)
        ? Number(amountTokenRaw)
        : undefined;
    const submittedTraderAddress = traderAddress;
    const submittedCaip19 = caip19;
    const submittedAssetName = destToken?.symbol ?? target.tokenSymbol;
    const submittedPayWith = sourceToken?.symbol;

    // Shared by the SUBMITTED + COMPLETED (success / failure) events. Built
    // once here so the success vs failure delta stays small at the call sites.
    const tradeBaseProps =
      submittedTraderAddress && submittedCaip19
        ? {
            [SocialLeaderboardEventProperties.TRADER_ADDRESS]:
              submittedTraderAddress,
            [SocialLeaderboardEventProperties.CAIP19]: submittedCaip19,
            [SocialLeaderboardEventProperties.ASSET_NAME]: submittedAssetName,
            [SocialLeaderboardEventProperties.AMOUNT_USD]: amountUsd,
            [SocialLeaderboardEventProperties.PAY_WITH_TOKEN]: submittedPayWith,
          }
        : null;

    if (tradeBaseProps) {
      trackTradeSubmitted(tradeBaseProps);
    }
    markTradeSubmitted();
    submitStartedAtRef.current = Date.now();

    const elapsedMs = () =>
      submitStartedAtRef.current ? Date.now() - submitStartedAtRef.current : 0;

    try {
      dispatch(setIsSubmittingTx(true));
      const submitResult = await Engine.context.BridgeStatusController.submitTx(
        walletAddress,
        { ...activeQuote, approval: activeQuote.approval ?? undefined },
        stxEnabled,
      );
      setTxPhase('success');
      await playSuccessNotification();
      const txHash =
        submitResult &&
        typeof (submitResult as { hash?: unknown }).hash === 'string'
          ? ((submitResult as { hash?: string }).hash as string)
          : undefined;
      if (tradeBaseProps) {
        trackTradeCompleted({
          ...tradeBaseProps,
          [SocialLeaderboardEventProperties.AMOUNT_TOKEN]: amountToken,
          [SocialLeaderboardEventProperties.TX_HASH]: txHash,
          [SocialLeaderboardEventProperties.EXECUTION_TIME_MS]: elapsedMs(),
          [SocialLeaderboardEventProperties.STATUS]:
            SocialLeaderboardEventValues.STATUS.SUCCESS,
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 800));
      onClose();
      navigation.navigate(Routes.TRANSACTIONS_VIEW);
    } catch (error) {
      console.error('Error submitting QuickBuy tx', error);
      await playErrorNotification();
      if (tradeBaseProps) {
        trackTradeCompleted({
          ...tradeBaseProps,
          [SocialLeaderboardEventProperties.AMOUNT_TOKEN]: amountToken,
          [SocialLeaderboardEventProperties.EXECUTION_TIME_MS]: elapsedMs(),
          [SocialLeaderboardEventProperties.STATUS]:
            SocialLeaderboardEventValues.STATUS.FAILED,
        });
      }
    } finally {
      dispatch(setIsSubmittingTx(false));
    }
  }, [
    activeQuote,
    walletAddress,
    stxEnabled,
    dispatch,
    onClose,
    navigation,
    usdAmountNumber,
    traderAddress,
    caip19,
    destToken?.symbol,
    target.tokenSymbol,
    sourceToken?.symbol,
    trackTradeSubmitted,
    trackTradeCompleted,
    markTradeSubmitted,
    submitStartedAtRef,
  ]);

  const hasError = Boolean(quoteFetchError || isNoQuotesAvailable);
  const hasValidAmount = Boolean(usdAmount && Number(usdAmount) > 0);
  const hasQuoteRequestableAmount = useMemo(() => {
    const hasNonZeroInputAmount = Boolean(
      sourceTokenAmount && Number(sourceTokenAmount) !== 0,
    );

    try {
      return Boolean(
        hasNonZeroInputAmount &&
          (sourceToken?.decimals === undefined ||
            calcTokenValue(sourceTokenAmount, sourceToken.decimals).toFixed(
              0,
            ) !== '0'),
      );
    } catch {
      return hasNonZeroInputAmount;
    }
  }, [sourceTokenAmount, sourceToken?.decimals]);
  const settledSourceTokenAmountRef = useRef(sourceTokenAmount);
  const wasQuoteLoadingRef = useRef(isQuoteLoading);

  useEffect(() => {
    const loadingJustFinished = wasQuoteLoadingRef.current && !isQuoteLoading;

    if (loadingJustFinished || hasError) {
      settledSourceTokenAmountRef.current = sourceTokenAmount;
    }

    wasQuoteLoadingRef.current = isQuoteLoading;
  }, [isQuoteLoading, sourceTokenAmount, hasError]);

  const hasCompleteQuoteInputs = Boolean(
    sourceToken &&
      destToken &&
      hasQuoteRequestableAmount &&
      !isDestinationAddressMissing,
  );
  const isPendingQuoteRefresh =
    settledSourceTokenAmountRef.current !== sourceTokenAmount &&
    hasCompleteQuoteInputs;
  const hasQuoteMismatch =
    Boolean(activeQuote) && !isActiveQuoteForCurrentTokenPair;

  const isConfirmDisabled =
    !hasValidAmount ||
    isSetupLoading ||
    !sourceToken ||
    !destToken ||
    isDestinationAddressMissing ||
    !activeQuote ||
    hasQuoteMismatch ||
    isPendingQuoteRefresh ||
    isQuoteLoading ||
    hasInsufficientBalance ||
    isNetworkFeeUnavailable ||
    hasInsufficientGas ||
    isSubmittingTx ||
    hasError ||
    isHardwareSolanaBlocked ||
    isPriceImpactError ||
    !walletAddress;

  const isTotalLoading =
    hasValidAmount && (isQuoteLoading || isPendingQuoteRefresh);

  const isConfirmLoading = isSubmittingTx;

  let buttonError: QuickBuyButtonError | null = null;
  if (hasInsufficientBalance || isNetworkFeeUnavailable) {
    buttonError = 'insufficient_balance';
  } else if (hasInsufficientGas) {
    buttonError = 'insufficient_gas';
  } else if (hasError) {
    buttonError = 'no_quotes';
  }

  let confirmButtonState: 'idle' | 'loading' | 'success' = 'idle';
  if (txPhase === 'success') {
    confirmButtonState = 'success';
  } else if (isConfirmLoading) {
    confirmButtonState = 'loading';
  }

  const getButtonLabel = useCallback(() => {
    if (!hasValidAmount) {
      return strings('social_leaderboard.trader_position.buy');
    }
    if (buttonError) return strings(BUTTON_ERROR_LABELS[buttonError]);
    if (isSubmittingTx) return strings('bridge.submitting_transaction');
    return strings('social_leaderboard.trader_position.buy');
  }, [buttonError, hasValidAmount, isSubmittingTx]);

  return {
    hiddenInputRef,
    destToken,
    isSetupLoading,
    isUnsupportedChain,
    sourceToken,
    sourceChainId,
    sourceTokenOptions,
    selectedSourceToken,
    isSourcePickerOpen,
    setIsSourcePickerOpen,
    setSelectedSourceToken,
    amountDisplayMode,
    usdAmount,
    sliderPercent,
    maxSpendUsd,
    formattedExchangeRate,
    metamaskFeePercent,
    estimatedReceiveAmount,
    sourceBalanceFiat,
    sourceBalanceDisplay,
    formattedNetworkFee,
    formattedSlippage,
    formattedMinimumReceived,
    formattedPriceImpact,
    totalAmountUsd,
    isQuoteLoading,
    isSubmittingTx,
    isTotalLoading,
    isHardwareSolanaBlocked,
    priceImpactViewData,
    isPriceImpactError,
    buttonError,
    hasValidAmount,
    isConfirmDisabled,
    confirmButtonState,
    getButtonLabel,
    handleClose,
    handleSliderChange,
    handleAmountAreaPress,
    handleAmountChange,
    handleToggleAmountDisplay,
    handleConfirm,
  };
}
