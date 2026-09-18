import type { SocialShellTab, SocialShellTabConfig } from './types';

export const SOCIAL_SHELL_TAB_CONFIG: Record<
  SocialShellTab,
  SocialShellTabConfig
> = {
  trending: {
    labelKey: 'social_leaderboard.feed.tabs.trending',
  },
  following: {
    labelKey: 'social_leaderboard.feed.tabs.following',
  },
  leaderboard: {
    labelKey: 'social_leaderboard.feed.tabs.leaderboard',
  },
  liveTrades: {
    labelKey: 'social_leaderboard.feed.tabs.live_trades',
  },
};

export const SOCIAL_V1_TAB_ORDER = [
  'trending',
  'following',
  'leaderboard',
  'liveTrades',
] as const;
