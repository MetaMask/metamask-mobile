import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import {
  useIsTransactionPayLoading,
  useTransactionPayQuotes,
  useTransactionPayQuotesLastUpdated,
} from '../pay/useTransactionPayData';
import { useTransactionPayHasSourceAmount } from '../pay/useTransactionPayHasSourceAmount';
import { useAlerts } from '../../context/alert-system-context';
import { AlertKeys } from '../../constants/alerts';

/**
 * The mutually-exclusive UI stages of the custom amount info screen.
 *
 * Each stage fully describes what the screen renders:
 *
 * - `AmountInput`: keyboard visible, pay-with / account-select rows, no totals.
 * - `Loading`: no keyboard, pay-with / account-select rows, totals skeletons.
 * - `ShowTotals`: no keyboard, pay-with / account-select rows, real totals.
 * - `NoQuote`: no keyboard, pay-with / account-select rows, no totals (a quote
 * could not be found; the alert explains why).
 *
 * The pay-with and account-select rows render in every stage; the stages
 * differ only by the keyboard and the totals region.
 */
export enum CustomAmountInfoStage {
  AmountInput = 'amountInput',
  Loading = 'loading',
  ShowTotals = 'showTotals',
  NoQuote = 'noQuote',
}

/**
 * Own the rendering state machine for `CustomAmountInfo`.
 *
 * The stage is computed from two layers:
 *
 * 1. `stageOverride` — a stateful escape hatch for the events the screen
 * cannot derive: the keyboard being open (`AmountInput`) and an amount update
 * being in flight (`Loading`). "An update is in flight" is an event, not a
 * derivable fact — when the user commits an amount we must show `Loading`
 * before any reactive input (quotes, source amount) has changed. The component
 * sets the override via `setStage` (`Loading` on commit, `AmountInput` on
 * keyboard open). The hook clears it (back to `null`) once quotes settle. While
 * non-null, the override wins.
 *
 * 2. Derivation — the pure, flicker-free default used whenever there is no
 * override (`null`). It folds the continuous reactive inputs (quotes loading,
 * quotes, source amount, no-quotes alert, prefill / add-mUSD flags) into
 * `Loading` (quotes are still fetching, or a prefill / add-mUSD preload is
 * resolving), `ShowTotals` (a quote is ready) or `NoQuote` (a quote could not
 * be found). The override only bridges the pre-fetch window, so the derived
 * `Loading` covers the fetch itself via `isQuotesLoading`. We derive rather
 * than mirror these into state to avoid an extra stale-frame render at the
 * skeleton→totals boundary.
 *
 * The hook reads the quote and alert state itself so the component renders
 * purely off the returned `stage`.
 *
 * @param options - The inputs.
 * @param options.initialStage - The stage to start in.
 * @param options.amountFiat - The current fiat amount in the input. Used to
 * detect a no-op commit (the user re-commits without changing the amount): when
 * the shell sets the `Loading` override but `amountFiat` is unchanged since the
 * last commit, no quote fetch will follow, so the override is ignored.
 * @param options.isAddMusdIntent - Whether this is an add-mUSD intent.
 * @param options.isDepositPrefillLoading - Whether a deposit prefill is loading.
 * @param options.isDepositPrefilled - Whether a deposit prefill has resolved.
 * @param options.skipDepositPrefill - Whether deposit prefill is skipped.
 * @param options.hasAccountNoFunds - Whether the account-no-funds alert is set.
 * @returns The current stage and its setter.
 */
