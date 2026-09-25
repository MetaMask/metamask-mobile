import type {
  SocialV1FeedItem,
  SocialV1FeedPost,
  SocialV1HotToken,
} from '../types';

/** How many chips the feed rail shows. */
export const SOCIAL_V1_HOT_TOKEN_LIMIT = 10;

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
  /** First spot contract seen for this ticker, for the token feed route. */
  chain?: string;
  contractAddress?: string;
}

/**
 * Chain and contract for the token feed. Perp rows often have an empty
 * address; those cannot call `GET /tokens/:chain/:contractAddress/feed`.
 */
const tokenFeedIdentity = (
  item: SocialV1FeedItem,
): { chain: string; contractAddress: string } | null => {
  const chain = item.asset.avatar.chain.trim();
  const contractAddress = item.asset.avatar.tokenAddress.trim();
  if (!chain || !contractAddress) {
    return null;
  }
  return { chain, contractAddress };
};

/**
 * Top assets in the loaded feed, most frequent first.
 *
 * Each post counts once. Spot and perp rows that share a display symbol
 * count as the same asset, so tapping the chip can filter every trade for
 * it. Ties break on the chip id so a later page that fills in a name does
 * not reshuffle the rail.
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
    const contract = tokenFeedIdentity(post.item);
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
        chain: contract?.chain,
        contractAddress: contract?.contractAddress,
      });
      return;
    }

    existing.count += 1;

    if (!existing.contractAddress && contract) {
      existing.chain = contract.chain;
      existing.contractAddress = contract.contractAddress;
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
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
    .slice(0, Math.max(0, limit))
    .map(({ id, symbol, label, avatar, chain, contractAddress }) => ({
      id,
      symbol,
      label,
      avatar,
      ...(chain && contractAddress ? { chain, contractAddress } : {}),
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

  const match = posts.find(
    (post) => getSocialV1HotTokenId(post.item) === selectedTokenId,
  );
  if (!match) {
    return [...tokens];
  }

  const [pinned] = rankFeedHotTokens([match], 1);
  if (!pinned) {
    return [...tokens];
  }

  return [pinned, ...tokens];
};
