import type { CaipAssetType } from '@metamask/utils';
import { toFeedAssetId } from '../../../../../UI/SocialFeed/data/socialFeedSource';
import type {
  SocialV1FeedItem,
  SocialV1FeedPost,
} from '../../../../../UI/SocialFeed/types';
import type { SocialV1HotToken } from '../types';

/** How many chips the feed rail shows. */
export const SOCIAL_V1_HOT_TOKEN_LIMIT = 10;

/** Most asset ids one chip filters by. The feed accepts 1 to 10. */
export const SOCIAL_V1_HOT_TOKEN_ASSET_ID_LIMIT = 10;

const isPerpsItem = (item: SocialV1FeedItem): boolean =>
  item.variant === 'perpsOpen' || item.variant === 'perpsClosed';

/**
 * Identity for one traded asset, shared by spot and perp posts of the same
 * ticker. Two PEPE contracts on different chains collapse into one chip —
 * the rail is a frequency sketch of what the loaded feed is talking about,
 * not a canonical asset index.
 */
export const getSocialV1FeedAssetKey = (
  item: SocialV1FeedItem,
): string | null => {
  const symbol = item.asset.symbol.trim();
  if (!symbol) {
    return null;
  }
  return symbol.toUpperCase();
};

/** Chip id for a feed row, or null when the row has no ticker. */
export const getSocialV1HotTokenId = (
  item: SocialV1FeedItem,
): string | null => {
  const key = getSocialV1FeedAssetKey(item);
  return key ? `asset:${key}` : null;
};

const chipLabel = (item: SocialV1FeedItem): string => {
  const name = item.asset.name?.trim();
  return name || item.asset.symbol;
};

const feedAssetIdOf = (item: SocialV1FeedItem): CaipAssetType | null => {
  const { chain, tokenAddress, tokenSymbol } = item.asset.avatar;
  return toFeedAssetId({ chain, tokenAddress, tokenSymbol });
};

interface RankedAsset {
  id: string;
  symbol: string;
  label: string;
  avatar: SocialV1HotToken['avatar'];
  count: number;
  /** True once a perp row has supplied the icon (raw market id). */
  hasPerpsAvatar: boolean;
  /** True once a human name has replaced the ticker. */
  labelIsName: boolean;
  /** Posts per feed asset id, in the order the ids were first seen. */
  assetIdCounts: Map<CaipAssetType, number>;
}

/** Most frequent first; ties keep the order the ids were first seen. */
const topAssetIds = (counts: Map<CaipAssetType, number>): CaipAssetType[] =>
  [...counts.entries()]
    .sort(([, left], [, right]) => right - left)
    .slice(0, SOCIAL_V1_HOT_TOKEN_ASSET_ID_LIMIT)
    .map(([assetId]) => assetId);

/**
 * Top assets in the loaded feed, most frequent first.
 *
 * Each post counts once. Spot and perp rows that share a display symbol
 * count as the same asset, and the chip carries every feed asset id among
 * them, so selecting it filters every trade for it. A chip with no asset id
 * cannot filter the feed and is left out. Ties break on the chip id so a
 * later page that fills in a name does not reshuffle the rail.
 */
export const rankFeedHotTokens = (
  posts: readonly SocialV1FeedPost[],
  limit: number = SOCIAL_V1_HOT_TOKEN_LIMIT,
): SocialV1HotToken[] => {
  const byId = new Map<string, RankedAsset>();

  posts.forEach((post) => {
    const id = getSocialV1HotTokenId(post.item);
    if (!id) {
      return;
    }

    const { asset } = post.item;
    const isPerps = isPerpsItem(post.item);
    const name = asset.name?.trim();
    const assetId = feedAssetIdOf(post.item);
    const existing = byId.get(id);

    if (!existing) {
      byId.set(id, {
        id,
        symbol: asset.avatar.tokenSymbol || asset.symbol,
        label: chipLabel(post.item),
        avatar: asset.avatar,
        count: 1,
        hasPerpsAvatar: isPerps,
        labelIsName: Boolean(name),
        assetIdCounts: new Map(assetId ? [[assetId, 1]] : []),
      });
      return;
    }

    existing.count += 1;

    if (assetId) {
      existing.assetIdCounts.set(
        assetId,
        (existing.assetIdCounts.get(assetId) ?? 0) + 1,
      );
    }

    if (!existing.labelIsName && name) {
      existing.label = name;
      existing.labelIsName = true;
    }

    // Equities only publish icons under the prefixed market id, which lives
    // on the perp avatar. A spot row seen first must not keep that icon.
    if (isPerps && !existing.hasPerpsAvatar) {
      existing.avatar = asset.avatar;
      existing.symbol = asset.avatar.tokenSymbol || asset.symbol;
      existing.hasPerpsAvatar = true;
    }
  });

  return [...byId.values()]
    .filter((asset) => asset.assetIdCounts.size > 0)
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
    .slice(0, Math.max(0, limit))
    .map(({ id, symbol, label, avatar, assetIdCounts }) => ({
      id,
      symbol,
      label,
      avatar,
      assetIds: topAssetIds(assetIdCounts),
    }));
};

/**
 * Keeps a selected chip on the rail after a later page pushes it out of the
 * top ranks, so the filter can still be cleared.
 */
export const pinSelectedHotToken = (
  tokens: readonly SocialV1HotToken[],
  posts: readonly SocialV1FeedPost[],
  selectedTokenId: string | null,
): SocialV1HotToken[] => {
  if (
    !selectedTokenId ||
    tokens.some((token) => token.id === selectedTokenId)
  ) {
    return [...tokens];
  }

  const [pinned] = rankFeedHotTokens(
    posts.filter(
      (post) => getSocialV1HotTokenId(post.item) === selectedTokenId,
    ),
    1,
  );
  if (!pinned) {
    return [...tokens];
  }

  return [pinned, ...tokens];
};