export function useCustomAmountInfoStage({
  initialStage,
  amountFiat,
  isAddMusdIntent,
  isDepositPrefillLoading,
  isDepositPrefilled,
  skipDepositPrefill,
  hasAccountNoFunds,
}: {
  initialStage: CustomAmountInfoStage;
  amountFiat: string;
  isAddMusdIntent: boolean;
  isDepositPrefillLoading: boolean;
  isDepositPrefilled: boolean;
  skipDepositPrefill: boolean;
  hasAccountNoFunds: boolean;
}): {
  stage: CustomAmountInfoStage;
  setStage: Dispatch<SetStateAction<CustomAmountInfoStage | null>>;
} {
  // `null` means "no override — derive the stage". In practice the override
  // only ever holds `AmountInput` (keyboard open) or `Loading` (update in
  // flight); `initialStage` is one of those.
  const [stageOverride, setStage] = useState<CustomAmountInfoStage | null>(
    initialStage,
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

  // Snapshot the quote timestamp when Loading begins so we only leave Loading
  // once a genuinely newer quote arrives, never on a stale one that predates
  // the amount update.
  const loadingBaselineRef = useRef<number | undefined>(undefined);
  const wasLoadingRef = useRef(false);
  const hasObservedQuotesLoadingRef = useRef(false);
  // The `amountFiat` captured when the current `Loading` override began, so we
  // can recognise a re-commit that did not change the amount.
  const lastCommittedFiatRef = useRef<string | undefined>(undefined);

  /**
   * Clear the `Loading` override once the amount update it represents has
   * settled, handing the stage back to the derive path below.
   *
   * The override is a stateful bridge for the window between committing an
   * amount and the quote fetch starting — a period no reactive input yet
   * reflects.
   *
   * First, ignore a no-op commit: if the override is `Loading` but `amountFiat`
   * has not changed since the last commit, the amount update will not fetch a
   * new quote, so there is nothing to wait for — clear the override immediately
   * rather than sit in a skeleton that would never resolve. Because of this, a
   * live `Loading` override always corresponds to a real amount change, so the
   * exit below can rely on a fetch arriving.
   *
   * While it is `Loading` for a real change, this effect watches the quote state
   * and clears it (to `null`) when the update has settled:
   *
   * - `hasFreshQuote`: a quote newer than the one present when Loading began
   * arrived (compared against `loadingBaselineRef` so a stale quote that
   * predates the amount update never counts).
   * - `hasObservedQuotesLoadingRef`: a fetch we saw running has since finished.
   *
   * Resetting the refs whenever the override is not `Loading` re-arms the
   * effect for the next amount update.
   */
  useEffect(() => {
    if (stageOverride !== CustomAmountInfoStage.Loading) {
      wasLoadingRef.current = false;
      hasObservedQuotesLoadingRef.current = false;
      return;
    }

    // Ignore a re-commit that did not change the amount: no fetch will follow,
    // so hand the stage straight back to the derive path.
    if (lastCommittedFiatRef.current === amountFiat) {
      setStage(null);
      return;
    }

    if (!wasLoadingRef.current) {
      wasLoadingRef.current = true;
      loadingBaselineRef.current = quotesLastUpdated;
      lastCommittedFiatRef.current = amountFiat;
    }

    if (isQuotesLoading) {
      hasObservedQuotesLoadingRef.current = true;
      return;
    }

    const hasFreshQuote =
      quotesLastUpdated !== undefined &&
      (loadingBaselineRef.current === undefined ||
        quotesLastUpdated > loadingBaselineRef.current);

    if (hasFreshQuote || hasObservedQuotesLoadingRef.current) {
      setStage(null);
    }
  }, [stageOverride, amountFiat, isQuotesLoading, quotesLastUpdated]);

  const isKeyboardVisible = stageOverride === CustomAmountInfoStage.AmountInput;

  const isAwaitingPrefillResult =
    !hasAccountNoFunds &&
    !skipDepositPrefill &&
    (isDepositPrefillLoading ||
      (isDepositPrefilled && !hasSourceAmount && !isKeyboardVisible));

  const showPaymentDetails =
    hasQuotes || (!isAddMusdIntent && !hasSourceAmount && !hasNoQuotesAlert);

  // The override wins while set — return it directly.
  if (stageOverride !== null) {
    return { setStage, stage: stageOverride };
  }

  // No override: derive the stage from reactive inputs. Stay in Loading while
  // quotes are actively fetching, or while a prefill / add-mUSD preload
  // resolves — the override only bridges the pre-fetch window, so isQuotesLoading
  // covers the fetch itself.
  if (
    isQuotesLoading ||
    isAwaitingPrefillResult ||
    (isAddMusdIntent && !showPaymentDetails)
  ) {
    return { setStage, stage: CustomAmountInfoStage.Loading };
  }

  // ShowTotals once payment details are ready, otherwise NoQuote.
  if (showPaymentDetails) {
    return { setStage, stage: CustomAmountInfoStage.ShowTotals };
  }

  return { setStage, stage: CustomAmountInfoStage.NoQuote };
}
