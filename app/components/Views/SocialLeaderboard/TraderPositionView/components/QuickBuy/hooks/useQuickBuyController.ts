import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  playErrorNotification,
  playImpact,
  ImpactMoment,
} from '../../../../../../../util/haptics';
import { TextInput } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import type {
  QuickBuyAmountDisplayMode,
  QuickBuyAnalyticsContext,
  QuickBuyTarget,
  QuickBuyTradeMode,
} from '../types';
import { useQuickBuyAnalytics } from './useQuickBuyAnalytics';
import { formatExchangeRate } from '../utils/formatExchangeRate';
import { getMetamaskFeePercent } from '../utils/getMetamaskFeePercent';
import type { Hex } from '@metamask/utils';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import { selectDefaultSourceToken } from '../../../../utils/tokenSelection';
import { useQuickBuySetup } from './useQuickBuySetup';
import { usePayWithTokens } from './usePayWithTokens';
import { useReceiveTokens } from './useReceiveTokens';
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
import I18n, { strings } from '../../../../../../../../locales/i18n';
import { calcTokenValue } from '../../../../../../../util/transactions';
import Logger from '../../../../../../../util/Logger';
import { buildSocialLoggerErrorOptions } from '../../../../../../../util/social/socialServiceTelemetry';
import { useTheme } from '../../../../../../../util/theme';
import { ToastContext } from '../../../../../../../component-library/components/Toast';
import {
  SocialLeaderboardEventProperties,
  SocialLeaderboardEventValues,
} from '../../../../analytics';
import { trackQuickBuyTrade } from '../quickBuyTradeTracker';
import { buildQuickBuyToastOptions } from '../quickBuyToastOptions';
import { resolveQuickBuyTerminalToast } from '../resolveQuickBuyTerminalToast';
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
  /** Token-units amount entered in the unpriced sell path (otherwise ''). */
  sourceAmountTokens: string;
  /** Source token amount in token units (derived from USD for priced, or directly entered for unpriced). */
  sourceTokenAmount: string | undefined;
  /** True when the source token has a usable fiat exchange rate. */
  hasSourcePrice: boolean;
  sliderPercent: number;
  maxSpendUsd: number;
  /** True when neither USD nor token-balance gates allow slider interaction. */
  isSliderDisabled: boolean;
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
  /**
   * True only when a quote load should block the UI (first load or an input
   * change with no usable quote yet). False during benign background refreshes,
   * so the CTA stays enabled and the receive estimate stays visible.
   */
  isBlockingQuoteLoad: boolean;
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
  handleSliderDragEnd: (percent: number) => void;
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
  const theme = useTheme();
  const { toastRef } = useContext(ToastContext);

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
  const [sourceAmountTokens, setSourceAmountTokens] = useState('');
  // Drives quote re-fetching. Updated only when the user commits a value
  // (slider drag end, tap, or text input) — NOT on every drag tick. This
  // prevents spamming quote requests while the thumb is moving.
  const [quotedUsdAmount, setQuotedUsdAmount] = useState('');
  // Bumped whenever the user commits an amount in a single discrete gesture
  // (slider release) so the quotes hook fetches immediately instead of waiting
  // out the typing debounce. Typed input intentionally does NOT bump this — it
  // stays debounced to avoid a request per keystroke.
  const [immediateFetchToken, setImmediateFetchToken] = useState(0);
  // Fiat-first: every input path (slider, hidden TextInput, amount-area press)
  // edits the USD amount, so the primary label must default to fiat as well.
  // The user can swap to crypto display via the toggle once a quote is available.
  const [amountDisplayMode, setAmountDisplayMode] =
    useState<QuickBuyAmountDisplayMode>('fiat');
  const [sliderPercent, setSliderPercent] = useState(0);
  const lastSliderPercentRef = useRef(0);
  // Deduplicates consecutive handleSliderDragEnd calls with the same USD amount
  // (can happen when Tap + Pan both fire onEnd for a pure tap gesture).
  const lastCommittedUsdRef = useRef('');
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

  // ─── Buy "Pay with" options (tokens the user holds) ─────────────────────
  const { options: sourceTokenOptions } = usePayWithTokens();
  const [selectedSourceToken, setSelectedSourceToken] = useState<
    BridgeToken | undefined
  >(undefined);
  const [isSourcePickerOpen, setIsSourcePickerOpen] = useState(false);
  // True once the user explicitly picks a token from the picker. While false,
  // the auto-select effect is allowed to correct a stale selection.
  const isManualSelectionRef = useRef(false);

  // Dest-token lookup key passed to `selectDefaultSourceToken` so the
  // destination is filtered out of source candidates and not preselected as
  // pay-with. Reads from `positionTokenFromSetup` once available because
  // `useQuickBuySetup` normalises `address` to match what `sourceTokenOptions`
  // contains — bare hex for EVM (zero address for native, mint hex for
  // ERC-20) and CAIP-19 for non-EVM. Comparing against the raw
  // `target.tokenAddress` would miss when the social feed sends a CAIP-19
  // wrapper for an EVM asset (e.g. `eip155:137/slip44:966` for native POL),
  // letting the same token through as a pay-with option.
  //
  // Falls back to raw `target` values while metadata resolves (ERC-20s only —
  // natives resolve synchronously). The symbol fallback in
  // `selectDefaultSourceToken` covers cross-format mismatches in that window.
  const destLookupKey = useMemo<
    Pick<BridgeToken, 'address' | 'chainId' | 'symbol'> | undefined
  >(() => {
    if (!destChainId) return undefined;
    return {
      chainId: destChainId,
      address: positionTokenFromSetup?.address ?? target.tokenAddress,
      symbol: positionTokenFromSetup?.symbol ?? target.tokenSymbol,
    };
  }, [
    destChainId,
    positionTokenFromSetup?.address,
    positionTokenFromSetup?.symbol,
    target.tokenAddress,
    target.tokenSymbol,
  ]);

  // Auto-select default source token using smart priority rules (see
  // `selectDefaultSourceToken`). `destLookupKey` is passed so the destination
  // is deprioritized and not preselected when the user has other holdings.
  // Manual picker selections are preserved via `isManualSelectionRef`.
  //
  // We wait for `!isSetupLoading` before the first pick so `destLookupKey`
  // reflects the normalised dest address (otherwise an ERC-20 destination
  // with a CAIP-19-wrapped `target.tokenAddress` could leak through the
  // address filter while metadata is in flight, and the `selectedSourceToken`
  // guard would prevent self-correction once metadata lands).
  useEffect(() => {
    if (isSetupLoading) return;
    if (sourceTokenOptions.length === 0) return;
    if (selectedSourceToken) return;
    if (isManualSelectionRef.current) return;
    setSelectedSourceToken(
      selectDefaultSourceToken(sourceTokenOptions, destChainId, destLookupKey),
    );
  }, [
    isSetupLoading,
    sourceTokenOptions,
    selectedSourceToken,
    destChainId,
    destLookupKey,
  ]);

  // ─── Sell mode: position token (what the user is selling) ──────────────
  const positionToken = usePositionTokenBalance(target, positionTokenFromSetup);

  // ─── Sell "Receive" options (stablecoins) ──────────────────────────────
  const sellDestTokenOptions = useReceiveTokens(
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

  const hasSourcePrice = Boolean(
    sourceToken?.currencyExchangeRate && sourceToken.currencyExchangeRate > 0,
  );

  const sourceTokenAmount = useMemo(() => {
    if (hasSourcePrice) {
      if (!quotedUsdAmount || !sourceToken?.currencyExchangeRate) {
        return undefined;
      }
      const usd = parseFloat(quotedUsdAmount);
      if (isNaN(usd) || usd <= 0) return undefined;
      return (usd / sourceToken.currencyExchangeRate).toString();
    }
    // Unpriced path: source amount is entered directly in token units.
    if (!sourceAmountTokens) return undefined;
    const tokens = parseFloat(sourceAmountTokens);
    if (!Number.isFinite(tokens) || tokens <= 0) return undefined;
    return sourceAmountTokens;
  }, [
    hasSourcePrice,
    quotedUsdAmount,
    sourceAmountTokens,
    sourceToken?.currencyExchangeRate,
  ]);

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

  // Used for analytics passed to useQuickBuyQuotes. Must derive from
  // quotedUsdAmount (not usdAmount) so that mid-drag display updates don't
  // recreate quotesAnalyticsContext and trigger spurious quote re-fetches.
  const quotedUsdAmountNumber = useMemo(() => {
    const v = Number(quotedUsdAmount);
    return Number.isFinite(v) ? v : 0;
  }, [quotedUsdAmount]);
  // Derives from usdAmount for handleConfirm (the confirm button is disabled
  // when usdAmount !== quotedUsdAmount, so by the time confirm is pressed they
  // are always equal — keeping separate avoids recreating handleConfirm on
  // every drag tick).
  const usdAmountNumber = useMemo(() => {
    const v = Number(usdAmount);
    return Number.isFinite(v) ? v : 0;
  }, [usdAmount]);
  const quotesAnalyticsContext = useMemo(
    () => ({ traderAddress, caip19, amountUsd: quotedUsdAmountNumber }),
    [traderAddress, caip19, quotedUsdAmountNumber],
  );

  const {
    activeQuote,
    sortedQuotes,
    destTokenAmount: estimatedReceiveAmount,
    isQuoteLoading,
    isNoQuotesAvailable,
    quoteFetchError,
    isActiveQuoteForCurrentTokenPair,
    isQuoteRequestStale,
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
    immediateFetchToken,
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

  // Derive both sides of the ratio from the same activeQuote so the rate is
  // always internally consistent. Previously we mixed the live
  // sourceTokenAmount (which jumps the moment the user commits a new slider
  // value) with the stale estimatedReceiveAmount (still the previous quote's
  // dest amount), producing nonsensical rates during the in-flight window
  // between drag-end and the new quote arriving.
  const formattedRate = useMemo(() => {
    if (!sourceToken || !destToken || !activeQuote || !estimatedReceiveAmount) {
      return undefined;
    }
    const quoteSrcMinimal = activeQuote.quote.srcTokenAmount;
    if (sourceToken.decimals == null || !quoteSrcMinimal) return undefined;
    const sourceAmt =
      parseFloat(quoteSrcMinimal) / Math.pow(10, sourceToken.decimals);
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
  }, [sourceToken, destToken, activeQuote, estimatedReceiveAmount]);

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

  // Token-amount-based gate: used for sources we can't price. Mirrors how the
  // Bridge / asset list keep unpriceable tokens usable as long as the user
  // actually holds a positive balance.
  const maxSpendTokens = useMemo(() => {
    const raw = latestSourceBalance?.displayBalance;
    if (!raw) return 0;
    const parsed = parseFloat(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [latestSourceBalance?.displayBalance]);

  const isSliderDisabled = hasSourcePrice
    ? maxSpendUsd <= 0
    : maxSpendTokens <= 0;

  // For the toolbar rate pill in buy mode the dest token from `useQuickBuySetup`
  // carries no price data, so we enrich a local copy with the rate already
  // resolved by `usePositionTokenBalance`. We deliberately do NOT propagate this
  // into `destToken` itself — the BridgeToken passed to quote fetching and
  // redux must stay reference-stable, otherwise EVM→non-EVM (e.g. USDC/Base →
  // SOL/Solana) flows lose their quote requests when market data ticks.
  const destTokenForRate = useMemo<BridgeToken | undefined>(() => {
    if (tradeMode !== 'buy' || !destToken) return destToken;
    const rate = positionToken?.currencyExchangeRate;
    if (rate === undefined) return destToken;
    return { ...destToken, currencyExchangeRate: rate };
  }, [tradeMode, destToken, positionToken?.currencyExchangeRate]);

  const formattedExchangeRate = useMemo(
    () =>
      tradeMode === 'sell'
        ? formatExchangeRate(sourceToken, destToken)
        : formatExchangeRate(destTokenForRate, sourceToken),
    [destToken, destTokenForRate, sourceToken, tradeMode],
  );

  const metamaskFeePercent = useMemo(
    () => getMetamaskFeePercent(activeQuote),
    [activeQuote],
  );

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Updates the display state (thumb position + fiat label) on every 1% tick
  // during a drag. Does NOT commit to quotedUsdAmount or fire analytics — that
  // is deferred to handleSliderDragEnd so we only re-fetch quotes once per
  // gesture, not on every pixel of movement.
  const handleSliderChange = useCallback(
    (percent: number) => {
      const rounded = Math.round(percent);
      if (rounded === lastSliderPercentRef.current) {
        return;
      }

      lastSliderPercentRef.current = rounded;
      setSliderPercent(rounded);

      // ── Unpriced path: drive token-amount state directly. ───────────────
      if (!hasSourcePrice) {
        if (maxSpendTokens <= 0) {
          setSourceAmountTokens('');
          return;
        }
        const nextTokens =
          rounded === 0 ? '' : ((maxSpendTokens * rounded) / 100).toString();
        setSourceAmountTokens(nextTokens);
        return;
      }

      // ── Priced path: update display state only (quote commits on drag end). ──
      if (maxSpendUsd <= 0) {
        setUsdAmount('');
        return;
      }
      const nextUsd =
        rounded === 0 ? '' : ((maxSpendUsd * rounded) / 100).toFixed(2);
      setUsdAmount(nextUsd);
      lastInputMethodRef.current =
        SocialLeaderboardEventValues.AMOUNT_SELECTION_METHOD.SLIDER;
    },
    [hasSourcePrice, maxSpendTokens, maxSpendUsd, lastInputMethodRef],
  );

  // Called once when the user lifts their finger (pan end) or taps the track.
  // Commits the final value to quotedUsdAmount (triggering a quote re-fetch)
  // and fires analytics exactly once per interaction.
  const handleSliderDragEnd = useCallback(
    (percent: number) => {
      const rounded = Math.round(percent);
      const nextUsd =
        rounded === 0 || maxSpendUsd <= 0
          ? ''
          : ((maxSpendUsd * rounded) / 100).toFixed(2);

      // Deduplicate: Tap + Pan can both fire onEnd for a pure tap gesture.
      if (nextUsd === lastCommittedUsdRef.current) {
        return;
      }
      lastCommittedUsdRef.current = nextUsd;

      // Guarantee display state matches the committed value. The last onUpdate
      // tick during a Pan may have landed on a different % than where the
      // finger actually lifted — if so, usdAmount would be stale relative to
      // quotedUsdAmount, keeping isAmountUncommitted true and the Buy button
      // permanently disabled. Syncing both states here is the authoritative fix.
      setSliderPercent(rounded);
      lastSliderPercentRef.current = rounded;
      setUsdAmount(nextUsd);

      setQuotedUsdAmount(nextUsd);
      const numericUsd = Number(nextUsd);
      if (rounded > 0 && Number.isFinite(numericUsd) && numericUsd > 0) {
        // Slider release is a single committed value — fetch the quote
        // immediately rather than waiting out the typing debounce.
        setImmediateFetchToken((token) => token + 1);
        trackAmountSelected(
          numericUsd,
          SocialLeaderboardEventValues.AMOUNT_SELECTION_METHOD.SLIDER,
          tradeMode === 'buy' ? sourceToken?.symbol : undefined,
          rounded,
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
    ],
  );

  const handleAmountAreaPress = useCallback(() => {
    // Priced flows are fiat-first, so typing in fiat keeps the keyboard digits
    // aligned with the headline. Unpriced flows are crypto-first by necessity
    // (we have no rate to convert), so we leave the display mode as 'crypto'.
    if (hasSourcePrice) {
      setAmountDisplayMode('fiat');
    } else {
      setAmountDisplayMode('crypto');
    }
    hiddenInputRef.current?.focus();
  }, [hasSourcePrice]);

  const handleToggleAmountDisplay = useCallback(() => {
    setAmountDisplayMode((mode) => (mode === 'fiat' ? 'crypto' : 'fiat'));
  }, []);

  const resetAmountState = useCallback(() => {
    setUsdAmount('');
    setQuotedUsdAmount('');
    setSourceAmountTokens('');
    setSliderPercent(0);
    lastSliderPercentRef.current = 0;
    lastCommittedUsdRef.current = '';
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
      // Default display mode follows pricing availability. Unpriced sources
      // can only meaningfully show a crypto-first headline.
      setAmountDisplayMode(hasSourcePrice ? 'fiat' : 'crypto');
      trackTradeModeToggled(tradeMode);
    }
  }, [tradeMode, hasSourcePrice, resetAmountState, trackTradeModeToggled]);

  // If the source token's price becomes available (or disappears) while the
  // sheet is open — e.g. a new market-data fetch lands — re-align the display
  // mode so the headline reflects what we can honestly show. If price arrives
  // after the user already entered a token amount, convert it to USD so the
  // amount is not lost.
  const prevHasSourcePriceRef = useRef(hasSourcePrice);
  useEffect(() => {
    if (prevHasSourcePriceRef.current === hasSourcePrice) return;
    const prev = prevHasSourcePriceRef.current;
    prevHasSourcePriceRef.current = hasSourcePrice;
    if (!hasSourcePrice) {
      setAmountDisplayMode('crypto');
    } else if (!prev) {
      // Price just became available — migrate any entered token amount to USD.
      setAmountDisplayMode('fiat');
      const tokens = parseFloat(sourceAmountTokens);
      if (
        Number.isFinite(tokens) &&
        tokens > 0 &&
        sourceToken?.currencyExchangeRate
      ) {
        const usd = (tokens * sourceToken.currencyExchangeRate).toFixed(2);
        setUsdAmount(usd);
        setQuotedUsdAmount(usd);
        lastCommittedUsdRef.current = usd;
      }
    }
  }, [hasSourcePrice, sourceAmountTokens, sourceToken?.currencyExchangeRate]);

  const handleSelectSourceToken = useCallback(
    (token: BridgeToken) => {
      isManualSelectionRef.current = true;
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
      // Priced (fiat) input: cap to 2 decimals. Unpriced (token) input: allow
      // up to the token's decimals so the user can spend small balances.
      const maxFractionDigits = hasSourcePrice
        ? 2
        : (sourceToken?.decimals ?? 18);
      if (parts.length === 2 && parts[1].length > maxFractionDigits) return;
      if (hasSourcePrice) {
        setUsdAmount(normalized);
        setQuotedUsdAmount(normalized);
        lastCommittedUsdRef.current = normalized;
      } else {
        setSourceAmountTokens(normalized);
      }
      lastSliderPercentRef.current = 0;
      setSliderPercent(0);
    },
    [hasSourcePrice, sourceToken?.decimals, lastInputMethodRef],
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

    const amountUsd = usdAmountNumber > 0 ? usdAmountNumber : undefined;
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
          ...(amountUsd !== undefined
            ? { [SocialLeaderboardEventProperties.AMOUNT_USD]: amountUsd }
            : {}),
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
    // Captures the copy data for every swap-lifecycle toast so the pending,
    // complete and failed states read consistently — and so the app-root
    // watcher can render the terminal toast after the sheet has unmounted.
    const tradeToastInfo = {
      tradeMode,
      tokenSymbol: target.tokenSymbol,
      counterTokenSymbol:
        (tradeMode === 'buy' ? sourceToken?.symbol : destToken?.symbol) ?? '',
      fiatAmountLabel: formatCurrency(usdAmountNumber, currentCurrency),
      rate: formattedRate,
    };
    // Close the sheet and surface the pending toast immediately — the swap can
    // take minutes to settle (cross-chain), so the user gets instant feedback
    // on the trigger screen while submission happens in the background. The
    // complete/failed toast later fires from the app-root registration.
    onClose();
    toastRef?.current?.showToast(
      buildQuickBuyToastOptions('pending', { trade: tradeToastInfo, theme }),
    );
    // Medium impact acknowledging the Buy commit (catalog `PrimaryCTA`);
    // success/error feedback is deferred to the terminal complete/failed
    // states once the swap settles.
    playImpact(ImpactMoment.PrimaryCTA);

    const elapsedMs = () =>
      submitStartedAtRef.current ? Date.now() - submitStartedAtRef.current : 0;

    try {
      dispatch(setIsSubmittingTx(true));
      const submitResult = await Engine.context.BridgeStatusController.submitTx(
        walletAddress,
        { ...activeQuote, approval: activeQuote.approval ?? undefined },
        stxEnabled,
      );
      const txHash =
        submitResult &&
        typeof (submitResult as { hash?: unknown }).hash === 'string'
          ? ((submitResult as { hash?: string }).hash as string)
          : undefined;
      const txMetaId = (submitResult as { id?: string } | undefined)?.id;
      if (txMetaId) {
        trackQuickBuyTrade(txMetaId, tradeToastInfo);
        // The swap may already have settled by the time submitTx resolves, in
        // which case the terminal stateChange events fired before this id was
        // tracked and the app-root handler ignored them. Reconcile against the
        // current bridge status now so the user isn't stuck on the pending
        // toast; if it's still pending, future stateChange events take over.
        const showToast = toastRef?.current?.showToast;
        if (showToast) {
          resolveQuickBuyTerminalToast(txMetaId, showToast, theme);
        }
      }
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
      // submitTx threw before publish (e.g. user rejection), so no bridge
      // history item will ever exist — surface the failure immediately.
      toastRef?.current?.showToast(
        buildQuickBuyToastOptions('failed', { trade: tradeToastInfo, theme }),
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
    toastRef,
    theme,
    sourceToken?.chainId,
    destToken?.chainId,
    usdAmountNumber,
    currentCurrency,
    formattedRate,
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
  const hasValidAmount = hasSourcePrice
    ? Boolean(usdAmount && Number(usdAmount) > 0)
    : Boolean(sourceAmountTokens && Number(sourceAmountTokens) > 0);
  // True while the slider is mid-drag: the user has moved the thumb but has not
  // yet committed (released).
  const isAmountUncommitted = usdAmount !== quotedUsdAmount;
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
  // A displayed quote corresponds to the current amount when the amount the
  // user actually spends matches the requested amount. The request is built
  // with `calcTokenValue(sourceTokenAmount, decimals).toFixed(0)`, so we
  // normalise both sides to atomic units and compare.
  //
  // We compare against the quote's `sentAmount` (the full wallet deduction:
  // routing amount + src-token fees, or the fixed intent commitment) rather
  // than `quote.srcTokenAmount`. `quote.srcTokenAmount` is the post-fee swap
  // amount, so for gas-included / gas-sponsored quotes it is smaller than the
  // requested amount and an exact equality would never pass — leaving the Buy
  // CTA stuck disabled even with a valid quote on screen. `sentAmount` adds
  // those src-token fees back, reconstructing the requested amount.
  //
  // Deriving this synchronously (rather than tracking the last-settled amount
  // in a ref updated from an effect) lets the CTA enable on the same render the
  // matching quote arrives — in lockstep with the loader — instead of a render
  // later.
  const isActiveQuoteForCurrentAmount = useMemo(() => {
    if (
      !activeQuote ||
      !sourceToken ||
      sourceToken.decimals == null ||
      !sourceTokenAmount
    ) {
      return false;
    }
    try {
      const requested = calcTokenValue(
        sourceTokenAmount,
        sourceToken.decimals,
      ).toFixed(0);
      const sent = calcTokenValue(
        activeQuote.sentAmount.amount,
        sourceToken.decimals,
      ).toFixed(0);
      return sent === requested;
    } catch {
      return false;
    }
  }, [activeQuote, sourceToken, sourceTokenAmount]);

  const hasCompleteQuoteInputs = Boolean(
    sourceToken &&
      destToken &&
      hasQuoteRequestableAmount &&
      !isDestinationAddressMissing,
  );
  const isPendingQuoteRefresh =
    hasCompleteQuoteInputs && !isActiveQuoteForCurrentAmount;
  const hasQuoteMismatch =
    Boolean(activeQuote) && !isActiveQuoteForCurrentTokenPair;

  // A usable quote for exactly what's displayed: present, for the current token
  // pair, for the current (committed) amount, not mid-drag, and for the current
  // request-only inputs (slippage, destination address, gas settings). When this
  // holds, an in-flight fetch is a benign background refresh — the displayed
  // quote stays valid and submittable and is swapped in place when the new one
  // lands. When a request input changes, the displayed quote no longer matches
  // the request being fetched, so it is not usable until the new quote arrives.
  const hasUsableQuoteOnScreen =
    Boolean(activeQuote) &&
    isActiveQuoteForCurrentTokenPair &&
    !isPendingQuoteRefresh &&
    !isAmountUncommitted &&
    !isQuoteRequestStale;

  // Loading that should block the UI: first load or an input change with no
  // usable quote yet. A plain background refresh is excluded so the CTA and the
  // receive estimate are not blanked every refresh tick.
  const isBlockingQuoteLoad = isQuoteLoading && !hasUsableQuoteOnScreen;

  const isConfirmDisabled =
    !hasValidAmount ||
    isAmountUncommitted ||
    isSetupLoading ||
    !sourceToken ||
    !destToken ||
    isDestinationAddressMissing ||
    !activeQuote ||
    hasQuoteMismatch ||
    isPendingQuoteRefresh ||
    isQuoteRequestStale ||
    isBlockingQuoteLoad ||
    hasInsufficientBalance ||
    isNetworkFeeUnavailable ||
    hasInsufficientGas ||
    isSubmittingTx ||
    hasError ||
    isHardwareSolanaBlocked ||
    !walletAddress;

  const isTotalLoading =
    hasValidAmount &&
    (isBlockingQuoteLoad || isPendingQuoteRefresh || isQuoteRequestStale);

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
  if (isConfirmLoading) {
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
    sourceAmountTokens,
    sourceTokenAmount,
    hasSourcePrice,
    sliderPercent,
    maxSpendUsd,
    isSliderDisabled,
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
    isBlockingQuoteLoad,
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
    handleSliderDragEnd,
    handleAmountAreaPress,
    handleAmountChange,
    handleToggleAmountDisplay,
    handleSelectSourceToken,
    handleSelectDestStable,
    handleConfirm,
  };
}
