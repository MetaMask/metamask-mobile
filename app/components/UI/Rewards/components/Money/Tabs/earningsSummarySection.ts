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
  /** The last fetch failed. Cached amounts stay on screen with the banner. */
  failed: boolean;
  /** A failure that left nothing to show. The overview card uses this. */
  error: boolean;
  show: boolean;
}

/** Which breakdown fetch the one banner under the amounts reports. */
export type BreakdownErrorSource = 'summary' | 'funnel';

/**
 * One banner under an earnings breakdown. A summary failure wins, because it
 * covers every amount; the funnel banner is only for a funnel failure on its
 * own.
 */
export function deriveBreakdownErrorSource(
  summaryFailed: boolean,
  funnelFailed: boolean,
): BreakdownErrorSource | null {
  if (summaryFailed) {
    return 'summary';
  }
  if (funnelFailed) {
    return 'funnel';
  }
  return null;
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
  // The overview card hides itself only when a failure left nothing to show.
  // A breakdown keeps its rows and reads `failed` for the banner.
  const error = failed && !data;
  return {
    data,
    loading,
    refreshing: Boolean(entry?.loading),
    failed,
    error,
    show: !error && (loading || data !== null),
  };
}
