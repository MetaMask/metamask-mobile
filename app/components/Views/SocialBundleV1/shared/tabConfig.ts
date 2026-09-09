import type { ComponentType } from 'react';
import FeedTab from '../FeedTab/FeedTab';
import LeaderboardTab from '../LeaderboardTab/LeaderboardTab';
import LiveTradesTab from '../LiveTradesTab/LiveTradesTab';

export type TabId = 'feed' | 'live_trades' | 'leaderboard';

export interface TabDefinition {
  id: TabId;
  label: string;
  testID: string;
  component: ComponentType;
}

/**
 * Left-to-right tab order for the SocialBundleV1 prototype home. Feed lands
 * as the default because it's the only tab with real content in this PR.
 */
export const TABS: readonly TabDefinition[] = [
  {
    id: 'feed',
    label: 'Feed',
    testID: 'social-bundle-v1-tab-feed',
    component: FeedTab,
  },
  {
    id: 'live_trades',
    label: 'Live trades',
    testID: 'social-bundle-v1-tab-live-trades',
    component: LiveTradesTab,
  },
  {
    id: 'leaderboard',
    label: 'Leaderboard',
    testID: 'social-bundle-v1-tab-leaderboard',
    component: LeaderboardTab,
  },
];
