import { EVENT_NAME } from '../../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../../util/analytics/abTestAnalytics.types';
import type { FeedAudience } from '../FeedView/types';

// --- Leaderboard Landing Feed A/B Test (TSA-1042) ---
//
// Controls where the homepage "Top traders" entry points (section header and
// the "View more" card) land inside the Follow Trading surface:
// - control: the Leaderboard tab (current behavior)
// - treatment: the Feed tab with the "All" audience preselected
//
// The homepage resolves the assignment without emitting exposure and forwards
// the landing target as route params; `SocialTradersTabsView` emits exposure
// when it receives those params, so only users who actually opened the surface
// from the homepage carousel are counted (nav-tab, deeplink, and notification
// entries never resolve this experiment).

export const LEADERBOARD_LANDING_FEED_AB_KEY =
  'socialAiTSA1042AbtestLeaderboardLandingFeed';

export enum LeaderboardLandingFeedVariant {
  Control = 'control',
  Treatment = 'treatment',
}

/** Tab the Follow Trading surface opens on. */
export type SocialTradersLandingTab = 'leaderboard' | 'feed';

interface LeaderboardLandingFeedVariantConfig {
  landingTab: SocialTradersLandingTab;
  /** Audience preselected on the Feed tab. Omitted for leaderboard landings. */
  landingFeedAudience?: FeedAudience;
}

export const LEADERBOARD_LANDING_FEED_VARIANTS: Record<
  LeaderboardLandingFeedVariant,
  LeaderboardLandingFeedVariantConfig
> = {
  [LeaderboardLandingFeedVariant.Control]: { landingTab: 'leaderboard' },
  [LeaderboardLandingFeedVariant.Treatment]: {
    landingTab: 'feed',
    landingFeedAudience: 'all',
  },
};

export const LEADERBOARD_LANDING_FEED_EXPOSURE_METADATA: {
  experimentName: string;
  variationNames: Partial<Record<LeaderboardLandingFeedVariant, string>>;
} = {
  experimentName: 'Leaderboard Landing Feed',
  variationNames: {
    [LeaderboardLandingFeedVariant.Control]: 'Lands on Leaderboard tab',
    [LeaderboardLandingFeedVariant.Treatment]: 'Lands on Feed tab (All)',
  },
};

export const LEADERBOARD_LANDING_FEED_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: LEADERBOARD_LANDING_FEED_AB_KEY,
    validVariants: Object.values(LeaderboardLandingFeedVariant),
    eventNames: [
      EVENT_NAME.SOCIAL_TRADER_LEADERBOARD_SCREEN_VIEWED,
      EVENT_NAME.SOCIAL_TRADER_LEADERBOARD_TRADER_CLICKED,
      EVENT_NAME.SOCIAL_TRADER_FEED_SCREEN_VIEWED,
      EVENT_NAME.SOCIAL_TRADER_FEED_INTERACTION,
      EVENT_NAME.SOCIAL_TRADER_FEED_ITEM_TRADE_CLICKED,
      EVENT_NAME.SOCIAL_FOLLOW_TRADING_INTERACTION,
    ],
  };
