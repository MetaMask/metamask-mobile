import { EVENT_NAME } from '../../../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../../../util/analytics/abTestAnalytics.types';

export const CARD_BUTTON_BADGE_AB_KEY = 'cardCARD338AbtestAttentionBadge';

export enum CardButtonBadgeVariant {
  Control = 'control',
  WithBadge = 'withBadge',
}

export const CARD_BUTTON_BADGE_VARIANTS: Record<
  CardButtonBadgeVariant,
  { showBadge: boolean }
> = {
  [CardButtonBadgeVariant.Control]: { showBadge: false },
  [CardButtonBadgeVariant.WithBadge]: { showBadge: true },
};

export const CARD_BUTTON_BADGE_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: CARD_BUTTON_BADGE_AB_KEY,
    validVariants: Object.values(CardButtonBadgeVariant),
    eventNames: [EVENT_NAME.CARD_BUTTON_VIEWED],
  };
