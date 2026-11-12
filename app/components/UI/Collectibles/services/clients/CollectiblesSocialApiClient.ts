import type {
  CollectiblesAccount,
  CollectiblesRarity,
  IndexedPack,
  Page,
  PageRequest,
  Pokedex,
  WalletSummary,
} from './CollectiblesApiClient';

export interface CollectiblesSocialProfile {
  profileId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  followerCount: number;
  /** Viewer-relative relationship in the Social interface. */
  isFollowing: boolean;
  accounts: CollectiblesAccount[];
  leaderboardOptIn: boolean;
}
export interface CollectiblesEngagement {
  likes: number;
  comments: number;
  likedByViewer: boolean;
}
export interface CollectiblesPackFeedItem {
  itemId: string;
  type: 'collectibles_pack';
  actor: CollectiblesSocialProfile;
  timestamp: string;
  engagement: CollectiblesEngagement;
  data: { pack: IndexedPack; caption: string | null };
}
export interface CollectiblesMultiPackFeedItem {
  itemId: string;
  type: 'collectibles_multi_pack';
  actor: CollectiblesSocialProfile;
  timestamp: string;
  engagement: CollectiblesEngagement;
  data: { yoloId: string; packs: IndexedPack[]; caption: string | null };
}
/** Card snapshot for sharing, independently of indexed pack records. */
export interface CollectiblesCardShareSnapshot {
  readonly provider: 'pack-partner';
  readonly mint: string;
  readonly name: string;
  readonly imageUrl: string | null;
  readonly insuredValueUsd: string | null;
  readonly rarity?: CollectiblesRarity;
  readonly grade?: string;
  readonly memo?: string;
  readonly batchId?: string;
}
export interface CollectiblesCardFeedItem {
  itemId: string;
  type: 'collectibles_cards';
  actor: CollectiblesSocialProfile;
  timestamp: string;
  engagement: CollectiblesEngagement;
  data: {
    cards: CollectiblesCardShareSnapshot[];
    caption: string | null;
  };
}
export type CollectiblesFeedItem =
  | CollectiblesPackFeedItem
  | CollectiblesMultiPackFeedItem
  | CollectiblesCardFeedItem;
export interface CollectiblesCommentTarget {
  targetType: CollectiblesFeedItem['type'];
  targetId: string;
}
export interface CollectiblesComment {
  commentId: string;
  target: CollectiblesCommentTarget;
  author: CollectiblesSocialProfile;
  text: string;
  createdAt: string;
  parentId: string | null;
}
export type CollectiblesLeaderboardSort =
  | 'collectiblesVolume'
  | 'collectiblesEpic'
  | 'collectiblesPacks'
  | 'collectiblesPokedex';
export interface CollectiblesLeaderboardEntry {
  rank: number;
  profile: CollectiblesSocialProfile;
  summary: WalletSummary;
}
export interface PackSocialContext {
  friends: CollectiblesSocialProfile[];
  topBuyer: CollectiblesSocialProfile | null;
  lastFriendEpic: CollectiblesPackFeedItem | null;
  friendOpenings: number;
}
export interface ProfileFavoritePack {
  packType: string;
  packName: string;
  openedCount: number;
}
export interface CollectiblesSocialApiClient {
  getPackSocialContext(request: {
    packTypes: string[];
    viewerProfileId?: string;
  }): Promise<Record<string, PackSocialContext>>;
  getLeaderboard(
    request: PageRequest & { sort: CollectiblesLeaderboardSort },
  ): Promise<Page<CollectiblesLeaderboardEntry>>;
  getFeed(
    request: PageRequest & { profileId?: string; followingOf?: string },
  ): Promise<Page<CollectiblesFeedItem>>;
  getProfile(request: {
    profileId: string;
  }): Promise<CollectiblesSocialProfile | null>;
  setFollow(request: {
    profileId: string;
    following: boolean;
  }): Promise<CollectiblesSocialProfile>;
  /** Indexed openings for a profile, not proof of current token ownership. */
  getProfileFavoritePacks(request: {
    profileId: string;
  }): Promise<ProfileFavoritePack[]>;
  getProfileCollectibles(
    request: PageRequest & { profileId: string },
  ): Promise<Page<IndexedPack>>;
  getProfilePokedex(request: {
    profileId: string;
    generation?: number;
  }): Promise<Pokedex>;
  getComments(
    request: PageRequest & CollectiblesCommentTarget,
  ): Promise<Page<CollectiblesComment>>;
  addComment(
    request: CollectiblesCommentTarget & {
      text: string;
      parentId?: string;
    },
  ): Promise<CollectiblesComment>;
  setReaction(
    request: CollectiblesCommentTarget & { liked: boolean },
  ): Promise<CollectiblesFeedItem>;
  /** Share cards independently of indexed pack posts. */
  shareCards(request: {
    draftId: string;
    cards: readonly CollectiblesCardShareSnapshot[];
    caption?: string;
  }): Promise<CollectiblesCardFeedItem>;
}
