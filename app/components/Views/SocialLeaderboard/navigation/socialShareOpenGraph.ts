import { strings } from '../../../../../locales/i18n';

/**
 * One brand image for every Social share preview. This is the static default
 * card the social API serves (`/api/v1/og-images/default.jpg`) on the dev
 * host while the share-card API is still being tested.
 */
export const SOCIAL_SHARE_OPEN_GRAPH_IMAGE_URL =
  'https://social.dev-api.cx.metamask.io/api/v1/og-images/default.jpg';

/** Branch dynamic open-graph fields attached to a shared social link. */
export interface SocialLinkOpenGraph {
  title: string;
  description: string;
  imageUrl?: string;
}

export interface SocialPositionShareContext {
  traderName: string;
  assetSymbol?: string;
}

const MAX_TRADER_NAME_LENGTH = 24;
const MAX_ASSET_SYMBOL_LENGTH = 12;

export interface TraderShareNameSource {
  /** Username stored on `profile.name`. */
  name?: string | null;
  /** Public display name, when the profile API sends one. */
  displayName?: string | null;
}

/**
 * Name to put in a share preview. Prefers the public display name, then the
 * username, then whatever the screen already showed.
 */
export const readTraderShareName = (
  profile: TraderShareNameSource | null | undefined,
  fallback?: string | null,
): string => {
  const displayName = profile?.displayName?.trim();
  if (displayName) {
    return displayName;
  }
  const name = profile?.name?.trim();
  if (name) {
    return name;
  }
  return fallback?.trim() ?? '';
};

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

/** Profile preview: "{displayName} on MetaMask". */
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
    imageUrl: SOCIAL_SHARE_OPEN_GRAPH_IMAGE_URL,
  };
};

/**
 * Position preview: "{displayName}'s {token} trade" / "{displayName} is
 * trading {token}". The same wording is used whether the position is open
 * or closed, spot or perp.
 */
export const buildSocialPositionOpenGraph = ({
  traderName,
  assetSymbol,
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
        'social_leaderboard.share_link.profile_description',
        { trader },
      ),
      imageUrl: SOCIAL_SHARE_OPEN_GRAPH_IMAGE_URL,
    };
  }
  return {
    title: strings('social_leaderboard.share_link.position_title', {
      trader,
      asset,
    }),
    description: strings('social_leaderboard.share_link.position_description', {
      trader,
      asset,
    }),
    imageUrl: SOCIAL_SHARE_OPEN_GRAPH_IMAGE_URL,
  };
};
