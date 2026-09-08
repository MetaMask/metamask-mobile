import type {
  FeedSubnavId,
  LeaderboardSubnavId,
  LiveTradesSubnavId,
  SocialShellTabConfig,
} from './types';

const FEED_CONFIG: SocialShellTabConfig<FeedSubnavId> = {
  labelKey: 'social_leaderboard.feed.tabs.feed',
  subnav: [
    {
      id: 'trending',
      labelKey: 'social_leaderboard.shell.subnav.trending',
    },
    {
      id: 'following',
      labelKey: 'social_leaderboard.feed.following',
    },
  ],
  defaultSubnav: 'trending',
};

const LIVE_TRADES_CONFIG: SocialShellTabConfig<LiveTradesSubnavId> = {
  labelKey: 'social_leaderboard.feed.tabs.live_trades',
  subnav: [
    {
      id: 'memecoins',
      labelKey: 'social_leaderboard.shell.subnav.memecoins',
    },
    {
      id: 'perps',
      labelKey: 'social_leaderboard.shell.subnav.perps',
    },
    {
      id: 'stocks',
      labelKey: 'social_leaderboard.shell.subnav.stocks',
    },
    {
      id: 'whales',
      labelKey: 'social_leaderboard.shell.subnav.whales',
      leadingEmoji: '🐋',
    },
  ],
  defaultSubnav: 'memecoins',
};

const LEADERBOARD_CONFIG: SocialShellTabConfig<LeaderboardSubnavId> = {
  labelKey: 'social_leaderboard.feed.tabs.leaderboard',
  subnav: [
    {
      id: 'topTraders',
      labelKey: 'social_leaderboard.shell.subnav.top_traders',
    },
    {
      id: 'topPerps',
      labelKey: 'social_leaderboard.shell.subnav.top_perps',
    },
    {
      id: 'kols',
      labelKey: 'social_leaderboard.shell.subnav.kols',
    },
    {
      id: 'topTokens',
      labelKey: 'social_leaderboard.shell.subnav.top_tokens',
    },
  ],
  defaultSubnav: 'topTraders',
};

export const SOCIAL_SHELL_TAB_CONFIG = {
  feed: FEED_CONFIG,
  liveTrades: LIVE_TRADES_CONFIG,
  leaderboard: LEADERBOARD_CONFIG,
} as const;

export const SOCIAL_BUNDLE_TAB_ORDER = [
  'feed',
  'liveTrades',
  'leaderboard',
] as const;
