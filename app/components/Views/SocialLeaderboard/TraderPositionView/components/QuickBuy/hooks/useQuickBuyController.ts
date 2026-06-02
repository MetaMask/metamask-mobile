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
  QuickBuyTradeMode,
} from '../types';
import { useQuickBuyAnalytics } from './useQuickBuyAnalytics';
import { formatExchangeRate } from '../utils/formatExchangeRate';
import { getMetamaskFeePercent } from '../utils/getMetamaskFeePercent';
import { snapToPercentageStep } from '../components/QuickBuyPercentageSlider';
import type { Hex } from '@metamask/utils';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import { selectDefaultSourceToken } from '../../../../utils/tokenSelection';
import { useQuickBuySetup } from './useQuickBuySetup';
import {
  useSourceTokenOptions,
  useSellDestTokenOptions,
} from './useSourceTokenOptions';
import { usePositionTokenBalance } from './usePositionTokenBalance';
import {
  useQuickBuyQuotes,
  type EnrichedQuickBuyQuote,
} from './useQuickBuyQuotes';
import { getIntlNumberFormatter } from '../../../../../../../util/intl';
import { useDisplayCurrencyValue } from '../../../../../../UI/Bridge/hooks/useDisplayCurrencyValue';
import {
  formatMinimumReceived,
  formatCurrency,
} from '../../../../../../UI/Bridge/utils/currencyUtils';
import { useFormattedNetworkFee } from '../../../../../../UI/Bridge/hooks/useFormattedNetworkFee';
import { isGaslessQuote } from '../../../../../../UI/Bridge/utils/isGaslessQuote';
import { selectCurrentCurrency } from '../../../../../../../selectors/currencyRateController';
import {
  isNumberValue,
  dotAndCommaDecimalFormatter,
} from '../../../../../../../util/number/bigint';
import { isNonEvmChainId } from '@metamask/bridge-controller';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
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
import I18n, { strings } from '../../../../../../../../locales/i18n';
import { calcTokenValue } from '../../../../../../../util/transactions';
import Logger from '../../../../../../../util/Logger';
import { buildSocialLoggerErrorOptions } from '../../../../../../../util/social/socialServiceTelemetry';
import {
  SocialLeaderboardEventProperties,
  SocialLeaderboardEventValues,
} from '../../../../analytics';
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
  // trade mode
  tradeMode: QuickBuyTradeMode;
  setTradeMode: React.Dispatch<React.SetStateAction<QuickBuyTradeMode>>;
  /** True when the user holds a non-zero balance of the position token (sell is viable). */
  hasSellableBalance: boolean;
  // active quote (for QuoteDetails sub-screen)
  activeQuote: EnrichedQuickBuyQuote | undefined;
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
  // sell dest token (Sell mode "Receive with")
  sellDestTokenOptions: BridgeToken[];
  selectedDestStable: BridgeToken | undefined;
  handleSelectDestStable: (token: BridgeToken) => void;
  currentCurrency: string;
  // amount
  amountDisplayMode: QuickBuyAmountDisplayMode;
  usdAmount: string;
  sliderPercent: number;
  maxSpendUsd: number;
  formattedExchangeRate: string | undefined;
  metamaskFeePercent: number;
  estimatedReceiveAmount: string | undefined;
  sourceBalanceFiat: string;
  sourceBalanceDisplay: string | undefined;
  formattedNetworkFee: string;
  formattedSlippage: string;
  formattedMinimumReceived: string;
  formattedMinimumReceivedFiat: string | undefined;
  formattedPriceImpact: string;
  formattedRate: string | undefined;
  totalAmountUsd: string;
  // quote state
  isQuoteLoading: boolean;
  isSubmittingTx: boolean;
  isTotalLoading: boolean;
  // all quotes for the select-quote screen
  sortedQuotes: EnrichedQuickBuyQuote[];
  selectedQuoteRequestId: string | undefined;
  setSelectedQuoteRequestId: React.Dispatch<
    React.SetStateAction<string | undefined>
  >;
  quotesLastFetchedAt: number | null;
  refreshCount: number;
  quoteRefreshRateMs: number;
  maxRefreshCount: number;
  refetchQuotes: () => void;
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
  handleSelectSourceToken: (token: BridgeToken) => void;
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
  const caip19 = useMemo(
    () => toAssetId(target.tokenAddress, target.chain) ?? '',
    [target.chain, target.tokenAddress],
  );

  const {
    refs: { lastInputMethodRef, lastTrackedAmountRef, submitStartedAtRef },
    trackAmountSelected,
    trackTradeModeToggled,
    trackTradeSubmitted,
    trackTradeCompleted,
    markTradeSubmitted,
  } = useQuickBuyAnalytics(traderAddress, caip19, analyticsContext);

  const [tradeMode, setTradeMode] = useState<QuickBuyTradeMode>('buy');
  const [usdAmount, setUsdAmount] = useState('');
  // Fiat-first: every input path (slider, hidden TextInput, amount-area press)
  // edits the USD amount, so the primary label must default to fiat as well.
  // The user can swap to crypto display via the toggle once a quote is available.
  const [amountDisplayMode, setAmountDisplayMode] =
    useState<QuickBuyAmountDisplayMode>('fiat');
  const [sliderPercent, setSliderPercent] = useState(0);
  const lastSnappedSliderPercentRef = useRef(0);
  const [txPhase, setTxPhase] = useState<'idle' | 'success'>('idle');
  const [selectedQuoteRequestId, setSelectedQuoteRequestId] = useState<
    string | undefined
  >(undefined);

  const isSubmittingTx = useSelector(selectIsSubmittingTx);
  const walletAddress = useSelector(selectSourceWalletAddress);
  const destAddress = useSelector(selectDestAddress);
  const slippage = useSelector(selectSlippage);
  const isEvmNonEvmBridge = useSelector(selectIsEvmNonEvmBridge);
  const isNonEvmNonEvmBridge = useSelector(selectIsNonEvmNonEvmBridge);
  const isSolanaSourced = useSelector(selectIsSolanaSourced);
  const bridgeFeatureFlags = useSelector(selectBridgeFeatureFlags);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const isHardwareAddress = selectedAddress
    ? !!isHardwareAccount(selectedAddress)
    : false;
  const isHardwareSolanaBlocked = isHardwareAddress && Boolean(isSolanaSourced);

  const {
    chainId: destChainId,
    destToken: positionTokenFromSetup,
    isLoading: isSetupLoading,
    isUnsupportedChain,
  } = useQuickBuySetup(target);

  // ─── Buy source token options ───────────────────────────────────────────
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

  // ─── Sell mode: position token (what the user is selling) ──────────────
  const positionToken = usePositionTokenBalance(target, positionTokenFromSetup);

  // ─── Sell dest stable options (Receive with) ───────────────────────────
  const sellDestTokenOptions = useSellDestTokenOptions(
    destChainId as string | undefined,
  );
  const [selectedDestStable, setSelectedDestStable] = useState<
    BridgeToken | undefined
  >(undefined);

  // Auto-select default dest stable: prefer a token the user already holds on
  // the position chain; fall back to the first candidate (USDC on position chain).
  useEffect(() => {
    if (sellDestTokenOptions.length > 0 && !selectedDestStable) {
      setSelectedDestStable(sellDestTokenOptions[0]);
    }
  }, [sellDestTokenOptions, selectedDestStable]);

  // ─── Source / dest resolution (mode-dependent) ─────────────────────────
  const sourceToken = tradeMode === 'buy' ? selectedSourceToken : positionToken;
  const destToken =
    tradeMode === 'buy' ? positionTokenFromSetup : selectedDestStable;
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
    if (sourceToken && destToken) {
      dispatch(setSourceToken(sourceToken));
      dispatch(setDestToken(destToken));
    }
  }, [sourceToken, destToken, dispatch]);

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
    sortedQuotes,
    destTokenAmount: estimatedReceiveAmount,
    isQuoteLoading,
    isNoQuotesAvailable,
    quoteFetchError,
    isActiveQuoteForCurrentTokenPair,
    quotesLastFetchedAt,
    refreshCount,
    quoteRefreshRateMs,
    maxRefreshCount,
    refetchQuotes,
  } = useQuickBuyQuotes({
    sourceToken,
    destToken,
    sourceTokenAmount,
    analyticsContext: quotesAnalyticsContext,
    selectedQuoteRequestId,
  });

  // Reset manual quote selection whenever the user changes amount, token, or slippage.
  useEffect(() => {
    setSelectedQuoteRequestId(undefined);
  }, [sourceToken, destToken, sourceTokenAmount, slippage]);

  // Each fetch (including auto-refresh) returns quotes with new requestIds.
  useEffect(() => {
    if (!selectedQuoteRequestId) {
      return;
    }
    const hasMatchingQuote = sortedQuotes.some(
      (quote) => quote.quote.requestId === selectedQuoteRequestId,
    );
    if (!hasMatchingQuote) {
      setSelectedQuoteRequestId(undefined);
    }
  }, [selectedQuoteRequestId, sortedQuotes]);

  const formattedNetworkFee = useFormattedNetworkFee(activeQuote ?? null);

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

  const formattedSlippage = useMemo(() => {
    if (slippage == null) return '-';
    return `${slippage}%`;
  }, [slippage]);

  const formattedMinimumReceived = useMemo(() => {
    const amount = activeQuote?.minToTokenAmount?.amount;
    const symbol = destToken?.symbol;
    if (!amount || !symbol) return '-';
    const formatted = formatMinimumReceived(amount);
    return `${formatted} ${symbol}`;
  }, [activeQuote, destToken]);

  const minReceivedTokenAmount = activeQuote?.minToTokenAmount?.amount;
  const formattedMinimumReceivedFiat = useDisplayCurrencyValue(
    minReceivedTokenAmount,
    destToken,
  );

  const formattedRate = useMemo(() => {
    if (
      !sourceToken ||
      !destToken ||
      !sourceTokenAmount ||
      !estimatedReceiveAmount
    ) {
      return undefined;
    }
    const sourceAmt = parseFloat(sourceTokenAmount);
    const destAmt = parseFloat(estimatedReceiveAmount);
    if (!sourceAmt || !destAmt || isNaN(sourceAmt) || isNaN(destAmt))
      return undefined;
    const rate = destAmt / sourceAmt;
    const formatter = getIntlNumberFormatter(I18n.locale, {
      ...(rate > 1
        ? { minimumFractionDigits: 1, maximumFractionDigits: 2 }
        : { minimumSignificantDigits: 2, maximumSignificantDigits: 3 }),
    });
    return `1 ${sourceToken.symbol} = ${formatter.format(rate)} ${destToken.symbol}`;
  }, [sourceToken, destToken, sourceTokenAmount, estimatedReceiveAmount]);

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

  const sourceBalanceFiatUsd = useMemo(() => {
    if (
      !latestSourceBalance?.displayBalance ||
      !sourceToken?.currencyExchangeRate
    ) {
      return 0;
    }
    const balance = parseFloat(latestSourceBalance.displayBalance);
    if (!Number.isFinite(balance)) return 0;
    const fiat = balance * sourceToken.currencyExchangeRate;
    return Number.isFinite(fiat) && fiat > 0 ? fiat : 0;
  }, [latestSourceBalance?.displayBalance, sourceToken?.currencyExchangeRate]);

  const sourceBalanceFiat = useMemo(
    () => formatCurrency(sourceBalanceFiatUsd, currentCurrency),
    [sourceBalanceFiatUsd, currentCurrency],
  );

  const sourceBalanceDisplay = useMemo(() => {
    if (!latestSourceBalance?.displayBalance || !sourceToken?.symbol) {
      return undefined;
    }
    const balance = parseFloat(latestSourceBalance.displayBalance);
    if (isNaN(balance)) return undefined;
    const formatted = new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 6,
      useGrouping: false,
    }).format(balance);
    return `${formatted} ${sourceToken.symbol}`;
  }, [latestSourceBalance?.displayBalance, sourceToken?.symbol]);

  const maxSpendUsd = sourceBalanceFiatUsd;

  const formattedExchangeRate = useMemo(
    () =>
      tradeMode === 'sell'
        ? formatExchangeRate(sourceToken, destToken)
        : formatExchangeRate(destToken, sourceToken),
    [destToken, sourceToken, tradeMode],
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
          tradeMode === 'buy' ? sourceToken?.symbol : undefined,
          snapped,
          tradeMode === 'sell' ? destToken?.symbol : undefined,
        );
      }
    },
    [
      maxSpendUsd,
      sourceToken?.symbol,
      destToken?.symbol,
      tradeMode,
      trackAmountSelected,
      lastInputMethodRef,
    ],
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

  const resetAmountState = useCallback(() => {
    setUsdAmount('');
    setSliderPercent(0);
    lastSnappedSliderPercentRef.current = 0;
    lastTrackedAmountRef.current = '';
    lastInputMethodRef.current =
      SocialLeaderboardEventValues.AMOUNT_SELECTION_METHOD.SLIDER;
  }, [lastInputMethodRef, lastTrackedAmountRef]);

  // Reset amount/slider when tradeMode flips and emit analytics.
  const prevTradeModeRef = useRef<QuickBuyTradeMode>(tradeMode);
  useEffect(() => {
    if (prevTradeModeRef.current !== tradeMode) {
      prevTradeModeRef.current = tradeMode;
      resetAmountState();
      setAmountDisplayMode('fiat');
      trackTradeModeToggled(tradeMode);
    }
  }, [tradeMode, resetAmountState, trackTradeModeToggled]);

  const handleSelectSourceToken = useCallback(
    (token: BridgeToken) => {
      setSelectedSourceToken(token);
      resetAmountState();
    },
    [resetAmountState],
  );

  const handleSelectDestStable = useCallback(
    (token: BridgeToken) => {
      setSelectedDestStable(token);
      resetAmountState();
    },
    [resetAmountState],
  );

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
    if (lastTrackedAmountRef.current === String(numeric)) return;
    const handle = setTimeout(() => {
      trackAmountSelected(
        numeric,
        SocialLeaderboardEventValues.AMOUNT_SELECTION_METHOD.CUSTOM_INPUT,
        tradeMode === 'buy' ? sourceToken?.symbol : undefined,
        undefined,
        tradeMode === 'sell' ? destToken?.symbol : undefined,
      );
    }, 500);
    return () => clearTimeout(handle);
  }, [
    usdAmount,
    sourceToken?.symbol,
    destToken?.symbol,
    tradeMode,
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
    const submittedAssetName = target.tokenSymbol;
    const submittedPayWith =
      tradeMode === 'buy' ? sourceToken?.symbol : undefined;
    const submittedReceiveToken =
      tradeMode === 'sell' ? destToken?.symbol : undefined;

    // Shared by the SUBMITTED + COMPLETED (success / failure) events. Built
    // once here so the success vs failure delta stays small at the call sites.
    const tradeBaseProps = submittedCaip19
      ? {
          ...(submittedTraderAddress
            ? {
                [SocialLeaderboardEventProperties.TRADER_ADDRESS]:
                  submittedTraderAddress,
              }
            : {}),
          [SocialLeaderboardEventProperties.CAIP19]: submittedCaip19,
          [SocialLeaderboardEventProperties.ASSET_NAME]: submittedAssetName,
          [SocialLeaderboardEventProperties.AMOUNT_USD]: amountUsd,
          [SocialLeaderboardEventProperties.TRADE_TYPE]: tradeMode,
          ...(submittedPayWith
            ? {
                [SocialLeaderboardEventProperties.PAY_WITH_TOKEN]:
                  submittedPayWith,
              }
            : {}),
          ...(submittedReceiveToken
            ? {
                [SocialLeaderboardEventProperties.RECEIVE_TOKEN]:
                  submittedReceiveToken,
              }
            : {}),
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
      const err = error instanceof Error ? error : new Error(String(error));
      Logger.error(
        err,
        buildSocialLoggerErrorOptions({
          surface: 'quick_buy',
          operation: 'submit_tx',
          extraMessage: 'Error submitting QuickBuy tx',
          source: 'useQuickBuyController',
          error,
          extraTags: {
            sourceChainId: sourceToken?.chainId ?? 'unknown',
            destChainId: destToken?.chainId ?? 'unknown',
          },
        }),
      );
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
    sourceToken?.chainId,
    destToken?.chainId,
    usdAmountNumber,
    traderAddress,
    caip19,
    tradeMode,
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
    if (buttonError) return strings(BUTTON_ERROR_LABELS[buttonError]);
    if (isSubmittingTx) return strings('bridge.submitting_transaction');
    return tradeMode === 'sell'
      ? strings('social_leaderboard.trader_position.sell')
      : strings('social_leaderboard.trader_position.buy');
  }, [buttonError, isSubmittingTx, tradeMode]);

  return {
    hiddenInputRef,
    tradeMode,
    setTradeMode,
    hasSellableBalance: positionToken !== undefined,
    activeQuote,
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
    sellDestTokenOptions,
    selectedDestStable,
    currentCurrency,
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
    formattedMinimumReceivedFiat,
    formattedPriceImpact,
    formattedRate,
    totalAmountUsd,
    isQuoteLoading,
    isSubmittingTx,
    isTotalLoading,
    sortedQuotes,
    selectedQuoteRequestId,
    setSelectedQuoteRequestId,
    quotesLastFetchedAt,
    refreshCount,
    quoteRefreshRateMs,
    maxRefreshCount,
    refetchQuotes,
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
    handleSelectSourceToken,
    handleSelectDestStable,
    handleConfirm,
  };
}
