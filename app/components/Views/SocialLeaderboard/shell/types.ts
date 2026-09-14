export type SocialShellTab = 'feed' | 'liveTrades' | 'leaderboard';

export type FeedSubnavId = 'trending' | 'following';

export type LiveTradesSubnavId = 'memecoins' | 'perps' | 'stocks' | 'whales';

export type LeaderboardSubnavId =
  | 'topTraders'
  | 'topPerps'
  | 'kols'
  | 'topTokens';

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
