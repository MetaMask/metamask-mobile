import { EVENT_NAME } from '../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../util/analytics/abTestAnalytics.types';

export const HOMEPAGE_TRENDING_SECTIONS_AB_KEY =
  'homepageAbtestTrendingSections';

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
