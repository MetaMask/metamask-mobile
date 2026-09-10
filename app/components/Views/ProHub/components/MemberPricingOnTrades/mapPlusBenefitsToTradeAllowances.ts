import type {
  PerpsBenefitUsage,
  PredictBenefitUsage,
  SubscriptionBenefitsState,
  SwapsBenefitUsage,
} from '@metamask/subscription-controller';
import type {
  TradeAllowanceItem,
  TradeAllowanceKind,
} from '../../ProHub.constants';

export const MICRO_USD_PER_USD = 1_000_000;

/** Swap, perps, and predict — the products Member pricing can show. */
export const PLUS_BENEFIT_PRODUCT_COUNT = 3;

const toUsd = (microUsd: number): number =>
  Math.round(microUsd / MICRO_USD_PER_USD);

const mapMeteredRow = ({
  id,
  kind,
  cap,
  consumed,
  remaining,
  exhausted,
}: {
  id: TradeAllowanceItem['id'];
  kind: TradeAllowanceKind;
  cap: number | undefined;
  consumed: number | undefined;
  remaining: number | null;
  exhausted: boolean;
}): TradeAllowanceItem | undefined => {
  if (cap === undefined || cap <= 0) {
    return undefined;
  }

  let used: number | undefined;
  if (consumed !== undefined) {
    used = consumed;
  } else if (remaining !== null) {
    used = cap - remaining;
  } else if (exhausted) {
    used = cap;
  }

  if (used === undefined) {
    return undefined;
  }

  const allowance = kind === 'currency' ? toUsd(cap) : cap;
  let displayUsed = kind === 'currency' ? toUsd(used) : used;
  displayUsed = Math.max(0, displayUsed);

  if (exhausted) {
    displayUsed = Math.max(displayUsed, allowance);
  }

  return {
    id,
    used: displayUsed,
    allowance,
    kind,
    exhausted,
  };
};

const mapSwaps = (usage: SwapsBenefitUsage): TradeAllowanceItem | undefined =>
  mapMeteredRow({
    id: 'swaps',
    kind: 'currency',
    cap: usage.capMicroUsd,
    consumed: usage.consumedMicroUsd,
    remaining: usage.remainingMicroUsd,
    exhausted: usage.exhausted,
  });

const mapPerps = (usage: PerpsBenefitUsage): TradeAllowanceItem | undefined =>
  mapMeteredRow({
    id: 'perps',
    kind: 'currency',
    cap: usage.capMicroUsd,
    consumed: usage.consumedMicroUsd,
    remaining: usage.remainingMicroUsd,
    exhausted: usage.exhausted,
  });

const mapPredict = (
  usage: PredictBenefitUsage,
): TradeAllowanceItem | undefined =>
  mapMeteredRow({
    id: 'predict',
    kind: 'count',
    cap: usage.capTxCount,
    consumed: usage.consumedTxCount,
    remaining: usage.remainingTxCount,
    exhausted: usage.exhausted,
  });

/**
 * Maps persisted Plus benefits onto the Member pricing rows. Products without
 * a cap are omitted so the UI never invents an allowance bar.
 *
 * @param benefits - Persisted `SubscriptionController` benefits, if any.
 * @returns Rows that can be rendered, in swaps / perps / predict order.
 */
export const mapPlusBenefitsToTradeAllowances = (
  benefits: SubscriptionBenefitsState | undefined,
): TradeAllowanceItem[] => {
  if (!benefits) {
    return [];
  }

  return [
    mapSwaps(benefits.swaps),
    mapPerps(benefits.perps),
    mapPredict(benefits.predict),
  ].filter((item): item is TradeAllowanceItem => item !== undefined);
};

/**
 * Formats a subscription period-end ISO timestamp for the shared reset line.
 *
 * @param currentPeriodEnd - ISO 8601 timestamp from the Plus subscription.
 * @returns A short month-day string, or undefined when the timestamp is missing
 * or unparseable.
 */
export const formatPlusPeriodEnd = (
  currentPeriodEnd: string | undefined,
): string | undefined => {
  if (!currentPeriodEnd) {
    return undefined;
  }

  const date = new Date(currentPeriodEnd);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};
