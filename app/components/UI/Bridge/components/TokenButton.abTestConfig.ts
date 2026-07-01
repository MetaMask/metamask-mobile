import { EVENT_NAME } from '../../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../../util/analytics/abTestAnalytics.types';

export const BRIDGE_TOKEN_SELECTOR_VERIFIED_BADGE_AB_KEY =
  'swapsSWAPS4635AbtestVerified2';

export enum BridgeTokenSelectorVerifiedBadgeVariant {
  Control = 'control',
  Treatment = 'treatment',
}

export interface BridgeTokenSelectorVerifiedBadgeConfig {
  showVerifiedBadge: boolean;
}

export const BRIDGE_TOKEN_SELECTOR_VERIFIED_BADGE_VARIANTS: Record<
  BridgeTokenSelectorVerifiedBadgeVariant,
  BridgeTokenSelectorVerifiedBadgeConfig
> = {
  [BridgeTokenSelectorVerifiedBadgeVariant.Control]: {
    showVerifiedBadge: false,
  },
  [BridgeTokenSelectorVerifiedBadgeVariant.Treatment]: {
    showVerifiedBadge: true,
  },
};

export const BRIDGE_TOKEN_SELECTOR_VERIFIED_BADGE_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: BRIDGE_TOKEN_SELECTOR_VERIFIED_BADGE_AB_KEY,
    validVariants: Object.values(BridgeTokenSelectorVerifiedBadgeVariant),
    eventNames: [EVENT_NAME.SWAP_PAGE_VIEWED],
  };
