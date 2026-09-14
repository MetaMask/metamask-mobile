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
      id: 'following',
      labelKey: 'social_leaderboard.feed.following',
    },
    {
      id: 'trending',
      labelKey: 'social_leaderboard.shell.subnav.trending',
    },
    {
      id: 'hotRightNow',
      labelKey: 'social_leaderboard.shell.subnav.hot_right_now',
    },
    {
      id: 'pumping',
      labelKey: 'social_leaderboard.shell.subnav.pumping',
    },
  ],
  defaultSubnav: 'trending',
};

const LIVE_TRADES_CONFIG: SocialShellTabConfig<LiveTradesSubnavId> = {
  labelKey: 'social_leaderboard.feed.tabs.live_trades',
  subnav: [
    {
      id: 'topGainers',
      labelKey: 'social_leaderboard.shell.subnav.top_gainers',
    },
    {
      id: 'topLosers',
      labelKey: 'social_leaderboard.shell.subnav.top_losers',
    },
    {
      id: 'newMarkets',
      labelKey: 'social_leaderboard.shell.subnav.new_markets',
    },
  ],
  defaultSubnav: 'topGainers',
};

const LEADERBOARD_CONFIG: SocialShellTabConfig<LeaderboardSubnavId> = {
  labelKey: 'social_leaderboard.feed.tabs.leaderboard',
  subnav: [
    {
      id: 'topTraders',
      labelKey: 'social_leaderboard.shell.subnav.top_traders',
    },
    {
      id: 'kols',
      labelKey: 'social_leaderboard.shell.subnav.kols',
    },
  ],
  defaultSubnav: 'topTraders',
};

export const SOCIAL_SHELL_TAB_CONFIG = {
  feed: FEED_CONFIG,
  liveTrades: LIVE_TRADES_CONFIG,
  leaderboard: LEADERBOARD_CONFIG,
} as const;

export const SOCIAL_V1_TAB_ORDER = [
  'feed',
  'liveTrades',
  'leaderboard',
] as const;
