import { EVENT_NAME } from '../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../util/analytics/abTestAnalytics.types';

export const WHATS_HAPPENING_EXPLORE_AB_KEY =
  'socialAiTSA531AbtestWhatsHappeningExplore';

export enum WhatsHappeningExploreVariant {
  Control = 'control',
  Treatment = 'treatment',
}

export const WHATS_HAPPENING_EXPLORE_VARIANTS: Record<
  WhatsHappeningExploreVariant,
  { whatsHappeningBeforePredict: boolean }
> = {
  [WhatsHappeningExploreVariant.Control]: {
    whatsHappeningBeforePredict: false,
  },
  [WhatsHappeningExploreVariant.Treatment]: {
    whatsHappeningBeforePredict: true,
  },
};

export const WHATS_HAPPENING_EXPLORE_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: WHATS_HAPPENING_EXPLORE_AB_KEY,
    validVariants: Object.values(WhatsHappeningExploreVariant),
    eventNames: [EVENT_NAME.EXPLORE_INTERACTED],
  };
