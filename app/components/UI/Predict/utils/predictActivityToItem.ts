import {
  type PredictActivity,
  type PredictActivityItem,
  PredictActivityType,
} from '../types';

const ENTRY_TYPE_TO_ACTIVITY_TYPE: Record<
  PredictActivity['entry']['type'],
  PredictActivityType
> = {
  buy: PredictActivityType.BUY,
  sell: PredictActivityType.SELL,
  claimWinnings: PredictActivityType.CLAIM,
};

/**
 * Converts the lean provider `PredictActivity` into the richer
 * `PredictActivityItem` shape the activity-detail screen consumes. Mirrors the
 * inline mapping in the legacy `PredictTransactionsView` so the unified
 * activity list can navigate to the same detail screen.
 *
 * `detail` (the legacy list subtitle string) is intentionally omitted — the
 * detail screen doesn't read it, and the unified row builds its own subtitle.
 */
export function predictActivityToItem(
  activity: PredictActivity,
): PredictActivityItem {
  const { entry } = activity;
  return {
    id: activity.id,
    type: ENTRY_TYPE_TO_ACTIVITY_TYPE[entry.type] ?? PredictActivityType.CLAIM,
    marketTitle: activity.title ?? '',
    detail: '',
    amountUsd: entry.amount,
    icon: activity.icon,
    outcome: activity.outcome,
    providerId: activity.providerId,
    entry,
  };
}
