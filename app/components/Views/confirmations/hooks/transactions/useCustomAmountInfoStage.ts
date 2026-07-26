import {
  Dispatch,
  RefObject,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
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
 * @param options.amountFiat - The current fiat amount in the input. Used to
 * detect a no-op commit (the user re-commits without changing the amount): when
 * the shell sets the `Loading` override but `amountFiat` is unchanged since the
 * last commit, no quote fetch will follow, so the override is ignored.
 * @param options.isAddMusdIntent - Whether this is an add-mUSD intent.
 * @param options.isDepositPrefillEnabled - Whether deposit prefill is enabled.
 * @param options.isDepositPrefillLoading - Whether a deposit prefill is loading.
 * @param options.isDepositPrefilled - Whether a deposit prefill has resolved.
 * @param options.skipDepositPrefill - Whether deposit prefill is skipped.
 * @param options.hasAccountNoFunds - Whether the account-no-funds alert is set.
 * @returns The current stage, its setter, and a ref holding the latest stage
 * for reading inside async callbacks that outlive the render that created them.
 */
export function useCustomAmountInfoStage({
  amountFiat,
  isAddMusdIntent,
  isDepositPrefillEnabled,
  isDepositPrefillLoading,
  isDepositPrefilled,
  skipDepositPrefill,
  hasAccountNoFunds,
}: {
  amountFiat: string;
  isAddMusdIntent: boolean;
  isDepositPrefillEnabled: boolean;
  isDepositPrefillLoading: boolean;
  isDepositPrefilled: boolean;
  skipDepositPrefill: boolean;
  hasAccountNoFunds: boolean;
}): {
  stage: CustomAmountInfoStage;
  setStage: Dispatch<SetStateAction<CustomAmountInfoStage | null>>;
  stageRef: RefObject<CustomAmountInfoStage>;
} {
  // `null` means "no override — derive the stage". In practice the override
  // only ever holds `AmountInput` (keyboard open) or `Loading` (update in
  // flight). The initial stage is one of those: the keyboard opens straight
  // away unless a deposit prefill is expected to resolve first.
  const [stageOverride, setStage] = useState<CustomAmountInfoStage | null>(
    () =>
      !isAddMusdIntent && (!isDepositPrefillEnabled || skipDepositPrefill)
        ? CustomAmountInfoStage.AmountInput
        : CustomAmountInfoStage.Loading,
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
  // The `amountFiat` from the previous commit, so we can recognise a re-commit
  // that did not change the amount. Only read (and then overwritten) on the arm
  // transition, so it always reflects the prior commit at the moment we check.
  const lastCommittedFiatRef = useRef<string | undefined>(undefined);

  /**
   * Clear the `Loading` override once the amount update it represents has
   * settled, handing the stage back to the derive path below.
   *
   * The override is a stateful bridge for the window between committing an
   * amount and the quote fetch starting — a period no reactive input yet
   * reflects. Once that window closes, the derive path can render the stage
   * itself, so the override clears.
   *
   * The effect distinguishes the two transitions:
   *
   * 1. Arm (the first render where the override became `Loading`): snapshot the
   * quote timestamp as the baseline and record the committed amount. At this
   * one moment, compare the new amount against the *previous* commit's amount:
   * if unchanged, this is a no-op re-commit that will not trigger a fetch, so
   * clear the override immediately rather than sit in a skeleton that never
   * resolves. The comparison happens ONLY here, against the prior value, before
   * we overwrite it — checking on later renders would always match the value we
   * just stored and collapse the override mid-commit.
   *
   * 2. Settle (later renders while armed): clear the override when either
   * - `hasFreshQuote`: real quotes newer than the baseline arrived (gated on
   * `hasQuotes` so an empty pre-fetch bump that only advances the timestamp
   * never counts), or
   * - `isQuotesLoading`: the composite loading is now `true`, meaning the real
   * fetch (or the tx-data update) is in flight. The derived `Loading` takes
   * over seamlessly, so the override is redundant. Keying off the *current*
   * loading state — not a latched "we saw loading then it stopped" ref — avoids
   * the flash: the controller pulses `isLoading` for an intermediate/empty
   * quote update BEFORE the real fetch, and a latch cannot tell that empty
   * pulse apart from the real fetch, so it would clear during the gap and
   * briefly derive `NoQuote`.
   *
   * Resetting `wasLoadingRef` whenever the override is not `Loading` re-arms the
   * effect for the next amount update.
   */
  useEffect(() => {
    if (stageOverride !== CustomAmountInfoStage.Loading) {
      wasLoadingRef.current = false;
      return;
    }

    if (!wasLoadingRef.current) {
      // Arm: compare against the PRIOR commit before overwriting the ref.
      const isNoOpRecommit = lastCommittedFiatRef.current === amountFiat;

      wasLoadingRef.current = true;
      loadingBaselineRef.current = quotesLastUpdated;
      lastCommittedFiatRef.current = amountFiat;

      // A re-commit of the unchanged amount fetches nothing, so hand the stage
      // straight back to the derive path.
      if (isNoOpRecommit) {
        setStage(null);
      }
      return;
    }

    // A quote timestamp newer than the one present when Loading began. Gated on
    // `hasQuotes` so an empty pre-fetch bump (which advances the timestamp but
    // carries no quotes, often a NoPayTokenQuotes alert) never counts.
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

  const isKeyboardVisible = stageOverride === CustomAmountInfoStage.AmountInput;

  const isAwaitingPrefillResult =
    !hasAccountNoFunds &&
    !skipDepositPrefill &&
    (isDepositPrefillLoading ||
      (isDepositPrefilled && !hasSourceAmount && !isKeyboardVisible));

  const showPaymentDetails =
    hasQuotes || (!isAddMusdIntent && !hasSourceAmount && !hasNoQuotesAlert);

  const stage = deriveStage();

  // Mirror the current stage into a ref so async callbacks (e.g. the amount
  // commit handler) can read the latest stage after an await, rather than the
  // stale value captured when the callback was created.
  const stageRef = useRef(stage);
  stageRef.current = stage;

  // Re-assert the keyboard when deposit prefill is enabled but skipped (e.g. a
  // fiat method was selected): there is nothing to prefill, so the user should
  // be entering an amount. Reads the latest stage via the ref so it does not
  // clobber a `Loading` / non-input stage.
  useEffect(() => {
    if (
      isDepositPrefillEnabled &&
      skipDepositPrefill &&
      stageRef.current !== CustomAmountInfoStage.AmountInput
    ) {
      setStage(CustomAmountInfoStage.AmountInput);
    }
    // `stageRef` is a stable ref; reading `.current` intentionally does not
    // make this effect reactive to stage changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDepositPrefillEnabled, skipDepositPrefill]);

  return { setStage, stage, stageRef };

  function deriveStage(): CustomAmountInfoStage {
    // The override wins while set.
    if (stageOverride !== null) {
      return stageOverride;
    }

    // No override: derive the stage from reactive inputs. Stay in Loading while
    // quotes are actively fetching, or while a prefill / add-mUSD preload
    // resolves — the override only bridges the pre-fetch window, so
    // isQuotesLoading covers the fetch itself.
    if (
      isQuotesLoading ||
      isAwaitingPrefillResult ||
      (isAddMusdIntent && !showPaymentDetails)
    ) {
      return CustomAmountInfoStage.Loading;
    }

    // ShowTotals once payment details are ready, otherwise NoQuote.
    if (showPaymentDetails) {
      return CustomAmountInfoStage.ShowTotals;
    }

    return CustomAmountInfoStage.NoQuote;
  }
}
