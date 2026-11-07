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
  /** True for a perp. A perp with no known side reads as "traded". */
  isPerp?: boolean;
  isClosed?: boolean;
}

const MAX_TRADER_NAME_LENGTH = 24;
const MAX_ASSET_SYMBOL_LENGTH = 12;

export interface TraderShareNameSource {
  /** Username. `profile.name` on the trader profile API. */
  name?: string | null;
}

/**
 * Name to put in a share preview: the username, else whatever the screen
 * already showed.
 */
export const readTraderShareName = (
  profile: TraderShareNameSource | null | undefined,
  fallback?: string | null,
): string => profile?.name?.trim() || fallback?.trim() || '';

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

/** Profile preview copy: "Follow <username> on MetaMask Social". */
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

const positionTitleKey = ({
  side,
  isPerp,
  isClosed,
}: Pick<
  SocialPositionShareContext,
  'side' | 'isPerp' | 'isClosed'
>): string => {
  if (side === 'long') {
    return 'social_leaderboard.share_link.position_longed';
  }
  if (side === 'short') {
    return 'social_leaderboard.share_link.position_shorted';
  }
  if (isPerp) {
    return 'social_leaderboard.share_link.position_traded';
  }
  return isClosed
    ? 'social_leaderboard.share_link.position_sold'
    : 'social_leaderboard.share_link.position_bought';
};

/**
 * Position preview copy: "<username> bought|sold|longed|shorted <asset>".
 * Spot reads as bought while open and sold once closed; a perp reads as its
 * side either way.
 */
export const buildSocialPositionOpenGraph = ({
  traderName,
  assetSymbol,
  side,
  isPerp = false,
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
      description: strings(
        'social_leaderboard.share_link.position_description_no_asset',
        { trader },
      ),
    };
  }
  return {
    title: strings(positionTitleKey({ side, isPerp, isClosed }), {
      trader,
      asset,
    }),
    description: strings('social_leaderboard.share_link.position_description', {
      trader,
      asset,
    }),
  };
};
