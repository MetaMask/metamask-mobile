import type { EarningsSummaryEntry } from '../../../../../../reducers/rewardsMoney';
import type { EarningsSummaryDto } from '../../../../../../core/Engine/controllers/rewards-money-controller/types';
import { formatMusdBaseUnits } from '../../../utils/formatUtils';

/** mUSD base units as a two-decimal amount, or a dash when there is none. */
export const musdAmount = (baseUnits: string | null | undefined): string =>
  formatMusdBaseUnits(baseUnits, { maximumFractionDigits: 2 }) ?? '—';

/** The claim minimum as a whole-dollar amount, or undefined when it is unknown. */
export const musdMinimumAmount = (
  baseUnits: string | null | undefined,
): string | undefined =>
  formatMusdBaseUnits(baseUnits, { maximumFractionDigits: 0 }) ?? undefined;

export interface SummarySectionState {
  data: EarningsSummaryDto | null;
  loading: boolean;
  refreshing: boolean;
  error: boolean;
  show: boolean;
}

/**
 * Reduces the earnings summary entry to the questions both money tabs ask:
 * is it loading, did it fail, should its section render.
 */
export function deriveSummarySection(
  entry: EarningsSummaryEntry | undefined,
): SummarySectionState {
  const data = entry?.data ?? null;
  const failed = Boolean(entry?.error);
  const loading = !data && (!entry || Boolean(entry.loading));
  // A failed refresh keeps the last summary. The banner is only for a failure
  // that left nothing to show, including while that retry is in flight.
  const error = failed && !data;
  return {
    data,
    loading,
    refreshing: Boolean(entry?.loading),
    error,
    show: !error && (loading || data !== null),
  };
}
