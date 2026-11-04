import type { Position } from '@metamask/social-controllers';
import { isPerpPosition } from '../../../../UI/SocialFeed/utils/perp';

export type ProfileAssetFilter = 'all' | 'tokens' | 'perps';

export const splitPositionsByType = (
  positions: Position[],
): { tokens: Position[]; perps: Position[] } => {
  const tokens: Position[] = [];
  const perps: Position[] = [];

  positions.forEach((position) => {
    if (isPerpPosition(position)) {
      perps.push(position);
    } else {
      tokens.push(position);
    }
  });

  return { tokens, perps };
};

/**
 * Whether a position, or a post that has one, belongs in the shared profile
 * asset filter. A post with no position only stays when the filter is All.
 */
export const matchesProfileAssetFilter = (
  position: Position | undefined,
  filter: ProfileAssetFilter,
): boolean => {
  if (filter === 'all') {
    return true;
  }
  if (!position) {
    return false;
  }
  const isPerp = isPerpPosition(position);
  return filter === 'perps' ? isPerp : !isPerp;
};

/** Keeps API order. `all` returns the same list; the others drop the other asset type. */
export const filterPositionsByAsset = (
  positions: Position[],
  filter: ProfileAssetFilter,
): Position[] => {
  if (filter === 'all') {
    return positions;
  }
  return positions.filter((position) =>
    matchesProfileAssetFilter(position, filter),
  );
};

export const getFilteredPositionSections = (
  positions: Position[],
  filter: ProfileAssetFilter,
): { tokens: Position[]; perps: Position[] } => {
  const { tokens, perps } = splitPositionsByType(positions);

  if (filter === 'tokens') {
    return { tokens, perps: [] };
  }
  if (filter === 'perps') {
    return { tokens: [], perps };
  }
  return { tokens, perps };
};

export const getProfilePositionsEmptyMessageKey = (
  tab: 'open' | 'closed',
  filter: ProfileAssetFilter,
): string => {
  if (filter === 'tokens') {
    return tab === 'open'
      ? 'social_leaderboard.my_profile.empty_open_tokens'
      : 'social_leaderboard.my_profile.empty_closed_tokens';
  }
  if (filter === 'perps') {
    return tab === 'open'
      ? 'social_leaderboard.my_profile.empty_open_perps'
      : 'social_leaderboard.my_profile.empty_closed_perps';
  }
  return tab === 'open'
    ? 'social_leaderboard.my_profile.empty_open'
    : 'social_leaderboard.my_profile.empty_closed';
};
