import { EVENT_NAME } from '../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../util/analytics/abTestAnalytics.types';
import type { TransactionActiveAbTestEntry } from '../../../util/transactions/transaction-active-ab-test-attribution-registry';

/**
 * LaunchDarkly / remote flag key. Pattern: `{team}{TICKET}Abtest{Name}` — keep in
 * sync with the flag in LD (team `home`, ticket TMCU-470).
 */
export const HOMEPAGE_TRENDING_SECTIONS_AB_KEY =
  'homeTMCU470AbtestTrendingSections';

/**
 * Builds `active_ab_tests` entries for swap / perps / predict Transaction Added
 * when the homepage trending-sections experiment assignment is active.
 */
export function getHomepageTrendingSectionsTransactionActiveAbTests(
  isAssignmentActive: boolean,
  variantName: string,
): TransactionActiveAbTestEntry[] | undefined {
  if (!isAssignmentActive) {
    return undefined;
  }
  return [{ key: HOMEPAGE_TRENDING_SECTIONS_AB_KEY, value: variantName }];
}

export enum HomepageTrendingSectionsVariant {
  Control = 'control',
  TrendingSections = 'trendingSections',
}

export const HOMEPAGE_TRENDING_SECTIONS_VARIANTS: Record<
  HomepageTrendingSectionsVariant,
  { separateTrending: boolean }
> = {
  [HomepageTrendingSectionsVariant.Control]: { separateTrending: false },
  [HomepageTrendingSectionsVariant.TrendingSections]: {
    separateTrending: true,
  },
};

export const HOMEPAGE_TRENDING_SECTIONS_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: HOMEPAGE_TRENDING_SECTIONS_AB_KEY,
    validVariants: Object.values(HomepageTrendingSectionsVariant),
    eventNames: [EVENT_NAME.HOME_VIEWED],
  };
