import type { SocialShellTab, SocialShellTabConfig } from './types';

export const SOCIAL_SHELL_TAB_CONFIG: Record<
  SocialShellTab,
  SocialShellTabConfig
> = {
  forYou: {
    labelKey: 'social_leaderboard.feed.tabs.for_you',
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
  'forYou',
  'following',
  'leaderboard',
  'liveTrades',
] as const;
