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
  live: {
    labelKey: 'social_leaderboard.feed.tabs.live',
  },
};

export const SOCIAL_V1_TAB_ORDER = [
  'trending',
  'following',
  'leaderboard',
  'live',
] as const;
