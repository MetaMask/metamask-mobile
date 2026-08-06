import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  useIsTransactionPayQuoteLoading,
  useTransactionPayPrimaryRequiredToken,
  useTransactionPayQuotesLastUpdated,
  useTransactionPayQuotesRaw,
} from '../pay/useTransactionPayData';

/** Mutually-exclusive UI stages of the custom amount info screen. */
export enum CustomAmountStage {
  AmountInput = 'amountInput',
  Loading = 'loading',
  ShowTotals = 'showTotals',
  NoQuote = 'noQuote',
}

/**
 * Owns the rendering state machine for `CustomAmountInfo`.
 *
 * Stage is computed from two layers: a stateful override (`AmountInput` when
 * the keyboard is open, `Loading` while an amount update is in flight) set by
 * the lifecycle controls or `setStage`; and a pure derivation from reactive
 * inputs (quotes, prefill flags) used whenever the override is `null`.
 * The hook reads quote state itself so the component renders purely
 * off the returned `stage`.
 *
 * @param options.amountFiat - Current fiat amount; detects a no-op re-commit
 * (unchanged amount → skip the loading window, no fetch will follow).
 * @param options.hasAccountNoFunds - Whether the account-no-funds alert is active.
 * @param options.hasPrefetchedQuote - Whether the current amount already has a quote.
 * @param options.isAddMusdIntent - Whether this is an add-mUSD deposit.
 * @param options.isDepositPrefillEnabled - Whether deposit prefill is enabled.
 * @param options.isDepositPrefillLoading - Whether a deposit prefill is loading.
 * @param options.skipDepositPrefill - Whether deposit prefill is skipped.
 * @returns The current stage, amount-update lifecycle controls and state, and
 * a setter to override the stage.
 */
