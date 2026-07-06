import { isNonEvmChainId } from '@metamask/bridge-controller';
import type { Hex } from '@metamask/utils';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { TextInput } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../../../selectors/currencyRateController';
import { selectNetworkConfigurations } from '../../../../../../../selectors/networkController';
import {
  ImpactMoment,
  playErrorNotification,
  playImpact,
} from '../../../../../../../util/haptics';
import {
  dotAndCommaDecimalFormatter,
  isNumberValue,
} from '../../../../../../../util/number/bigint';
import { useDisplayCurrencyValue } from '../../../../../../UI/Bridge/hooks/useDisplayCurrencyValue';
import { useFormattedNetworkFee } from '../../../../../../UI/Bridge/hooks/useFormattedNetworkFee';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import {
  formatCurrency,
  formatMinimumReceived,
} from '../../../../../../UI/Bridge/utils/currencyUtils';
import { FIAT_INPUT_DECIMALS } from '../../../../../../UI/Bridge/utils/sourceAmountInputMode';
import { isGaslessQuote } from '../../../../../../UI/Bridge/utils/isGaslessQuote';
import { calcUsdAmountFromFiat } from '../../../../../../UI/Bridge/utils/exchange-rates';
import {
  isSameAsset,
  selectDefaultSourceToken,
} from '../../../../utils/tokenSelection';
import type {
  QuickBuyAmountDisplayMode,
  QuickBuyAnalyticsContext,
  QuickBuyTarget,
  QuickBuyTradeMode,
} from '../types';
import { getTokenKey } from '../tokenKey';
import { formatExchangeRate } from '../utils/formatExchangeRate';
import { formatQuickBuyRateValue } from '../utils/formatQuickBuyRateValue';
import { getMetamaskFeePercent } from '../utils/getMetamaskFeePercent';
import { selectDefaultReceiveToken } from '../utils/selectDefaultReceiveToken';
import { useDestTokenExchangeRate } from './useDestTokenExchangeRate';
import { usePayWithTokens } from './usePayWithTokens';
import { usePositionTokenBalance } from './usePositionTokenBalance';
import { useQuickBuyAnalytics } from './useQuickBuyAnalytics';
import {
  useQuickBuyQuotes,
  type EnrichedQuickBuyQuote,
} from './useQuickBuyQuotes';
import { useQuickBuySetup } from './useQuickBuySetup';
import { useReceiveTokens } from './useReceiveTokens';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import I18n, { strings } from '../../../../../../../../locales/i18n';
import { ToastContext } from '../../../../../../../component-library/components/Toast';
import Engine from '../../../../../../../core/Engine';
import {
  selectBridgeFeatureFlags,
  selectDestAddress,
  selectIsEvmNonEvmBridge,
  selectIsNonEvmNonEvmBridge,
  selectIsNonEvmSourced,
  selectIsSolanaSourced,
  selectIsSubmittingTx,
  selectSlippage,
  setDestToken,
  setIsSubmittingTx,
  setSourceAmount,
  setSourceToken,
} from '../../../../../../../core/redux/slices/bridge';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../../selectors/accountsController';
import { selectSourceWalletAddress } from '../../../../../../../selectors/bridge';
import { selectShouldUseSmartTransaction } from '../../../../../../../selectors/smartTransactionsController';
import { isHardwareAccount } from '../../../../../../../util/address';
import Logger from '../../../../../../../util/Logger';
import { buildSocialLoggerErrorOptions } from '../../../../../../../util/social/socialServiceTelemetry';
import { useTheme } from '../../../../../../../util/theme';
import { calcTokenValue } from '../../../../../../../util/transactions';
import { useRefreshSmartTransactionsLiveness } from '../../../../../../hooks/useRefreshSmartTransactionsLiveness';
import { toAssetId } from '../../../../../../UI/Bridge/hooks/useAssetMetadata/utils';
import { useHasSufficientGas } from '../../../../../../UI/Bridge/hooks/useHasSufficientGas';
import { useInitialSlippage } from '../../../../../../UI/Bridge/hooks/useInitialSlippage';
import useIsInsufficientBalance from '../../../../../../UI/Bridge/hooks/useInsufficientBalance';
import { useIsGasIncludedSTXSendBundleSupported } from '../../../../../../UI/Bridge/hooks/useIsGasIncludedSTXSendBundleSupported';
import { useIsNetworkFeeUnavailable } from '../../../../../../UI/Bridge/hooks/useIsNetworkFeeUnavailable';
import { useLatestBalance } from '../../../../../../UI/Bridge/hooks/useLatestBalance';
import { usePriceImpactViewData } from '../../../../../../UI/Bridge/hooks/usePriceImpactViewData';
import { useRecipientInitialization } from '../../../../../../UI/Bridge/hooks/useRecipientInitialization';
import {
  exceedsPriceImpactErrorThreshold,
  parsePriceImpact,
} from '../../../../../../UI/Bridge/utils/getPriceImpactViewData';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useGasFeeEstimates } from '../../../../../confirmations/hooks/gas/useGasFeeEstimates';
import { QuickBuyEventProperties, QuickBuyEventValues } from '../analytics';
import { buildQuickBuyToastOptions } from '../quickBuyToastOptions';
import {
  trackQuickBuyTrade,
  beginQuickBuySubmission,
  endQuickBuySubmission,
} from '../quickBuyTradeTracker';
import { resolveQuickBuyTerminalToast } from '../resolveQuickBuyTerminalToast';
import { resolveLiveTokenBalance } from './liveSelectedTokenBalance';

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
  /** Raw entered amount in the user's display currency (unformatted, e.g. "20"). */
  fiatAmount: string;
  /** Entered amount preformatted in the user's display currency (e.g. "$20", "20 €"). */
  fiatAmountLabel: string;
  /** Token-units amount entered in the unpriced sell path (otherwise ''). */
  sourceAmountTokens: string;
  /** Source token amount in token units (derived from the fiat amount for priced, or directly entered for unpriced). */
  sourceTokenAmount: string | undefined;
  /** True when the source token has a usable fiat exchange rate. */
  hasSourcePrice: boolean;
  sliderPercent: number;
  maxSpendFiat: number;
  /** True when neither fiat nor token-balance gates allow slider interaction. */
  isSliderDisabled: boolean;
  formattedExchangeRate: string | undefined;
  metamaskFeePercent: number;
  estimatedReceiveAmount: string | undefined;
  sourceBalanceFiat: string;
  sourceBalanceDisplay: string | undefined;
  /**
   * Live fiat balance of the sell-mode "Receive" token, resynced from the
   * reactive receive-token list so it tracks underlying balance changes.
   * `undefined` when no receive token is selected or its price is unresolved.
   */
  destBalanceFiat: string | undefined;
  formattedNetworkFee: string;
  formattedSlippage: string;
  formattedMinimumReceived: string;
  formattedMinimumReceivedFiat: string | undefined;
  formattedPriceImpact: string;
  formattedRate: string | undefined;
  totalAmountFiat: string;
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
  handleSelectQuote: (requestId: string) => void;
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
  /** Buy-mode preset fiat pill tap — commits amount and fetches quote immediately. */
  handleQuickAmountPress: (fiatValue: number) => void;
  /** USD → user display currency rate for fallback pill conversion. */
  usdToCurrentCurrencyRate: number | undefined;
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
    trackQuoteSelected,
    trackPayWithSelected,
    trackReceiveTokenSelected,
    trackSlippageChanged,
    trackTradeSubmitted,
    trackTradeCompleted,
    markTradeSubmitted,
  } = useQuickBuyAnalytics(traderAddress, caip19, analyticsContext);

  const [tradeMode, setTradeMode] = useState<QuickBuyTradeMode>('buy');
  const [fiatAmount, setFiatAmount] = useState('');
  const [sourceAmountTokens, setSourceAmountTokens] = useState('');
  // True when the user has committed the slider to 100% ("sell all"). In this
  // mode `sourceTokenAmount` spends the exact on-chain balance rather than a
  // value reconstructed from the fiat round-trip / float math, either of which
  // can land just above the real balance and falsely trip the insufficient-
  // funds gate. Reset on any other amount input.
  const [isMaxSourceAmount, setIsMaxSourceAmount] = useState(false);
  // Drives quote re-fetching. Updated only when the user commits a value
  // (slider drag end, tap, or text input) — NOT on every drag tick. This
  // prevents spamming quote requests while the thumb is moving.
  const [quotedFiatAmount, setQuotedFiatAmount] = useState('');
  // Bumped whenever the user commits an amount in a single discrete gesture
  // (slider release) so the quotes hook fetches immediately instead of waiting
  // out the typing debounce. Typed input intentionally does NOT bump this — it
  // stays debounced to avoid a request per keystroke.
  const [immediateFetchToken, setImmediateFetchToken] = useState(0);
  // Fiat-first: every input path (slider, hidden TextInput, amount-area press)
  // edits the user-currency amount, so the primary label must default to fiat
  // as well. The user can swap to crypto display via the toggle once a quote is
  // available.
  const [amountDisplayMode, setAmountDisplayMode] =
    useState<QuickBuyAmountDisplayMode>('fiat');
  const [sliderPercent, setSliderPercent] = useState(0);
  const lastSliderPercentRef = useRef(0);
  // Deduplicates consecutive handleSliderDragEnd calls with the same
  // user-currency amount (can happen when Tap + Pan both fire onEnd for a pure
  // tap gesture).
  const lastCommittedFiatRef = useRef('');
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
  const isNonEvmSourced = useSelector(selectIsNonEvmSourced);
  const bridgeFeatureFlags = useSelector(selectBridgeFeatureFlags);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const currencyRates = useSelector(selectCurrencyRates);
  const networkConfigurations = useSelector(selectNetworkConfigurations);
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
  const { options: heldTokenOptions } = usePayWithTokens();
  const [selectedSourceToken, setSelectedSourceToken] = useState<
    BridgeToken | undefined
  >(undefined);
  const [isSourcePickerOpen, setIsSourcePickerOpen] = useState(false);
  // True once the user explicitly picks a token from the picker. While false,
  // the auto-select effect is allowed to correct a stale selection.
  const isManualSelectionRef = useRef(false);

  // Dest-token lookup key used to exclude the destination from the "Pay with"
  // options and from the default source-token selection — a source equal to
  // the destination can never produce a quote.
  // Reads from `positionTokenFromSetup` once available because
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

  // "Pay with" options surfaced to the picker: the asset being bought is
  // excluded so the user can never select a source equal to the buy target
  // (TSA-660). While ERC-20 metadata resolves, `destLookupKey` falls back to
  // the raw target values; the non-EVM symbol fallback in `isSameAsset`
  // covers cross-format mismatches in that window, and the dest is filtered
  // out on the next render once the normalised address lands.
  const sourceTokenOptions = useMemo(
    () =>
      destLookupKey
        ? heldTokenOptions.filter((token) => !isSameAsset(token, destLookupKey))
        : heldTokenOptions,
    [heldTokenOptions, destLookupKey],
  );

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

  // If the current selection turns out to BE the destination asset — e.g. it
  // was picked while ERC-20 metadata was still resolving and the normalised
  // dest address only matched afterwards — fall back to the best non-dest
  // option instead of silently keeping a same-token pair that can never
  // quote. Clears the manual flag so the auto-select effect can take over
  // again if the fallback yields nothing.
  useEffect(() => {
    if (!selectedSourceToken || !destLookupKey) return;
    if (!isSameAsset(selectedSourceToken, destLookupKey)) return;
    isManualSelectionRef.current = false;
    setSelectedSourceToken(
      selectDefaultSourceToken(sourceTokenOptions, destChainId, destLookupKey),
    );
  }, [selectedSourceToken, destLookupKey, sourceTokenOptions, destChainId]);

  // ─── Sell mode: position token (what the user is selling) ──────────────
  const positionToken = usePositionTokenBalance(target, positionTokenFromSetup);

  // If the position balance drops to zero while sell mode is active, fall back
  // to buy so the user is not stranded in a mode they can no longer use.
  useEffect(() => {
    if (positionToken === undefined && tradeMode === 'sell') {
      setTradeMode('buy');
    }
  }, [positionToken, tradeMode]);

  // ─── Sell "Receive" options (stablecoins) ──────────────────────────────
  const receiveTokenOptions = useReceiveTokens(
    destChainId as string | undefined,
  );
  // Exclude the token being sold from the "Receive" list entirely — receiving
  // the same token you're selling is a no-op, so it must not be selectable.
  // Identity comes from `positionTokenFromSetup` (normalised address/chainId).
  const sellDestTokenOptions = useMemo(() => {
    if (!positionTokenFromSetup) return receiveTokenOptions;
    const soldKey = getTokenKey(positionTokenFromSetup);
    return receiveTokenOptions.filter(
      (token) => getTokenKey(token) !== soldKey,
    );
  }, [receiveTokenOptions, positionTokenFromSetup]);
  const [selectedDestStable, setSelectedDestStable] = useState<
    BridgeToken | undefined
  >(undefined);

  // Auto-select the default receive token. Prefer the native token of the
  // position's chain (e.g. selling USDC on Base defaults to ETH on Base) and
  // never the same token being sold — see `selectDefaultReceiveToken`.
  //
  // Wait for `!isSetupLoading` so the sold token's address is normalised before
  // the (one-shot) selection runs. The sold token's identity is read from
  // `positionTokenFromSetup` (which carries the normalised address/chainId)
  // rather than the balance-enriched `positionToken`, so the exclusion still
  // works even when the balance is still resolving.
  useEffect(() => {
    if (isSetupLoading) return;
    if (sellDestTokenOptions.length > 0 && !selectedDestStable) {
      setSelectedDestStable(
        selectDefaultReceiveToken(sellDestTokenOptions, positionTokenFromSetup),
      );
    }
  }, [
    isSetupLoading,
    sellDestTokenOptions,
    selectedDestStable,
    positionTokenFromSetup,
  ]);

  // ─── Source / dest resolution (mode-dependent) ─────────────────────────
  const sourceToken = tradeMode === 'buy' ? selectedSourceToken : positionToken;
  const destToken =
    tradeMode === 'buy' ? positionTokenFromSetup : selectedDestStable;
  const sourceChainId = sourceToken?.chainId as Hex | undefined;

  // The entered amount is in the user's display currency, but the
  // `amount_usd` analytics property is contractually USD. Convert via the
  // pure fiat->USD ratio (usdConversionRate / conversionRate) derived from the
  // source chain's native-currency rates. Returns 0 when rates are unavailable
  // so analytics never reports a user-currency value as USD.
  const toAmountUsd = useCallback(
    (fiat: number): number => {
      if (!Number.isFinite(fiat) || fiat <= 0) return 0;
      return (
        calcUsdAmountFromFiat({
          tokenFiatValue: fiat,
          chainId: sourceToken?.chainId,
          networkConfigurationsByChainId: networkConfigurations,
          evmMultiChainCurrencyRates: currencyRates,
        }) ?? 0
      );
    },
    [sourceToken?.chainId, networkConfigurations, currencyRates],
  );

  const usdToCurrentCurrencyRate = useMemo(() => {
    const nativeCurrency = sourceToken?.chainId
      ? networkConfigurations[sourceToken.chainId]?.nativeCurrency
      : undefined;
    const evmChainCurrencyEntry = nativeCurrency
      ? currencyRates?.[nativeCurrency]
      : undefined;
    const fallbackEvmCurrencyEntry = Object.values(currencyRates ?? {}).find(
      (entry) => entry?.conversionRate && entry?.usdConversionRate,
    );
    const currencyEntry = evmChainCurrencyEntry ?? fallbackEvmCurrencyEntry;
    const conversionRate = currencyEntry?.conversionRate;
    const usdConversionRate = currencyEntry?.usdConversionRate;
    if (!conversionRate || !usdConversionRate) {
      return undefined;
    }
    return conversionRate / usdConversionRate;
  }, [sourceToken?.chainId, networkConfigurations, currencyRates]);

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

  // ─── Live selected-token balances (TSA-632) ────────────────────────────
  // The selected pay-with token (`selectedSourceToken`, buy mode) and receive
  // token (`selectedDestStable`, sell mode) are `useState` snapshots, so their
  // cached `balance` / `balanceFiat` freeze at selection time. The option lists
  // they were picked from — `usePayWithTokens` / `useReceiveTokens` — recompute
  // on every balance-state change because they subscribe (via `useSelector`) to
  // `TokenBalancesController` / `AccountTrackerController` (EVM) and the
  // multichain balances state (Solana). Re-reading the matching option here
  // makes both displayed balances track the underlying state whatever changed
  // it: a QuickBuy swap settling, an external incoming transfer, a send in
  // another flow, etc.
  //
  // The other side of each trade is already selector-driven and needs no
  // resync: sell-mode `positionToken` comes from `usePositionTokenBalance`, and
  // buy-mode `destToken` (`positionTokenFromSetup`) carries no displayed
  // balance in the footer.
  //
  // Only the balance fields are pulled from the live option — never the token
  // reference passed to quote fetching — so market-data ticks can't churn quote
  // requests (see `destTokenForRate` below for the same invariant).
  const liveSelectedSourceBalance = resolveLiveTokenBalance(
    selectedSourceToken,
    sourceTokenOptions,
  );
  const liveSelectedDestBalance = resolveLiveTokenBalance(
    selectedDestStable,
    sellDestTokenOptions,
  );

  // In buy mode, read the live exchange rate from the reactive option list so
  // the displayed fiat balance and slider cap stay in sync with the option list
  // when `usePayWithTokens` refreshes rates without a balance string change
  // (Bugbot: "Stale rate with live balance"). In sell mode `sourceToken` is
  // `positionToken` (already selector-driven), so the frozen value is live.
  //
  // Intentionally NOT used in `sourceTokenAmount` (the quote pipeline): a rate
  // tick must not churn quote requests — only balance changes do.
  const liveSourceCurrencyExchangeRate =
    tradeMode === 'buy'
      ? (liveSelectedSourceBalance?.currencyExchangeRate ??
        sourceToken?.currencyExchangeRate)
      : sourceToken?.currencyExchangeRate;

  const hasSourcePrice = Boolean(
    liveSourceCurrencyExchangeRate && liveSourceCurrencyExchangeRate > 0,
  );

  // The live balance for whichever token is the *source* this mode: the
  // resynced pay-with token in buy mode, or the already-live position token in
  // sell mode.
  const liveSourceBalance =
    tradeMode === 'buy'
      ? liveSelectedSourceBalance?.balance
      : positionToken?.balance;

  const latestSourceBalance = useLatestBalance({
    address: sourceToken?.address,
    decimals: sourceToken?.decimals,
    chainId: sourceToken?.chainId,
    balance: liveSourceBalance,
    // `useLatestBalance` does a one-shot on-chain RPC fetch that shadows the
    // cached value until its token identity or this key changes. Keying it off
    // the live balance itself means any change to the underlying balance — for
    // ANY reason — triggers a fresh on-chain read and re-render, independent of
    // QuickBuy's own state.
    refreshKey: liveSourceBalance ?? '',
  });

  const sourceTokenAmount = useMemo(() => {
    // Max ("sell all"): spend the exact on-chain balance. `displayBalance` is
    // `formatUnits(atomicBalance)`, so it round-trips back to the precise
    // atomic balance — unlike the fiat (priced) or float (unpriced) paths
    // below, which can reconstruct a value fractionally above the real balance
    // and falsely block the trade with "Insufficient funds".
    if (isMaxSourceAmount && latestSourceBalance?.displayBalance) {
      return latestSourceBalance.displayBalance;
    }
    if (hasSourcePrice) {
      if (!quotedFiatAmount || !sourceToken?.currencyExchangeRate) {
        return undefined;
      }
      // `currencyExchangeRate` is user-currency-per-token and `quotedFiatAmount`
      // is in the user's display currency, so fiat / rate yields token units.
      const fiat = parseFloat(quotedFiatAmount);
      if (isNaN(fiat) || fiat <= 0) return undefined;
      return (fiat / sourceToken.currencyExchangeRate).toString();
    }
    // Unpriced path: source amount is entered directly in token units.
    if (!sourceAmountTokens) return undefined;
    const tokens = parseFloat(sourceAmountTokens);
    if (!Number.isFinite(tokens) || tokens <= 0) return undefined;
    return sourceAmountTokens;
  }, [
    hasSourcePrice,
    isMaxSourceAmount,
    latestSourceBalance?.displayBalance,
    quotedFiatAmount,
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

  // Used for analytics passed to useQuickBuyQuotes. Must derive from
  // quotedFiatAmount (not fiatAmount) so that mid-drag display updates don't
  // recreate quotesAnalyticsContext and trigger spurious quote re-fetches.
  const quotedFiatAmountNumber = useMemo(() => {
    const v = Number(quotedFiatAmount);
    return Number.isFinite(v) ? v : 0;
  }, [quotedFiatAmount]);
  // Derives from fiatAmount for handleConfirm (the confirm button is disabled
  // when fiatAmount !== quotedFiatAmount, so by the time confirm is pressed they
  // are always equal — keeping separate avoids recreating handleConfirm on
  // every drag tick).
  const fiatAmountNumber = useMemo(() => {
    const v = Number(fiatAmount);
    return Number.isFinite(v) ? v : 0;
  }, [fiatAmount]);
  // `amount_usd` analytics is contractually USD; the committed amount is in the
  // user's display currency, so convert before it leaves for analytics.
  const quotedAmountUsd = useMemo(
    () => toAmountUsd(quotedFiatAmountNumber),
    [toAmountUsd, quotedFiatAmountNumber],
  );
  const quotesAnalyticsContext = useMemo(
    () => ({
      traderAddress,
      caip19,
      amountUsd: quotedAmountUsd,
      source: analyticsContext?.source,
    }),
    [traderAddress, caip19, quotedAmountUsd, analyticsContext?.source],
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

  const handleSelectQuote = useCallback(
    (requestId: string) => {
      const index = sortedQuotes.findIndex(
        (quote) => quote.quote.requestId === requestId,
      );
      if (index >= 0) {
        trackQuoteSelected(index, sortedQuotes.length);
      }
      setSelectedQuoteRequestId(requestId);
    },
    [sortedQuotes, trackQuoteSelected],
  );

  const prevSlippageRef = useRef(slippage);
  const hasSlippageInitializedRef = useRef(false);
  useEffect(() => {
    if (!hasSlippageInitializedRef.current) {
      hasSlippageInitializedRef.current = true;
      prevSlippageRef.current = slippage;
      return;
    }
    const prev = prevSlippageRef.current;
    if (prev === slippage) return;
    prevSlippageRef.current = slippage;
    trackSlippageChanged(slippage ?? '', prev ?? '');
  }, [slippage, trackSlippageChanged]);

  const formattedNetworkFee = useFormattedNetworkFee(activeQuote ?? null);

  const networkFeeFiat = useMemo(() => {
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
    const formattedRateValue = formatQuickBuyRateValue(
      rate,
      rate > 1
        ? { minimumFractionDigits: 1, maximumFractionDigits: 2 }
        : { minimumSignificantDigits: 2, maximumSignificantDigits: 3 },
    );
    return `1 ${sourceToken.symbol} = ${formattedRateValue} ${destToken.symbol}`;
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

  const totalAmountFiat = useMemo(() => {
    const inputNum = parseFloat(fiatAmount);
    const zero = formatCurrency(0, currentCurrency);
    if (!fiatAmount || isNaN(inputNum)) return zero;
    // Both the entered amount and the quote's network fee (`valueInCurrency`)
    // are already in the user's display currency.
    if (activeQuote && networkFeeFiat !== null) {
      return formatCurrency(inputNum + networkFeeFiat, currentCurrency);
    }
    return zero;
  }, [fiatAmount, activeQuote, networkFeeFiat, currentCurrency]);

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

  const sourceBalanceFiatValue = useMemo(() => {
    if (
      !latestSourceBalance?.displayBalance ||
      !liveSourceCurrencyExchangeRate
    ) {
      return 0;
    }
    const balance = parseFloat(latestSourceBalance.displayBalance);
    if (!Number.isFinite(balance)) return 0;
    const fiat = balance * liveSourceCurrencyExchangeRate;
    return Number.isFinite(fiat) && fiat > 0 ? fiat : 0;
  }, [latestSourceBalance?.displayBalance, liveSourceCurrencyExchangeRate]);

  const sourceBalanceFiat = useMemo(
    () => formatCurrency(sourceBalanceFiatValue, currentCurrency),
    [sourceBalanceFiatValue, currentCurrency],
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

  // Live fiat balance for the sell-mode "Receive" token, resynced from the
  // reactive `useReceiveTokens` list so the footer pill tracks balance changes
  // (TSA-632). `enrichTokenBalance` already formats this as a fiat string, so we
  // pass it straight through rather than re-deriving it from a token amount.
  const destBalanceFiat = liveSelectedDestBalance?.balanceFiat;

  const maxSpendFiat = sourceBalanceFiatValue;

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
    ? maxSpendFiat <= 0
    : maxSpendTokens <= 0;

  // Display-only copy of the dest token enriched with a balance-independent
  // rate (`useDestTokenExchangeRate`) so the pre-quote pill renders even when
  // the user holds no balance of the token being bought. Never propagated into
  // `destToken` — the quote/redux reference must stay stable so market-data
  // ticks don't churn quote requests.
  const destTokenLookupRate = useDestTokenExchangeRate(
    tradeMode === 'buy' ? destToken : undefined,
  );
  // Price source priority for the buy token: the host-supplied chart price
  // (display currency, present even for un-held tokens) → the cached market-data
  // lookup → the held-balance rate. The first two cover the common case of
  // buying a token the user doesn't hold, where the lookup alone resolves
  // nothing (TokenRatesController only tracks held tokens).
  const hostTokenPriceFiat = analyticsContext?.tokenPriceFiat;
  const destTokenForRate = useMemo<BridgeToken | undefined>(() => {
    if (tradeMode !== 'buy' || !destToken) return destToken;
    const rate =
      (hostTokenPriceFiat !== undefined && hostTokenPriceFiat > 0
        ? hostTokenPriceFiat
        : undefined) ??
      destTokenLookupRate ??
      positionToken?.currencyExchangeRate;
    if (rate === undefined) return destToken;
    return { ...destToken, currencyExchangeRate: rate };
  }, [
    tradeMode,
    destToken,
    hostTokenPriceFiat,
    destTokenLookupRate,
    positionToken?.currencyExchangeRate,
  ]);

  const formattedExchangeRate = useMemo(
    () =>
      tradeMode === 'sell'
        ? formatExchangeRate(sourceToken, destToken)
        : formatExchangeRate(sourceToken, destTokenForRate),
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
  // during a drag. Does NOT commit to quotedFiatAmount or fire analytics — that
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
      // This branch commits on every tick (no separate drag-end commit), so the
      // max sentinel is set here rather than in handleSliderDragEnd.
      if (!hasSourcePrice) {
        if (maxSpendTokens <= 0) {
          setSourceAmountTokens('');
          setIsMaxSourceAmount(false);
          return;
        }
        setIsMaxSourceAmount(rounded >= 100);
        const nextTokens =
          rounded === 0 ? '' : ((maxSpendTokens * rounded) / 100).toString();
        setSourceAmountTokens(nextTokens);
        return;
      }

      // ── Priced path: update display state only (quote commits on drag end). ──
      if (maxSpendFiat <= 0) {
        setFiatAmount('');
        return;
      }
      const nextFiat =
        rounded === 0
          ? ''
          : ((maxSpendFiat * rounded) / 100).toFixed(FIAT_INPUT_DECIMALS);
      setFiatAmount(nextFiat);
      lastInputMethodRef.current =
        QuickBuyEventValues.AMOUNT_SELECTION_METHOD.SLIDER;
    },
    [hasSourcePrice, maxSpendTokens, maxSpendFiat, lastInputMethodRef],
  );

  // Called once when the user lifts their finger (pan end) or taps the track.
  // Commits the final value to quotedFiatAmount (triggering a quote re-fetch)
  // and fires analytics exactly once per interaction.
  const handleSliderDragEnd = useCallback(
    (percent: number) => {
      const rounded = Math.round(percent);
      const nextFiat =
        rounded === 0 || maxSpendFiat <= 0
          ? ''
          : ((maxSpendFiat * rounded) / 100).toFixed(FIAT_INPUT_DECIMALS);

      // Flag max BEFORE the dedup guard. lastCommittedFiatRef is also written by
      // typed input and the price-migration effect, so releasing the slider at
      // 100% can match the ref and return early (e.g. user typed the exact max,
      // then slid to 100% to "sell all"). If setIsMaxSourceAmount ran after the
      // guard, sourceTokenAmount would fall back to the cent-rounded fiat
      // reconstruction and falsely trip insufficient-funds on sell-all. Setting
      // it here is idempotent, so the dedup path is unaffected.
      setIsMaxSourceAmount(rounded >= 100);

      // Deduplicate: Tap + Pan can both fire onEnd for a pure tap gesture.
      if (nextFiat === lastCommittedFiatRef.current) {
        return;
      }
      lastCommittedFiatRef.current = nextFiat;

      // Guarantee display state matches the committed value. The last onUpdate
      // tick during a Pan may have landed on a different % than where the
      // finger actually lifted — if so, fiatAmount would be stale relative to
      // quotedFiatAmount, keeping isAmountUncommitted true and the Buy button
      // permanently disabled. Syncing both states here is the authoritative fix.
      setSliderPercent(rounded);
      lastSliderPercentRef.current = rounded;
      setFiatAmount(nextFiat);

      setQuotedFiatAmount(nextFiat);
      const numericFiat = Number(nextFiat);
      if (rounded > 0 && Number.isFinite(numericFiat) && numericFiat > 0) {
        // Slider release is a single committed value — fetch the quote
        // immediately rather than waiting out the typing debounce.
        setImmediateFetchToken((token) => token + 1);
        trackAmountSelected(
          toAmountUsd(numericFiat),
          QuickBuyEventValues.AMOUNT_SELECTION_METHOD.SLIDER,
          tradeMode === 'buy' ? sourceToken?.symbol : undefined,
          rounded,
          tradeMode === 'sell' ? destToken?.symbol : undefined,
        );
      }
    },
    [
      maxSpendFiat,
      sourceToken?.symbol,
      destToken?.symbol,
      tradeMode,
      toAmountUsd,
      trackAmountSelected,
    ],
  );

  const handleQuickAmountPress = useCallback(
    (fiatValue: number) => {
      if (!Number.isFinite(fiatValue) || fiatValue <= 0) {
        return;
      }

      lastInputMethodRef.current =
        QuickBuyEventValues.AMOUNT_SELECTION_METHOD.PRESET;
      setIsMaxSourceAmount(false);

      const nextFiat = fiatValue.toFixed(FIAT_INPUT_DECIMALS);
      lastCommittedFiatRef.current = nextFiat;
      setFiatAmount(nextFiat);
      setQuotedFiatAmount(nextFiat);

      const nextSliderPercent =
        maxSpendFiat > 0
          ? Math.min(100, Math.round((fiatValue / maxSpendFiat) * 100))
          : 0;
      setSliderPercent(nextSliderPercent);
      lastSliderPercentRef.current = nextSliderPercent;

      setImmediateFetchToken((token) => token + 1);
      trackAmountSelected(
        toAmountUsd(fiatValue),
        QuickBuyEventValues.AMOUNT_SELECTION_METHOD.PRESET,
        tradeMode === 'buy' ? sourceToken?.symbol : undefined,
        undefined,
        tradeMode === 'sell' ? destToken?.symbol : undefined,
      );
    },
    [
      maxSpendFiat,
      sourceToken?.symbol,
      destToken?.symbol,
      tradeMode,
      toAmountUsd,
      trackAmountSelected,
      lastInputMethodRef,
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
    setFiatAmount('');
    setQuotedFiatAmount('');
    setSourceAmountTokens('');
    setIsMaxSourceAmount(false);
    setSliderPercent(0);
    lastSliderPercentRef.current = 0;
    lastCommittedFiatRef.current = '';
    lastTrackedAmountRef.current = '';
    lastInputMethodRef.current =
      QuickBuyEventValues.AMOUNT_SELECTION_METHOD.SLIDER;
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
  // after the user already entered a token amount, convert it to the user's
  // display currency so the amount is not lost.
  const prevHasSourcePriceRef = useRef(hasSourcePrice);
  useEffect(() => {
    if (prevHasSourcePriceRef.current === hasSourcePrice) return;
    const prev = prevHasSourcePriceRef.current;
    prevHasSourcePriceRef.current = hasSourcePrice;
    if (!hasSourcePrice) {
      setAmountDisplayMode('crypto');
    } else if (!prev) {
      // Price just became available — migrate any entered token amount to the
      // user's display currency (`currencyExchangeRate` is user-currency-per-token).
      setAmountDisplayMode('fiat');
      const tokens = parseFloat(sourceAmountTokens);
      if (
        Number.isFinite(tokens) &&
        tokens > 0 &&
        liveSourceCurrencyExchangeRate
      ) {
        const fiat = (tokens * liveSourceCurrencyExchangeRate).toFixed(
          FIAT_INPUT_DECIMALS,
        );
        setFiatAmount(fiat);
        setQuotedFiatAmount(fiat);
        lastCommittedFiatRef.current = fiat;
      }
    }
  }, [hasSourcePrice, sourceAmountTokens, liveSourceCurrencyExchangeRate]);

  const handleSelectSourceToken = useCallback(
    (token: BridgeToken) => {
      const previousToken = selectedSourceToken?.symbol ?? '';
      if (token.symbol !== previousToken) {
        trackPayWithSelected(token.symbol, previousToken);
      }
      isManualSelectionRef.current = true;
      setSelectedSourceToken(token);
      resetAmountState();
    },
    [resetAmountState, selectedSourceToken?.symbol, trackPayWithSelected],
  );

  const handleSelectDestStable = useCallback(
    (token: BridgeToken) => {
      const previousToken = selectedDestStable?.symbol ?? '';
      if (token.symbol !== previousToken) {
        trackReceiveTokenSelected(token.symbol, previousToken);
      }
      setSelectedDestStable(token);
      resetAmountState();
    },
    [resetAmountState, selectedDestStable?.symbol, trackReceiveTokenSelected],
  );

  const handleAmountChange = useCallback(
    (text: string) => {
      lastInputMethodRef.current =
        QuickBuyEventValues.AMOUNT_SELECTION_METHOD.CUSTOM_INPUT;
      const cleaned = dotAndCommaDecimalFormatter(text).replace(/[^0-9.]/g, '');
      const normalized = cleaned.startsWith('.') ? `0${cleaned}` : cleaned;
      const parts = normalized.split('.');
      if (parts.length > 2) return;
      // Priced (fiat) input: cap to two decimals, matching Bridge fiat mode
      // (`FIAT_INPUT_DECIMALS`). Unpriced (token) input: allow up to the token's
      // decimals so the user can spend small balances.
      const maxFractionDigits = hasSourcePrice
        ? FIAT_INPUT_DECIMALS
        : (sourceToken?.decimals ?? 18);
      if (parts.length === 2 && parts[1].length > maxFractionDigits) return;
      if (hasSourcePrice) {
        setFiatAmount(normalized);
        setQuotedFiatAmount(normalized);
        lastCommittedFiatRef.current = normalized;
      } else {
        setSourceAmountTokens(normalized);
      }
      lastSliderPercentRef.current = 0;
      setSliderPercent(0);
      setIsMaxSourceAmount(false);
    },
    [hasSourcePrice, sourceToken?.decimals, lastInputMethodRef],
  );

  // Debounced track for custom amount entries — fires once after the user
  // stops typing for 500ms, so we don't emit on every keystroke.
  useEffect(() => {
    if (lastInputMethodRef.current !== 'custom_input') return;
    if (!fiatAmount) return;
    const numericFiat = Number(fiatAmount);
    if (!Number.isFinite(numericFiat) || numericFiat <= 0) return;
    // `amount_usd` is contractually USD; convert the entered display-currency
    // amount and dedupe against the same USD value the tracker records.
    const amountUsd = toAmountUsd(numericFiat);
    if (lastTrackedAmountRef.current === String(amountUsd)) return;
    const handle = setTimeout(() => {
      trackAmountSelected(
        amountUsd,
        QuickBuyEventValues.AMOUNT_SELECTION_METHOD.CUSTOM_INPUT,
        tradeMode === 'buy' ? sourceToken?.symbol : undefined,
        undefined,
        tradeMode === 'sell' ? destToken?.symbol : undefined,
      );
    }, 500);
    return () => clearTimeout(handle);
  }, [
    fiatAmount,
    sourceToken?.symbol,
    destToken?.symbol,
    tradeMode,
    toAmountUsd,
    trackAmountSelected,
    lastInputMethodRef,
    lastTrackedAmountRef,
  ]);

  const handleConfirm = useCallback(async () => {
    if (!activeQuote || !walletAddress) return;

    // `amount_usd` is contractually USD; the entered amount is in the user's
    // display currency, so convert it here.
    const amountUsdValue = toAmountUsd(fiatAmountNumber);
    const amountUsd = amountUsdValue > 0 ? amountUsdValue : undefined;
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
                [QuickBuyEventProperties.TRADER_ADDRESS]:
                  submittedTraderAddress,
              }
            : {}),
          [QuickBuyEventProperties.CAIP19]: submittedCaip19,
          [QuickBuyEventProperties.ASSET_NAME]: submittedAssetName,
          ...(amountUsd !== undefined
            ? { [QuickBuyEventProperties.AMOUNT_USD]: amountUsd }
            : {}),
          [QuickBuyEventProperties.TRADE_TYPE]: tradeMode,
          ...(submittedPayWith
            ? {
                [QuickBuyEventProperties.PAY_WITH_TOKEN]: submittedPayWith,
              }
            : {}),
          ...(submittedReceiveToken
            ? {
                [QuickBuyEventProperties.RECEIVE_TOKEN]: submittedReceiveToken,
              }
            : {}),
        }
      : null;

    if (tradeBaseProps) {
      trackTradeSubmitted(tradeBaseProps);
    }
    markTradeSubmitted();
    submitStartedAtRef.current = Date.now();
    // Same-chain non-EVM swaps (Solana, Tron, Bitcoin) never reach a terminal
    // `BridgeStatusController` status, so the terminal toast must resolve from
    // `MultichainTransactionsController` instead. Cross-chain bridges (incl.
    // non-EVM → EVM) still settle via the bridge status path, so they are
    // excluded here.
    const isNonEvmSwap =
      Boolean(isNonEvmSourced) && !isEvmNonEvmBridge && !isNonEvmNonEvmBridge;
    // Captures the copy data for every swap-lifecycle toast so the pending,
    // complete and failed states read consistently — and so the app-root
    // watcher can render the terminal toast after the sheet has unmounted.
    const tradeToastInfo = {
      tradeMode,
      tokenSymbol: target.tokenSymbol,
      counterTokenSymbol:
        (tradeMode === 'buy' ? sourceToken?.symbol : destToken?.symbol) ?? '',
      fiatAmountLabel: formatCurrency(fiatAmountNumber, currentCurrency),
      rate: formattedRate,
      isNonEvmSwap,
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
      // Mark a QuickBuy submission as in flight BEFORE submitTx so the generic
      // transaction notification (which fires mid-submit, before the tx id is
      // known) is suppressed. The id-based tracker takes over for the terminal
      // notification once submitTx resolves.
      beginQuickBuySubmission();
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
        // For Solana the tx signature (`hash`) is the id used to find the tx in
        // `MultichainTransactionsController`; persist it for the fallback path.
        trackQuickBuyTrade(txMetaId, {
          ...tradeToastInfo,
          txSignature: txHash,
        });
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
          [QuickBuyEventProperties.AMOUNT_TOKEN]: amountToken,
          [QuickBuyEventProperties.TX_HASH]: txHash,
          [QuickBuyEventProperties.EXECUTION_TIME_MS]: elapsedMs(),
          [QuickBuyEventProperties.STATUS]: QuickBuyEventValues.STATUS.SUCCESS,
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
          [QuickBuyEventProperties.AMOUNT_TOKEN]: amountToken,
          [QuickBuyEventProperties.EXECUTION_TIME_MS]: elapsedMs(),
          [QuickBuyEventProperties.STATUS]: QuickBuyEventValues.STATUS.FAILED,
        });
      }
    } finally {
      // Cleared after `trackQuickBuyTrade` (in the try block) has registered the
      // tx id, so the predicate transitions from marker-based to id-based
      // suppression with no coverage gap.
      endQuickBuySubmission();
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
    isNonEvmSourced,
    isEvmNonEvmBridge,
    isNonEvmNonEvmBridge,
    sourceToken?.chainId,
    destToken?.chainId,
    fiatAmountNumber,
    toAmountUsd,
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

  // Preformatted headline value in the user's display currency (correct symbol
  // placement + separators for any locale/currency). The view renders this
  // string directly instead of concatenating a hardcoded "$".
  const fiatAmountLabel = useMemo(
    () => formatCurrency(Number(fiatAmount) || 0, currentCurrency),
    [fiatAmount, currentCurrency],
  );

  const hasError = Boolean(quoteFetchError || isNoQuotesAvailable);
  const hasValidAmount = hasSourcePrice
    ? Boolean(fiatAmount && Number(fiatAmount) > 0)
    : Boolean(sourceAmountTokens && Number(sourceAmountTokens) > 0);
  // True while the slider is mid-drag: the user has moved the thumb but has not
  // yet committed (released).
  const isAmountUncommitted = fiatAmount !== quotedFiatAmount;
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
  if (isConfirmLoading || isBlockingQuoteLoad) {
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
    fiatAmount,
    fiatAmountLabel,
    sourceAmountTokens,
    sourceTokenAmount,
    hasSourcePrice,
    sliderPercent,
    maxSpendFiat,
    isSliderDisabled,
    formattedExchangeRate,
    metamaskFeePercent,
    estimatedReceiveAmount,
    sourceBalanceFiat,
    sourceBalanceDisplay,
    destBalanceFiat,
    formattedNetworkFee,
    formattedSlippage,
    formattedMinimumReceived,
    formattedMinimumReceivedFiat,
    formattedPriceImpact,
    formattedRate,
    totalAmountFiat,
    isQuoteLoading,
    isBlockingQuoteLoad,
    isSubmittingTx,
    isTotalLoading,
    sortedQuotes,
    selectedQuoteRequestId,
    setSelectedQuoteRequestId,
    handleSelectQuote,
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
    handleQuickAmountPress,
    usdToCurrentCurrencyRate,
    handleAmountAreaPress,
    handleAmountChange,
    handleToggleAmountDisplay,
    handleSelectSourceToken,
    handleSelectDestStable,
    handleConfirm,
  };
}
