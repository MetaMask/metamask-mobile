import { strings } from '../../../../../locales/i18n';

/** Branch dynamic open-graph fields attached to a shared social link. */
export interface SocialLinkOpenGraph {
  title: string;
  description: string;
}

export interface SocialPositionShareContext {
  traderName: string;
  assetSymbol?: string;
  side?: 'long' | 'short' | null;
  isClosed?: boolean;
}

const MAX_TRADER_NAME_LENGTH = 24;
const MAX_ASSET_SYMBOL_LENGTH = 12;

/**
 * Collapses whitespace and caps a label so the share URL stays short.
 * Cuts on a word boundary when the name has one.
 */
const clipShareLabel = (value: string, maxLength: number): string => {
  const collapsed = value.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= maxLength) {
    return collapsed;
  }
  const sliced = collapsed.slice(0, maxLength);
  const lastSpace = sliced.lastIndexOf(' ');
  return (lastSpace >= 8 ? sliced.slice(0, lastSpace) : sliced).trimEnd();
};

/**
 * Profile preview copy. Names the trader and nothing else, so the link
 * stays short enough to share in a chat.
 */
export const buildSocialProfileOpenGraph = (
  traderName: string | undefined,
): SocialLinkOpenGraph | undefined => {
  const trader = clipShareLabel(traderName ?? '', MAX_TRADER_NAME_LENGTH);
  if (!trader) {
    return undefined;
  }
  return {
    title: strings('social_leaderboard.share_link.profile_title', { trader }),
    description: strings('social_leaderboard.share_link.profile_description', {
      trader,
    }),
  };
};

const positionDescriptionKey = ({
  side,
  isClosed,
}: Pick<SocialPositionShareContext, 'side' | 'isClosed'>): string => {
  if (side === 'long') {
    return isClosed
      ? 'social_leaderboard.share_link.position_long_closed'
      : 'social_leaderboard.share_link.position_long_open';
  }
  if (side === 'short') {
    return isClosed
      ? 'social_leaderboard.share_link.position_short_closed'
      : 'social_leaderboard.share_link.position_short_open';
  }
  return isClosed
    ? 'social_leaderboard.share_link.position_spot_closed'
    : 'social_leaderboard.share_link.position_spot_open';
};

/**
 * Position preview copy. Names the trader and, when we have one, the asset
 * and whether the position is a long, a short, or a spot trade.
 */
export const buildSocialPositionOpenGraph = ({
  traderName,
  assetSymbol,
  side,
  isClosed = false,
}: SocialPositionShareContext): SocialLinkOpenGraph | undefined => {
  const trader = clipShareLabel(traderName, MAX_TRADER_NAME_LENGTH);
  if (!trader) {
    return undefined;
  }
  const asset = clipShareLabel(assetSymbol ?? '', MAX_ASSET_SYMBOL_LENGTH);
  if (!asset) {
    return {
      title: strings('social_leaderboard.share_link.position_title_no_asset', {
        trader,
      }),
      description: strings('social_leaderboard.share_link.position_no_asset', {
        trader,
      }),
    };
  }
  return {
    title: strings('social_leaderboard.share_link.position_title', {
      trader,
      asset,
    }),
    description: strings(positionDescriptionKey({ side, isClosed }), {
      trader,
      asset,
    }),
  };
};