export function useCustomAmountStage({
  amountFiat,
  disablePay,
  hasAccountNoFunds,
  hasPrefetchedQuote = false,
  isAddMusdIntent,
  isDepositPrefillEnabled,
  isDepositPrefillLoading,
  skipDepositPrefill,
}: {
  amountFiat: string;
  disablePay: boolean | undefined;
  hasAccountNoFunds: boolean;
  hasPrefetchedQuote?: boolean;
  isAddMusdIntent: boolean;
  isDepositPrefillEnabled: boolean;
  isDepositPrefillLoading: boolean;
  skipDepositPrefill: boolean;
}): {
  beginAmountUpdate: () => boolean;
  endAmountUpdate: () => void;
  isAmountUpdating: boolean;
  stage: CustomAmountStage;
  setStage: Dispatch<SetStateAction<CustomAmountStage | null>>;
} {
  // `null` = derive the stage. Initial override opens the keyboard unless a
  // deposit prefill is expected to resolve first.
  const [stageOverride, setStage] = useState<CustomAmountStage | null>(() =>
    !isAddMusdIntent && (!isDepositPrefillEnabled || skipDepositPrefill)
      ? CustomAmountStage.AmountInput
      : CustomAmountStage.Loading,
  );
  const [isAmountUpdatePending, setIsAmountUpdatePending] = useState(false);
  const isAmountUpdateInProgressRef = useRef(false);

  const beginAmountUpdate = useCallback(() => {
    if (isAmountUpdateInProgressRef.current) {
      return false;
    }

    isAmountUpdateInProgressRef.current = true;
    setIsAmountUpdatePending(true);
    setStage(CustomAmountStage.Loading);
    return true;
  }, []);

  const endAmountUpdate = useCallback(() => {
    isAmountUpdateInProgressRef.current = false;
    setIsAmountUpdatePending(false);
  }, []);

  const isQuotesLoading = useIsTransactionPayQuoteLoading();
  const quotesLastUpdated = useTransactionPayQuotesLastUpdated();
  const quotes = useTransactionPayQuotesRaw();
  const hasQuotes = Boolean(quotes?.length);
  const requiredToken = useTransactionPayPrimaryRequiredToken();
  const hasAmount = Boolean(
    requiredToken?.amountRaw && requiredToken.amountRaw !== '0',
  );

  // Quote timestamp when Loading began, so we only leave on a genuinely newer
  // quote, not a stale one predating the amount update.
  const loadingBaselineRef = useRef<number | undefined>(undefined);
  const wasLoadingRef = useRef(false);
  const settleOnCommitRef = useRef(false);
  // `amountFiat` from the previous commit, to recognise a no-op re-commit.
  const lastCommittedFiatRef = useRef<string | undefined>(undefined);

  /**
   * Clear the `Loading` override once its amount update settles, handing the
   * stage back to the derive path. The override bridges the commit→fetch window
   * that no reactive input yet reflects.
   *
   * Arm (first `Loading` render): snapshot the baseline timestamp and committed
   * amount. Compare the new amount against the *prior* commit ONLY here, before
   * overwriting the ref — a no-op re-commit fetches nothing, so clear at once.
   *
   * Settle (later renders): after the amount commit resolves, clear on
   * `hasFreshQuote` or `isQuotesLoading`. Key off *current* loading, not a
   * latch: the controller pulses `isLoading` for an empty pre-fetch update
   * before the real fetch, and a latch would clear in the gap and briefly
   * derive `NoQuote`.
   */
  useEffect(() => {
    if (stageOverride !== CustomAmountStage.Loading) {
      wasLoadingRef.current = false;
      settleOnCommitRef.current = false;
      return;
    }

    if (!wasLoadingRef.current) {
      const isNoOpRecommit = lastCommittedFiatRef.current === amountFiat;

      wasLoadingRef.current = true;
      loadingBaselineRef.current = quotesLastUpdated;
      lastCommittedFiatRef.current = amountFiat;
      settleOnCommitRef.current =
        isNoOpRecommit || Boolean(disablePay) || hasPrefetchedQuote;

      // `disablePay` flows are direct transfers: no pay token, no quote, and the
      // required-token amount may never resolve. Once the amount commit ends,
      // there is nothing else to await. The same applies to no-op re-commits and
      // amounts that already have a prefetched quote.
      if (settleOnCommitRef.current && !isAmountUpdatePending) {
        setStage(null);
      }
      return;
    }

    if (settleOnCommitRef.current && !isAmountUpdatePending) {
      setStage(null);
      return;
    }

    // Newer than the baseline, gated on `hasQuotes` so an empty pre-fetch bump
    // (advances the timestamp but carries no quotes) never counts.
    const hasFreshQuote =
      hasQuotes &&
      quotesLastUpdated !== undefined &&
      (loadingBaselineRef.current === undefined ||
        quotesLastUpdated > loadingBaselineRef.current);

    if (
      !isAmountUpdatePending &&
      hasAmount &&
      (hasFreshQuote || isQuotesLoading)
    ) {
      setStage(null);
    }
  }, [
    stageOverride,
    amountFiat,
    disablePay,
    hasAmount,
    hasPrefetchedQuote,
    hasQuotes,
    isAmountUpdatePending,
    isQuotesLoading,
    quotesLastUpdated,
  ]);

  const isAwaitingPrefillResult =
    !hasAccountNoFunds && !skipDepositPrefill && isDepositPrefillLoading;

  // `disablePay` flows never fetch quotes, so totals (a plain `TotalRow`) show
  // as soon as the override clears — they must never fall through to `NoQuote`.
  const showTotals = hasQuotes || disablePay;

  // Re-assert the keyboard when prefill is enabled but skipped: nothing to
  // prefill, so the user should be entering an amount. The updater is a no-op
  // when already `AmountInput`, so it never clobbers a `Loading` stage.
  useEffect(() => {
    if (isDepositPrefillEnabled && skipDepositPrefill) {
      setStage((prev) =>
        prev === CustomAmountStage.AmountInput
          ? prev
          : CustomAmountStage.AmountInput,
      );
    }
  }, [isDepositPrefillEnabled, skipDepositPrefill]);

  // The override wins while set. Otherwise derive from reactive inputs: stay
  // in Loading while quotes fetch or a prefill preload resolves, show totals
  // when quotes exist, or fall through to NoQuote after a settled empty fetch.
  let stage: CustomAmountStage;
  if (stageOverride !== null) {
    stage = stageOverride;
  } else if (
    (isQuotesLoading && !hasPrefetchedQuote) ||
    isAwaitingPrefillResult
  ) {
    stage = CustomAmountStage.Loading;
  } else if (showTotals) {
    stage = CustomAmountStage.ShowTotals;
  } else {
    stage = CustomAmountStage.NoQuote;
  }

  // Keep the amount update active until its commit settles, even if an older
  // quote request was already loading. Afterwards, remain active only until
  // quote fetching takes over.
  const isAmountUpdating =
    stage === CustomAmountStage.Loading &&
    (isAmountUpdatePending || !isQuotesLoading);

  return {
    beginAmountUpdate,
    endAmountUpdate,
    isAmountUpdating,
    setStage,
    stage,
  };
}
