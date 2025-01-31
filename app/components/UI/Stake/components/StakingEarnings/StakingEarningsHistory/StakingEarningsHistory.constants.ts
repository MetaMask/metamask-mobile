import { DateRange } from './StakingEarningsTimePeriod/StakingEarningsTimePeriod.types';

export const EARNINGS_HISTORY_TIME_PERIOD_DEFAULT = DateRange.MONTHLY;
export const EARNINGS_HISTORY_DAYS_LIMIT = 730;
export const EARNINGS_HISTORY_CHART_BAR_LIMIT = {
  [DateRange.DAILY]: 7,
  [DateRange.MONTHLY]: 12,
  [DateRange.YEARLY]: 2,
};
