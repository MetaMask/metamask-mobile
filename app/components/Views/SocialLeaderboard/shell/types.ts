export type SocialShellTab = 'feed' | 'liveTrades' | 'leaderboard';

export type FeedSubnavId = 'following' | 'trending' | 'hotRightNow' | 'pumping';

export type LiveTradesSubnavId = 'topGainers' | 'topLosers' | 'newMarkets';

export type LeaderboardSubnavId = 'topTraders' | 'kols';

export type SocialShellSubnavId =
  | FeedSubnavId
  | LiveTradesSubnavId
  | LeaderboardSubnavId;

export interface SocialShellSubnavItem<TId extends SocialShellSubnavId> {
  id: TId;
  labelKey: string;
  leadingEmoji?: string;
}

export interface SocialShellTabConfig<TId extends SocialShellSubnavId> {
  labelKey: string;
  subnav: readonly SocialShellSubnavItem<TId>[];
  defaultSubnav: TId;
}
