import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import {
  useIsTransactionPayLoading,
  useTransactionPayQuotes,
  useTransactionPayQuotesLastUpdated,
} from '../pay/useTransactionPayData';
import { useTransactionPayHasSourceAmount } from '../pay/useTransactionPayHasSourceAmount';
import { useAlerts } from '../../context/alert-system-context';
import { AlertKeys } from '../../constants/alerts';

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
 * the component via `setStage`; and a pure derivation from reactive inputs
 * (quotes, prefill flags, alerts) used whenever the override is `null`.
 * The hook reads quote and alert state itself so the component renders purely
 * off the returned `stage`.
 *
 * @param options.amountFiat - Current fiat amount; detects a no-op re-commit
 * (unchanged amount → skip the loading window, no fetch will follow).
 * @param options.hasAccountNoFunds - Whether the account-no-funds alert is active.
 * @param options.isAddMusdIntent - Whether this is an add-mUSD deposit.
 * @param options.isDepositPrefillEnabled - Whether deposit prefill is enabled.
 * @param options.isDepositPrefillLoading - Whether a deposit prefill is loading.
 * @param options.isDepositPrefilled - Whether a deposit prefill has resolved.
 * @param options.skipDepositPrefill - Whether deposit prefill is skipped.
 * @returns The current stage and a setter to override it.
 */
export function useCustomAmountStage({
  amountFiat,
  hasAccountNoFunds,
  isAddMusdIntent,
  isDepositPrefillEnabled,
  isDepositPrefillLoading,
  isDepositPrefilled,
  skipDepositPrefill,
}: {
  amountFiat: string;
  hasAccountNoFunds: boolean;
  isAddMusdIntent: boolean;
  isDepositPrefillEnabled: boolean;
  isDepositPrefillLoading: boolean;
  isDepositPrefilled: boolean;
  skipDepositPrefill: boolean;
}): {
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

  const isQuotesLoading = useIsTransactionPayLoading();
  const quotesLastUpdated = useTransactionPayQuotesLastUpdated();
  const quotes = useTransactionPayQuotes();
  const hasQuotes = Boolean(quotes?.length);
  const hasSourceAmount = useTransactionPayHasSourceAmount();
  const { alerts } = useAlerts();
  const hasNoQuotesAlert = alerts.some(
    (a) => a.key === AlertKeys.NoPayTokenQuotes,
  );

  // Quote timestamp when Loading began, so we only leave on a genuinely newer
  // quote, not a stale one predating the amount update.
  const loadingBaselineRef = useRef<number | undefined>(undefined);
  const wasLoadingRef = useRef(false);
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
   * Settle (later renders): clear on `hasFreshQuote` or `isQuotesLoading`. Key
   * off *current* loading, not a latch: the controller pulses `isLoading` for
   * an empty pre-fetch update before the real fetch, and a latch would clear in
   * the gap and briefly derive `NoQuote`.
   */
  useEffect(() => {
    if (stageOverride !== CustomAmountStage.Loading) {
      wasLoadingRef.current = false;
      return;
    }

    if (!wasLoadingRef.current) {
      const isNoOpRecommit = lastCommittedFiatRef.current === amountFiat;

      wasLoadingRef.current = true;
      loadingBaselineRef.current = quotesLastUpdated;
      lastCommittedFiatRef.current = amountFiat;

      if (isNoOpRecommit) {
        setStage(null);
      }
      return;
    }

    // Newer than the baseline, gated on `hasQuotes` so an empty pre-fetch bump
    // (advances the timestamp but carries no quotes) never counts.
    const hasFreshQuote =
      hasQuotes &&
      quotesLastUpdated !== undefined &&
      (loadingBaselineRef.current === undefined ||
        quotesLastUpdated > loadingBaselineRef.current);

    if (hasFreshQuote || isQuotesLoading) {
      setStage(null);
    }
  }, [
    stageOverride,
    amountFiat,
    hasQuotes,
    isQuotesLoading,
    quotesLastUpdated,
  ]);

  const isKeyboardVisible = stageOverride === CustomAmountStage.AmountInput;

  const isAwaitingPrefillResult =
    !hasAccountNoFunds &&
    !skipDepositPrefill &&
    (isDepositPrefillLoading ||
      (isDepositPrefilled && !hasSourceAmount && !isKeyboardVisible));

  const showPaymentDetails =
    hasQuotes || (!isAddMusdIntent && !hasSourceAmount && !hasNoQuotesAlert);

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

  // All hooks have run, so we can early-return. The override wins while set.
  if (stageOverride !== null) {
    return { setStage, stage: stageOverride };
  }

  // Derive from reactive inputs. Stay in Loading while quotes fetch or a
  // prefill / add-mUSD preload resolves. The add-mUSD term excludes
  // `hasNoQuotesAlert` so a failed fetch falls through to NoQuote instead of
  // spinning forever.
  if (
    isQuotesLoading ||
    isAwaitingPrefillResult ||
    (isAddMusdIntent && !showPaymentDetails && !hasNoQuotesAlert)
  ) {
    return { setStage, stage: CustomAmountStage.Loading };
  }

  if (showPaymentDetails) {
    return { setStage, stage: CustomAmountStage.ShowTotals };
  }

  return { setStage, stage: CustomAmountStage.NoQuote };
}
